from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.sale import Sale
from app.models.product import Product


class SaleRepository:

    def __init__(self, db: Session):
        self.db = db

    # =========================================================
    # CREATE SALE
    # =========================================================

    def create(
        self,
        product_id: int,
        quantity: int,
        sale_date: datetime | None = None,
    ):

        sale = Sale(
            product_id=product_id,
            quantity=quantity,
        )

        if sale_date:
            sale.sale_date = sale_date

        self.db.add(sale)

        # DO NOT COMMIT HERE
        # SaleService will commit the complete transaction.

        self.db.flush()

        return sale

    # =========================================================
    # GET ALL SALES
    # =========================================================

    def get_all(self):

        return (
            self.db.query(Sale)
            .filter(
                Sale.is_deleted == False,
            )
            .order_by(
                Sale.sale_date.desc()
            )
            .all()
        )

    # =========================================================
    # GET DAILY SALES
    # =========================================================

    def get_daily_sales(
        self,
        start_date: datetime,
        end_date: datetime,
    ):

        results = (
            self.db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                func.sum(
                    Sale.quantity
                ).label("quantity_sold"),
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
            )
            .group_by(
                Product.id,
                Product.name,
            )
            .order_by(
                Product.name.asc()
            )
            .all()
        )

        return results