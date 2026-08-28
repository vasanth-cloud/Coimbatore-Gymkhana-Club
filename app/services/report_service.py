from app.repositories.report_repository import ReportRepository


class ReportService:

    def __init__(self, db):
        self.repository = ReportRepository(db)

    # ---------------------------------
    # DAILY ENTRY REPORT
    # ---------------------------------

    def get_daily_entry_report(self, report_date):

        customers_entered = (
            self.repository.get_daily_entries(
                report_date
            )
        )

        additional_guests = (
            self.repository.get_additional_guests(
                report_date
            )
        )

        return {
            "report_date": str(report_date),

            "customers_entered": customers_entered,

            "additional_guests": additional_guests,

            "total_people_entered": (
                customers_entered
                + additional_guests
            ),
        }

    # ---------------------------------
    # DAILY SUMMARY
    # ---------------------------------

    def get_daily_summary(self, report_date):

        customers_entered = (
            self.repository.get_daily_entries(
                report_date
            )
        )

        additional_guests = (
            self.repository.get_additional_guests(
                report_date
            )
        )

        total_bottles_sold = (
            self.repository.get_total_bottles_sold(
                report_date
            )
        )

        brand_sales = (
            self.repository.get_brand_sales(
                report_date
            )
        )

        product_sales = (
            self.repository.get_product_sales(
                report_date
            )
        )

        return {
            "report_date": str(report_date),

            "customers_entered": customers_entered,

            "additional_guests": additional_guests,

            "total_people_entered": (
                customers_entered
                + additional_guests
            ),

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