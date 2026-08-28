from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, customer_id: int) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.id == customer_id,
                Customer.is_deleted == False,
            )
            .first()
        )

    def get_by_phone(self, phone: str) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.phone == phone,
                Customer.is_deleted == False,
            )
            .first()
        )

    def get_by_customer_code(
        self,
        customer_code: str,
    ) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.customer_code == customer_code,
                Customer.is_deleted == False,
            )
            .first()
        )

    def get_by_qr_token(
        self,
        qr_token: str,
    ) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.qr_token == qr_token,
                Customer.is_deleted == False,
            )
            .first()
        )

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)

        return customer