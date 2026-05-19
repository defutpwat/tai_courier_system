import httpx
import math
from typing import Tuple, Optional

async def get_coordinates(address: str) -> Optional[Tuple[float, float]]:
    """
    Pobiera współrzędne z serwisu Nominatim (OSM) za pomocą asynchronicznego zapytania HTTP.
    Odporne na zablokowanie całego API przez użycie httpx.AsyncClient i timeout.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": address,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "courier_system_gemini"
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
            return None
    except Exception:
        return None

def calculate_distance(coords1: Tuple[float, float], coords2: Tuple[float, float]) -> float:
    """
    Oblicza dystans w kilometrach pomiędzy dwoma punktami (Haversine formula).
    Odciąża serwer od dużych pakietów typu geopy.distance, robiąc to czystą matematyką.
    """
    lat1, lon1 = coords1
    lat2, lon2 = coords2
    
    R = 6371.0 # Promień Ziemi w kilometrach
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return max(distance, 1.0)
