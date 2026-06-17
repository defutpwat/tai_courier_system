from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from collections import defaultdict
from datetime import datetime
import models
import schemas
from database import get_db
from services.auth_service import get_password_hash, require_admin

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

@router.get("/stats")
def get_admin_stats(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    all_packages = db.query(models.Package).all()

    monthly_revenue_data = defaultdict(float)
    global_total_revenue = 0.0

    for p in all_packages:
        if p.is_paid:
            global_total_revenue += p.delivery_cost
            if p.created_at:
                m_key = p.created_at.strftime("%Y-%m")
                monthly_revenue_data[m_key] += p.delivery_cost

    monthly_revenue_chart = [
        {"month": k, "revenue": round(v, 2)}
        for k, v in sorted(monthly_revenue_data.items())
    ]

    now = datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    target_from = from_date or today_str[:8] + "01"
    target_to   = to_date   or today_str

    filtered = [
        p for p in all_packages
        if p.created_at and target_from <= p.created_at.strftime("%Y-%m-%d") <= target_to
    ]

    range_revenue = round(sum(p.delivery_cost for p in filtered if p.is_paid), 2)
    delivered = sum(1 for p in filtered if p.status == "delivered")
    pending   = sum(1 for p in filtered if p.status == "pending")
    accepted  = sum(1 for p in filtered if p.status == "accepted")

    total_clients  = db.query(models.User).filter(models.User.role == "client").count()
    total_couriers = db.query(models.User).filter(models.User.role == "courier").count()

    return {
        "kpis": {
            "total_packages": len(filtered),
            "revenue": round(global_total_revenue, 2),
            "revenue_in_range": range_revenue,
            "clients": total_clients,
            "couriers": total_couriers,
        },
        "status_distribution": [
            {"name": "Oczekujące",  "value": pending},
            {"name": "W drodze",    "value": accepted},
            {"name": "Dostarczone", "value": delivered},
        ],
        "monthly_revenue": monthly_revenue_chart,
    }

@router.get("/couriers-overview")
def get_couriers_overview(db: Session = Depends(get_db)):
    couriers = db.query(models.User).filter(models.User.role == "courier").all()
    result = []
    for courier in couriers:
        packages = db.query(models.Package).filter(models.Package.courier_id == courier.id).all()
        delivered = [p for p in packages if p.status == "delivered"]
        result.append({
            "id": courier.id,
            "username": courier.username,
            "full_name": courier.full_name,
            "address": courier.address,
            "total_assigned": len(packages),
            "in_transit": sum(1 for p in packages if p.status == "accepted"),
            "delivered": len(delivered),
            "total_revenue": round(sum(p.delivery_cost for p in delivered), 2),
            "avg_distance": round(sum(p.distance_km for p in packages) / len(packages), 1) if packages else 0,
        })
    result.sort(key=lambda x: x["delivered"], reverse=True)
    return result

@router.get("/clients-overview")
def get_clients_overview(db: Session = Depends(get_db)):
    clients = db.query(models.User).filter(models.User.role == "client").all()
    result = []
    for client in clients:
        packages = db.query(models.Package).filter(models.Package.client_id == client.id).all()
        result.append({
            "id": client.id,
            "username": client.username,
            "full_name": client.full_name,
            "address": client.address,
            "packages_total": len(packages),
            "packages_paid": sum(1 for p in packages if p.is_paid),
            "packages_delivered": sum(1 for p in packages if p.status == "delivered"),
            "total_spent": round(sum(p.delivery_cost for p in packages if p.is_paid), 2),
            "packages": [
                {
                    "id": p.id,
                    "status": p.status,
                    "is_paid": p.is_paid,
                    "origin_address": p.origin_address,
                    "destination_address": p.destination_address,
                    "delivery_cost": p.delivery_cost,
                    "distance_km": p.distance_km,
                    "weight_kg": p.weight_kg,
                }
                for p in packages
            ],
        })
    return result

# ── Zarządzanie użytkownikami ──────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id).all()

@router.post("/users", response_model=schemas.UserResponse)
def admin_create_user(user: schemas.AdminUserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Nazwa użytkownika jest już zajęta")
    if user.role not in ["client", "courier", "admin"]:
        raise HTTPException(status_code=400, detail="Nieprawidłowa rola")
    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=user.role,
        full_name=user.full_name,
        address=user.address,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
def admin_update_user(user_id: int, data: schemas.AdminUserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    if db_user.username == "admin":
        raise HTTPException(status_code=403, detail="Konto głównego administratora nie może być edytowane")
    if data.full_name is not None:
        db_user.full_name = data.full_name
    if data.address is not None:
        db_user.address = data.address
    if data.role is not None:
        if data.role not in ["client", "courier", "admin"]:
            raise HTTPException(status_code=400, detail="Nieprawidłowa rola")
        db_user.role = data.role
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/users/{user_id}/password")
def admin_change_user_password(user_id: int, data: schemas.AdminUserPasswordChange, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    if db_user.username == "admin":
        raise HTTPException(status_code=403, detail="Hasła głównego administratora nie można zmienić przez panel zarządzania")
    if not data.new_password or len(data.new_password) < 1:
        raise HTTPException(status_code=400, detail="Hasło nie może być puste")
    db_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Hasło zostało zmienione"}

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    if db_user.username == "admin":
        raise HTTPException(status_code=403, detail="Konto głównego administratora nie może być usunięte")
    db.delete(db_user)
    db.commit()
    return {"message": "Użytkownik został usunięty"}

# ── Zarządzanie paczkami ───────────────────────────────────────────────────

@router.get("/packages", response_model=List[schemas.Package])
def admin_get_all_packages(db: Session = Depends(get_db)):
    return db.query(models.Package).order_by(models.Package.id.desc()).all()

@router.patch("/packages/{package_id}", response_model=schemas.Package)
def admin_update_package(package_id: int, data: schemas.AdminPackageUpdate, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Paczka nie znaleziona")
    if data.status is not None:
        if data.status not in ["pending", "accepted", "delivered"]:
            raise HTTPException(status_code=400, detail="Nieprawidłowy status")
        package.status = data.status
    if data.courier_id is not None:
        package.courier_id = data.courier_id if data.courier_id != 0 else None
    if data.is_paid is not None:
        package.is_paid = data.is_paid
    db.commit()
    db.refresh(package)
    return package

@router.delete("/packages/{package_id}")
def admin_delete_package(package_id: int, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Paczka nie znaleziona")
    db.delete(package)
    db.commit()
    return {"message": "Paczka została usunięta"}
