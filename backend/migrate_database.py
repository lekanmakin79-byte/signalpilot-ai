import sqlite3

from pathlib import Path


DATABASE_PATH = (
    Path(__file__).resolve().parent
    / "signalpilot.db"
)


NEW_COLUMNS = {
    "signal_timestamp": "TEXT",
    "evaluation_minutes": "INTEGER",
    "evaluation_price": "REAL",
    "price_change": "REAL",
    "price_change_percent": "REAL",
    "outcome": "TEXT DEFAULT 'PENDING'",
    "evaluated_at": "TEXT",
}


def main():
    connection = sqlite3.connect(
        DATABASE_PATH
    )

    try:
        cursor = connection.cursor()

        cursor.execute(
            "PRAGMA table_info(signalhistory)"
        )

        existing_columns = {
            row[1]
            for row in cursor.fetchall()
        }

        for column, definition in NEW_COLUMNS.items():
            if column in existing_columns:
                print(
                    f"Already exists: {column}"
                )
                continue

            cursor.execute(
                f"""
                ALTER TABLE signalhistory
                ADD COLUMN {column} {definition}
                """
            )

            print(
                f"Added column: {column}"
            )

        connection.commit()

    finally:
        connection.close()

    print("")
    print("Database migration completed.")


if __name__ == "__main__":
    main()