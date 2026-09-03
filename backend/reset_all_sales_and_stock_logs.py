from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.stock_transaction import StockTransaction
from app.models.sale import Sale

print("Truncating stock_transactions, sales, and daily_tallies tables in PostgreSQL...")

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE stock_transactions RESTART IDENTITY CASCADE;"))
    conn.execute(text("TRUNCATE TABLE sales RESTART IDENTITY CASCADE;"))
    conn.execute(text("TRUNCATE TABLE daily_tallies RESTART IDENTITY CASCADE;"))
    conn.commit()

db = SessionLocal()
tx_count = db.query(StockTransaction).count()
sale_count = db.query(Sale).count()

print(f"✅ COMPLETE RESET SUCCESSFUL!")
print(f"Remaining stock_transactions count: {tx_count}")
print(f"Remaining sales count: {sale_count}")
