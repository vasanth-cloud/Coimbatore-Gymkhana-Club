from datetime import datetime, timezone, date
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from app.models.stock_transaction import StockTransaction
from app.models.product import Product


class StockRepository:

    def __init__(self, db: Session):
        self.db = db

    def create_transaction(
        self,
        product_id: int,
        quantity: int,
        transaction_type: str,
        note: str | None = None,
        transaction_date: datetime | None = None,
    ):
        transaction = StockTransaction(
            product_id=product_id,
            quantity=quantity,
            transaction_type=transaction_type,
            transaction_date=(
                transaction_date
                or datetime.now(timezone.utc)
            ),
        )

        self.db.add(transaction)
        self.db.flush()
        return transaction

    def get_transactions(self):
        return (
            self.db.query(StockTransaction)
            .filter(StockTransaction.is_deleted == False)
            .order_by(StockTransaction.transaction_date.desc())
            .all()
        )

    def get_current_stock(self, product_id: int):
        stock_in = (
            self.db.query(
                func.coalesce(func.sum(StockTransaction.quantity), 0)
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
                func.coalesce(func.sum(StockTransaction.quantity), 0)
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

    def get_all_current_stock(self):
        products = (
            self.db.query(Product)
            .filter(
                Product.is_deleted == False,
                Product.is_active == True,
            )
            .order_by(Product.name.asc())
            .all()
        )

        result = []
        for product in products:
            current_stock = self.get_current_stock(product.id)
            result.append(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "current_stock": current_stock,
                }
            )
        return result

    def get_daily_stock_ledger(self, target_date: date):
        products = (
            self.db.query(Product)
            .filter(Product.is_deleted == False, Product.is_active == True)
            .order_by(Product.name.asc())
            .all()
        )

        result = []
        for p in products:
            pack_sz = p.pack_size or (48 if p.volume_ml <= 180 else 24 if p.volume_ml == 375 else 12)

            # 1. Prior IN (date < target_date)
            prior_in = (
                self.db.query(func.coalesce(func.sum(StockTransaction.quantity), 0))
                .filter(
                    StockTransaction.product_id == p.id,
                    StockTransaction.transaction_type == "IN",
                    cast(StockTransaction.transaction_date, Date) < target_date,
                    StockTransaction.is_deleted == False,
                )
                .scalar() or 0
            )

            # 2. Prior OUT (date < target_date)
            prior_out = (
                self.db.query(func.coalesce(func.sum(StockTransaction.quantity), 0))
                .filter(
                    StockTransaction.product_id == p.id,
                    StockTransaction.transaction_type == "OUT",
                    cast(StockTransaction.transaction_date, Date) < target_date,
                    StockTransaction.is_deleted == False,
                )
                .scalar() or 0
            )

            opening_stock = prior_in - prior_out

            # 3. Today Purchase IN (date == target_date)
            today_purchase = (
                self.db.query(func.coalesce(func.sum(StockTransaction.quantity), 0))
                .filter(
                    StockTransaction.product_id == p.id,
                    StockTransaction.transaction_type == "IN",
                    cast(StockTransaction.transaction_date, Date) == target_date,
                    StockTransaction.is_deleted == False,
                )
                .scalar() or 0
            )

            # 4. Today Sale OUT (date == target_date)
            today_sale = (
                self.db.query(func.coalesce(func.sum(StockTransaction.quantity), 0))
                .filter(
                    StockTransaction.product_id == p.id,
                    StockTransaction.transaction_type == "OUT",
                    cast(StockTransaction.transaction_date, Date) == target_date,
                    StockTransaction.is_deleted == False,
                )
                .scalar() or 0
            )

            closing_stock = opening_stock + today_purchase - today_sale

            # Format Cases & Loose Bottles
            def format_case_bottle(total_bottles, psz):
                if total_bottles <= 0:
                    return {"cases": 0, "bottles": 0, "formatted": "0C + 0B"}
                cases = total_bottles // psz
                btts = total_bottles % psz
                return {
                    "cases": cases,
                    "bottles": btts,
                    "formatted": f"{cases}C + {btts}B"
                }

            opening_cb = format_case_bottle(opening_stock, pack_sz)
            purchase_cb = format_case_bottle(today_purchase, pack_sz)
            sale_cb = format_case_bottle(today_sale, pack_sz)
            closing_cb = format_case_bottle(closing_stock, pack_sz)

            selling_rate = p.selling_price or 0
            mrp_rate = p.mrp or selling_rate
            basic_rate = p.basic_rate or round(selling_rate * 0.7)

            result.append({
                "product_id": p.id,
                "product_name": p.name,
                "category": p.category,
                "volume_ml": p.volume_ml,
                "pack_size": pack_sz,
                
                # Prices
                "unit_price": selling_rate,       # Sales Rate
                "selling_price": selling_rate,
                "mrp": mrp_rate,                 # MRP Rate
                "basic_rate": basic_rate,         # Basic Purchase Rate
                
                # Totals in Bottles
                "opening_stock": opening_stock,
                "purchase_qty": today_purchase,
                "sale_qty": today_sale,
                "closing_stock": closing_stock,

                # Cases & Loose Bottles Breakdown
                "opening_cases": opening_cb["cases"],
                "opening_bottles": opening_cb["bottles"],
                "opening_str": opening_cb["formatted"],

                "purchase_cases": purchase_cb["cases"],
                "purchase_bottles": purchase_cb["bottles"],
                "purchase_str": purchase_cb["formatted"],

                "sale_cases": sale_cb["cases"],
                "sale_bottles": sale_cb["bottles"],
                "sale_str": sale_cb["formatted"],

                "closing_cases": closing_cb["cases"],
                "closing_bottles": closing_cb["bottles"],
                "closing_str": closing_cb["formatted"],

                # Valuation (Evening Total Rate)
                "closing_sales_value": closing_stock * selling_rate,
                "closing_cost_value": closing_stock * basic_rate,
                "closing_mrp_value": closing_stock * mrp_rate,
            })

        return result