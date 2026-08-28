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
    ):

        # Check whether brand exists
        brand = self.brand_repository.get_by_id(brand_id)

        if not brand:
            raise ValueError("Brand not found")

        if not brand.is_active:
            raise ValueError("Brand is inactive")

        # Prevent duplicate product under same brand
        existing_product = (
            self.product_repository.get_by_name_and_brand(
                name=name,
                brand_id=brand_id,
            )
        )

        if existing_product:
            raise ValueError(
                "Product with this name already exists for this brand"
            )

        if volume_ml <= 0:
            raise ValueError(
                "Volume must be greater than zero"
            )

        return self.product_repository.create(
            brand_id=brand_id,
            name=name,
            category=category,
            volume_ml=volume_ml,
            unit=unit,
        )

    def get_all_products(self):

        return self.product_repository.get_all()

    def get_product(self, product_id: int):

        product = self.product_repository.get_by_id(
            product_id
        )

        if not product:
            raise ValueError("Product not found")

        return product

    def get_products_by_brand(self, brand_id: int):

        brand = self.brand_repository.get_by_id(brand_id)

        if not brand:
            raise ValueError("Brand not found")

        return self.product_repository.get_by_brand(
            brand_id
        )