from datetime import datetime

from sqlalchemy.orm import Session

from app.models.entry import Entry


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