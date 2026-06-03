import httpx
from typing import Optional
import config

async def get_driving_distance(origin: str, destination: str) -> Optional[float]:
    """
    Pobiera rzeczywisty dystans drogowy z Google Maps Distance Matrix API.
    Zwraca dystans w kilometrach.
    """
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destination,
        "key": config.GOOGLE_MAPS_API_KEY
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK" and data["rows"]:
                elements = data["rows"][0].get("elements", [])
                if elements and elements[0].get("status") == "OK":
                    distance_meters = elements[0]["distance"]["value"]
                    return distance_meters / 1000.0
            return None
    except Exception as e:
        print(f"Błąd Google Maps API: {e}")
        return None
