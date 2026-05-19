from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from services.auth_service import get_password_hash, verify_password

router = APIRouter(tags=["Auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    role = user.role if user.role in ["client", "courier"] else "client"
    
    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.UserResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return db_user

@router.post("/reset-password")
def reset_password(data: schemas.UserResetPassword, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == data.username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
