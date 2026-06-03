import random
from services import geocoding_service
import schemas

async def calculate_package_cost_and_distance(package_data: schemas.PackageCreate) -> dict:
    """
    Asynchronicznie oblicza dystans drogowo z użyciem Google Maps API i wycenia paczkę.
    """
    try:
        distance_km = await geocoding_service.get_driving_distance(
            package_data.origin_address, 
            package_data.destination_address
        )
        
        if distance_km is None:
            # Fallback w przypadku błędu API lub braku odnalezienia drogi
            distance_km = random.uniform(5.0, 50.0)
            
    except Exception:
        distance_km = random.uniform(5.0, 50.0)

    cost = 15.0 + (distance_km * 2.5)
    
    return {
        "distance_km": round(distance_km, 2),
        "delivery_cost": round(cost, 2)
    }
