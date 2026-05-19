import os
import sys

# Dodaj główny folder do ścieżki, żeby importy działały poprawnie
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
import models
from services.auth_service import get_password_hash

def init_db():
    print("Tworzenie tabel w bazie danych...")
    models.Base.metadata.create_all(bind=engine)

def seed_users():
    db = SessionLocal()
    try:
        users_to_add = [
            ("admin", "admin", "admin"),
            ("test1", "1111", "client"),
            ("test2", "2222", "client"),
            ("kurier1", "3333", "courier"),
        ]
        added = 0
        for uname, pwd, role in users_to_add:
            if not db.query(models.User).filter(models.User.username == uname).first():
                db_user = models.User(
                    username=uname,
                    password_hash=get_password_hash(pwd),
                    role=role
                )
                db.add(db_user)
                added += 1
        db.commit()
        print(f"Dodano {added} użytkowników testowych.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    seed_users()
    print("Zakończono inicjalizację bazy danych.")
