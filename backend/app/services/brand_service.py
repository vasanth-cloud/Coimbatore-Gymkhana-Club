from sqlalchemy.orm import Session

from app.repositories.brand_repository import BrandRepository


class BrandService:

    def __init__(self, db: Session):
        self.repository = BrandRepository(db)

    def create_brand(
        self,
        name: str,
        category: str,
    ):
        existing_brand = self.repository.get_by_name(name)

        if existing_brand:
            raise ValueError(
                "Brand with this name already exists"
            )

        return self.repository.create(
            name=name,
            category=category,
        )

    def get_all_brands(self):
        return self.repository.get_all()

    def get_brand(self, brand_id: int):
        brand = self.repository.get_by_id(brand_id)

        if not brand:
            raise ValueError("Brand not found")

        return brand

    def update_brand(
        self,
        brand_id: int,
        name: str | None = None,
        category: str | None = None,
        is_active: bool | None = None,
    ):
        brand = self.repository.get_by_id(brand_id)
        if not brand:
            raise ValueError("Brand not found")

        if name is not None and name != brand.name:
            existing = self.repository.get_by_name(name)
            if existing and existing.id != brand_id:
                raise ValueError("Another brand with this name already exists")

        return self.repository.update(
            brand=brand,
            name=name,
            category=category,
            is_active=is_active,
        )

    def delete_brand(self, brand_id: int):
        brand = self.repository.get_by_id(brand_id)
        if not brand:
            raise ValueError("Brand not found")

        return self.repository.delete(brand)