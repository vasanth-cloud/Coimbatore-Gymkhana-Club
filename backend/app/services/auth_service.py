from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository


class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.user_repository = UserRepository(db)

    def register(
        self,
        full_name: str,
        email: str,
        password: str,
        phone: str | None = None,
        role: UserRole = UserRole.STAFF,
    ) -> User:

        existing_user = self.user_repository.get_by_email(email)

        if existing_user:
            raise ValueError("Email already registered")

        user = User(
            full_name=full_name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )

        return self.user_repository.create(user)

    def login(
        self,
        email: str,
        password: str,
    ) -> str:

        user = self.user_repository.get_by_email(email)

        if not user:
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("User account is inactive")

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise ValueError("Invalid email or password")

        token = create_access_token({
            "sub": str(user.id),
            "role": user.role.value,
        })

        return token