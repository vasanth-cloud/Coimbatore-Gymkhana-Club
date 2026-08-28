import secrets

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository


class CustomerService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = CustomerRepository(db)

    def create_customer(
        self,
        full_name: str,
        phone: str,
    ) -> Customer:

        # Check duplicate phone number
        existing_customer = self.repository.get_by_phone(phone)

        if existing_customer:
            raise ValueError(
                "Customer with this phone number already exists"
            )

        # Generate customer code
        customer_code = self._generate_customer_code()

        # Generate secure QR token
        qr_token = secrets.token_urlsafe(32)

        customer = Customer(
            customer_code=customer_code,
            full_name=full_name,
            phone=phone,
            qr_token=qr_token,
            is_active=True,
        )

        return self.repository.create(customer)

    def _generate_customer_code(self) -> str:
        while True:
            code = (
                "CUS-"
                + secrets.token_hex(4).upper()
            )

            existing = (
                self.repository.get_by_customer_code(code)
            )

            if not existing:
                return code