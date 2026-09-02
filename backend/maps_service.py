import os
import logging
import httpx
from typing import Optional, Dict, Any
import urllib.parse

logger = logging.getLogger(__name__)

AIRPORT_COORDS = {"lat": 28.5562, "lng": 77.1000}
OSRM_BASE_URL = "https://router.project-osrm.org"
NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

def configured() -> bool:
    return True

async def geocode_address(address: str) -> Optional[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            params = {
                "q": address,
                "format": "json",
                "limit": 1
            }
            headers = {"User-Agent": "AeroFlow/1.0"}

            response = await client.get(
                f"{NOMINATIM_BASE_URL}/search",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            if data and len(data) > 0:
                result = data[0]
                return {
                    "lat": float(result["lat"]),
                    "lng": float(result["lon"]),
                    "formatted_address": result.get("display_name", address)
                }
            return None

    except Exception as e:
        logger.error("Nominatim geocoding failed: %s", e)
        return None

async def get_travel_time(origin: str, destination: Optional[str] = None) -> Dict[str, Any]:
    MAX_REASONABLE_TRAVEL_MINUTES = 180
    origin_coords = None
    if "," in origin and (origin.replace(".", "").replace("-", "").replace(" ", "").replace(",", "").isdigit()):
        parts = origin.split(",")
        origin_coords = {"lat": float(parts[0]), "lng": float(parts[1])}
    else:
        origin_coords = await geocode_address(origin)

    if not origin_coords:
        logger.warning("Could not geocode origin: %s", origin)
        return {
            "status": "GEOCODE_FAILED",
            "duration_seconds": 2700,
            "duration_text": "45 mins",
            "distance_meters": 0,
            "distance_text": "Unknown"
        }

    dest_coords = AIRPORT_COORDS

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            url = f"{OSRM_BASE_URL}/route/v1/driving"
            params = {
                "overview": "false",
                "alternatives": "false"
            }

            coordinates = f"{origin_coords['lng']},{origin_coords['lat']};{dest_coords['lng']},{dest_coords['lat']}"
            response = await client.get(
                f"{url}/{coordinates}",
                params=params
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") == "Ok" and data.get("routes") and len(data["routes"]) > 0:
                route = data["routes"][0]
                duration_seconds = route["duration"]
                distance_meters = route["distance"]

                duration_minutes = duration_seconds / 60
                if duration_minutes > MAX_REASONABLE_TRAVEL_MINUTES:
                    logger.warning("Travel time %.1f minutes exceeds reasonable local airport travel limit of %d minutes", duration_minutes, MAX_REASONABLE_TRAVEL_MINUTES)
                    return {
                        "status": "TOO_FAR",
                        "duration_seconds": 2700,
                        "duration_text": "45 mins (local estimate)",
                        "distance_meters": distance_meters,
                        "distance_text": f"{distance_meters / 1000:.1f} km",
                        "warning": "You appear to be in a different city. Using local airport travel time estimate."
                    }

                if duration_seconds < 60:
                    duration_text = f"{int(duration_seconds)} sec"
                elif duration_seconds < 3600:
                    minutes = int(duration_seconds / 60)
                    duration_text = f"{minutes} min{'s' if minutes > 1 else ''}"
                else:
                    hours = int(duration_seconds / 3600)
                    minutes = int((duration_seconds % 3600) / 60)
                    duration_text = f"{hours}h {minutes}m"

                if distance_meters < 1000:
                    distance_text = f"{int(distance_meters)} m"
                else:
                    distance_text = f"{distance_meters / 1000:.1f} km"

                return {
                    "status": "OK",
                    "duration_seconds": duration_seconds,
                    "duration_text": duration_text,
                    "distance_meters": distance_meters,
                    "distance_text": distance_text,
                    "source": "osrm"
                }
            else:
                error_code = data.get("code", "UNKNOWN")
                logger.error("OSRM API error: %s", error_code)
                return {
                    "status": error_code,
                    "duration_seconds": 2700,
                    "duration_text": "45 mins",
                    "distance_meters": 0,
                    "distance_text": "Unknown"
                }

    except Exception as e:
        logger.error("OSRM API request failed: %s", e)
        return {
            "status": "ERROR",
            "duration_seconds": 2700,
            "duration_text": "45 mins",
            "distance_meters": 0,
            "distance_text": "Unknown"
        }
