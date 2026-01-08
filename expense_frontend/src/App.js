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

// ✅ Updated API_BASE for production routing
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
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState("");
  const [note, setNote] = useState("");

  // ✅ Initialize as empty array to avoid initial .map errors
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadExpenses() {
    try {
      const res = await axios.get(`${API_BASE}/expenses?limit=50`);
      // ✅ Safety: Only set expenses if response is an array
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Load failed:", err);
      setExpenses([]);
    }
  }

  async function loadAnalytics() {
    try {
      const res = await axios.get(`${API_BASE}/analytics/summary`);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics failed:", err);
    }
  }

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
    const today = new Date().toISOString().slice(0, 10);
    setExpenseDate(today);
    loadExpenses();
    loadAnalytics();
  }, []);

  const topCategory = useMemo(() => {
    if (!analytics || analytics.message || !analytics.category_totals) return "—";
    const entries = Object.entries(analytics.category_totals);
    if (!entries.length) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return `${CATEGORY_ICON[entries[0][0]] || "📌"} ${entries[0][0]}`;
  }, [analytics]);

  function buildLast7DaysChart(expensesList) {
    const days = [];
    const totals = [];

    // ✅ Safety: Ensure list exists
    const list = Array.isArray(expensesList) ? expensesList : [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(key);
      totals.push(0);
    }

    for (const exp of list) {
      const idx = days.indexOf(exp.expense_date);
      if (idx !== -1) totals[idx] += Number(exp.amount);
    }

    return { days, totals };
  }

  const { days, totals } = useMemo(() => buildLast7DaysChart(expenses), [expenses]);

  const weeklyChartData = useMemo(() => ({
    labels: days,
    datasets: [{
      label: "Daily Spend (Last 7 Days)",
      data: totals,
      tension: 0.3,
      borderWidth: 3,
      pointRadius: 4,
    }],
  }), [days, totals]);

  const weeklyChartOptions = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Expense Tracker</div>
          <div className="subtitle">React UI → FastAPI → PostgreSQL</div>
        </div>
        <div className="badge">
          Backend: <b>{API_BASE}</b><br />
          Status: {loading ? "Working..." : "Ready ✅"}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Add Expense</h3>
          <form onSubmit={addExpense}>
            <div className="row">
              <div>
                <label>Amount</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option value={c} key={c}>{CATEGORY_ICON[c]} {c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div>
                <label>Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div>
                <label>Note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>Add</button>
            </div>
            {message && <div className="msg">{message}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Analytics Summary</h3>
          {!analytics ? <div className="msg">Loading...</div> : (
            <div className="stats">
              <div className="stat">
                <div className="k">Total expenses</div>
                <div className="v">{analytics.total_expenses || 0}</div>
              </div>
              <div className="stat">
                <div className="k">Average spend</div>
                <div className="v">{analytics.average_spend || 0}</div>
              </div>
              <div className="stat">
                <div className="k">Top category</div>
                <div className="v">{topCategory}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Weekly Expenses (Last 7 Days)</h3>
        {!expenses?.length ? <div className="msg">No data yet.</div> : (
          <Line data={weeklyChartData} options={weeklyChartOptions} />
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Latest Expenses</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Amount</th><th>Category</th><th>Date</th><th>Note</th><th>Action</th></tr>
            </thead>
            <tbody>
              {/* ✅ Added Array.isArray check to prevent c.map error */}
              {Array.isArray(expenses) && expenses.length > 0 ? (
                expenses.map((x) => (
                  <tr key={x.id}>
                    <td>{x.id}</td>
                    <td>{x.amount}</td>
                    <td>{CATEGORY_ICON[x.category] || "📌"} {x.category}</td>
                    <td>{x.expense_date}</td>
                    <td>{x.note || "—"}</td>
                    <td>
                      <button className="btn btn-danger" onClick={() => deleteExpense(x.id)} disabled={loading}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: "center" }}>No expenses found. Check database connection.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}