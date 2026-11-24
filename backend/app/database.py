import os
from dotenv import load_dotenv
from typing import AsyncGenerator
from sqlalchemy import create_engine

# from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# Load the env variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL ennvironment variable is not set.")

# Create the engine
engine = create_engine(DATABASE_URL, echo=True)

# Create session fatory - so our users can use it
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


# FastAPI dependency to provide a database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
