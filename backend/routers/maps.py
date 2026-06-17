import httpx
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from urllib.parse import quote
from typing import List
from config import GOOGLE_MAPS_API_KEY
from services.auth_service import get_current_user

router = APIRouter(prefix="/maps", tags=["Maps"], dependencies=[Depends(get_current_user)])


# ── Embed trasy (istniejący) ───────────────────────────────────────────────

@router.get("/directions")
def get_directions_embed(origin: str, destination: str):
    url = (
        f"https://www.google.com/maps/embed/v1/directions"
        f"?key={GOOGLE_MAPS_API_KEY}"
        f"&origin={quote(origin)}"
        f"&destination={quote(destination)}"
        f"&mode=driving&language=pl"
    )
    return {"url": url}


# ── Walidacja adresu ───────────────────────────────────────────────────────

class ValidateAddressRequest(BaseModel):
    address: str

@router.post("/validate-address")
async def validate_address(data: ValidateAddressRequest):
    url = f"https://addressvalidation.googleapis.com/v1:validateAddress?key={GOOGLE_MAPS_API_KEY}"
    body = {
        "address": {
            "addressLines": [data.address],
            "regionCode": "PL",
        }
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=body)
            result = resp.json()

        verdict = result.get("result", {}).get("verdict", {})
        address = result.get("result", {}).get("address", {})
        granularity = verdict.get("validationGranularity", "OTHER")
        is_valid = granularity in ("PREMISE", "SUB_PREMISE", "ROUTE")
        formatted = address.get("formattedAddress", data.address)
        return {"valid": is_valid, "formatted": formatted, "granularity": granularity}
    except Exception as e:
        print(f"Address Validation error: {e}")
        return {"valid": True, "formatted": data.address, "granularity": "UNKNOWN"}


# ── Autocomplete adresów ───────────────────────────────────────────────────

_PL_CODE_RE = re.compile(r'^(\d{2}-\d{3})\s+(.+)$')

def _format_suggestion(prediction: dict) -> str:
    """Reformatuje sugestię do kolejności: Miasto, Ulica Numer, Kod pocztowy."""
    sf = prediction.get("structured_formatting", {})
    main = sf.get("main_text", "").strip()
    secondary = sf.get("secondary_text", "").strip()
    if not main or not secondary:
        return prediction.get("description", "")

    # Usuń "Polska" / "Poland" z secondary
    sec_parts = [s.strip() for s in secondary.split(",")
                 if s.strip() not in ("Polska", "Poland", "")]

    city_parts, code_parts = [], []
    for part in sec_parts:
        m = _PL_CODE_RE.match(part)
        if m:
            code_parts.append(m.group(1))   # np. "00-590"
            city_parts.append(m.group(2))   # np. "Warszawa"
        else:
            city_parts.append(part)

    # Kolejność: Miasto, Ulica Numer, Kod pocztowy
    result = city_parts + [main] + code_parts
    return ", ".join(result)


@router.get("/autocomplete")
async def autocomplete(input: str):
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {
        "input": input,
        "key": GOOGLE_MAPS_API_KEY,
        "language": "pl",
        "components": "country:pl",
        "types": "address",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        predictions = data.get("predictions", [])
        return {"suggestions": [_format_suggestion(p) for p in predictions[:6]]}
    except Exception as e:
        print(f"Autocomplete error: {e}")
        return {"suggestions": []}


# ── Optymalizacja trasy kuriera ───────────────────────────────────────────

class PackageStop(BaseModel):
    id: int
    destination_address: str
    receiver_name: str

class OptimizeRequest(BaseModel):
    start_address: str
    packages: List[PackageStop]

@router.post("/optimize-route")
async def optimize_route(data: OptimizeRequest):
    packages = data.packages
    if not packages:
        return {"optimized_packages": [], "map_url": None, "total_distance_km": 0}

    if len(packages) == 1:
        pkg = packages[0]
        map_url = (
            f"https://www.google.com/maps/embed/v1/directions"
            f"?key={GOOGLE_MAPS_API_KEY}"
            f"&origin={quote(data.start_address)}"
            f"&destination={quote(pkg.destination_address)}"
            f"&mode=driving&language=pl"
        )
        return {"optimized_packages": [pkg.model_dump()], "map_url": map_url, "total_distance_km": None}

    # Directions API z waypoints=optimize:true
    origin = data.start_address
    destination = packages[-1].destination_address
    mid_stops = [p.destination_address for p in packages[:-1]]
    waypoints_param = "optimize:true|" + "|".join(mid_stops)

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "waypoints": waypoints_param,
        "key": GOOGLE_MAPS_API_KEY,
        "language": "pl",
        "mode": "driving",
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, params=params)
            result = resp.json()

        route = (result.get("routes") or [{}])[0]
        waypoint_order = route.get("waypoint_order", list(range(len(mid_stops))))
        legs = route.get("legs", [])
        total_distance_km = round(sum(leg.get("distance", {}).get("value", 0) for leg in legs) / 1000, 1)

        # Przebuduj kolejność paczek wg sugestii API
        optimized = [packages[i].model_dump() for i in waypoint_order] + [packages[-1].model_dump()]

        # Embed URL z wieloma przystankami
        all_stops = [p["destination_address"] for p in optimized]
        waypoints_embed = "|".join(all_stops[:-1]) if len(all_stops) > 1 else ""
        map_url = (
            f"https://www.google.com/maps/embed/v1/directions"
            f"?key={GOOGLE_MAPS_API_KEY}"
            f"&origin={quote(origin)}"
            f"&destination={quote(all_stops[-1])}"
            + (f"&waypoints={quote(waypoints_embed)}" if waypoints_embed else "")
            + f"&mode=driving&language=pl"
        )

        return {"optimized_packages": optimized, "map_url": map_url, "total_distance_km": total_distance_km}
    except Exception as e:
        print(f"Optimize route error: {e}")
        return {"optimized_packages": [p.model_dump() for p in packages], "map_url": None, "total_distance_km": None}
