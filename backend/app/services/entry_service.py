from datetime import datetime, time, timezone

from sqlalchemy.orm import Session

from app.models.entry import Entry
from app.repositories.customer_repository import CustomerRepository
from app.repositories.entry_repository import EntryRepository


class EntryService:

    def __init__(self, db: Session):
        self.db = db

        self.customer_repository = CustomerRepository(db)
        self.entry_repository = EntryRepository(db)

    def record_entry(
        self,
        qr_token: str,
        additional_guests: int,
        scanned_by: int,
    ) -> Entry:

        customer = (
            self.customer_repository
            .lookup_customer(qr_token)
        )

        if not customer:
            raise ValueError(
                "Invalid QR code or Member Card #"
            )

        if not customer.is_active:
            raise ValueError(
                "Customer card is inactive"
            )

        # Current UTC date
        now = datetime.now(timezone.utc)

        start_of_day = datetime.combine(
            now.date(),
            time.min,
            tzinfo=timezone.utc,
        )

        start_of_next_day = datetime.combine(
            now.date(),
            time.max,
            tzinfo=timezone.utc,
        )

        # Check whether customer already entered today
        existing_entry = (
            self.entry_repository
            .get_customer_entry_for_date(
                customer_id=customer.id,
                start=start_of_day,
                end=start_of_next_day,
            )
        )

        if existing_entry:
            raise ValueError(
                "Customer already scanned today"
            )

        total_people = 1 + additional_guests

        entry = Entry(
            customer_id=customer.id,
            scanned_by=scanned_by,
            entry_time=now,
            entry_date=now.date(),
            additional_guests=additional_guests,
            total_people=total_people,
        )

        return self.entry_repository.create(entry)