from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.entry import Entry


class CustomerRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)

        return customer

    def update(self, customer: Customer) -> Customer:
        self.db.commit()
        self.db.refresh(customer)

        return customer

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

    def get_by_customer_code(self, customer_code: str) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.customer_code == customer_code,
                Customer.is_deleted == False,
            )
            .first()
        )

    def get_all_active_codes(self) -> list[str]:
        rows = (
            self.db.query(Customer.customer_code)
            .filter(Customer.is_deleted == False)
            .all()
        )
        return [r[0] for r in rows if r[0]]

    def get_all(self) -> list[Customer]:
        return (
            self.db.query(Customer)
            .filter(Customer.is_deleted == False)
            .order_by(Customer.id.asc())
            .all()
        )

    def get_by_qr_token(self, qr_token: str) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(
                Customer.qr_token == qr_token,
                Customer.is_deleted == False,
            )
            .first()
        )

    def delete(self, customer: Customer) -> bool:
        # Delete associated entries first then hard-delete customer to free constraints
        self.db.query(Entry).filter(Entry.customer_id == customer.id).delete(synchronize_session=False)
        self.db.delete(customer)
        self.db.commit()
        return True

    def delete_all(self) -> int:
        self.db.query(Entry).delete(synchronize_session=False)
        count = self.db.query(Customer).delete(synchronize_session=False)
        self.db.commit()
        return count