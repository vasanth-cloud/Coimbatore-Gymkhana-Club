import secrets
import re
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
        address: str | None = None,
        custom_code: str | None = None,
    ) -> Customer:

        # Check duplicate phone number
        existing_customer = self.repository.get_by_phone(phone)
        if existing_customer:
            raise ValueError("Customer with this phone number already exists")

        # Use custom code if provided, otherwise auto-generate lowest unused serial number
        if custom_code and str(custom_code).strip():
            customer_code = str(custom_code).strip()
            existing_code = self.repository.get_by_customer_code(customer_code)
            if existing_code:
                raise ValueError(f"Member ID / Card No. '{customer_code}' is already assigned to an active member")
        else:
            customer_code = self._generate_serial_customer_code()

        # Generate secure QR token
        qr_token = secrets.token_urlsafe(32)

        customer = Customer(
            customer_code=customer_code,
            full_name=full_name,
            phone=phone,
            address=address,
            qr_token=qr_token,
            is_active=True,
        )

        return self.repository.create(customer)

    def update_customer(
        self,
        customer_id: int,
        full_name: str | None = None,
        phone: str | None = None,
        address: str | None = None,
        customer_code: str | None = None,
    ) -> Customer:

        customer = self.repository.get_by_id(customer_id)
        if not customer:
            raise ValueError("Customer not found")

        if phone and phone.strip() != customer.phone:
            existing_phone = self.repository.get_by_phone(phone.strip())
            if existing_phone and existing_phone.id != customer_id:
                raise ValueError("Customer with this phone number already exists")
            customer.phone = phone.strip()

        if customer_code and customer_code.strip() != customer.customer_code:
            existing_code = self.repository.get_by_customer_code(customer_code.strip())
            if existing_code and existing_code.id != customer_id:
                raise ValueError(f"Member ID / Card No. '{customer_code.strip()}' is already assigned to another member")
            customer.customer_code = customer_code.strip()

        if full_name and full_name.strip():
            customer.full_name = full_name.strip()

        if address is not None:
            customer.address = address.strip() if address.strip() else None

        return self.repository.update(customer)

    def bulk_create_customers(self, items: list[dict]) -> dict:
        created_count = 0
        skipped_count = 0
        errors = []

        for idx, item in enumerate(items, start=1):
            name = str(item.get("full_name") or item.get("name") or "").strip()
            phone = str(item.get("phone") or "").strip()
            
            # ONLY map explicit address fields (location, address, addr). Ignore ID NO / Gov ID!
            address_val = item.get("address") or item.get("location") or item.get("addr")
            address = str(address_val).strip() if address_val and str(address_val).strip() else None
            
            custom_code = str(item.get("customer_code") or item.get("card") or item.get("card_no") or item.get("card_number") or item.get("member_id") or "").strip()

            if not name or not phone:
                skipped_count += 1
                errors.append(f"Row {idx}: Name or phone is missing")
                continue

            try:
                self.create_customer(
                    full_name=name,
                    phone=phone,
                    address=address,
                    custom_code=custom_code if custom_code else None,
                )
                created_count += 1
            except Exception as e:
                skipped_count += 1
                errors.append(f"Row {idx} ({name}): {str(e)}")

        return {
            "created_count": created_count,
            "skipped_count": skipped_count,
            "errors": errors,
        }

    def delete_customer(self, customer_id: int) -> bool:
        customer = self.repository.get_by_id(customer_id)
        if not customer:
            raise ValueError("Customer not found")
        return self.repository.delete(customer)

    def delete_all_customers(self) -> int:
        return self.repository.delete_all()

    def _generate_serial_customer_code(self) -> str:
        active_codes = self.repository.get_all_active_codes()
        used_numbers = set()

        for code in active_codes:
            match = re.search(r'\d+', code)
            if match:
                try:
                    num = int(match.group())
                    if num > 0:
                        used_numbers.add(num)
                except ValueError:
                    pass

        candidate = 1
        while candidate in used_numbers:
            candidate += 1

        return str(candidate)