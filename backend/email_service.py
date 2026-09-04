import os
import re
import ipaddress
import logging
from pathlib import Path
from dotenv import load_dotenv
import httpx
import aiosmtplib
from email.message import EmailMessage
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://api.resend.com"
EMAIL_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "AeroFlow"
EMAIL_FROM_ADDRESS = os.environ.get("RESEND_FROM_ADDRESS") or "onboarding@resend.dev"

GMAIL_EMAIL = os.environ.get("GMAIL_EMAIL", "").strip() or "aeroflow2026@gmail.com"
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip() or "tmjcaletxvzzftxq"
GMAIL_ENABLED = os.environ.get("GMAIL_ENABLED", "true").lower().strip() not in ("false", "0", "no")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)

def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)

def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)

class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []

def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened/numeric/credential URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != host {real!r} (G3)")

def _get_gmail_config():
    enabled_str = os.environ.get("GMAIL_ENABLED", "true").lower().strip()
    email = os.environ.get("GMAIL_EMAIL", "").strip() or "aeroflow2026@gmail.com"
    password = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip() or "tmjcaletxvzzftxq"
    enabled = enabled_str not in ("false", "0", "no") and bool(email) and bool(password)
    return enabled, email, password

def _get_resend_config():
    key = os.environ.get("RESEND_API_KEY", "").strip()
    from_addr = os.environ.get("RESEND_FROM_ADDRESS", "").strip() or "onboarding@resend.dev"
    name = os.environ.get("EMAIL_FROM_NAME", "").strip() or "AeroFlow"
    return key, from_addr, name

def _configured() -> bool:
    g_enabled, g_email, g_pass = _get_gmail_config()
    r_key, _, _ = _get_resend_config()
    return (g_enabled and bool(g_email) and bool(g_pass)) or (bool(r_key) and not r_key.startswith("{"))

def configured() -> bool:
    return _configured()

import ssl
import certifi

def _get_ssl_context(verify: bool = True):
    if verify:
        try:
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()
    else:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

async def _send_via_gmail(to_email: str, subject: str, html: str) -> bool:
    _, gmail_email, gmail_pass = _get_gmail_config()
    from_name = os.environ.get("EMAIL_FROM_NAME", "").strip() or "AeroFlow"

    if not gmail_email or not gmail_pass:
        logger.error("Cannot send email: GMAIL_EMAIL or GMAIL_APP_PASSWORD is not configured")
        return False

    message = EmailMessage()
    message["From"] = f"{from_name} <{gmail_email}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(html, subtype="html")

    # Strategy 1: Port 465 (Direct SSL) with certifi CA validation
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=465,
            username=gmail_email,
            password=gmail_pass,
            use_tls=True,
            tls_context=_get_ssl_context(verify=True),
            timeout=3,
        )
        logger.info("Email successfully sent via Gmail (port 465 verified SSL) to %s", to_email)
        return True
    except Exception as e465_ver:
        logger.warning("Gmail port 465 verified SSL failed (%s); trying fallback SSL context...", e465_ver)

    # Strategy 2: Port 465 (Direct SSL) with unverified context (handles container CA trust gaps)
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=465,
            username=gmail_email,
            password=gmail_pass,
            use_tls=True,
            tls_context=_get_ssl_context(verify=False),
            timeout=3,
        )
        logger.info("Email successfully sent via Gmail (port 465 fallback SSL) to %s", to_email)
        return True
    except Exception as e465_unver:
        logger.warning("Gmail port 465 fallback SSL failed (%s); trying port 587 STARTTLS...", e465_unver)

    # Strategy 3: Port 587 (STARTTLS)
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            username=gmail_email,
            password=gmail_pass,
            start_tls=True,
            tls_context=_get_ssl_context(verify=False),
            timeout=3,
        )
        logger.info("Email successfully sent via Gmail (port 587 STARTTLS) to %s", to_email)
        return True
    except Exception as e587:
        logger.warning("Gmail SMTP connections blocked on this host (Port 465/587 blocked by cloud firewall): %s", e587)
        return False

async def _send_via_http_bridge(to_email: str, subject: str, html: str) -> bool:
    bridge_url = os.environ.get("GMAIL_HTTP_BRIDGE_URL", "").strip() or os.environ.get("EMAIL_WEBHOOK_URL", "").strip()
    if not bridge_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.post(
                bridge_url,
                json={
                    "to": to_email,
                    "subject": subject,
                    "html": html,
                    "from_name": os.environ.get("EMAIL_FROM_NAME", "AeroFlow")
                }
            )
            if resp.status_code < 400:
                logger.info("Email successfully sent via HTTP Bridge to %s", to_email)
                return True
            else:
                logger.warning("HTTP Bridge responded with status %d: %s", resp.status_code, resp.text)
    except Exception as be:
        logger.warning("HTTP Bridge delivery failed: %s", be)
    return False

async def _send_via_brevo(to_email: str, subject: str, html: str) -> bool:
    brevo_key = os.environ.get("BREVO_API_KEY", "").strip()
    if not brevo_key:
        return False
    from_name = os.environ.get("EMAIL_FROM_NAME", "").strip() or "AeroFlow"
    sender_email = os.environ.get("GMAIL_EMAIL", "").strip() or "aeroflow2026@gmail.com"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json={
                    "sender": {"name": from_name, "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html
                }
            )
            if resp.status_code < 400:
                logger.info("Email successfully sent via Brevo HTTPS API to %s", to_email)
                return True
            logger.error("Brevo API responded with %d: %s", resp.status_code, resp.text)
    except Exception as be:
        logger.error("Brevo API delivery failed: %s", be)
    return False

async def _send_via_resend(to_email: str, subject: str, html: str) -> bool:
    key, from_addr, name = _get_resend_config()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/emails",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"{name} <{from_addr}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html
                },
            )
        if resp.status_code >= 400:
            logger.error("Resend API rejected email to %s with status %d: %s", to_email, resp.status_code, resp.text)
            return False
        logger.info("Email successfully sent via Resend to %s", to_email)
        return True
    except Exception as e:
        logger.error("Resend send failed: %s", e)
        return False

async def _send(to_email: str, subject: str, html: str) -> bool:
    try:
        _assert_safe_email(subject, html)
    except Exception as se:
        logger.error("Email safety validation failed: %s", se)
        return False

    # 1. Try HTTP Bridge (Port 443 HTTPS - 100% bypasses cloud SMTP port blocks)
    if await _send_via_http_bridge(to_email, subject, html):
        return True

    # 2. Try Brevo HTTPS API (Port 443 HTTPS)
    if await _send_via_brevo(to_email, subject, html):
        return True

    # 3. Try Gmail Direct SMTP (Fast 3s fail-over if cloud host blocks ports 465/587)
    g_enabled, g_email, g_pass = _get_gmail_config()
    if g_enabled and g_email and g_pass:
        try:
            if await _send_via_gmail(to_email, subject, html):
                return True
        except Exception as e:
            logger.warning("Gmail SMTP attempt failed: %s", e)

    # 4. Try Resend HTTPS API (Port 443 HTTPS)
    r_key, _, _ = _get_resend_config()
    if r_key and not r_key.startswith("{"):
        try:
            if await _send_via_resend(to_email, subject, html):
                return True
        except Exception as re:
            logger.error("Resend API fallback failed: %s", re)

    logger.warning("⚠️ Email could not be sent to %s via available providers", to_email)
    return False

def _wrap(inner: str) -> str:
    return (f'<table role="presentation" width="100%"><tr><td style="padding:24px;'
            f'font-family:Arial,sans-serif;color:#0B132B;max-width:560px">{inner}'
            f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {escape(EMAIL_FROM_NAME)} '
            f'· Smart Airport Operations. We never ask for your password by email.</p>'
            f'</td></tr></table>')

async def send_otp_email(to_email: str, code: str) -> bool:
    html = _wrap(f'<h2 style="margin:0 0 12px">Verify your {escape(EMAIL_FROM_NAME)} account</h2>'
                 f'<p>Your one-time verification code is:</p>'
                 f'<p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#0284C7">{escape(code)}</p>'
                 f'<p>This code expires in 10 minutes.</p>')
    return await _send(to_email, f"{EMAIL_FROM_NAME} verification code: {code}", html)

async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/reset-password?token={token}"
    if not _configured() or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Password reset link: %s", link)
        else:
            logger.error("Password reset email not configured")
        return False
    html = _wrap(f'<h2 style="margin:0 0 12px">Reset your password</h2>'
                 f'<p>We received a request to reset your {escape(EMAIL_FROM_NAME)} password.</p>'
                 f'<p><a href="{escape(link)}" style="color:#0284C7">Reset your password</a></p>'
                 f'<p>This link expires in 1 hour and can be used once.</p>')
    return await _send(to_email, f"Reset your {EMAIL_FROM_NAME} password", html)

async def send_preflight_email(to_email: str, flight_number: str, dep_time: str, arrive_by: str, note: str) -> bool:
    html = _wrap(f'<h2 style="margin:0 0 12px">Your journey plan for {escape(flight_number)}</h2>'
                 f'<p>Scheduled departure: <strong>{escape(dep_time)}</strong></p>'
                 f'<p>Suggested airport arrival: <strong style="color:#0284C7">{escape(arrive_by)}</strong></p>'
                 f'<p>{escape(note)}</p>'
                 f'<p>Open the app to see your live step-by-step journey forecast.</p>')
    return await _send(to_email, f"Plan your trip for {flight_number}", html)

async def send_alert_email(to_email: str, severity: str, message: str) -> bool:
    html = _wrap(f'<h2 style="margin:0 0 12px">Operations alert · {escape(severity.upper())}</h2>'
                 f'<p>{escape(message)}</p>'
                 f'<p>Open the Ops Console to acknowledge and act on this alert.</p>')
    return await _send(to_email, f"[{severity.upper()}] AeroFlow Ops Alert", html)

async def send_baggage_belt_email(to_email: str, flight_number: str, carousel: str, bag_count: str) -> bool:
    html = _wrap(f'<h2 style="margin:0 0 12px">Baggage belt started for {escape(flight_number)}</h2>'
                 f'<p>Your bags are now arriving on the carousel.</p>'
                 f'<p><strong>Carousel:</strong> {escape(str(carousel))}</p>'
                 f'<p><strong>Expected bags:</strong> {escape(str(bag_count))}</p>'
                 f'<p>Head to the baggage reclaim area now.</p>')
    return await _send(to_email, f"Baggage belt started - {flight_number}", html)
