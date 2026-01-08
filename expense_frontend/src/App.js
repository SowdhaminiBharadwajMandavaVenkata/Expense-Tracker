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

// ✅ Use relative path for Vercel routing
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

  // ✅ Initialize as empty array to prevent .map errors on first load
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadExpenses() {
    try {
      const res = await axios.get(`${API_BASE}/expenses?limit=50`);
      // ✅ Critical check: Ensure res.data is actually an array
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setExpenses([]); // Fallback to empty array
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

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setExpenseDate(today);
    loadExpenses();
    loadAnalytics();
  }, []);

  // ✅ Safety check for Analytics mapping
  const topCategory = useMemo(() => {
    if (!analytics || analytics.message || !analytics.category_totals) return "—";
    const entries = Object.entries(analytics.category_totals);
    if (!entries.length) return "—";
    entries.sort((a, b) => b[1] - a[1]);
    return `${CATEGORY_ICON[entries[0][0]] || "📌"} ${entries[0][0]}`;
  }, [analytics]);

  // ✅ Safety check for Chart data mapping
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

  return (
    <div className="container">
      <div className="header">
        <div className="title">Expense Tracker</div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Latest Expenses</h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {/* ✅ Added explicit check to prevent white screen crash */}
                {Array.isArray(expenses) && expenses.length > 0 ? (
                  expenses.map((x) => (
                    <tr key={x.id}>
                      <td>{x.amount}</td>
                      <td>{CATEGORY_ICON[x.category]} {x.category}</td>
                      <td>{x.expense_date}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3">No expenses found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}