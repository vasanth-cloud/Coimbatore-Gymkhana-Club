from sqlalchemy.orm import Session

from app.models.user import User, UserRole

class UserRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return (
            self.db.query(User)
            .filter(
                User.email == email,
                User.is_deleted == False,
            )
            .first()
        )
        
    def get_all_staff(self):
        return (
        self.db.query(User)
        .filter(
            User.role == UserRole.STAFF,
            User.is_deleted == False,
        )
        .order_by(User.created_at.desc())
        .all()
    )

    def get_by_id(self, user_id: int) -> User | None:
        return (
            self.db.query(User)
            .filter(
                User.id == user_id,
                User.is_deleted == False,
            )
            .first()
        )

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user