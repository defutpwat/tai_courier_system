"""
Schematy Pydantic (Modele Danych API).
Plik ten służy do ścisłej walidacji danych przychodzących z frontendu (np. formularze rejestracji) 
oraz formatowania danych wychodzących (np. decydowanie, co serwer zwraca jako szczegóły przesyłki).
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResetPassword(BaseModel):
    username: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class PackageBase(BaseModel):
    client_id: int
    sender_name: str
    receiver_name: str
    origin_address: str
    destination_address: str
    weight_kg: float

class PackageCreate(PackageBase):
    client_id: int

class Package(PackageBase):
    id: int
    courier_id: Optional[int] = None
    distance_km: float
    delivery_cost: float
    status: str
    is_paid: bool
    client_archived: bool
    courier_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True
