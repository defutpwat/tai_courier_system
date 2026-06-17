from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from services.auth_service import (
    get_password_hash, verify_password,
    create_access_token, get_current_user,
)

router = APIRouter(tags=["Auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Nazwa użytkownika jest już zajęta")

    role = user.role if user.role in ["client", "courier"] else "client"

    db_user = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=role,
        full_name=user.full_name,
        address=user.address,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"access_token": create_access_token(db_user), "token_type": "bearer", "user": db_user}


@router.post("/login", response_model=schemas.TokenResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Nieprawidłowa nazwa użytkownika lub hasło")
    return {"access_token": create_access_token(db_user), "token_type": "bearer", "user": db_user}


@router.post("/reset-password")
def reset_password(data: schemas.UserResetPassword, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == data.username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono użytkownika o podanej nazwie")
    db_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Hasło zostało zaktualizowane pomyślnie"}


@router.patch("/users/{user_id}/profile", response_model=schemas.UserResponse)
def update_profile(
    user_id: int,
    data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień do edycji tego profilu")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    if data.full_name is not None:
        db_user.full_name = data.full_name
    if data.address is not None:
        db_user.address = data.address
    db.commit()
    db.refresh(db_user)
    return db_user
