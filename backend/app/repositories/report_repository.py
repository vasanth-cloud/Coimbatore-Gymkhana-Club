from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entry import Entry
from app.models.sale import Sale
from app.models.product import Product
from app.models.brand import Brand


class ReportRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_daily_entries(
        self,
        report_date,
    ):
        start_date = datetime.combine(
            report_date,
            datetime.min.time(),
        )

        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(
                func.count(Entry.id)
            )
            .filter(
                Entry.entry_date >= start_date.date(),
                Entry.entry_date < end_date.date(),
                Entry.is_deleted == False,
            )
            .scalar()
        )

        return result or 0

    def get_additional_guests(
        self,
        report_date,
    ):
        start_date = datetime.combine(
            report_date,
            datetime.min.time(),
        )

        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(
                func.coalesce(
                    func.sum(Entry.additional_guests),
                    0,
                )
            )
            .filter(
                Entry.entry_date >= start_date.date(),
                Entry.entry_date < end_date.date(),
                Entry.is_deleted == False,
            )
            .scalar()
        )

        return result or 0

    def get_total_bottles_sold(
        self,
        report_date,
    ):
        start_date = datetime.combine(
            report_date,
            datetime.min.time(),
        )

        end_date = start_date + timedelta(days=1)

        result = (
            self.db.query(
                func.coalesce(
                    func.sum(Sale.quantity),
                    0,
                )
            )
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
            )
            .scalar()
        )

        return result or 0

    def get_brand_sales(
        self,
        report_date,
    ):
        start_date = datetime.combine(
            report_date,
            datetime.min.time(),
        )

        end_date = start_date + timedelta(days=1)

        return (
            self.db.query(
                Brand.id.label("brand_id"),
                Brand.name.label("brand_name"),
                func.sum(
                    Sale.quantity
                ).label("quantity_sold"),
            )
            .join(
                Product,
                Product.brand_id == Brand.id,
            )
            .join(
                Sale,
                Sale.product_id == Product.id,
            )
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
                Product.is_deleted == False,
                Brand.is_deleted == False,
            )
            .group_by(
                Brand.id,
                Brand.name,
            )
            .order_by(
                func.sum(
                    Sale.quantity
                ).desc()
            )
            .all()
        )

    def get_product_sales(
        self,
        report_date,
    ):
        start_date = datetime.combine(
            report_date,
            datetime.min.time(),
        )

        end_date = start_date + timedelta(days=1)

        return (
            self.db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Brand.name.label("brand_name"),
                func.sum(
                    Sale.quantity
                ).label("quantity_sold"),
            )
            .join(
                Brand,
                Product.brand_id == Brand.id,
            )
            .join(
                Sale,
                Sale.product_id == Product.id,
            )
            .filter(
                Sale.sale_date >= start_date,
                Sale.sale_date < end_date,
                Sale.is_deleted == False,
                Product.is_deleted == False,
                Brand.is_deleted == False,
            )
            .group_by(
                Product.id,
                Product.name,
                Brand.name,
            )
            .order_by(
                func.sum(
                    Sale.quantity
                ).desc()
            )
            .all()
        )