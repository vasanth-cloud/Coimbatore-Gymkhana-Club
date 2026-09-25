from datetime import datetime, timezone, date
from sqlalchemy import func, cast, Date, case
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

        return max(0, stock_in - stock_out)

    def get_all_current_stock(self):
        # Ultra-fast 1-query aggregation for all products
        tx_agg = (
            self.db.query(
                StockTransaction.product_id,
                func.coalesce(
                    func.sum(
                        case(
                            (StockTransaction.transaction_type == "IN", StockTransaction.quantity),
                            else_=0,
                        )
                    ) - func.sum(
                        case(
                            (StockTransaction.transaction_type == "OUT", StockTransaction.quantity),
                            else_=0,
                        )
                    ),
                    0,
                ).label("net_stock"),
            )
            .filter(StockTransaction.is_deleted == False)
            .group_by(StockTransaction.product_id)
            .subquery()
        )

        query = (
            self.db.query(Product.id, Product.name, func.coalesce(tx_agg.c.net_stock, 0).label("stock"))
            .outerjoin(tx_agg, Product.id == tx_agg.c.product_id)
            .filter(Product.is_deleted == False, Product.is_active == True)
            .order_by(Product.name.asc())
        )

        results = query.all()
        return [
            {
                "product_id": r.id,
                "product_name": r.name,
                "current_stock": max(0, r.stock),
            }
            for r in results
        ]

    def get_daily_stock_ledger(self, target_date: date | str):
        if isinstance(target_date, str):
            try:
                target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
            except Exception:
                target_date = date.today()

        target_date_str = target_date.strftime("%Y-%m-%d") if isinstance(target_date, date) else str(target_date)

        # Single aggregated SQL query for all 653 products across prior and today dates
        tx_subquery = (
            self.db.query(
                StockTransaction.product_id,
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (func.date(StockTransaction.transaction_date) < target_date_str)
                                & (StockTransaction.transaction_type == "IN"),
                                StockTransaction.quantity,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("prior_in"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (func.date(StockTransaction.transaction_date) < target_date_str)
                                & (StockTransaction.transaction_type == "OUT"),
                                StockTransaction.quantity,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("prior_out"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (func.date(StockTransaction.transaction_date) == target_date_str)
                                & (StockTransaction.transaction_type == "IN"),
                                StockTransaction.quantity,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("today_in"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (func.date(StockTransaction.transaction_date) == target_date_str)
                                & (StockTransaction.transaction_type == "OUT"),
                                StockTransaction.quantity,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("today_out"),
            )
            .filter(StockTransaction.is_deleted == False)
            .group_by(StockTransaction.product_id)
            .subquery()
        )

        query = (
            self.db.query(
                Product,
                tx_subquery.c.prior_in,
                tx_subquery.c.prior_out,
                tx_subquery.c.today_in,
                tx_subquery.c.today_out,
            )
            .outerjoin(tx_subquery, Product.id == tx_subquery.c.product_id)
            .filter(Product.is_deleted == False, Product.is_active == True)
            .order_by(Product.name.asc())
        )

        rows = query.all()
        result = []

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

        def calculate_units(category: str, volume_ml: int, pack_size: int, total_bottles: int) -> float:
            if total_bottles <= 0:
                return 0.0
            cat_lower = (category or "").lower()
            vol = volume_ml or 750
            pack = pack_size if pack_size and pack_size > 0 else 12

            if "beer" in cat_lower:
                return round(total_bottles / float(pack), 2)
            elif "wine" in cat_lower:
                total_ml = total_bottles * vol
                return round(total_ml / 2250.0, 2)
            else:
                total_ml = total_bottles * vol
                return round(total_ml / 750.0, 2)

        from app.models.stock_receipt import StockReceipt, StockReceiptItem

        # Build map of historical rates (mrp, basic_rate, selling_price) as of target_date
        rate_subquery = (
            self.db.query(
                StockReceiptItem.product_id,
                func.max(StockReceiptItem.id).label("max_item_id")
            )
            .join(StockReceipt, StockReceiptItem.receipt_id == StockReceipt.id)
            .filter(
                StockReceipt.invoice_date <= target_date,
                StockReceiptItem.product_id.isnot(None)
            )
            .group_by(StockReceiptItem.product_id)
            .subquery()
        )

        latest_rates = (
            self.db.query(StockReceiptItem)
            .join(rate_subquery, StockReceiptItem.id == rate_subquery.c.max_item_id)
            .all()
        )

        rates_map = {}
        for r_item in latest_rates:
            if r_item.product_id:
                m_val = float(r_item.mrp or 0.0)
                sp_val = float(r_item.selling_price or 0.0)
                b_val = float(r_item.calculated_basic_cost or 0.0)
                rates_map[r_item.product_id] = {
                    "mrp": m_val if m_val > 0 else None,
                    "basic_rate": b_val if b_val > 0 else None,
                    "selling_price": sp_val if sp_val > 0 else None,
                }

        for p, prior_in, prior_out, today_in, today_out in rows:
            pack_sz = p.pack_size or (48 if p.volume_ml <= 180 else 24 if p.volume_ml == 375 else 12)

            p_in = prior_in or 0
            p_out = prior_out or 0
            t_in = today_in or 0
            t_out = today_out or 0

            opening_stock = max(0, p_in - p_out)
            today_purchase = max(0, t_in)
            today_sale = max(0, t_out)
            closing_stock = max(0, opening_stock + today_purchase - today_sale)

            opening_cb = format_case_bottle(opening_stock, pack_sz)
            purchase_cb = format_case_bottle(today_purchase, pack_sz)
            sale_cb = format_case_bottle(today_sale, pack_sz)
            closing_cb = format_case_bottle(closing_stock, pack_sz)

            opening_u = calculate_units(p.category, p.volume_ml, pack_sz, opening_stock)
            purchase_u = calculate_units(p.category, p.volume_ml, pack_sz, today_purchase)
            sale_u = calculate_units(p.category, p.volume_ml, pack_sz, today_sale)
            closing_u = calculate_units(p.category, p.volume_ml, pack_sz, closing_stock)

            hist_rates = rates_map.get(p.id, {})
            selling_rate = float(hist_rates.get("selling_price") or p.selling_price or 0.0)
            mrp_rate = float(hist_rates.get("mrp") or p.mrp or selling_rate)
            basic_rate = float(hist_rates.get("basic_rate") or p.basic_rate or (mrp_rate if mrp_rate > 0 else selling_rate))

            result.append({
                "product_id": p.id,
                "product_name": p.name,
                "category": p.category,
                "volume_ml": p.volume_ml,
                "pack_size": pack_sz,
                
                "unit_price": selling_rate,
                "selling_price": selling_rate,
                "mrp": mrp_rate,
                "basic_rate": basic_rate,
                
                "opening_stock": opening_stock,
                "purchase_qty": today_purchase,
                "sale_qty": today_sale,
                "closing_stock": closing_stock,

                "opening_cases": opening_cb["cases"],
                "opening_bottles": opening_cb["bottles"],
                "opening_str": opening_cb["formatted"],
                "opening_units": opening_u,

                "purchase_cases": purchase_cb["cases"],
                "purchase_bottles": purchase_cb["bottles"],
                "purchase_str": purchase_cb["formatted"],
                "purchase_units": purchase_u,

                "sale_cases": sale_cb["cases"],
                "sale_bottles": sale_cb["bottles"],
                "sale_str": sale_cb["formatted"],
                "sale_units": sale_u,

                "closing_cases": closing_cb["cases"],
                "closing_bottles": closing_cb["bottles"],
                "closing_str": closing_cb["formatted"],
                "closing_units": closing_u,

                "sale_sales_value": today_sale * selling_rate,
                "sale_cost_value": today_sale * basic_rate,
                "sale_mrp_value": today_sale * mrp_rate,
                "closing_sales_value": closing_stock * selling_rate,
                "closing_cost_value": closing_stock * basic_rate,
                "closing_mrp_value": closing_stock * mrp_rate,
            })

        return result