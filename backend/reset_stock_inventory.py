from sqlalchemy import text
from app.core.database import engine, SessionLocal

print("Clearing all stock bottle transaction entries and tallies in PostgreSQL...")

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE stock_transactions RESTART IDENTITY CASCADE;"))
    conn.execute(text("TRUNCATE TABLE daily_tallies RESTART IDENTITY CASCADE;"))
    conn.commit()

db = SessionLocal()
from app.models.stock_transaction import StockTransaction
from app.models.daily_tally import DailyTally

tx_count = db.query(StockTransaction).count()
tally_count = db.query(DailyTally).count()

print(f"✅ ALL BOTTLE STOCKS RESET TO 0! Remaining transactions: {tx_count}, Remaining tallies: {tally_count}")
