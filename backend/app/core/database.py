from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=30,
    )

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()