from datetime import datetime

from app.repositories.stock_repository import StockRepository
from app.repositories.product_repository import ProductRepository


class StockService:

    def __init__(self, db):

        self.repository = StockRepository(db)
        self.product_repository = ProductRepository(db)

    # ---------------------------------------------------------
    # RECEIVE STOCK
    # ---------------------------------------------------------

    def receive_stock(
        self,
        product_id: int,
        quantity: int,
        transaction_date: datetime | None = None,
    ):

        # Check quantity
        if quantity <= 0:
            raise ValueError(
                "Stock quantity must be greater than 0"
            )

        # Check product exists
        product = self.product_repository.get_by_id(
            product_id
        )

        if not product:
            raise ValueError(
                "Product not found"
            )

        # Check product is active
        if not product.is_active:
            raise ValueError(
                "Cannot receive stock for an inactive product"
            )

        # Create IN transaction
        transaction = self.repository.create_transaction(
            product_id=product_id,
            quantity=quantity,
            transaction_type="IN",
            transaction_date=transaction_date,
        )

        return transaction

    # ---------------------------------------------------------
    # GET STOCK TRANSACTIONS
    # ---------------------------------------------------------

    def get_transactions(self):

        return self.repository.get_transactions()

    # ---------------------------------------------------------
    # GET CURRENT STOCK
    # ---------------------------------------------------------

    def get_current_stock(
        self,
        product_id: int,
    ):

        product = self.product_repository.get_by_id(
            product_id
        )

        if not product:
            raise ValueError(
                "Product not found"
            )

        current_stock = (
            self.repository.get_current_stock(
                product_id
            )
        )

        return {
            "product_id": product.id,
            "product_name": product.name,
            "current_stock": current_stock,
        }

    # ---------------------------------------------------------
    # GET ALL CURRENT STOCK
    # ---------------------------------------------------------

    def get_all_current_stock(self):

        return self.repository.get_all_current_stock()