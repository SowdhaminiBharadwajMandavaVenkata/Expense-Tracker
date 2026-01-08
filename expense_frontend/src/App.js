import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// ✅ Relative path for Vercel routing to work with vercel.json
const API_BASE = "/api";
const CATEGORY_OPTIONS = ["Food", "Transport", "Shopping", "Rent", "Utilities", "Other"];

const CATEGORY_ICON = {
  Food: "🍔",
  Transport: "🚌",
  Shopping: "🛍️",
  Rent: "🏠",
  Utilities: "💡",
  Other: "📌",
};

export default function App() {
  // Form fields
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState("");
  const [note, setNote] = useState("");

  // Data - Initialized safely to prevent .map errors
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // UI State
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Data Loading Functions ---

  async function loadExpenses() {
    try {
      const res = await axios.get(`${API_BASE}/expenses?limit=50`);
      // ✅ Critical: Ensure we only set expenses if the response is an array
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setExpenses([]); 
    }
  }

  async function loadAnalytics() {
    try {
      const res = await axios.get(`${API_BASE}/analytics/summary`);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }

  // --- Action Functions ---

  async function addExpense(e) {
    e.preventDefault();
    setMessage("");

    if (!amount || !expenseDate || !category) {
      setMessage("❌ Please enter amount, category, and date.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        amount: parseFloat(amount),
        category,
        expense_date: expenseDate,
        note: note ? note : null,
      };

      const res = await axios.post(`${API_BASE}/expenses`, payload);
      setMessage(`✅ Added! (ID: ${res.data.id})`);

      setAmount("");
      setNote("");

      await loadExpenses();
      await loadAnalytics();
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(id) {
    const ok = window.confirm(`Delete expense ID ${id}?`);
    if (!ok) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/expenses/${id}`);
      setMessage(`🗑️ Deleted expense ID ${id}`);
      await loadExpenses();
      await loadAnalytics();
    } catch (err) {
      setMessage(`❌ Delete failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Default date = today
    const today = new Date().toISOString().slice(0, 10);
    setExpenseDate(today);

    loadExpenses();
    loadAnalytics();
  }, []);

  // --- Computed Data (Memos) ---

  const topCategory = useMemo(() => {
    if (!analytics || analytics.message || !analytics.category_totals) return "—";
    const entries = Object.entries(analytics.category_totals || {});
    if (!entries.length) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return `${CATEGORY_ICON[entries[0][0]] || "📌"} ${entries[0][0]}`;
  }, [analytics]);

  const { days, totals } = useMemo(() => {
    const dList = [];
    const tList = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dList.push(d.toISOString().slice(0, 10));
      tList.push(0);
    }

    if (Array.isArray(expenses)) {
      expenses.forEach(exp => {
        const idx = dList.indexOf(exp.expense_date);
        if (idx !== -1) tList[idx] += Number(exp.amount);
      });
    }

    return { days: dList, totals: tList };
  }, [expenses]);

  const weeklyChartData = {
    labels: days,
    datasets: [
      {
        label: "Daily Spend (Last 7 Days)",
        data: totals,
        tension: 0.3,
        borderWidth: 3,
        pointRadius: 4,
        borderColor: "rgb(75, 192, 192)",
      },
    ],
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Expense Tracker</div>
          <div className="subtitle">React + FastAPI + PostgreSQL</div>
        </div>
        <div className="badge">
          Status: {loading ? "Working..." : "Ready ✅"}
        </div>
      </div>

      <div className="grid">
        {/* Form Card */}
        <div className="card">
          <h3>Add Expense</h3>
          <form onSubmit={addExpense}>
            <div className="row">
              <div>
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option value={c} key={c}>
                      {CATEGORY_ICON[c]} {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div>
                <label>Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
            {message && <div className="msg">{message}</div>}
          </form>
        </div>

        {/* Analytics Card */}
        <div className="card">
          <h3>Analytics Summary</h3>
          {!analytics ? (
            <div className="msg">Loading analytics...</div>
          ) : (
            <div className="stats">
              <div className="stat">
                <div className="k">Total Expenses</div>
                <div className="v">{analytics.total_expenses || 0}</div>
              </div>
              <div className="stat">
                <div className="k">Average Spend</div>
                <div className="v">${analytics.average_spend || 0}</div>
              </div>
              <div className="stat">
                <div className="k">Top Category</div>
                <div className="v">{topCategory}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Card */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Weekly Expenses (Last 7 Days)</h3>
        {Array.isArray(expenses) && expenses.length > 0 ? (
          <Line data={weeklyChartData} />
        ) : (
          <div className="msg">No data available for chart.</div>
        )}
      </div>

      {/* Table Card */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Latest Expenses</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ Safety check prevents crash if expenses is not an array */}
              {Array.isArray(expenses) && expenses.length > 0 ? (
                expenses.map((x) => (
                  <tr key={x.id}>
                    <td>${x.amount}</td>
                    <td>{CATEGORY_ICON[x.category]} {x.category}</td>
                    <td>{x.expense_date}</td>
                    <td>{x.note || "—"}</td>
                    <td>
                      <button className="btn btn-danger" onClick={() => deleteExpense(x.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="msg">No expenses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}