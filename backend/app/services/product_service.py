from sqlalchemy.orm import Session

from app.repositories.brand_repository import BrandRepository
from app.repositories.product_repository import ProductRepository


class ProductService:

    def __init__(self, db: Session):
        self.product_repository = ProductRepository(db)
        self.brand_repository = BrandRepository(db)

    def create_product(
        self,
        brand_id: int,
        name: str,
        category: str,
        volume_ml: int,
        unit: str,
        selling_price: int,
    ):
        if selling_price < 0:
            raise ValueError("Selling price cannot be negative")

        brand = self.brand_repository.get_by_id(brand_id)
        if not brand:
            raise ValueError("Brand not found")

        product = self.product_repository.get_by_name_and_brand(
            name=name,
            brand_id=brand_id,
        )

        if product:
            raise ValueError("Product already exists for this brand")

        return self.product_repository.create(
            brand_id=brand_id,
            name=name,
            category=category,
            volume_ml=volume_ml,
            unit=unit,
            selling_price=selling_price,
        )

    def get_all_products(self):
        return self.product_repository.get_all()

    def get_product(self, product_id: int):
        product = self.product_repository.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")

        return product

    def get_products_by_brand(self, brand_id: int):
        brand = self.brand_repository.get_by_id(brand_id)
        if not brand:
            raise ValueError("Brand not found")

        return self.product_repository.get_by_brand(brand_id)

    def update_product(
        self,
        product_id: int,
        brand_id: int | None = None,
        name: str | None = None,
        category: str | None = None,
        volume_ml: int | None = None,
        unit: str | None = None,
        selling_price: float | None = None,
        mrp: float | None = None,
        basic_rate: float | None = None,
        pack_size: int | None = None,
        is_active: bool | None = None,
    ):
        product = self.product_repository.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")

        if selling_price is not None and selling_price < 0:
            raise ValueError("Selling price cannot be negative")

        if brand_id is not None:
            brand = self.brand_repository.get_by_id(brand_id)
            if not brand:
                raise ValueError("Brand not found")

        return self.product_repository.update(
            product=product,
            brand_id=brand_id,
            name=name,
            category=category,
            volume_ml=volume_ml,
            unit=unit,
            selling_price=selling_price,
            mrp=mrp,
            basic_rate=basic_rate,
            pack_size=pack_size,
            is_active=is_active,
        )

    def update_selling_price(
        self,
        product_id: int,
        selling_price: int,
    ):
        if selling_price <= 0:
            raise ValueError("Selling price must be greater than 0")

        product = self.product_repository.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")

        return self.product_repository.update_selling_price(
            product_id=product_id,
            selling_price=selling_price,
        )

    def delete_product(self, product_id: int):
        product = self.product_repository.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")

        return self.product_repository.delete(product)

    def get_products_by_category(
        self,
        category: str,
    ):
        return self.product_repository.get_by_category(category)