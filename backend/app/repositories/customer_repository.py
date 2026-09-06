import re
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

    def lookup_customer(self, query_str: str) -> Customer | None:
        if not query_str:
            return None

        # Clean non-printable / control chars (e.g. \r, \n, \t, STX, ETX) and leading/trailing whitespace
        raw_q = str(query_str).strip()
        q = "".join(ch for ch in raw_q if ord(ch) >= 32 and ord(ch) != 127).strip()
        if not q:
            return None

        # Base clean strings
        clean_q = q.replace("#", "").strip()

        # Build ordered list of candidate strings
        candidates = [q]
        if clean_q and clean_q not in candidates:
            candidates.append(clean_q)

        # Extract path/query parameters if q is a URL (e.g., https://cgcltd.in/entry-scanner?token=XYZ)
        if "/" in q or "?" in q or "=" in q:
            parts = re.split(r'[/?&=#]', q)
            for part in parts:
                p = part.strip()
                if p and len(p) >= 1 and p not in candidates:
                    candidates.append(p)

        # Handle Caps Lock key inverted case / shift key swap from hardware USB gun scanners
        inverted = q.swapcase()
        if inverted not in candidates:
            candidates.append(inverted)
        inverted_clean = clean_q.swapcase()
        if inverted_clean and inverted_clean not in candidates:
            candidates.append(inverted_clean)

        # Stage 1: Exact & case-insensitive matching across candidates
        for cand in candidates:
            if not cand:
                continue

            # A. Exact qr_token
            cust = self.db.query(Customer).filter(Customer.qr_token == cand, Customer.is_deleted == False).first()
            if cust:
                return cust

            # B. Case-insensitive qr_token
            cust = self.db.query(Customer).filter(Customer.qr_token.ilike(cand), Customer.is_deleted == False).first()
            if cust:
                return cust

            # C. Match customer_code (exact, clean, or with #)
            cand_clean = cand.replace("#", "").strip()
            cust = self.db.query(Customer).filter(
                (Customer.customer_code == cand) | 
                (Customer.customer_code == cand_clean) | 
                (Customer.customer_code == f"#{cand_clean}") |
                (Customer.customer_code.ilike(cand_clean)),
                Customer.is_deleted == False
            ).first()
            if cust:
                return cust

            # D. Match phone
            cust = self.db.query(Customer).filter(
                (Customer.phone == cand) | (Customer.phone == cand_clean),
                Customer.is_deleted == False
            ).first()
            if cust:
                return cust

        # Stage 2: Partial substring match in database
        for cand in candidates:
            if not cand or len(cand) < 2:
                continue
            cust = self.db.query(Customer).filter(
                (Customer.qr_token.ilike(f"%{cand}%")) | (Customer.customer_code.ilike(f"%{cand}%")),
                Customer.is_deleted == False
            ).first()
            if cust:
                return cust

        # Stage 3: Reverse lookup (check if any active customer's token/code/phone is embedded inside q)
        all_customers = self.db.query(Customer).filter(Customer.is_deleted == False).all()
        q_lower = q.lower()
        for cust in all_customers:
            if cust.qr_token and cust.qr_token.lower() in q_lower:
                return cust
            if cust.customer_code and (cust.customer_code.lower() in q_lower or f"#{cust.customer_code.lower()}" in q_lower):
                return cust
            if cust.phone and cust.phone in q_lower:
                return cust

        return None

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