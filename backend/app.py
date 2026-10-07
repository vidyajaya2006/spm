from flask import Flask, request, jsonify, send_from_directory
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    login_required,
    current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

import sqlite3
import os


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

FRONTEND_DIR = os.path.join(
    BASE_DIR,
    "frontend"
)

DATABASE = os.path.join(
    BASE_DIR,
    "finance.db"
)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)

app.config["SECRET_KEY"] = "pet-development-secret-key-2026"


# =========================================================
# DATABASE
# =========================================================

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db()
    cursor = conn.cursor()

    # -----------------------------------------------------
    # USERS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # -----------------------------------------------------
    # PROFILES
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # TRANSACTIONS
    # -----------------------------------------------------

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    # -----------------------------------------------------
    # BUDGETS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            month TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE,
            UNIQUE(user_id, category, month)
        )
    """)

    # -----------------------------------------------------
    # GOALS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            target_date TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    # -----------------------------------------------------
    # CATEGORIES
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT DEFAULT '💰',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    # -----------------------------------------------------
    # INDEXES
    # -----------------------------------------------------

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


# =========================================================
# LOGIN MANAGER
# =========================================================

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "/"


# =========================================================
# USER CLASS
# =========================================================

class User(UserMixin):

    def __init__(self, user_id, name, email):
        self.id = user_id
        self.name = name
        self.email = email


# =========================================================
# LOAD USER
# =========================================================

@login_manager.user_loader
def load_user(user_id):

    conn = get_db()

    user = conn.execute("""
        SELECT
            id,
            name,
            email
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    conn.close()

    if user is None:
        return None

    return User(
        user["id"],
        user["name"],
        user["email"]
    )


# =========================================================
# FRONTEND ROUTES
# =========================================================

@app.route("/")
def login_page():

    return send_from_directory(
        FRONTEND_DIR,
        "login.html"
    )


@app.route("/login.html")
def login_html():

    return send_from_directory(
        FRONTEND_DIR,
        "login.html"
    )


@app.route("/register.html")
def register_page():

    return send_from_directory(
        FRONTEND_DIR,
        "register.html"
    )


@app.route("/index.html")
def dashboard_page():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/api/auth/register",
    methods=["POST"]
)
def register():

    data = request.get_json() or {}

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    # Validation

    if not name:
        return jsonify({
            "error": "Name is required."
        }), 400

    if not email:
        return jsonify({
            "error": "Email is required."
        }), 400

    if "@" not in email:
        return jsonify({
            "error": "Please enter a valid email address."
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": "Password must contain at least 6 characters."
        }), 400

    conn = get_db()

    existing = conn.execute("""
        SELECT id
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    if existing:
        conn.close()

        return jsonify({
            "error": "An account with this email already exists."
        }), 409

    password_hash = generate_password_hash(password)

    cursor = conn.execute("""
        INSERT INTO users
        (
            name,
            email,
            password_hash
        )
        VALUES (?, ?, ?)
    """, (
        name,
        email,
        password_hash
    ))

    user_id = cursor.lastrowid

    conn.execute("""
        INSERT INTO profiles
        (
            user_id,
            currency,
            monthly_income
        )
        VALUES (?, ?, ?)
    """, (
        user_id,
        "INR",
        0
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Account created successfully."
    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def login():

    data = request.get_json() or {}

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    remember = bool(
        data.get(
            "remember",
            False
        )
    )

    if not email or not password:
        return jsonify({
            "error": "Email and password are required."
        }), 400

    conn = get_db()

    user = conn.execute("""
        SELECT
            id,
            name,
            email,
            password_hash
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    conn.close()

    if user is None:
        return jsonify({
            "error": "Invalid email or password."
        }), 401

    if not check_password_hash(
        user["password_hash"],
        password
    ):
        return jsonify({
            "error": "Invalid email or password."
        }), 401

    user_object = User(
        user["id"],
        user["name"],
        user["email"]
    )

    login_user(
        user_object,
        remember=remember
    )

    return jsonify({
        "message": "Login successful.",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })


# =========================================================
# CURRENT USER
# =========================================================

@app.route(
    "/api/auth/me",
    methods=["GET"]
)
def current_user_api():

    if not current_user.is_authenticated:
        return jsonify({
            "authenticated": False
        })

    return jsonify({
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email
        }
    })


# =========================================================
# LOGOUT
# =========================================================

@app.route(
    "/api/auth/logout",
    methods=["POST"]
)
@login_required
def logout():

    logout_user()

    return jsonify({
        "message": "Logged out successfully."
    })


# =========================================================
# TRANSACTIONS — GET
# =========================================================

@app.route(
    "/transactions",
    methods=["GET"]
)
@login_required
def get_transactions():

    conn = get_db()

    rows = conn.execute("""
        SELECT
            id,
            description,
            amount,
            type,
            category,
            date,
            payment_method,
            notes,
            created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY
            date DESC,
            id DESC
    """, (
        current_user.id,
    )).fetchall()

    conn.close()

    return jsonify({
        "transactions": [
            dict(row)
            for row in rows
        ]
    })


# =========================================================
# TRANSACTIONS — CREATE
# =========================================================

@app.route(
    "/transactions",
    methods=["POST"]
)
@login_required
def create_transaction():

    data = request.get_json() or {}

    description = str(
        data.get(
            "description",
            ""
        )
    ).strip()

    amount = data.get("amount")

    transaction_type = str(
        data.get(
            "type",
            ""
        )
    ).strip().lower()

    category = str(
        data.get(
            "category",
            "Other"
        )
    ).strip()

    date = str(
        data.get(
            "date",
            ""
        )
    ).strip()

    payment_method = str(
        data.get(
            "payment_method",
            data.get(
                "paymentMethod",
                "Other"
            )
        )
    ).strip()

    notes = str(
        data.get(
            "notes",
            ""
        )
    ).strip()

    # Validation

    if not description:
        return jsonify({
            "error": "Description is required."
        }), 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Amount must be a valid number."
        }), 400

    if amount <= 0:
        return jsonify({
            "error": "Amount must be greater than zero."
        }), 400

    if transaction_type not in [
        "income",
        "expense"
    ]:
        return jsonify({
            "error": "Invalid transaction type."
        }), 400

    if not category:
        category = "Other"

    if not date:
        return jsonify({
            "error": "Transaction date is required."
        }), 400

    if not payment_method:
        payment_method = "Other"

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO transactions
        (
            user_id,
            description,
            amount,
            type,
            category,
            date,
            payment_method,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user.id,
        description,
        amount,
        transaction_type,
        category,
        date,
        payment_method,
        notes
    ))

    transaction_id = cursor.lastrowid

    conn.commit()

    row = conn.execute("""
        SELECT
            id,
            description,
            amount,
            type,
            category,
            date,
            payment_method,
            notes,
            created_at
        FROM transactions
        WHERE id = ?
          AND user_id = ?
    """, (
        transaction_id,
        current_user.id
    )).fetchone()

    conn.close()

    return jsonify({
        "message": "Transaction saved successfully.",
        "transaction": dict(row)
    }), 201


# =========================================================
# TRANSACTIONS — DELETE
# =========================================================

@app.route(
    "/transactions/<int:transaction_id>",
    methods=["DELETE"]
)
@login_required
def delete_transaction(transaction_id):

    conn = get_db()

    cursor = conn.execute("""
        DELETE FROM transactions
        WHERE id = ?
          AND user_id = ?
    """, (
        transaction_id,
        current_user.id
    ))

    conn.commit()

    deleted = cursor.rowcount

    conn.close()

    if deleted == 0:
        return jsonify({
            "error": "Transaction not found."
        }), 404

    return jsonify({
        "message": "Transaction deleted successfully."
    })


# =========================================================
# SUMMARY
# =========================================================

@app.route(
    "/summary",
    methods=["GET"]
)
@login_required
def get_summary():

    conn = get_db()

    income_row = conn.execute("""
        SELECT
            COALESCE(
                SUM(amount),
                0
            ) AS total
        FROM transactions
        WHERE user_id = ?
          AND type = 'income'
    """, (
        current_user.id,
    )).fetchone()

    expense_row = conn.execute("""
        SELECT
            COALESCE(
                SUM(amount),
                0
            ) AS total
        FROM transactions
        WHERE user_id = ?
          AND type = 'expense'
    """, (
        current_user.id,
    )).fetchone()

    count_row = conn.execute("""
        SELECT
            COUNT(*) AS total
        FROM transactions
        WHERE user_id = ?
    """, (
        current_user.id,
    )).fetchone()

    conn.close()

    income = float(
        income_row["total"]
    )

    expense = float(
        expense_row["total"]
    )

    balance = income - expense

    savings_rate = (
        (balance / income) * 100
        if income > 0
        else 0
    )

    return jsonify({
        "income": income,
        "expense": expense,
        "balance": balance,
        "savings_rate": savings_rate,
        "transaction_count": count_row["total"]
    })


# =========================================================
# BUDGETS — GET
# =========================================================

@app.route(
    "/budgets",
    methods=["GET"]
)
@login_required
def get_budgets():

    conn = get_db()

    rows = conn.execute("""
        SELECT
            id,
            category,
            amount,
            month,
            created_at
        FROM budgets
        WHERE user_id = ?
        ORDER BY
            month DESC,
            category ASC
    """, (
        current_user.id,
    )).fetchall()

    conn.close()

    return jsonify({
        "budgets": [
            dict(row)
            for row in rows
        ]
    })


# =========================================================
# BUDGETS — CREATE
# =========================================================

@app.route(
    "/budgets",
    methods=["POST"]
)
@login_required
def create_budget():

    data = request.get_json() or {}

    category = str(
        data.get(
            "category",
            ""
        )
    ).strip()

    amount = data.get("amount")

    month = str(
        data.get(
            "month",
            ""
        )
    ).strip()

    if not category:
        return jsonify({
            "error": "Budget category is required."
        }), 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Budget amount must be a valid number."
        }), 400

    if amount <= 0:
        return jsonify({
            "error": "Budget amount must be greater than zero."
        }), 400

    if not month:
        return jsonify({
            "error": "Budget month is required."
        }), 400

    conn = get_db()

    try:

        cursor = conn.execute("""
            INSERT INTO budgets
            (
                user_id,
                category,
                amount,
                month
            )
            VALUES (?, ?, ?, ?)
        """, (
            current_user.id,
            category,
            amount,
            month
        ))

        budget_id = cursor.lastrowid

        conn.commit()

        row = conn.execute("""
            SELECT
                id,
                category,
                amount,
                month,
                created_at
            FROM budgets
            WHERE id = ?
              AND user_id = ?
        """, (
            budget_id,
            current_user.id
        )).fetchone()

        return jsonify({
            "message": "Budget created successfully.",
            "budget": dict(row)
        }), 201

    except sqlite3.IntegrityError:

        conn.rollback()

        return jsonify({
            "error": "A budget already exists for this category and month."
        }), 409

    finally:

        conn.close()


# =========================================================
# BUDGETS — DELETE
# =========================================================

@app.route(
    "/budgets/<int:budget_id>",
    methods=["DELETE"]
)
@login_required
def delete_budget(budget_id):

    conn = get_db()

    cursor = conn.execute("""
        DELETE FROM budgets
        WHERE id = ?
          AND user_id = ?
    """, (
        budget_id,
        current_user.id
    ))

    conn.commit()

    deleted = cursor.rowcount

    conn.close()

    if deleted == 0:
        return jsonify({
            "error": "Budget not found."
        }), 404

    return jsonify({
        "message": "Budget deleted successfully."
    })


# =========================================================
# GOALS — GET
# =========================================================

@app.route(
    "/goals",
    methods=["GET"]
)
@login_required
def get_goals():

    conn = get_db()

    rows = conn.execute("""
        SELECT
            id,
            name,
            target_amount,
            current_amount,
            target_date,
            description,
            created_at
        FROM goals
        WHERE user_id = ?
        ORDER BY
            target_date ASC,
            id DESC
    """, (
        current_user.id,
    )).fetchall()

    conn.close()

    return jsonify({
        "goals": [
            dict(row)
            for row in rows
        ]
    })


# =========================================================
# GOALS — CREATE
# =========================================================

@app.route(
    "/goals",
    methods=["POST"]
)
@login_required
def create_goal():

    data = request.get_json() or {}

    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()

    target_amount = data.get(
        "target_amount",
        data.get(
            "targetAmount"
        )
    )

    current_amount = data.get(
        "current_amount",
        data.get(
            "currentAmount",
            0
        )
    )

    target_date = str(
        data.get(
            "target_date",
            data.get(
                "targetDate",
                ""
            )
        )
    ).strip()

    description = str(
        data.get(
            "description",
            ""
        )
    ).strip()

    if not name:
        return jsonify({
            "error": "Goal name is required."
        }), 400

    try:
        target_amount = float(
            target_amount
        )
    except (TypeError, ValueError):
        return jsonify({
            "error": "Target amount must be a valid number."
        }), 400

    try:
        current_amount = float(
            current_amount
        )
    except (TypeError, ValueError):
        return jsonify({
            "error": "Current amount must be a valid number."
        }), 400

    if target_amount <= 0:
        return jsonify({
            "error": "Target amount must be greater than zero."
        }), 400

    if current_amount < 0:
        return jsonify({
            "error": "Current amount cannot be negative."
        }), 400

    if current_amount > target_amount:
        current_amount = target_amount

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO goals
        (
            user_id,
            name,
            target_amount,
            current_amount,
            target_date,
            description
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        current_user.id,
        name,
        target_amount,
        current_amount,
        target_date,
        description
    ))

    goal_id = cursor.lastrowid

    conn.commit()

    row = conn.execute("""
        SELECT
            id,
            name,
            target_amount,
            current_amount,
            target_date,
            description,
            created_at
        FROM goals
        WHERE id = ?
          AND user_id = ?
    """, (
        goal_id,
        current_user.id
    )).fetchone()

    conn.close()

    return jsonify({
        "message": "Goal created successfully.",
        "goal": dict(row)
    }), 201


# =========================================================
# GOALS — UPDATE
# =========================================================

@app.route(
    "/goals/<int:goal_id>",
    methods=["PUT"]
)
@login_required
def update_goal(goal_id):

    data = request.get_json() or {}

    current_amount = data.get(
        "current_amount",
        data.get(
            "currentAmount"
        )
    )

    if current_amount is None:
        return jsonify({
            "error": "Current amount is required."
        }), 400

    try:
        current_amount = float(
            current_amount
        )
    except (TypeError, ValueError):
        return jsonify({
            "error": "Current amount must be a valid number."
        }), 400

    if current_amount < 0:
        return jsonify({
            "error": "Current amount cannot be negative."
        }), 400

    conn = get_db()

    goal = conn.execute("""
        SELECT
            target_amount
        FROM goals
        WHERE id = ?
          AND user_id = ?
    """, (
        goal_id,
        current_user.id
    )).fetchone()

    if goal is None:

        conn.close()

        return jsonify({
            "error": "Goal not found."
        }), 404

    target_amount = float(
        goal["target_amount"]
    )

    if current_amount > target_amount:
        current_amount = target_amount

    conn.execute("""
        UPDATE goals
        SET current_amount = ?
        WHERE id = ?
          AND user_id = ?
    """, (
        current_amount,
        goal_id,
        current_user.id
    ))

    conn.commit()

    updated = conn.execute("""
        SELECT
            id,
            name,
            target_amount,
            current_amount,
            target_date,
            description,
            created_at
        FROM goals
        WHERE id = ?
          AND user_id = ?
    """, (
        goal_id,
        current_user.id
    )).fetchone()

    conn.close()

    return jsonify({
        "message": "Goal updated successfully.",
        "goal": dict(updated)
    })


# =========================================================
# GOALS — DELETE
# =========================================================

@app.route(
    "/goals/<int:goal_id>",
    methods=["DELETE"]
)
@login_required
def delete_goal(goal_id):

    conn = get_db()

    cursor = conn.execute("""
        DELETE FROM goals
        WHERE id = ?
          AND user_id = ?
    """, (
        goal_id,
        current_user.id
    ))

    conn.commit()

    deleted = cursor.rowcount

    conn.close()

    if deleted == 0:
        return jsonify({
            "error": "Goal not found."
        }), 404

    return jsonify({
        "message": "Goal deleted successfully."
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({
        "status": "healthy",
        "application": "PET",
        "service": "Personal Expense Tracker"
    })


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "error": "Requested resource was not found."
    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({
        "error": "Internal server error."
    }), 500


# =========================================================
# START APPLICATION
# =========================================================

if __name__ == "__main__":

    init_db()

    print()
    print("=" * 55)
    print("PET - Personal Expense Tracker")
    print("=" * 55)
    print("Server: http://127.0.0.1:5000")
    print("Health: http://127.0.0.1:5000/api/health")
    print("=" * 55)
    print()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )