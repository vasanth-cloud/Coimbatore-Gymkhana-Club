from app.core.database import engine
from sqlalchemy import text

statements = [
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'CASH';",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS paytm_order_id VARCHAR(100);",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_500 INTEGER DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_200 INTEGER DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_100 INTEGER DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_50 INTEGER DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_20 INTEGER DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_10 INTEGER DEFAULT 0;",
]

with engine.connect() as conn:
    for stmt in statements:
        print(f"Executing: {stmt}")
        conn.execute(text(stmt))
    conn.commit()

print("✅ POSTGRESQL MIGRATION COMPLETED SUCCESSFULLY!")
