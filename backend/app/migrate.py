"""
Database migration script for upgrading to high-precision time tracking (seconds).

Handles:
- Renaming 'assigned_time_minutes' -> 'assigned_time_seconds' (+ unit conversion)
- Renaming 'total_time_spent_minutes' -> 'total_time_spent_seconds' (+ unit conversion)
- Renaming 'work_logs.minutes_spent' -> 'seconds_spent' (+ unit conversion)

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
        tasks_columns = {row[0] for row in cursor.fetchall()}
        print(f"Existing columns in 'tasks': {tasks_columns}")

        # Check existing columns in work_logs table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'work_logs'
        """)
        logs_columns = {row[0] for row in cursor.fetchall()}
        print(f"Existing columns in 'work_logs': {logs_columns}")

        # 1. Migrate tasks.assigned_time_minutes -> tasks.assigned_time_seconds
        if "assigned_time_minutes" in tasks_columns and "assigned_time_seconds" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks RENAME COLUMN assigned_time_minutes TO assigned_time_seconds")
            cursor.execute("UPDATE tasks SET assigned_time_seconds = assigned_time_seconds * 60")
            print("✅ Migrated tasks.assigned_time_minutes -> tasks.assigned_time_seconds (*60)")
        elif "assigned_time_seconds" in tasks_columns:
            print("⏭️  tasks.assigned_time_seconds already exists")

        # 2. Migrate tasks.total_time_spent_minutes -> tasks.total_time_spent_seconds
        if "total_time_spent_minutes" in tasks_columns and "total_time_spent_seconds" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks RENAME COLUMN total_time_spent_minutes TO total_time_spent_seconds")
            cursor.execute("UPDATE tasks SET total_time_spent_seconds = total_time_spent_seconds * 60")
            print("✅ Migrated tasks.total_time_spent_minutes -> tasks.total_time_spent_seconds (*60)")
        elif "total_time_spent_seconds" in tasks_columns:
            print("⏭️  tasks.total_time_spent_seconds already exists")

        # 3. Migrate work_logs.minutes_spent -> work_logs.seconds_spent
        if "minutes_spent" in logs_columns and "seconds_spent" not in logs_columns:
            cursor.execute("ALTER TABLE work_logs RENAME COLUMN minutes_spent TO seconds_spent")
            cursor.execute("UPDATE work_logs SET seconds_spent = seconds_spent * 60")
            print("✅ Migrated work_logs.minutes_spent -> work_logs.seconds_spent (*60)")
        elif "seconds_spent" in logs_columns:
            print("⏭️  work_logs.seconds_spent already exists")

        # 4. Ensure other necessary columns exist (from previous migrations)
        if "completed_by_id" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN completed_by_id INTEGER REFERENCES users(id)")
            print("✅ Added completed_by_id column")
        
        if "hidden_from_list" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN hidden_from_list BOOLEAN DEFAULT false NOT NULL")
            print("✅ Added hidden_from_list column")

        if "completed_at" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ")
            print("✅ Added completed_at column")

        if "due_at" not in tasks_columns:
            cursor.execute("ALTER TABLE tasks ADD COLUMN due_at TIMESTAMPTZ")
            print("✅ Added due_at column")

        # 5. Ensure tables exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS work_logs (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id),
                start_time VARCHAR(20) NOT NULL,
                end_time VARCHAR(20) NOT NULL,
                seconds_spent INTEGER NOT NULL DEFAULT 0,
                description TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_task_members (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                started_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

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
