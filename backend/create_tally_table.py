from app.core.database import engine
from app.models.base import BaseModel
from app.models.daily_tally import DailyTally

print("Creating daily_tallies table in PostgreSQL...")
BaseModel.metadata.create_all(bind=engine)
print("✅ daily_tallies TABLE CREATED SUCCESSFULLY IN POSTGRESQL!")
