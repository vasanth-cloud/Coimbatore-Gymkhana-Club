from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.sale import Sale
from app.models.product import Product
from app.models.brand import Brand
from app.models.customer import Customer


class SaleRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        product_id: int,
        quantity: int,
        customer_id: int | None = None,
        unit_price: int = 0,
        sale_date: datetime | None = None,
    ):
        total_price = quantity * unit_price

        sale = Sale(
            product_id=product_id,
            customer_id=customer_id,
            quantity=quantity,
            total_price=total_price,
        )

        if sale_date:
            sale.sale_date = sale_date

        self.db.add(sale)
        self.db.flush()

        return sale

    def get_all(self):
        return (
            self.db.query(Sale)
            .filter(Sale.is_deleted == False)
            .order_by(Sale.sale_date.desc())
            .all()
        )

    def get_detailed_sales(self, limit: int = 500):
        query = (
            self.db.query(
                Sale.id,
                Sale.sale_date,
                Sale.quantity,
                Sale.total_price,
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Product.category.label("category"),
                Product.volume_ml.label("volume_ml"),
                Product.selling_price.label("unit_price"),
                Brand.name.label("brand_name"),
                Customer.id.label("customer_id"),
                Customer.customer_code.label("customer_code"),
                Customer.full_name.label("customer_name"),
                Customer.phone.label("phone"),
            )
            .join(Product, Sale.product_id == Product.id)
            .outerjoin(Brand, Product.brand_id == Brand.id)
            .outerjoin(Customer, Sale.customer_id == Customer.id)
            .filter(Sale.is_deleted == False)
            .order_by(Sale.sale_date.desc())
            .limit(limit)
            .all()
        )

        results = []
        for r in query:
            unit_price = r.unit_price or 0
            total_p = r.total_price if r.total_price is not None else (r.quantity * unit_price)
            results.append({
                "id": r.id,
                "sale_date": r.sale_date,
                "quantity": r.quantity,
                "unit_price": unit_price,
                "total_price": total_p,
                "product_id": r.product_id,
                "product_name": r.product_name,
                "brand_name": r.brand_name or "N/A",
                "category": r.category,
                "volume_ml": r.volume_ml,
                "customer_id": r.customer_id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "phone": r.phone,
            })
        return results

    def get_sales_by_customer(self, customer_id: int):
        query = (
            self.db.query(
                Sale.id,
                Sale.sale_date,
                Sale.quantity,
                Sale.total_price,
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Product.category.label("category"),
                Product.volume_ml.label("volume_ml"),
                Product.selling_price.label("unit_price"),
                Brand.name.label("brand_name"),
                Customer.id.label("customer_id"),
                Customer.customer_code.label("customer_code"),
                Customer.full_name.label("customer_name"),
                Customer.phone.label("phone"),
            )
            .join(Product, Sale.product_id == Product.id)
            .outerjoin(Brand, Product.brand_id == Brand.id)
            .join(Customer, Sale.customer_id == Customer.id)
            .filter(
                Sale.customer_id == customer_id,
                Sale.is_deleted == False,
            )
            .order_by(Sale.sale_date.desc())
            .all()
        )

        results = []
        for r in query:
            unit_price = r.unit_price or 0
            total_p = r.total_price if r.total_price is not None else (r.quantity * unit_price)
            results.append({
                "id": r.id,
                "sale_date": r.sale_date,
                "quantity": r.quantity,
                "unit_price": unit_price,
                "total_price": total_p,
                "product_id": r.product_id,
                "product_name": r.product_name,
                "brand_name": r.brand_name or "N/A",
                "category": r.category,
                "volume_ml": r.volume_ml,
                "customer_id": r.customer_id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "phone": r.phone,
            })
        return results

    def get_daily_sales(self, start_date: datetime, end_date: datetime):
        results = (
            self.db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                func.sum(Sale.quantity).label("quantity_sold"),
            )
            .join(Sale, Sale.product_id == Product.id)
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
                Product.is_deleted == False,
            )
            .group_by(Product.id, Product.name)
            .order_by(Product.name.asc())
            .all()
        )

        return results