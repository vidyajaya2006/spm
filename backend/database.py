import sqlite3
import os


# Project root directory
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

# Database location
DATABASE = os.path.join(
    BASE_DIR,
    "finance.db"
)


def get_db():
    """
    Create and return a SQLite database connection.
    """

    conn = sqlite3.connect(DATABASE)

    # Allows rows to be accessed by column name
    conn.row_factory = sqlite3.Row

    return conn


def init_db():
    """
    Create all required database tables.
    """

    conn = get_db()
    cursor = conn.cursor()

    # -----------------------------------------
    # USERS
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


    # -----------------------------------------
    # USER PROFILES
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            phone TEXT,
            currency TEXT DEFAULT 'INR',
            monthly_income REAL DEFAULT 0,
            avatar TEXT,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)


    # -----------------------------------------
    # TRANSACTIONS
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            description TEXT NOT NULL,

            amount REAL NOT NULL,

            type TEXT NOT NULL,

            category TEXT DEFAULT 'Other',

            date TEXT,

            payment_method TEXT DEFAULT 'Other',

            notes TEXT,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)


    # -----------------------------------------
    # BUDGETS
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            category TEXT NOT NULL,

            amount REAL NOT NULL,

            month TEXT NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE,

            UNIQUE(user_id, category, month)
        )
    """)


    # -----------------------------------------
    # FINANCIAL GOALS
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            name TEXT NOT NULL,

            target_amount REAL NOT NULL,

            current_amount REAL DEFAULT 0,

            target_date TEXT,

            description TEXT,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)


    # -----------------------------------------
    # CATEGORIES
    # -----------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            name TEXT NOT NULL,

            type TEXT NOT NULL,

            icon TEXT DEFAULT '💰',

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)


    # -----------------------------------------
    # INDEXES
    # -----------------------------------------

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_transactions_user
        ON transactions(user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_transactions_date
        ON transactions(date)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_budgets_user
        ON budgets(user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_goals_user
        ON goals(user_id)
    """)


    conn.commit()
    conn.close()