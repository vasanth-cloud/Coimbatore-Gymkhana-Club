from sqlalchemy.orm import Session

from app.models.brand import Brand


class BrandRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_name(self, name: str):
        return (
            self.db.query(Brand)
            .filter(
                Brand.name == name,
                Brand.is_deleted == False,
            )
            .first()
        )

    def get_by_id(self, brand_id: int):
        return (
            self.db.query(Brand)
            .filter(
                Brand.id == brand_id,
                Brand.is_deleted == False,
            )
            .first()
        )

    def get_all(self):
        return (
            self.db.query(Brand)
            .filter(
                Brand.is_deleted == False,
            )
            .order_by(Brand.name.asc())
            .all()
        )

    def create(
        self,
        name: str,
        category: str,
    ):
        brand = Brand(
            name=name,
            category=category,
            is_active=True,
        )

        self.db.add(brand)
        self.db.commit()
        self.db.refresh(brand)

        return brand

    def update(
        self,
        brand: Brand,
        name: str | None = None,
        category: str | None = None,
        is_active: bool | None = None,
    ):
        if name is not None:
            brand.name = name
        if category is not None:
            brand.category = category
        if is_active is not None:
            brand.is_active = is_active

        self.db.commit()
        self.db.refresh(brand)
        return brand

    def delete(self, brand: Brand):
        brand.is_deleted = True
        self.db.commit()
        return True