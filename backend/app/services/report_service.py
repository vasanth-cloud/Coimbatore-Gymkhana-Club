from datetime import datetime, date
import calendar
from app.repositories.report_repository import ReportRepository


class ReportService:

    def __init__(self, db):
        self.repository = ReportRepository(db)

    def _get_date_range(self, period: str, date_val: date | None = None, year: int | None = None, month: int | None = None):
        if period == "monthly" and year and month:
            start_date = datetime(year, month, 1, 0, 0, 0)
            last_day = calendar.monthrange(year, month)[1]
            end_date = datetime(year, month, last_day, 23, 59, 59)
        else:
            target_date = date_val or date.today()
            start_date = datetime.combine(target_date, datetime.min.time())
            end_date = datetime.combine(target_date, datetime.max.time())
        return start_date, end_date

    # ---------------------------------
    # DAILY ENTRY REPORT
    # ---------------------------------
    def get_daily_entry_report(self, report_date):
        customers_entered = self.repository.get_daily_entries(report_date)
        additional_guests = self.repository.get_additional_guests(report_date)

        return {
            "report_date": str(report_date),
            "customers_entered": customers_entered,
            "additional_guests": additional_guests,
            "total_people_entered": customers_entered + additional_guests,
        }

    # ---------------------------------
    # DAILY SUMMARY
    # ---------------------------------
    def get_daily_summary(self, report_date):
        customers_entered = self.repository.get_daily_entries(report_date)
        additional_guests = self.repository.get_additional_guests(report_date)
        total_bottles_sold = self.repository.get_total_bottles_sold(report_date)
        brand_sales = self.repository.get_brand_sales(report_date)
        product_sales = self.repository.get_product_sales(report_date)

        return {
            "report_date": str(report_date),
            "customers_entered": customers_entered,
            "additional_guests": additional_guests,
            "total_people_entered": customers_entered + additional_guests,
            "total_bottles_sold": total_bottles_sold,
            "brands": [
                {
                    "brand_id": row.brand_id,
                    "brand_name": row.brand_name,
                    "quantity_sold": row.quantity_sold,
                }
                for row in brand_sales
            ],
            "products": [
                {
                    "product_id": row.product_id,
                    "product_name": row.product_name,
                    "brand_name": row.brand_name,
                    "quantity_sold": row.quantity_sold,
                }
                for row in product_sales
            ],
        }

    # ---------------------------------
    # DETAILED ENTRIES REPORT (Daily & Monthly)
    # ---------------------------------
    def get_entries_report(self, period: str = "daily", date_val: date | None = None, year: int | None = None, month: int | None = None):
        start_date, end_date = self._get_date_range(period, date_val, year, month)
        rows = self.repository.get_detailed_entries(start_date, end_date)

        items = [
            {
                "entry_id": row.entry_id,
                "customer_code": row.customer_code,
                "customer_name": row.customer_name,
                "additional_guests": row.additional_guests,
                "total_people": row.total_people,
                "entry_time": row.entry_time.isoformat() if row.entry_time else None,
            }
            for row in rows
        ]

        total_customers = len(items)
        total_additional = sum(i["additional_guests"] for i in items)
        total_footfall = sum(i["total_people"] for i in items)

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_customers": total_customers,
            "total_additional_guests": total_additional,
            "total_footfall": total_footfall,
            "items": items,
        }

    # ---------------------------------
    # DETAILED STOCK ARRIVALS REPORT (Daily & Monthly)
    # ---------------------------------
    def get_stock_report(self, period: str = "daily", date_val: date | None = None, year: int | None = None, month: int | None = None):
        start_date, end_date = self._get_date_range(period, date_val, year, month)
        rows = self.repository.get_detailed_stock(start_date, end_date)

        items = [
            {
                "transaction_id": row.transaction_id,
                "product_name": row.product_name,
                "category": row.category,
                "volume_ml": row.volume_ml,
                "quantity": row.quantity,
                "transaction_date": row.transaction_date.isoformat() if row.transaction_date else None,
            }
            for row in rows
        ]

        total_shipments = len(items)
        total_bottles_added = sum(i["quantity"] for i in items)

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_shipments": total_shipments,
            "total_bottles_added": total_bottles_added,
            "items": items,
        }

    # ---------------------------------
    # DETAILED SALES REPORT (Daily & Monthly)
    # ---------------------------------
    def get_sales_report(self, period: str = "daily", date_val: date | None = None, year: int | None = None, month: int | None = None):
        start_date, end_date = self._get_date_range(period, date_val, year, month)
        rows = self.repository.get_detailed_sales(start_date, end_date)

        items = [
            {
                "sale_id": row.sale_id,
                "product_name": row.product_name,
                "category": row.category,
                "volume_ml": row.volume_ml,
                "quantity": row.quantity,
                "unit_price": row.unit_price,
                "total_amount": row.total_amount,
                "sale_date": row.sale_date.isoformat() if row.sale_date else None,
            }
            for row in rows
        ]

        total_transactions = len(items)
        total_bottles_sold = sum(i["quantity"] for i in items)
        total_revenue = sum(i["total_amount"] for i in items)

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_transactions": total_transactions,
            "total_bottles_sold": total_bottles_sold,
            "total_revenue": total_revenue,
            "items": items,
        }