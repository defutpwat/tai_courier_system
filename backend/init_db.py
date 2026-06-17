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
            ("admin",   "admin", "admin",   "Administrator Systemu",  None),
            ("test1",   "1111",  "client",  "Jan Kowalski",           "Warszawa, ul. Marszałkowska 10, 00-590"),
            ("test2",   "2222",  "client",  "Anna Nowak",             "Kraków, ul. Floriańska 5, 31-019"),
            ("kurier1", "3333",  "courier", "Piotr Wiśniewski",       "Gdańsk, ul. Długa 22, 80-827"),
        ]
        added = 0
        for uname, pwd, role, full_name, address in users_to_add:
            if not db.query(models.User).filter(models.User.username == uname).first():
                db_user = models.User(
                    username=uname,
                    password_hash=get_password_hash(pwd),
                    role=role,
                    full_name=full_name,
                    address=address,
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
