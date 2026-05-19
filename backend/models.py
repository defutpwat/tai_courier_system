"""
Definicje modeli bazy danych (Tabele).
Plik zawiera struktury danych dla Użytkowników (User) i Przesyłek (Package), 
które SQLAlchemy automatycznie mapuje na tabele w bazie SQLite.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String) # client or courier

class Package(Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, index=True)
    courier_id = Column(Integer, nullable=True, index=True)
    sender_name = Column(String, index=True)
    receiver_name = Column(String, index=True)
    origin_address = Column(String)
    destination_address = Column(String)
    weight_kg = Column(Float)
    distance_km = Column(Float)
    delivery_cost = Column(Float)
    status = Column(String, default="pending") # pending, accepted, delivered
    is_paid = Column(Boolean, default=False)
    client_archived = Column(Boolean, default=False)
    courier_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
