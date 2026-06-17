import httpx
from typing import Optional
import config

WEATHER_CONDITIONS = {
    "CLEAR": (1.00, "Bezchmurnie"),
    "MOSTLY_CLEAR": (1.00, "Przeważnie bezchmurnie"),
    "PARTLY_CLOUDY": (1.00, "Częściowe zachmurzenie"),
    "MOSTLY_CLOUDY": (1.00, "Duże zachmurzenie"),
    "CLOUDY": (1.00, "Zachmurzenie"),
    "OVERCAST": (1.00, "Pochmurno"),
    "DRIZZLE": (1.05, "Mżawka +5%"),
    "MIST": (1.05, "Zamglenie +5%"),
    "HAZE": (1.05, "Opary +5%"),
    "LIGHT_RAIN": (1.08, "Lekki deszcz +8%"),
    "SHOWERS": (1.10, "Przelotne opady +10%"),
    "FOG": (1.10, "Mgła +10%"),
    "RAIN": (1.12, "Deszcz +12%"),
    "THUNDERSTORM": (1.18, "Burza +18%"),
    "HEAVY_RAIN": (1.15, "Ulewny deszcz +15%"),
    "LIGHT_SNOW": (1.15, "Lekki śnieg +15%"),
    "FLURRIES": (1.12, "Zamiecie śnieżne +12%"),
    "SNOW": (1.20, "Śnieg +20%"),
    "HEAVY_SNOW": (1.25, "Intensywne opady śniegu +25%"),
    "BLIZZARD": (1.30, "Zamieć śnieżna +30%"),
}

async def geocode_address(address: str) -> Optional[dict]:
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": config.GOOGLE_MAPS_API_KEY, "language": "pl"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        if data.get("status") == "OK" and data["results"]:
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"]}
    except Exception as e:
        print(f"Geocode error: {e}")
    return None

async def get_weather_factor(lat: float, lng: float) -> tuple:
    url = "https://weather.googleapis.com/v1/currentConditions:lookup"
    params = {
        "key": config.GOOGLE_MAPS_API_KEY,
        "location.latitude": lat,
        "location.longitude": lng,
        "unitsSystem": "METRIC",
        "languageCode": "pl",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        condition = (
            data.get("currentConditions", {})
                .get("weatherCondition", {})
                .get("type", "CLEAR")
        )
        return WEATHER_CONDITIONS.get(condition, (1.00, "Brak danych pogodowych"))
    except Exception as e:
        print(f"Weather API error: {e}")
        return (1.00, "Brak danych pogodowych")

async def get_route_info(origin: str, destination: str) -> Optional[dict]:
    """
    Routes API: zwraca dystans, czas i szacowany typ drogi (przez średnią prędkość).
    Dołącza dane pogodowe z miejsca nadania.
    """
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    headers = {
        "X-Goog-Api-Key": config.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.travelAdvisory",
        "Content-Type": "application/json",
    }
    body = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            data = resp.json()

        routes = data.get("routes", [])
        if not routes:
            return None

        route = routes[0]
        distance_m = route.get("distanceMeters", 0)
        duration_str = route.get("duration", "1s")
        duration_s = float(duration_str.rstrip("s")) or 1.0

        distance_km = distance_m / 1000.0
        avg_speed_kmh = distance_km / (duration_s / 3600.0)

        # Pogoda w miejscu nadania
        coords = await geocode_address(origin)
        if coords:
            weather_factor, weather_desc = await get_weather_factor(coords["lat"], coords["lng"])
        else:
            weather_factor, weather_desc = 1.00, "Brak danych pogodowych"

        return {
            "distance_km": distance_km,
            "avg_speed_kmh": avg_speed_kmh,
            "weather_factor": weather_factor,
            "weather_desc": weather_desc,
        }
    except Exception as e:
        print(f"Routes API error: {e}")
        return None

# Kompatybilność wsteczna — używane przez stare callery
async def get_driving_distance(origin: str, destination: str) -> Optional[float]:
    info = await get_route_info(origin, destination)
    return info["distance_km"] if info else None
