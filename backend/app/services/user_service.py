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

    def update_staff(
        self,
        user_id: int,
        full_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        password: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> User:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise ValueError("Staff account not found")

        if email and email.lower() != user.email.lower():
            existing = self.repository.get_by_email(email)
            if existing and existing.id != user_id:
                raise ValueError("Email already registered to another user")
            user.email = email

        if full_name:
            user.full_name = full_name
        if phone is not None:
            user.phone = phone
        if password and len(password.strip()) > 0:
            user.password_hash = hash_password(password)
        if role:
            user.role = UserRole(role.upper())
        if is_active is not None:
            user.is_active = is_active

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_staff(self, user_id: int) -> bool:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise ValueError("Staff account not found")
        user.is_deleted = True
        self.db.commit()
        return True