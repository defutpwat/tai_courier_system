import httpx
import base64
from config import PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE

async def _get_access_token() -> str:
    auth_string = f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}"
    b64_auth = base64.b64encode(auth_string.encode()).decode()
    
    url = f"{PAYPAL_API_BASE}/v1/oauth2/token"
    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type": "client_credentials"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()["access_token"]

async def create_order(amount: float) -> str:
    """
    Tworzy zamówienie w systemie PayPal i zwraca jego ID.
    Kwota jest przekazywana w PLN.
    """
    token = await _get_access_token()
    url = f"{PAYPAL_API_BASE}/v2/checkout/orders"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": "PLN",
                    "value": f"{amount:.2f}"
                }
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["id"]

async def capture_order(order_id: str) -> dict:
    """
    Weryfikuje i ostatecznie pobiera środki po autoryzacji przez klienta.
    """
    token = await _get_access_token()
    url = f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        response.raise_for_status()
        return response.json()
