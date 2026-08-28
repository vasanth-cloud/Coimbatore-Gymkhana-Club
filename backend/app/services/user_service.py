from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository


class UserService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def create_staff(
        self,
        full_name: str,
        email: str,
        password: str,
        phone: str | None = None,
    ) -> User:

        existing_user = self.repository.get_by_email(email)

        if existing_user:
            raise ValueError("Email already registered")

        staff = User(
            full_name=full_name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            role=UserRole.STAFF,
            is_active=True,
        )

        return self.repository.create(staff)