import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

def configured() -> bool:
    is_configured = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)
    logger.info("SMS configured check: %s (SID: %s, Token: %s, Phone: %s)",
                is_configured,
                bool(TWILIO_ACCOUNT_SID),
                bool(TWILIO_AUTH_TOKEN),
                bool(TWILIO_PHONE_NUMBER))
    return is_configured

async def send_sms(to_phone: str, message: str) -> bool:
    if not configured():
        logger.warning("Twilio not configured; skipping SMS to %s", to_phone)
        return False

    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        message_obj = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone
        )

        logger.info("SMS sent to %s via Twilio. SID: %s", to_phone, message_obj.sid)
        return True

    except ImportError:
        logger.error("Twilio library not installed. Install with: pip install twilio")
        return False
    except TwilioRestException as e:
        logger.error("Twilio API error: %s", e)
        return False
    except Exception as e:
        logger.error("Failed to send SMS: %s", e)
        return False

async def send_preflight_sms(to_phone: str, flight_number: str, dep_time: str, arrive_by: str, note: str) -> bool:
    message = f"AeroFlow: Your journey plan for {flight_number}. Departure: {dep_time}. Arrive by: {arrive_by}. {note}"
    return await send_sms(to_phone, message)

async def send_baggage_belt_sms(to_phone: str, flight_number: str, carousel: str, bag_count: str) -> bool:
    message = f"AeroFlow: Baggage belt started for {flight_number}. Carousel: {carousel}. Bags: {bag_count}. Head to baggage reclaim now."
    return await send_sms(to_phone, message)
