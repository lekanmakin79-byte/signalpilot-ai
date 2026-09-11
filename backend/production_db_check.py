import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


load_dotenv()

url = os.getenv("DATABASE_URL")

print(
    "DATABASE_URL:",
    "SET" if url else "NOT SET",
)

if not url:
    raise SystemExit(1)

engine = create_engine(
    url.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    ),
    pool_pre_ping=True,
)

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT 1")
        )

        print(
            "Supabase connection:",
            result.scalar(),
        )
finally:
    engine.dispose()