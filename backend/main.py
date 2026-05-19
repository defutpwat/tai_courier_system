"""
Główny plik serwera FastAPI (Backend) po refaktoryzacji.
Służy jako punkt wejścia konfigurujący aplikację i routery.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, packages, admin

app = FastAPI(title="Courier Delivery System")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rejestracja wydzielonych routerów
app.include_router(auth.router)
app.include_router(packages.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Courier API is running"}
