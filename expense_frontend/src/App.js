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

// ✅ If your backend is local:
//const API_BASE = "http://127.0.0.1:8000";
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

  // Data
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // UI
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadExpenses() {
    const res = await axios.get(`${API_BASE}/expenses?limit=50`);
    setExpenses(res.data);
  }

  async function loadAnalytics() {
    const res = await axios.get(`${API_BASE}/analytics/summary`);
    setAnalytics(res.data);
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
        expense_date: expenseDate, // must match backend field
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
    // default date = today
    const today = new Date().toISOString().slice(0, 10);
    setExpenseDate(today);

    loadExpenses();
    loadAnalytics();
  }, []);

  const topCategory = useMemo(() => {
    if (!analytics || analytics.message) return "—";
    const entries = Object.entries(analytics.category_totals || {});
    if (!entries.length) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return `${CATEGORY_ICON[entries[0][0]] || "📌"} ${entries[0][0]}`;
  }, [analytics]);

  // ✅ Build chart for last 7 days (daily spend)
  function buildLast7DaysChart(expensesList) {
    const days = [];
    const totals = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      days.push(key);
      totals.push(0);
    }

    for (const exp of expensesList) {
      const idx = days.indexOf(exp.expense_date);
      if (idx !== -1) totals[idx] += Number(exp.amount);
    }

    return { days, totals };
  }

  const { days, totals } = useMemo(() => buildLast7DaysChart(expenses), [expenses]);

  const weeklyChartData = useMemo(
    () => ({
      labels: days,
      datasets: [
        {
          label: "Daily Spend (Last 7 Days)",
          data: totals,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4,
        },
      ],
    }),
    [days, totals]
  );

  const weeklyChartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        y: { beginAtZero: true },
      },
    }),
    []
  );

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Expense Tracker</div>
          <div className="subtitle">
            React UI → FastAPI REST API → PostgreSQL storage + Pandas/NumPy analytics
          </div>
        </div>

        <div className="badge">
          Backend: <b>{API_BASE}</b>
          <br />
          Status: {loading ? "Working..." : "Ready ✅"}
        </div>
      </div>

      <div className="grid">
        {/* Add Expense */}
        <div className="card">
          <h3>Add Expense</h3>

          <form onSubmit={addExpense}>
            <div className="row">
              <div>
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12.50"
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
                <label>Note (optional)</label>
                <input
                  placeholder="e.g. lunch, cab, groceries"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  setLoading(true);
                  await loadExpenses();
                  await loadAnalytics();
                  setLoading(false);
                }}
              >
                Refresh
              </button>
            </div>

            {message && <div className="msg">{message}</div>}
          </form>
        </div>

        {/* Analytics */}
        <div className="card">
          <h3>Analytics Summary</h3>

          {!analytics ? (
            <div className="msg">Loading analytics...</div>
          ) : analytics.message ? (
            <div className="msg">{analytics.message}</div>
          ) : (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="k">Total expenses</div>
                  <div className="v">{analytics.total_expenses}</div>
                </div>

                <div className="stat">
                  <div className="k">Average spend</div>
                  <div className="v">{analytics.average_spend}</div>
                </div>

                <div className="stat">
                  <div className="k">Top category</div>
                  <div className="v">{topCategory}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="pill">
                  ✅ Uses <b>Pandas</b> for grouping + <b>NumPy</b> for mean/max
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Weekly chart */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginBottom: 0 }}>Weekly Expenses (Last 7 Days)</h3>
          <button className="btn btn-secondary" onClick={loadExpenses} disabled={loading}>
            Refresh
          </button>
        </div>

        {!expenses.length ? (
          <div className="msg" style={{ marginTop: 10 }}>
            No data yet to plot.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Line data={weeklyChartData} options={weeklyChartOptions} />
          </div>
        )}

        <div className="msg" style={{ marginTop: 10 }}>
          This chart is generated from stored expenses and updates when you add/delete entries.
        </div>
      </div>

      {/* Expenses table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginBottom: 0 }}>Latest Expenses</h3>
          <button className="btn btn-secondary" onClick={loadExpenses} disabled={loading}>
            Refresh list
          </button>
        </div>

        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Note</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {expenses.map((x) => (
                <tr key={x.id}>
                  <td>{x.id}</td>
                  <td>{x.amount}</td>
                  <td>
                    {CATEGORY_ICON[x.category] || "📌"} {x.category}
                  </td>
                  <td>{x.expense_date}</td>
                  <td>{x.note || "—"}</td>
                  <td>{x.created_at}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "8px 10px" }}
                      onClick={() => deleteExpense(x.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!expenses.length && (
                <tr>
                  <td colSpan="7" style={{ color: "#9ca3af" }}>
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="msg" style={{ marginTop: 10 }}>
          Tip: Delete button calls <b>DELETE /expenses/{`{id}`}</b> → removes record from PostgreSQL.
        </div>
      </div>
    </div>
  );
}
