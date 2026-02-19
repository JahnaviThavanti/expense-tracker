import { useEffect, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-expenses.css";

export default function Expenses() {

  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [totalSpend, setTotalSpend] = useState(0);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, filterMonth, filterYear, filterDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      let query = `/expenses?page=1&limit=1000`;

      // search
      if (search) query += `&search=${search}`;

      // category
      if (categoryFilter) query += `&category=${categoryFilter}`;

      // date filter (highest priority)
      if (filterDate) {
        query += `&date=${filterDate}`;
      } else {

        // if user selected month/year → use them
        if (filterMonth && filterYear) {
          query += `&month=${filterMonth}&year=${filterYear}`;
        } 
        else {
          // DEFAULT → CURRENT MONTH
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();

          query += `&month=${currentMonth}&year=${currentYear}`;
        }
      }

      const res = await API.get(query);

      const data = Array.isArray(res.data) ? res.data : [];

      // 🔥 FIX — if no expenses for selected month
      if (!data.length) {
        setExpenses([]);
        setTotalSpend(0);
        return;
      }

      const sorted = res.data.sort(
        (a, b) =>
          new Date(b.createdAt || b.date) -
          new Date(a.createdAt || a.date)
      );

      setExpenses(sorted);

      const total = sorted.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      setTotalSpend(total);

    } catch (err) {
      console.log("Expense load error:", err);
      setExpenses([]);
      setTotalSpend(0);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;

    try {
      await API.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.log("Delete failed:", err);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setFilterDate("");
    setFilterMonth("");
    setFilterYear("");
  };

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} onSearch={setSearch} />

        {/* HEADER */}
        <div className="expenses-header">
          <h1>Expense Manager</h1>
          <p>Track, filter and manage all your spending</p>
        </div>

        {/* SUMMARY */}
        <div className="expenses-summary">
          <div className="summary-box">
            <p>This Month Spend</p>
            <h2>$ {totalSpend}</h2>
          </div>

          <div className="summary-box">
            <p>Transactions</p>
            <h2>{expenses.length}</h2>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="expense-filters">
          <input
            placeholder="Search by title, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option>Food</option>
            <option>Shopping</option>
            <option>Travel</option>
            <option>Entertainment</option>
            <option>Health</option>
            <option>Other</option>
          </select>

          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="">Month</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">Year</option>
            <option>2023</option>
            <option>2024</option>
            <option>2025</option>
            <option>2026</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />

          <button className="reset-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>

        {/* LIST */}
        {loading ? (
          <p className="empty-text">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="empty-text">
            No expenses found for this period.
          </p>
        ) : (
          <div className="expense-list">
            {expenses.map((e) => (
              <div className="expense-card" key={e._id}>

                <div className="expense-info">
                  <div className={`category-dot ${e.category?.toLowerCase()}`} />

                  <div className="expense-text">
                    <h3>{e.title || e.category}</h3>
                    <span className="expense-meta">
                      {e.category} • {new Date(e.date || e.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="expense-actions">
                  <h2 className="expense-amount">$ {e.amount}</h2>

                  <button
                    className="delete-btn"
                    onClick={() => deleteExpense(e._id)}
                  >
                    Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
