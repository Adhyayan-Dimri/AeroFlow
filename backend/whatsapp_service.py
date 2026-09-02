import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_API_VERSION = os.environ.get("WHATSAPP_API_VERSION", "v18.0")

def configured() -> bool:
    return bool(WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN)

async def send_whatsapp(to_phone: str, message: str) -> bool:
    if not configured():
        logger.warning("WhatsApp Business API not configured; skipping message to %s", to_phone)
        return False

    try:
        url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()

            logger.info("WhatsApp message sent to %s", to_phone)
            return True

    except httpx.HTTPStatusError as e:
        logger.error("WhatsApp API error: %s", e.response.text)
        return False
    except Exception as e:
        logger.error("Failed to send WhatsApp message: %s", e)
        return False

async def send_preflight_whatsapp(to_phone: str, flight_number: str, dep_time: str, arrive_by: str, note: str) -> bool:
    message = f"*AeroFlow Journey Plan*\n\nFlight: {flight_number}\nDeparture: {dep_time}\nArrive by: {arrive_by}\n\n{note}\n\nOpen the app for live step-by-step journey forecast."
    return await send_whatsapp(to_phone, message)

async def send_baggage_belt_whatsapp(to_phone: str, flight_number: str, carousel: str, bag_count: str) -> bool:
    message = f"*Baggage Belt Started*\n\nFlight: {flight_number}\nCarousel: {carousel}\nExpected bags: {bag_count}\n\nHead to baggage reclaim area now."
    return await send_whatsapp(to_phone, message)
