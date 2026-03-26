"""
Database migration script for adding work log support.

Handles:
- Renaming time_taken_minutes -> assigned_time_minutes
- Adding total_time_spent_minutes, completed_by_id, hidden_from_list columns
- Creating work_logs table
- Creating active_task_members table (if not exists)

Run: python -m app.migrate
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_connection():
    """Parse SQLAlchemy URL to psycopg format."""
    # Convert from postgresql+psycopg:// to postgresql://
    url = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")
    return psycopg.connect(url)


def migrate():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check existing columns in tasks table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'tasks'
        """)
        columns = {row[0] for row in cursor.fetchall()}
        print(f"Existing columns in 'tasks': {columns}")

        # 1. Rename time_taken_minutes -> assigned_time_minutes
        if "time_taken_minutes" in columns and "assigned_time_minutes" not in columns:
            cursor.execute("ALTER TABLE tasks RENAME COLUMN time_taken_minutes TO assigned_time_minutes")
            print("✅ Renamed time_taken_minutes -> assigned_time_minutes")
        elif "assigned_time_minutes" in columns:
            print("⏭️  assigned_time_minutes already exists")

        # 2. Add total_time_spent_minutes
        if "total_time_spent_minutes" not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN total_time_spent_minutes INTEGER DEFAULT 0")
            print("✅ Added total_time_spent_minutes column")
        else:
            print("⏭️  total_time_spent_minutes already exists")

        # 3. Add completed_by_id
        if "completed_by_id" not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN completed_by_id INTEGER REFERENCES users(id)")
            print("✅ Added completed_by_id column")
        else:
            print("⏭️  completed_by_id already exists")

        # 4. Add hidden_from_list
        if "hidden_from_list" not in columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN hidden_from_list BOOLEAN DEFAULT false NOT NULL")
            print("✅ Added hidden_from_list column")
        else:
            print("⏭️  hidden_from_list already exists")

        # 5. Create work_logs table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS work_logs (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id),
                start_time VARCHAR(20) NOT NULL,
                end_time VARCHAR(20) NOT NULL,
                minutes_spent INTEGER NOT NULL DEFAULT 0,
                description TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        print("✅ work_logs table ready")

        # 6. Create active_task_members table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_task_members (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                started_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        print("✅ active_task_members table ready")

        conn.commit()
        print("\n🎉 Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    migrate()
