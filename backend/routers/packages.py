from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from database import get_db
from services import package_service, qr_service, paypal_service

router = APIRouter(prefix="/packages", tags=["Packages"])

@router.post("/", response_model=schemas.Package)
async def create_package(package: schemas.PackageCreate, db: Session = Depends(get_db)):
    calc_data = await package_service.calculate_package_cost_and_distance(package)

    db_package = models.Package(
        **package.model_dump(),
        distance_km=calc_data["distance_km"],
        delivery_cost=calc_data["delivery_cost"],
        status="pending",
        is_paid=False,
        courier_id=None,
        client_archived=False,
        courier_archived=False
    )
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    return db_package

@router.get("/", response_model=List[schemas.Package])
def read_packages(
    client_id: Optional[int] = None,
    courier_id: Optional[int] = None,
    client_archived: Optional[bool] = None,
    courier_archived: Optional[bool] = None,
    unassigned: Optional[bool] = False,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(models.Package)
    if client_id is not None:
        query = query.filter(models.Package.client_id == client_id)
        if client_archived is not None:
            query = query.filter(models.Package.client_archived == client_archived)
    if courier_id is not None:
        query = query.filter(models.Package.courier_id == courier_id)
        if courier_archived is not None:
            query = query.filter(models.Package.courier_archived == courier_archived)
    if unassigned:
        query = query.filter(models.Package.courier_id == None, models.Package.status == "pending")

    return query.offset(skip).limit(limit).all()

@router.get("/{package_id}", response_model=schemas.Package)
def read_package(package_id: int, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    return package

@router.patch("/{package_id}/assign", response_model=schemas.Package)
def assign_package(package_id: int, courier_id: int, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    if package.courier_id is not None:
        raise HTTPException(status_code=400, detail="Package already assigned")
    if not package.is_paid:
        raise HTTPException(status_code=400, detail="Package must be paid before assignment")
    
    package.courier_id = courier_id
    package.status = "accepted"
    db.commit()
    db.refresh(package)
    return package

@router.patch("/{package_id}/archive", response_model=schemas.Package)
def archive_package(package_id: int, role: str, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    if package.status != "delivered":
        raise HTTPException(status_code=400, detail="Package must be delivered to be archived")
    
    if role == "client":
        package.client_archived = True
    elif role == "courier":
        package.courier_archived = True
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    db.commit()
    db.refresh(package)
    return package

@router.patch("/{package_id}/status", response_model=schemas.Package)
def update_status(package_id: int, status: str, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    package.status = status
    db.commit()
    db.refresh(package)
    return package

from pydantic import BaseModel

class PayPalOrderCapture(BaseModel):
    order_id: str

@router.post("/{package_id}/paypal/create-order")
async def create_paypal_order(package_id: int, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    if package.is_paid:
        raise HTTPException(status_code=400, detail="Package is already paid")
        
    try:
        order_id = await paypal_service.create_order(package.delivery_cost)
        return {"orderID": order_id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error: {repr(e)}")

@router.post("/{package_id}/paypal/capture-order", response_model=schemas.Package)
async def capture_paypal_order(package_id: int, data: PayPalOrderCapture, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    try:
        capture_response = await paypal_service.capture_order(data.order_id)
        if capture_response["status"] == "COMPLETED":
            package.is_paid = True
            db.commit()
            db.refresh(package)
            return package
        else:
            raise HTTPException(status_code=400, detail="Payment not completed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/{package_id}/qr")
def generate_qr(package_id: int, db: Session = Depends(get_db)):
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    content = qr_service.generate_tracking_qr(
        package_id=package.id,
        receiver_name=package.receiver_name,
        origin=package.origin_address,
        dest=package.destination_address,
        status=package.status
    )
    
    return Response(content=content, media_type="image/png")
