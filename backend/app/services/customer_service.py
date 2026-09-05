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
        father_guardian_name: str | None = None,
        date_of_birth: str | None = None,
        gender: str | None = None,
        occupation: str | None = None,
        institution_organization: str | None = None,
        aadhaar_card_no: str | None = None,
        email: str | None = None,
        blood_group: str | None = None,
        emergency_contact_no: str | None = None,
        purpose_of_membership: str | None = None,
        declaration_accepted: bool | None = True,
        photo_url: str | None = None,
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
            father_guardian_name=father_guardian_name,
            date_of_birth=date_of_birth,
            gender=gender,
            occupation=occupation,
            institution_organization=institution_organization,
            aadhaar_card_no=aadhaar_card_no,
            email=email,
            blood_group=blood_group,
            emergency_contact_no=emergency_contact_no,
            purpose_of_membership=purpose_of_membership,
            declaration_accepted=declaration_accepted if declaration_accepted is not None else True,
            qr_token=qr_token,
            photo_url=photo_url,
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
        father_guardian_name: str | None = None,
        date_of_birth: str | None = None,
        gender: str | None = None,
        occupation: str | None = None,
        institution_organization: str | None = None,
        aadhaar_card_no: str | None = None,
        email: str | None = None,
        blood_group: str | None = None,
        emergency_contact_no: str | None = None,
        purpose_of_membership: str | None = None,
        declaration_accepted: bool | None = None,
        photo_url: str | None = None,
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

        if father_guardian_name is not None:
            customer.father_guardian_name = father_guardian_name.strip() if father_guardian_name.strip() else None
        if date_of_birth is not None:
            customer.date_of_birth = date_of_birth.strip() if date_of_birth.strip() else None
        if gender is not None:
            customer.gender = gender.strip() if gender.strip() else None
        if occupation is not None:
            customer.occupation = occupation.strip() if occupation.strip() else None
        if institution_organization is not None:
            customer.institution_organization = institution_organization.strip() if institution_organization.strip() else None
        if aadhaar_card_no is not None:
            customer.aadhaar_card_no = aadhaar_card_no.strip() if aadhaar_card_no.strip() else None
        if email is not None:
            customer.email = email.strip() if email.strip() else None
        if blood_group is not None:
            customer.blood_group = blood_group.strip() if blood_group.strip() else None
        if emergency_contact_no is not None:
            customer.emergency_contact_no = emergency_contact_no.strip() if emergency_contact_no.strip() else None
        if purpose_of_membership is not None:
            customer.purpose_of_membership = purpose_of_membership.strip() if purpose_of_membership.strip() else None
        if declaration_accepted is not None:
            customer.declaration_accepted = declaration_accepted
        if photo_url is not None:
            customer.photo_url = photo_url.strip() if photo_url.strip() else None

        return self.repository.update(customer)

    def bulk_create_customers(self, items: list[dict]) -> dict:
        created_count = 0
        skipped_count = 0
        errors = []

        for idx, item in enumerate(items, start=1):
            name = str(item.get("full_name") or item.get("name") or "").strip()
            phone = str(item.get("phone") or item.get("mobile") or "").strip()
            
            # ONLY map explicit address fields (location, address, addr). Ignore ID NO / Gov ID!
            address_val = item.get("address") or item.get("location") or item.get("addr")
            address = str(address_val).strip() if address_val and str(address_val).strip() else None
            
            custom_code = str(item.get("customer_code") or item.get("card") or item.get("card_no") or item.get("card_number") or item.get("member_id") or "").strip()

            father = str(item.get("father_guardian_name") or item.get("father_name") or item.get("guardian") or "").strip() or None
            dob = str(item.get("date_of_birth") or item.get("dob") or "").strip() or None
            gender = str(item.get("gender") or "").strip() or None
            occupation = str(item.get("occupation") or "").strip() or None
            institution = str(item.get("institution_organization") or item.get("institution") or item.get("organization") or "").strip() or None
            aadhaar = str(item.get("aadhaar_card_no") or item.get("aadhaar") or "").strip() or None
            email = str(item.get("email") or "").strip() or None
            blood = str(item.get("blood_group") or item.get("blood") or "").strip() or None
            emergency = str(item.get("emergency_contact_no") or item.get("emergency_contact") or "").strip() or None
            purpose = str(item.get("purpose_of_membership") or item.get("purpose") or "").strip() or None
            photo_url = str(item.get("photo_url") or item.get("photo") or "").strip() or None

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
                    father_guardian_name=father,
                    date_of_birth=dob,
                    gender=gender,
                    occupation=occupation,
                    institution_organization=institution,
                    aadhaar_card_no=aadhaar,
                    email=email,
                    blood_group=blood,
                    emergency_contact_no=emergency,
                    purpose_of_membership=purpose,
                    photo_url=photo_url,
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