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
        selling_price: int,
    ):
        product = Product(
            brand_id=brand_id,
            name=name,
            category=category,
            volume_ml=volume_ml,
            unit=unit,
            selling_price=selling_price,
            is_active=True,
        )

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product

    def update(
        self,
        product: Product,
        brand_id: int | None = None,
        name: str | None = None,
        category: str | None = None,
        volume_ml: int | None = None,
        unit: str | None = None,
        selling_price: int | None = None,
        is_active: bool | None = None,
    ):
        if brand_id is not None:
            product.brand_id = brand_id
        if name is not None:
            product.name = name
        if category is not None:
            product.category = category
        if volume_ml is not None:
            product.volume_ml = volume_ml
        if unit is not None:
            product.unit = unit
        if selling_price is not None:
            product.selling_price = selling_price
        if is_active is not None:
            product.is_active = is_active

        self.db.commit()
        self.db.refresh(product)
        return product

    def update_selling_price(
        self,
        product_id: int,
        selling_price: int,
    ):
        product = self.get_by_id(product_id)
        if not product:
            return None

        product.selling_price = selling_price
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product: Product):
        product.is_deleted = True
        self.db.commit()
        return True

    def get_by_category(
        self,
        category: str,
    ):
        return (
            self.db.query(Product)
            .filter(
                Product.category == category,
                Product.is_deleted == False,
                Product.is_active == True,
            )
            .order_by(
                Product.name.asc()
            )
            .all()
        )