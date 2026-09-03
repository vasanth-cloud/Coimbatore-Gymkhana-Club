from sqlalchemy import text
from app.core.database import engine

print("Migrating products table: Adding mrp, basic_rate, pack_size columns...")

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER DEFAULT 0;"))
    conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS basic_rate INTEGER DEFAULT 0;"))
    conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 24;"))
    
    # Auto-set standard TASMAC pack sizes based on volume
    conn.execute(text("UPDATE products SET pack_size = 48 WHERE volume_ml <= 180 AND (pack_size IS NULL OR pack_size = 24);"))
    conn.execute(text("UPDATE products SET pack_size = 24 WHERE volume_ml = 375 AND (pack_size IS NULL OR pack_size = 24);"))
    conn.execute(text("UPDATE products SET pack_size = 12 WHERE volume_ml >= 650 AND (pack_size IS NULL OR pack_size = 24);"))
    
    # Set default MRP and Basic Rate if 0
    conn.execute(text("UPDATE products SET mrp = selling_price WHERE mrp = 0 OR mrp IS NULL;"))
    conn.execute(text("UPDATE products SET basic_rate = ROUND(selling_price * 0.7) WHERE basic_rate = 0 OR basic_rate IS NULL;"))
    
    conn.commit()

print("✅ PRODUCTS TABLE MIGRATED SUCCESSFULLY IN POSTGRESQL!")
