from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, product_id: int):
        return (
            self.db.query(Product)
            .filter(
                Product.id == product_id,
                Product.is_deleted == False,
                Product.is_active == True,
            )
            .first()
        )

    def get_by_name_and_brand(
        self,
        name: str,
        brand_id: int,
    ):
        return (
            self.db.query(Product)
            .filter(
                Product.name == name,
                Product.brand_id == brand_id,
                Product.is_deleted == False,
            )
            .first()
        )

    def get_all(self):
        return (
            self.db.query(Product)
            .filter(
                Product.is_deleted == False,
            )
            .order_by(Product.name.asc())
            .all()
        )

    def get_by_brand(self, brand_id: int):
        return (
            self.db.query(Product)
            .filter(
                Product.brand_id == brand_id,
                Product.is_deleted == False,
            )
            .order_by(Product.name.asc())
            .all()
        )

    def create(
        self,
        brand_id: int,
        name: str,
        category: str,
        volume_ml: int,
        unit: str,
    ):
        product = Product(
            brand_id=brand_id,
            name=name,
            category=category,
            volume_ml=volume_ml,
            unit=unit,
            is_active=True,
        )

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product