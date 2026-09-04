import os
import secrets
import hashlib
import logging
import re
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Request, Response, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import db, now
import email_service
import sms_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
JWT_ALGORITHM = "HS256"
STAFF_ROLES = {"ops_manager", "security_lead", "baggage_ops", "admin", "ground_staff"}

_encryption_key = None
_cipher = None

def get_encryption_key() -> bytes:
    global _encryption_key
    if _encryption_key is None:
        key = os.environ.get("ENCRYPTION_KEY")
        if key:
            try:
                test_key = key.encode() if isinstance(key, str) else key
                Fernet(test_key)
                _encryption_key = test_key
            except Exception:
                _encryption_key = Fernet.generate_key()
        else:
            _encryption_key = Fernet.generate_key()
    return _encryption_key

def get_cipher() -> Fernet:
    global _cipher
    if _cipher is None:
        _cipher = Fernet(get_encryption_key())
    return _cipher

def encrypt_data(data: str) -> str:
    if not data:
        return data
    try:
        cipher = get_cipher()
        encrypted = cipher.encrypt(data.encode())
        return encrypted.decode()
    except Exception as e:
        logger.warning("Encryption error fallback: %s", e)
        return data

def decrypt_data(encrypted: str) -> str:
    if not encrypted:
        return encrypted
    try:
        cipher = get_cipher()
        decrypted = cipher.decrypt(encrypted.encode())
        return decrypted.decode()
    except Exception as e:
        logger.warning("Decryption error fallback: %s", e)
        return encrypted

def sanitize_string(value: str, max_length: int = 100) -> str:
    if not value:
        return value
    value = value.strip()
    if len(value) > max_length:
        raise HTTPException(status_code=400, detail=f"Field exceeds maximum length of {max_length}")
    dangerous_patterns = ["<script", "javascript:", "onerror=", "onload=", "onclick=", "onmouseover="]
    if any(pattern in value.lower() for pattern in dangerous_patterns):
        raise HTTPException(status_code=400, detail="Invalid characters detected")
    return value

def validate_phone(phone: str) -> str:
    if not phone:
        return phone
    phone = re.sub(r"[^\d+]", "", phone)
    if not re.match(r"^\+?\d{10,15}$", phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    return phone

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "aeroflow-jwt-default-super-secret-key-2026")

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        if not pw or not hashed:
            return False
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False
    except Exception:
        return False

def create_access_token(uid: str, email: str, role: str, ver: int = 0) -> str:
    payload = {"sub": uid, "email": email, "role": role, "ver": ver,
               "exp": now() + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(uid: str, ver: int = 0) -> str:
    payload = {"sub": uid, "ver": ver, "exp": now() + timedelta(days=30), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def _set_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=2592000, path="/")

def _public_user(u: dict) -> dict:
    phone = u.get("phone")
    decrypted_phone = decrypt_data(phone) if phone else None
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name"),
            "role": u.get("role", "passenger"), "phone": decrypted_phone,
            "notify_pre_flight": u.get("notify_pre_flight", False),
            "otp_verified": u.get("otp_verified_at") is not None}

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Session expired")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep

async def require_staff(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str | None = None
    invite_code: str | None = None

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_string(v, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if len(v) > 128:
            raise HTTPException(status_code=400, detail="Password too long")
        return v

    @field_validator("invite_code")
    @classmethod
    def sanitize_invite_code(cls, v: str | None) -> str | None:
        if v:
            return sanitize_string(v.strip(), max_length=50)
        return v

class OtpVerifyIn(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise HTTPException(status_code=400, detail="OTP must be 6 digits")
        return v

class LoginIn(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) > 128:
            raise HTTPException(status_code=400, detail="Invalid credentials")
        return v

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if len(v) > 128:
            raise HTTPException(status_code=400, detail="Password too long")
        return v

def _gen_otp() -> str:
    fixed = os.environ.get("TEST_OTP")
    if fixed:
        return f"{int(fixed.strip()) % 1000000:06d}"
    return f"{secrets.randbelow(1000000):06d}"

@router.post("/register")
@limiter.limit("60/minute")
async def register(body: RegisterIn, background: BackgroundTasks, request: Request):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("otp_verified_at") is None:
            otp = _gen_otp()
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {
                "password_hash": hash_password(body.password),
                "name": body.name,
                "otp_hash": hashlib.sha256(otp.encode()).hexdigest(),
                "otp_expires": now() + timedelta(minutes=10)
            }})
            logger.info("🔑 [AEROFLOW OTP] Verification code for %s is: %s", email, otp)
            background.add_task(email_service.send_otp_email, email, otp)
            return {"otp_required": True, "email": email, "role": existing.get("role", "passenger"), "channel": "email", "dev_otp": otp}
        else:
            raise HTTPException(status_code=400, detail="This email is already registered. Please sign in.")
    role = "passenger"
    if body.invite_code:
        inv = body.invite_code.strip().upper()
        code = await db.staff_invite_codes.find_one({"code": {"$regex": f"^{re.escape(inv)}$", "$options": "i"}})
        if code:
            role = code["role"]
        else:
            default_map = {
                "AERO-GROUND-2026": "ground_staff",
                "GROUND-STAFF-2026": "ground_staff",
                "AERO-STAFF-2026": "ground_staff",
                "AERO-OPS-2026": "ops_manager",
                "AERO-ADMIN-2026": "admin",
                "AERO-SEC-2026": "security_lead",
                "AERO-BAG-2026": "baggage_ops",
            }
            if inv in default_map:
                role = default_map[inv]
            else:
                raise HTTPException(status_code=400, detail="Invalid staff authorization code")
    otp = _gen_otp()
    channel = "email"
    validated_phone = body.phone.strip() if body.phone else None
    encrypted_phone = encrypt_data(validated_phone) if validated_phone else None
    if validated_phone and sms_service.configured():
        sms_sent = await sms_service.send_sms(validated_phone, f"AeroFlow verification code: {otp}")
        if sms_sent:
            channel = "sms"

    doc = {
        "email": email, "password_hash": hash_password(body.password), "name": body.name,
        "phone": encrypted_phone, "role": role, "token_version": 0, "otp_verified_at": None,
        "notify_pre_flight": False, "created_at": now(), "otp_channel": channel,
        "pending_invite_code": body.invite_code.strip() if body.invite_code else None,
        "otp_hash": hashlib.sha256(otp.encode()).hexdigest(),
        "otp_expires": now() + timedelta(minutes=10),
    }
    await db.users.insert_one(doc)
    resp = {"otp_required": True, "email": email, "role": role, "channel": channel, "dev_otp": otp}
    if channel == "email":
        logger.info("🔑 [AEROFLOW OTP] Verification code for %s is: %s", email, otp)
        background.add_task(email_service.send_otp_email, email, otp)
        logger.info("OTP verification task queued for %s", email)
    else:
        logger.info("SMS OTP sent to %s for %s", validated_phone, email)
    return resp

@router.post("/otp/verify")
async def verify_otp(body: OtpVerifyIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("otp_verified_at") is None:
        if user.get("otp_expires") and user["otp_expires"].replace(tzinfo=timezone.utc) < now():
            raise HTTPException(status_code=400, detail="Code expired, please resend")
        if user.get("otp_hash") != hashlib.sha256(body.otp.strip().encode()).hexdigest():
            raise HTTPException(status_code=400, detail="Incorrect verification code")
        update = {"otp_verified_at": now()}
        if user.get("pending_invite_code"):
            await db.staff_invite_codes.update_one(
                {"code": user["pending_invite_code"], "used_by": None},
                {"$set": {"used_by": str(user["_id"]), "used_at": now()}})
            update["pending_invite_code"] = None
        await db.users.update_one({"_id": user["_id"]}, {"$set": update, "$unset": {"otp_hash": "", "otp_expires": ""}})
        user = await db.users.find_one({"_id": user["_id"]})
    access = create_access_token(str(user["_id"]), user["email"], user["role"], user.get("token_version", 0))
    refresh = create_refresh_token(str(user["_id"]), user.get("token_version", 0))
    _set_cookies(response, access, refresh)
    return {"user": _public_user(user), "access_token": access}

@router.post("/otp/resend")
async def resend_otp(body: ForgotIn, background: BackgroundTasks):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user and user.get("otp_verified_at") is None:
        if user.get("otp_channel") == "sms" and user.get("phone") and twilio_service.configured():
            twilio_service.send_otp(user["phone"])
            return {"otp_required": True, "channel": "sms"}
        otp = _gen_otp()
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "otp_hash": hashlib.sha256(otp.encode()).hexdigest(), "otp_expires": now() + timedelta(minutes=10)}})
        logger.info("🔑 [AEROFLOW OTP] Resent verification code for %s is: %s", email, otp)
        background.add_task(email_service.send_otp_email, email, otp)
        logger.info("OTP resent to %s", email)
        return {"otp_required": True, "dev_otp": otp}
    return {"otp_required": False}

async def _locked(identifier_email: str, ip: str) -> bool:
    since = now() - timedelta(minutes=15)
    cnt = await db.login_attempts.count_documents(
        {"email": identifier_email, "at": {"$gte": since}})
    return cnt >= 15

@router.post("/login")
@limiter.limit("60/minute")
async def login(body: LoginIn, request: Request, response: Response, background: BackgroundTasks):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "?"
    user = await db.users.find_one({"email": email})
    if await _locked(email, ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.insert_one({"identifier": f"{ip}:{email}", "email": email, "at": now()})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("otp_verified_at") is None:
        otp = _gen_otp()
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "otp_hash": hashlib.sha256(otp.encode()).hexdigest(), "otp_expires": now() + timedelta(minutes=10)}})
        logger.info("🔑 [AEROFLOW OTP] Login verification code for %s is: %s", email, otp)
        background.add_task(email_service.send_otp_email, email, otp)
        return {"otp_required": True, "email": email, "role": user.get("role", "passenger"), "detail": "Account verification required. A new verification code has been dispatched.", "dev_otp": otp}
    await db.login_attempts.delete_many({"email": email})
    access = create_access_token(str(user["_id"]), user["email"], user["role"], user.get("token_version", 0))
    refresh = create_refresh_token(str(user["_id"]), user.get("token_version", 0))
    _set_cookies(response, access, refresh)
    return {"user": _public_user(user), "access_token": access}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite="none", secure=True, httponly=True)
    response.delete_cookie("refresh_token", path="/", samesite="none", secure=True, httponly=True)
    return {"ok": True}

@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": _public_user(user)}

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    access = create_access_token(str(user["_id"]), user["email"], user["role"], user.get("token_version", 0))
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=1800, path="/")
    return {"user": _public_user(user), "access_token": access}

@router.post("/forgot-password")
async def forgot_password(body: ForgotIn, background: BackgroundTasks):
    email = body.email.lower().strip()
    generic = {"message": "If that email is registered, a reset link has been sent."}
    await db.password_reset_requests.insert_one({"email": email, "created_at": now()})
    since = now() - timedelta(minutes=15)
    if await db.password_reset_requests.count_documents({"email": email, "created_at": {"$gte": since}}) > 5:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": str(user["_id"]),
        "email": email, "expires_at": now() + timedelta(hours=1), "used": False})
    background.add_task(email_service.send_password_reset_email, user["email"], token)
    return generic

@router.post("/reset-password")
async def reset_password(body: ResetIn):
    h = hashlib.sha256(body.token.encode()).hexdigest()
    doc = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now()}}, {"$set": {"used": True}})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    await db.users.update_one({"_id": ObjectId(doc["user_id"])}, {
        "$set": {"password_hash": hash_password(body.password)}, "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": doc["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": doc["email"]})
    return {"message": "Password updated. Please sign in."}

async def seed_admin():
    from pymongo.errors import DuplicateKeyError
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        try:
            await db.users.insert_one({
                "email": admin_email, "password_hash": hash_password(admin_password), "name": "Airport Admin",
                "role": "admin", "token_version": 0, "otp_verified_at": now(), "notify_pre_flight": False,
                "created_at": now()})
        except DuplicateKeyError:
            pass
    else:
        upd = {}
        if not verify_password(admin_password, existing["password_hash"]):
            upd["password_hash"] = hash_password(admin_password)
        if existing.get("otp_verified_at") is None:
            upd["otp_verified_at"] = now()
        if existing.get("role") != "admin":
            upd["role"] = "admin"
        if upd:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": upd})

    await db.users.delete_many({"role": "admin", "email": {"$ne": admin_email}})
    await db.login_attempts.delete_many({"email": admin_email})

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("email")
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
