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
    full_name: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResetPassword(BaseModel):
    username: str
    new_password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    password: str
    role: str
    full_name: Optional[str] = None
    address: Optional[str] = None

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None

class AdminUserPasswordChange(BaseModel):
    new_password: str

class AdminPackageUpdate(BaseModel):
    status: Optional[str] = None
    courier_id: Optional[int] = None
    is_paid: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PackageEstimate(BaseModel):
    distance_km: float
    delivery_cost: float
    road_type: str
    road_factor: float
    weight_label: str
    weight_factor: float
    weather_desc: str
    weather_factor: float

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
