from datetime import datetime

from sqlalchemy.orm import Session

from app.models.entry import Entry
from app.models.customer import Customer


class EntryRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, entry: Entry) -> Entry:
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        return entry

    def get_entries_for_date(
        self,
        start: datetime,
        end: datetime,
    ):
        return (
            self.db.query(Entry)
            .filter(
                Entry.entry_time >= start,
                Entry.entry_time < end,
                Entry.is_deleted == False,
            )
            .all()
        )

    def get_customer_entry_for_date(
        self,
        customer_id: int,
        start: datetime,
        end: datetime,
    ) -> Entry | None:

        return (
            self.db.query(Entry)
            .filter(
                Entry.customer_id == customer_id,
                Entry.entry_time >= start,
                Entry.entry_time < end,
                Entry.is_deleted == False,
            )
            .first()
        )

    def get_recent_entries_detailed(self, limit: int = 100):
        return (
            self.db.query(
                Entry.id.label("id"),
                Customer.customer_code.label("customer_code"),
                Customer.full_name.label("customer_name"),
                Customer.phone.label("phone"),
                Customer.qr_token.label("qr_token"),
                Entry.additional_guests.label("additional_guests"),
                Entry.total_people.label("total_people"),
                Entry.entry_time.label("entry_time"),
            )
            .join(Customer, Customer.id == Entry.customer_id)
            .filter(Entry.is_deleted == False)
            .order_by(Entry.entry_time.desc())
            .limit(limit)
            .all()
        )