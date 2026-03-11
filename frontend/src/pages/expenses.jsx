import { useEffect, useMemo, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-expenses.css";
import "../styles/shared-datepicker.css";
import useExpenseDateHighlights from "../hooks/useExpenseDateHighlights";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Expenses() {

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [totalSpend, setTotalSpend] = useState(0);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const { hasExpenseOnDate, refreshExpenseDateHighlights } =
    useExpenseDateHighlights();

  const toApiDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateMMDDYYYY = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    }).format(d);
  };

  const visibleExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? [...expenses] : [];
    list.sort((a, b) => {
      if (sortBy === "amount") {
        const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
        if (amountDiff !== 0) return amountDiff;
      }
      const da = new Date(a.createdAt || a.date).getTime();
      const db = new Date(b.createdAt || b.date).getTime();
      return db - da;
    });
    return list;
  }, [expenses, sortBy]);

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, filterMonth, filterYear, filterDate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await API.get("/categories");
      const rows = Array.isArray(response.data) ? response.data : [];
      setCategories(rows);
    } catch (err) {
      console.log("Category load error:", err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      let query = `/expenses?page=1&limit=1000`;

      // search
      if (search) query += `&search=${search}`;

      // category
      if (categoryFilter) query += `&category=${categoryFilter}`;

      /* =========================
         DATE FILTERING (FIXED)
         ========================= */

      if (filterDate) {
        // 🔥 send ISO to backend
        const apiDate = toApiDate(filterDate);
        query += `&date=${apiDate}`;
      } 
      else if (filterMonth && filterYear) {
        query += `&month=${filterMonth}&year=${filterYear}`;
      } 
      else {
        // default current month
        const now = new Date();
        query += `&month=${now.getMonth()+1}&year=${now.getFullYear()}`;
      }

      const res = await API.get(query);
      const data = Array.isArray(res.data) ? res.data : [];

      if (!data.length) {
        setExpenses([]);
        setTotalSpend(0);
        return;
      }

      const sorted = data.sort(
        (a, b) =>
          new Date(b.createdAt || b.date) -
          new Date(a.createdAt || a.date)
      );

      setExpenses(sorted);

      const total = sorted.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );

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
      refreshExpenseDateHighlights();
    } catch (err) {
      console.log("Delete failed:", err);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setFilterDate(null);
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

        {/* =========================
           FILTER BAR (UPGRADED)
           ========================= */}
        <div className="expense-filters">

          <input
            placeholder="Search by title, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={categoriesLoading}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>

          {/* MONTH */}
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setFilterDate(null); // avoid conflict
            }}
          >
            <option value="">Month</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          {/* YEAR */}
          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setFilterDate(null); // avoid conflict
            }}
          >
            <option value="">Year</option>
            <option>2023</option>
            <option>2024</option>
            <option>2025</option>
            <option>2026</option>
          </select>

          {/* MODERN CALENDAR */}
          <DatePicker
            selected={filterDate}
            onChange={(date) => {
              setFilterDate(date);
              setFilterMonth("");
              setFilterYear("");
            }}
            dateFormat="MM/dd/yyyy"
            placeholderText="Select date"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            showPopperArrow={false}
            todayButton="Today"
            maxDate={new Date()}
            isClearable
            className="date-picker-input"
            calendarClassName="modern-calendar"
            popperPlacement="bottom-start"
            dayClassName={(day) =>
              hasExpenseOnDate(day) ? "expense-day-highlight" : undefined
            }
          />

          <button className="reset-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>

        {/* =========================
           LIST
           ========================= */}
        {loading ? (
          <p className="empty-text">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="empty-text">
            No expenses found for this period.
          </p>
        ) : (
          <div className="expense-list">
            {visibleExpenses.map((e) => (
              <div className="expense-card" key={e._id}>

                <div className="expense-info">
                  <div className={`category-dot ${e.category?.toLowerCase()}`} />

                  <div className="expense-text">
                    <h3>{e.title || e.category}</h3>
                    <span className="expense-meta">
                      {e.category} •{" "}
                      {formatDateMMDDYYYY(e.date || e.createdAt)}
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
