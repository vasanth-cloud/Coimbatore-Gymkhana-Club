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
        payment_mode: str = "CASH",
        paytm_order_id: str | None = None,
        cash_500: int = 0,
        cash_200: int = 0,
        cash_100: int = 0,
        cash_50: int = 0,
        cash_20: int = 0,
        cash_10: int = 0,
        sale_date: datetime | None = None,
    ):
        total_price = quantity * unit_price

        sale = Sale(
            product_id=product_id,
            customer_id=customer_id,
            quantity=quantity,
            total_price=total_price,
            payment_mode=payment_mode,
            paytm_order_id=paytm_order_id,
            cash_500=cash_500,
            cash_200=cash_200,
            cash_100=cash_100,
            cash_50=cash_50,
            cash_20=cash_20,
            cash_10=cash_10,
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
                Sale.payment_mode,
                Sale.paytm_order_id,
                Sale.cash_500,
                Sale.cash_200,
                Sale.cash_100,
                Sale.cash_50,
                Sale.cash_20,
                Sale.cash_10,
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
                "payment_mode": r.payment_mode or "CASH",
                "paytm_order_id": r.paytm_order_id,
                "cash_500": r.cash_500 or 0,
                "cash_200": r.cash_200 or 0,
                "cash_100": r.cash_100 or 0,
                "cash_50": r.cash_50 or 0,
                "cash_20": r.cash_20 or 0,
                "cash_10": r.cash_10 or 0,
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
                Sale.payment_mode,
                Sale.paytm_order_id,
                Product.name.label("product_name"),
                Product.category.label("category"),
                Product.volume_ml.label("volume_ml"),
                Product.selling_price.label("unit_price"),
                Brand.name.label("brand_name"),
            )
            .join(Product, Sale.product_id == Product.id)
            .outerjoin(Brand, Product.brand_id == Brand.id)
            .filter(Sale.customer_id == customer_id)
            .filter(Sale.is_deleted == False)
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
                "payment_mode": r.payment_mode or "CASH",
                "paytm_order_id": r.paytm_order_id,
                "product_id": 0,
                "product_name": r.product_name,
                "brand_name": r.brand_name or "N/A",
                "category": r.category,
                "volume_ml": r.volume_ml,
                "customer_id": customer_id,
                "customer_code": None,
                "customer_name": None,
                "phone": None,
            })
        return results

    def get_by_id(self, sale_id: int):
        return (
            self.db.query(Sale)
            .filter(Sale.id == sale_id, Sale.is_deleted == False)
            .first()
        )

    def get_daily_sales_by_date(self, target_date):
        return (
            self.db.query(
                Sale.product_id,
                Product.name.label("product_name"),
                func.sum(Sale.quantity).label("quantity_sold"),
            )
            .join(Product, Sale.product_id == Product.id)
            .filter(func.date(Sale.sale_date) == target_date)
            .filter(Sale.is_deleted == False)
            .group_by(Sale.product_id, Product.name)
            .all()
        )