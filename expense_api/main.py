import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import psycopg2
import pandas as pd
import numpy as np

app = FastAPI(title="Expense Tracker API", version="1.0")

# ✅ FIX: Explicitly allow methods to prevent 405 Method Not Allowed errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins; update with your Vercel URL for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],  # Explicitly allow these methods
    allow_headers=["*"],
)

# ✅ Use environment variables for database connection (Required for Vercel)
DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    if not DATABASE_URL:
        raise HTTPException(
            status_code=500, 
            detail="DATABASE_URL environment variable is not set in Vercel Dashboard"
        )
    # Ensure sslmode is required for cloud providers like Neon or Supabase
    return psycopg2.connect(DATABASE_URL)

# ---- Request model (matches your table columns) ----
class Expense(BaseModel):
    amount: float = Field(..., gt=0)
    category: str
    expense_date: str  # YYYY-MM-DD
    note: str | None = None

@app.get("/")
def home():
    return {"message": "Expense Tracker API is running"}

# ---- Insert an expense ----
@app.post("/expenses")
def add_expense(exp: Expense):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO expenses (amount, category, expense_date, note)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
            """,
            (exp.amount, exp.category, exp.expense_date, exp.note)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Expense added", "id": new_id}
    except Exception as e:
        # ✅ Returns detailed error if database connection or query fails
        raise HTTPException(status_code=500, detail=str(e))

# ---- Delete expenses ----
@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM expenses WHERE id = %s RETURNING id;", (expense_id,))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not deleted:
            raise HTTPException(status_code=404, detail="Expense not found")

        return {"message": "Expense deleted", "id": deleted[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- List expenses ----
@app.get("/expenses")
def list_expenses(limit: int = 20):
    try:
        limit = max(1, min(limit, 200))
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, amount, category, expense_date, note, created_at
            FROM expenses
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (limit,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        return [
            {
                "id": r[0],
                "amount": float(r[1]),
                "category": r[2],
                "expense_date": str(r[3]),
                "note": r[4],
                "created_at": str(r[5]),
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- Analytics summary (Pandas + NumPy) ----
@app.get("/analytics/summary")
def analytics_summary():
    try:
        conn = get_connection()
        # Read data directly from PostgreSQL into a Pandas DataFrame
        df = pd.read_sql("SELECT amount, category, expense_date FROM expenses;", conn)
        conn.close()

        if df.empty:
            return {"message": "No data available"}

        df["expense_date"] = pd.to_datetime(df["expense_date"], errors="coerce")
        df = df.dropna(subset=["expense_date"])

        # Perform calculations using Pandas and NumPy
        df["month"] = df["expense_date"].dt.to_period("M").astype(str)
        category_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
        monthly_totals = df.groupby("month")["amount"].sum().sort_values()

        avg_spend = float(np.mean(df["amount"]))
        max_spend = float(np.max(df["amount"]))

        return {
            "total_expenses": int(len(df)),
            "average_spend": round(avg_spend, 2),
            "max_spend": round(max_spend, 2),
            "category_totals": {k: float(v) for k, v in category_totals.to_dict().items()},
            "monthly_totals": {k: float(v) for k, v in monthly_totals.to_dict().items()},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))