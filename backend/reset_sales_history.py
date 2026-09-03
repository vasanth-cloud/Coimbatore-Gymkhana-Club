from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.sale import Sale

print("Clearing all test sales records in PostgreSQL sales table...")

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE sales RESTART IDENTITY CASCADE;"))
    conn.commit()

db = SessionLocal()
sales_count = db.query(Sale).count()

print(f"ALL SALES TEST RECORDS CLEARED! Remaining sales count in database: {sales_count}")
