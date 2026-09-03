from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.repositories.product_repository import ProductRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.stock_repository import StockRepository
from app.repositories.customer_repository import CustomerRepository


class SaleService:

    def __init__(self, db: Session):
        self.db = db
        self.sale_repository = SaleRepository(db)
        self.product_repository = ProductRepository(db)
        self.stock_repository = StockRepository(db)
        self.customer_repository = CustomerRepository(db)

    def create_sale(
        self,
        product_id: int,
        quantity: int,
        customer_id: int | None = None,
        sale_date: datetime | None = None,
    ):
        try:
            if quantity <= 0:
                raise ValueError("Quantity must be greater than zero")

            product = self.product_repository.get_by_id(product_id)
            if not product:
                raise ValueError("Product not found")

            if not product.is_active:
                raise ValueError("Product is inactive")

            # Validate Customer if provided
            if customer_id:
                customer = self.customer_repository.get_by_id(customer_id)
                if not customer:
                    raise ValueError("Customer / Member Card not found")

            current_stock = self.stock_repository.get_current_stock(product_id)
            if quantity > current_stock:
                raise ValueError(f"Insufficient stock. Available stock: {current_stock}")

            sale = self.sale_repository.create(
                product_id=product_id,
                quantity=quantity,
                customer_id=customer_id,
                unit_price=product.selling_price or 0,
                sale_date=sale_date,
            )

            # Deduct stock
            self.stock_repository.create_transaction(
                product_id=product_id,
                quantity=quantity,
                transaction_type="OUT",
                transaction_date=sale_date,
            )

            self.db.commit()
            self.db.refresh(sale)
            return sale

        except ValueError:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

    def get_all_sales(self):
        return self.sale_repository.get_all()

    def get_detailed_sales(self, limit: int = 500):
        return self.sale_repository.get_detailed_sales(limit=limit)

    def get_customer_sales(self, customer_id: int):
        return self.sale_repository.get_sales_by_customer(customer_id=customer_id)

    def get_daily_sales(self, date_value):
        start_date = datetime.combine(date_value, datetime.min.time())
        end_date = start_date + timedelta(days=1)
        return self.sale_repository.get_daily_sales(start_date=start_date, end_date=end_date)