from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entry import Entry
from app.models.sale import Sale
from app.models.product import Product
from app.models.brand import Brand
from app.models.customer import Customer
from app.models.stock_transaction import StockTransaction


class ReportRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_daily_entries(self, report_date):
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(func.count(Entry.id))
            .filter(
                Entry.entry_date >= start_date.date(),
                Entry.entry_date < end_date.date(),
                Entry.is_deleted == False,
            )
            .scalar()
        )
        return result or 0

    def get_additional_guests(self, report_date):
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(func.coalesce(func.sum(Entry.additional_guests), 0))
            .filter(
                Entry.entry_date >= start_date.date(),
                Entry.entry_date < end_date.date(),
                Entry.is_deleted == False,
            )
            .scalar()
        )
        return result or 0

    def get_total_bottles_sold(self, report_date):
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(func.coalesce(func.sum(Sale.quantity), 0))
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
            )
            .scalar()
        )
        return result or 0

    def get_brand_sales(self, report_date):
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = start_date + timedelta(days=1)

        return (
            self.db.query(
                Brand.id.label("brand_id"),
                Brand.name.label("brand_name"),
                func.sum(Sale.quantity).label("quantity_sold"),
            )
            .join(Product, Product.brand_id == Brand.id)
            .join(Sale, Sale.product_id == Product.id)
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
                Product.is_deleted == False,
                Brand.is_deleted == False,
            )
            .group_by(Brand.id, Brand.name)
            .order_by(func.sum(Sale.quantity).desc())
            .all()
        )

    def get_product_sales(self, report_date):
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = start_date + timedelta(days=1)

        return (
            self.db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Brand.name.label("brand_name"),
                func.sum(Sale.quantity).label("quantity_sold"),
            )
            .join(Brand, Product.brand_id == Brand.id)
            .join(Sale, Sale.product_id == Product.id)
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
                Product.is_deleted == False,
                Brand.is_deleted == False,
            )
            .group_by(Product.id, Product.name, Brand.name)
            .order_by(func.sum(Sale.quantity).desc())
            .all()
        )

    # ---------------------------------------------------------
    # DETAILED ENTRIES REPORT (Daily & Monthly)
    # ---------------------------------------------------------
    def get_detailed_entries(self, start_date: datetime, end_date: datetime):
        return (
            self.db.query(
                Entry.id.label("entry_id"),
                Customer.customer_code.label("customer_code"),
                Customer.full_name.label("customer_name"),
                Entry.additional_guests.label("additional_guests"),
                (Entry.additional_guests + 1).label("total_people"),
                Entry.entry_time.label("entry_time"),
            )
            .join(Customer, Customer.id == Entry.customer_id)
            .filter(
                Entry.entry_time >= start_date,
                Entry.entry_time < end_date,
                Entry.is_deleted == False,
            )
            .order_by(Entry.entry_time.desc())
            .all()
        )

    # ---------------------------------------------------------
    # DETAILED STOCK ARRIVALS REPORT (Daily & Monthly)
    # ---------------------------------------------------------
    def get_detailed_stock(self, start_date: datetime, end_date: datetime):
        return (
            self.db.query(
                StockTransaction.id.label("transaction_id"),
                Product.name.label("product_name"),
                Product.category.label("category"),
                Product.volume_ml.label("volume_ml"),
                StockTransaction.quantity.label("quantity"),
                StockTransaction.transaction_date.label("transaction_date"),
            )
            .join(Product, Product.id == StockTransaction.product_id)
            .filter(
                StockTransaction.transaction_type == "IN",
                StockTransaction.transaction_date >= start_date,
                StockTransaction.transaction_date < end_date,
                StockTransaction.is_deleted == False,
            )
            .order_by(StockTransaction.transaction_date.desc())
            .all()
        )

    # ---------------------------------------------------------
    # DETAILED SALES REPORT (Daily & Monthly)
    # ---------------------------------------------------------
    def get_detailed_sales(self, start_date: datetime, end_date: datetime):
        return (
            self.db.query(
                Sale.id.label("sale_id"),
                Product.name.label("product_name"),
                Product.category.label("category"),
                Product.volume_ml.label("volume_ml"),
                Sale.quantity.label("quantity"),
                Product.selling_price.label("unit_price"),
                (Sale.quantity * Product.selling_price).label("total_amount"),
                Sale.sale_date.label("sale_date"),
                Customer.customer_code.label("customer_code"),
                Customer.full_name.label("customer_name"),
            )
            .join(Product, Product.id == Sale.product_id)
            .outerjoin(Customer, Customer.id == Sale.customer_id)
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
            )
            .order_by(Sale.sale_date.desc())
            .all()
        )