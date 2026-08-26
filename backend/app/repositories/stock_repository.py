from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.stock_transaction import StockTransaction
from app.models.product import Product


class StockRepository:

    def __init__(self, db: Session):
        self.db = db

    # =========================================================
    # CREATE STOCK TRANSACTION
    # =========================================================

    def create_transaction(
        self,
        product_id: int,
        quantity: int,
        transaction_type: str,
        transaction_date: datetime | None = None,
    ):

        transaction = StockTransaction(
            product_id=product_id,
            quantity=quantity,
            transaction_type=transaction_type,
            transaction_date=(
                transaction_date
                or datetime.utcnow()
            ),
        )

        self.db.add(transaction)

        # DO NOT COMMIT HERE
        # SaleService / StockService controls the transaction.

        self.db.flush()

        return transaction

    # =========================================================
    # GET TRANSACTIONS
    # =========================================================

    def get_transactions(self):

        return (
            self.db.query(StockTransaction)
            .filter(
                StockTransaction.is_deleted == False
            )
            .order_by(
                StockTransaction.transaction_date.desc()
            )
            .all()
        )

    # =========================================================
    # GET CURRENT STOCK
    # =========================================================

    def get_current_stock(
        self,
        product_id: int,
    ):

        stock_in = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        StockTransaction.quantity
                    ),
                    0,
                )
            )
            .filter(
                StockTransaction.product_id == product_id,
                StockTransaction.transaction_type == "IN",
                StockTransaction.is_deleted == False,
            )
            .scalar()
            or 0
        )

        stock_out = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        StockTransaction.quantity
                    ),
                    0,
                )
            )
            .filter(
                StockTransaction.product_id == product_id,
                StockTransaction.transaction_type == "OUT",
                StockTransaction.is_deleted == False,
            )
            .scalar()
            or 0
        )

        return stock_in - stock_out

    # =========================================================
    # GET ALL CURRENT STOCK
    # =========================================================

    def get_all_current_stock(self):

        products = (
            self.db.query(Product)
            .filter(
                Product.is_deleted == False,
                Product.is_active == True,
            )
            .order_by(
                Product.name.asc()
            )
            .all()
        )

        result = []

        for product in products:

            current_stock = (
                self.get_current_stock(
                    product.id
                )
            )

            result.append(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "current_stock": current_stock,
                }
            )

        return result