import os
from dotenv import load_dotenv

load_dotenv()

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "tai-courier-dev-secret-change-in-production")

