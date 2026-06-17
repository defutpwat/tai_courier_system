from services import geocoding_service
import schemas

# Progi wagowe: (limit_kg, mnożnik, etykieta)
WEIGHT_TIERS = [
    (1.0,        0.85, "do 1 kg"),
    (5.0,        1.00, "1–5 kg"),
    (15.0,       1.25, "5–15 kg"),
    (float("inf"), 1.50, "powyżej 15 kg"),
]

def _weight_tier(weight_kg: float) -> tuple:
    for limit, factor, label in WEIGHT_TIERS:
        if weight_kg <= limit:
            return factor, label
    return 1.50, "powyżej 15 kg"

def _road_tier(avg_speed_kmh: float) -> tuple:
    if avg_speed_kmh > 90:
        return 0.85, "Autostrada"
    elif avg_speed_kmh >= 50:
        return 1.00, "Droga krajowa"
    else:
        return 1.15, "Drogi lokalne / miejskie"

async def estimate_cost(origin: str, destination: str, weight_kg: float) -> dict:
    route = await geocoding_service.get_route_info(origin, destination)
    if route is None:
        raise ValueError(
            f"Nie udało się wyliczyć trasy: '{origin}' → '{destination}'. "
            "Sprawdź poprawność adresów i spróbuj ponownie."
        )

    distance_km    = route["distance_km"]
    road_factor, road_type     = _road_tier(route["avg_speed_kmh"])
    weight_factor, weight_label = _weight_tier(weight_kg)
    weather_factor = route["weather_factor"]
    weather_desc   = route["weather_desc"]

    base   = 10.0
    per_km = 2.2
    cost = (base + distance_km * per_km) * road_factor * weight_factor * weather_factor

    return {
        "distance_km":    round(distance_km, 2),
        "delivery_cost":  round(cost, 2),
        "road_type":      road_type,
        "road_factor":    road_factor,
        "weight_label":   weight_label,
        "weight_factor":  weight_factor,
        "weather_desc":   weather_desc,
        "weather_factor": weather_factor,
    }

async def calculate_package_cost_and_distance(package_data: schemas.PackageCreate) -> dict:
    return await estimate_cost(
        package_data.origin_address,
        package_data.destination_address,
        package_data.weight_kg,
    )
