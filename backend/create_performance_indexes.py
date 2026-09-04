from sqlalchemy import text
from app.core.database import engine

print("Creating high-performance PostgreSQL indexes for instant data fetching...")

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_stock_tx_prod_date_type ON stock_transactions (product_id, transaction_type, transaction_date, is_deleted);",
    "CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON stock_transactions (transaction_date);",
    "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date);",
    "CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_sales_product ON sales (product_id);",
    "CREATE INDEX IF NOT EXISTS idx_customers_code ON customers (customer_code);",
    "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);",
    "CREATE INDEX IF NOT EXISTS idx_products_cat ON products (category);",
]

with engine.connect() as conn:
    for idx_sql in indexes:
        conn.execute(text(idx_sql))
    conn.commit()

print("⚡ ALL HIGH-PERFORMANCE INDEXES CREATED SUCCESSFULLY!")
