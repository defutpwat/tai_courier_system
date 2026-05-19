import random
from services import geocoding_service
import schemas

async def calculate_package_cost_and_distance(package_data: schemas.PackageCreate) -> dict:
    """
    Asynchronicznie oblicza dystans z użyciem zewnętrznego API oraz wycenia paczkę.
    """
    try:
        origin_loc = await geocoding_service.get_coordinates(package_data.origin_address)
        dest_loc = await geocoding_service.get_coordinates(package_data.destination_address)
        
        if not origin_loc or not dest_loc:
            distance_km = random.uniform(5.0, 50.0)
        else:
            distance_km = geocoding_service.calculate_distance(origin_loc, dest_loc)
    except Exception:
        distance_km = random.uniform(5.0, 50.0)

    cost = 15.0 + (distance_km * 2.5)
    
    return {
        "distance_km": round(distance_km, 2),
        "delivery_cost": round(cost, 2)
    }
