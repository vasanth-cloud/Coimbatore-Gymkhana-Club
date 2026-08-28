from getpass import getpass

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def create_admin():
    db = SessionLocal()

    try:
        existing_admin = (
            db.query(User)
            .filter(
                User.role == UserRole.ADMIN,
                User.is_deleted == False,
            )
            .first()
        )

        if existing_admin:
            print("Admin already exists.")
            return

        print("=== Create Initial Admin ===")

        full_name = input("Full name: ").strip()
        email = input("Email: ").strip().lower()
        phone = input("Phone: ").strip() or None
        password = getpass("Password: ")
        confirm_password = getpass("Confirm password: ")

        if password != confirm_password:
            print("Passwords do not match.")
            return

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            print("A user with this email already exists.")
            return

        admin = User(
            full_name=full_name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print()
        print("Admin created successfully!")
        print(f"ID: {admin.id}")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role.value}")

    except Exception as e:
        db.rollback()
        print(f"Error creating admin: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()