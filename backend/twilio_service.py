import os
import logging

logger = logging.getLogger(__name__)

ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
API_KEY_SID = os.environ.get("TWILIO_API_KEY_SID")
API_KEY_SECRET = os.environ.get("TWILIO_API_KEY_SECRET")
VERIFY_SID_ENV = os.environ.get("TWILIO_VERIFY_SID")

_client = None
_verify_sid = None

def configured() -> bool:
    return bool(ACCOUNT_SID and (AUTH_TOKEN or (API_KEY_SID and API_KEY_SECRET))
                and not ACCOUNT_SID.startswith("{"))

def _get_client():
    global _client
    if _client is None and configured():
        try:
            from twilio.rest import Client
            if AUTH_TOKEN:
                _client = Client(ACCOUNT_SID, AUTH_TOKEN)
            else:
                _client = Client(API_KEY_SID, API_KEY_SECRET, ACCOUNT_SID)
        except Exception as e:
            logger.error("Twilio client init failed: %s", e)
            _client = False
    return _client or None

def verify_sid():
    global _verify_sid
    if _verify_sid:
        return _verify_sid
    if VERIFY_SID_ENV:
        _verify_sid = VERIFY_SID_ENV
        return _verify_sid
    c = _get_client()
    if not c:
        return None
    try:
        for s in c.verify.v2.services.list(limit=20):
            if s.friendly_name == "AeroFlow":
                _verify_sid = s.sid
                break
        if not _verify_sid:
            _verify_sid = c.verify.v2.services.create(friendly_name="AeroFlow").sid
        logger.info("Twilio Verify service: %s", _verify_sid)
    except Exception as e:
        logger.error("Twilio verify service resolve failed: %s", e)
    return _verify_sid

def send_otp(phone: str) -> bool:
    c = _get_client()
    vs = verify_sid()
    if not (c and vs and phone):
        return False
    try:
        c.verify.v2.services(vs).verifications.create(to=phone, channel="sms")
        return True
    except Exception as e:
        logger.error("Twilio send_otp failed for %s: %s", phone, e)
        return False

def check_otp(phone: str, code: str) -> bool:
    c = _get_client()
    vs = verify_sid()
    if not (c and vs and phone):
        return False
    try:
        r = c.verify.v2.services(vs).verification_checks.create(to=phone, code=code)
        return r.status == "approved"
    except Exception as e:
        logger.error("Twilio check_otp failed for %s: %s", phone, e)
        return False
