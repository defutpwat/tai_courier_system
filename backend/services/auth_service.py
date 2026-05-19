from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Weryfikuje czy podane hasło w postaci jawnej zgadza się z hashem w bazie.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Zwraca bezpieczny hash bcrypt dla podanego hasła.
    """
    return pwd_context.hash(password)
