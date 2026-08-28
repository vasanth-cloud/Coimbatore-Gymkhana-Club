from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.repositories.product_repository import ProductRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.stock_repository import StockRepository


class SaleService:

    def __init__(self, db: Session):

        self.db = db

        self.sale_repository = SaleRepository(db)

        self.product_repository = ProductRepository(db)

        self.stock_repository = StockRepository(db)

    # =========================================================
    # CREATE SALE
    # =========================================================

    def create_sale(
        self,
        product_id: int,
        quantity: int,
        sale_date: datetime | None = None,
    ):

        try:

            # -------------------------------------------------
            # 1. Validate quantity
            # -------------------------------------------------

            if quantity <= 0:
                raise ValueError(
                    "Quantity must be greater than zero"
                )

            # -------------------------------------------------
            # 2. Check product
            # -------------------------------------------------

            product = (
                self.product_repository.get_by_id(
                    product_id
                )
            )

            if not product:
                raise ValueError(
                    "Product not found"
                )

            # -------------------------------------------------
            # 3. Check product active
            # -------------------------------------------------

            if not product.is_active:
                raise ValueError(
                    "Product is inactive"
                )

            # -------------------------------------------------
            # 4. Check current stock
            # -------------------------------------------------

            current_stock = (
                self.stock_repository
                .get_current_stock(
                    product_id
                )
            )

            # -------------------------------------------------
            # 5. Prevent selling more than stock
            # -------------------------------------------------

            if quantity > current_stock:

                raise ValueError(
                    f"Insufficient stock. "
                    f"Available stock: {current_stock}"
                )

            # -------------------------------------------------
            # 6. Create sale
            # -------------------------------------------------

            sale = (
                self.sale_repository.create(
                    product_id=product_id,
                    quantity=quantity,
                    sale_date=sale_date,
                )
            )

            # -------------------------------------------------
            # 7. Create stock OUT transaction
            # -------------------------------------------------

            self.stock_repository.create_transaction(
                product_id=product_id,
                quantity=quantity,
                transaction_type="OUT",
                transaction_date=sale_date,
            )

            # -------------------------------------------------
            # 8. Commit both together
            # -------------------------------------------------

            self.db.commit()

            self.db.refresh(sale)

            return sale

        except ValueError:
            self.db.rollback()
            raise

        except Exception:
            self.db.rollback()
            raise

    # =========================================================
    # GET ALL SALES
    # =========================================================

    def get_all_sales(self):

        return self.sale_repository.get_all()

    # =========================================================
    # GET DAILY SALES
    # =========================================================

    def get_daily_sales(
        self,
        date_value,
    ):

        start_date = datetime.combine(
            date_value,
            datetime.min.time(),
        )

        end_date = (
            start_date
            + timedelta(days=1)
        )

        return (
            self.sale_repository
            .get_daily_sales(
                start_date=start_date,
                end_date=end_date,
            )
        )