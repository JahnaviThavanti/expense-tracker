import { useEffect, useMemo, useRef, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-charts.css";
import "../styles/shared-datepicker.css";
import useExpenseDateHighlights from "../hooks/useExpenseDateHighlights";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  ComposedChart,
  Bar,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
  ReferenceLine,
  Tooltip
} from "recharts";

const TIME_FILTERS = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" }
];

const CHART_MODES = ["line", "bar", "both"];

const PIE_COLORS = [
  "#6C5DD3",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
  "#22c55e",
  "#ef4444"
];

const formatDateForApi = (dateValue) => {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateMMDDYYYY = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(dateValue);
};

const formatDateMMDD = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit"
  }).format(dateValue);
};

const getExpenseDotColor = (seed) => {
  const s = String(seed || "expense");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 78%, 58%)`;
};

const getMonthName = (month, year) =>
  new Date(year, month, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

const toStartOfDay = (dateValue) => {
  const d = new Date(dateValue);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dayKey = (dateValue) => {
  const d = toStartOfDay(dateValue);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getCategoryColor = (category) => {
  const c = String(category || "").trim().toLowerCase();
  if (c === "food") return "#f97316";
  if (c === "transport") return "#3b82f6";
  if (c === "shopping") return "#a855f7";
  if (c === "bills") return "#ef4444";
  if (c === "entertainment") return "#22c55e";
  if (c === "others" || c === "other") return "#94a3b8";

  // Stable fallback color for custom categories.
  const s = c || "others";
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 75%, 60%)`;
};

const normalizeCategory = (value) => String(value || "Others").trim().toLowerCase() || "others";

export default function Reports() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [dailyMode, setDailyMode] = useState("line");
  const [trendMode, setTrendMode] = useState("line");
  const [monthMode, setMonthMode] = useState("line");
  const [scatterCategoryFilters, setScatterCategoryFilters] = useState([]);

  // Temporary UI disables (requested).
  const TEMP_DISABLE_MONTHLY_SCATTER = false;
  const TEMP_DISABLE_TWELVE_MONTH_TREND = false;

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState(null);

  const [rangeExpenses, setRangeExpenses] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [isCompactPie, setIsCompactPie] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : false
  );

  const [clickedMonthlyExpense, setClickedMonthlyExpense] = useState(null);
  const [clickedDailyExpense, setClickedDailyExpense] = useState(null);

  const initialLoadedAtRef = useRef(Date.now());
  const { hasExpenseOnDate } = useExpenseDateHighlights();

  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(value || 0));

  const selectedContext = useMemo(() => {
    const now = new Date();
    const selectedBaseDate = filterDate || now;
    return {
      month: filterMonth ? Number(filterMonth) - 1 : selectedBaseDate.getMonth(),
      year: filterYear ? Number(filterYear) : selectedBaseDate.getFullYear()
    };
  }, [filterDate, filterMonth, filterYear]);

  const currentMonthLabel = useMemo(
    () => getMonthName(selectedContext.month, selectedContext.year),
    [selectedContext.month, selectedContext.year]
  );

  useEffect(() => {
    const handleResize = () => setIsCompactPie(window.innerWidth < 1200);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadRangeExpenses = async () => {
    try {
      setRangeLoading(true);
      const selectedYear = selectedContext.year;
      const start = new Date(selectedYear - 1, 0, 1);
      const end = new Date(selectedYear, 11, 31);

      const limit = 1000;
      let page = 1;
      let allRows = [];

      while (true) {
        const res = await API.get("/expenses", {
          params: {
            startDate: formatDateForApi(start),
            endDate: formatDateForApi(end),
            page,
            limit
          }
        });
        const rows = Array.isArray(res.data) ? res.data : [];
        allRows = allRows.concat(rows);
        if (rows.length < limit) break;
        page += 1;
      }

      setRangeExpenses(allRows);
    } catch (err) {
      console.log("Report load error:", err);
      setRangeExpenses([]);
    } finally {
      setRangeLoading(false);
    }
  };

  useEffect(() => {
    loadRangeExpenses();
  }, [selectedContext.year]);

  useEffect(() => {
    const reloadOnFocus = () => loadRangeExpenses();
    window.addEventListener("focus", reloadOnFocus);
    return () => window.removeEventListener("focus", reloadOnFocus);
  }, [selectedContext.year]);

  const monthExpenses = useMemo(() => {
    return rangeExpenses.filter((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return false;
      return d.getMonth() === selectedContext.month && d.getFullYear() === selectedContext.year;
    });
  }, [rangeExpenses, selectedContext.month, selectedContext.year]);

  const yearExpenses = useMemo(() => {
    return rangeExpenses.filter((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return false;
      return d.getFullYear() === selectedContext.year;
    });
  }, [rangeExpenses, selectedContext.year]);

  const selectedDayExpenses = useMemo(() => {
    if (!filterDate) return [];
    const key = dayKey(filterDate);
    return rangeExpenses.filter((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return false;
      return dayKey(d) === key;
    });
  }, [filterDate, rangeExpenses]);

  const weeklyWindow = useMemo(() => {
    const base = filterDate
      ? new Date(filterDate)
      : new Date(selectedContext.year, selectedContext.month, 1);
    const anchor = toStartOfDay(base);
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - anchor.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return { weekStart, weekEnd };
  }, [filterDate, selectedContext.month, selectedContext.year]);

  const weeklyExpenses = useMemo(() => {
    const { weekStart, weekEnd } = weeklyWindow;
    return rangeExpenses.filter((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return false;
      const t = d.getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
  }, [rangeExpenses, weeklyWindow]);

  const monthlyTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [monthExpenses]
  );

  const transactions = useMemo(() => monthExpenses.length, [monthExpenses]);

  const lastMonthSummary = useMemo(() => {
    const selectedMonth = selectedContext.month;
    const selectedYear = selectedContext.year;
    for (let offset = 1; offset <= 12; offset += 1) {
      const d = new Date(selectedYear, selectedMonth - offset, 1);
      const rows = rangeExpenses.filter((expense) => {
        const ed = new Date(expense.date || expense.createdAt);
        if (!isValidDate(ed)) return false;
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      });
      if (rows.length) {
        const total = rows.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return { label: getMonthName(d.getMonth(), d.getFullYear()), total };
      }
    }
    return { label: "No data", total: 0 };
  }, [rangeExpenses, selectedContext.month, selectedContext.year]);

  const categoryScopeExpenses = useMemo(() => {
    if (timeFilter === "daily") return selectedDayExpenses;
    if (timeFilter === "weekly") return weeklyExpenses;
    if (timeFilter === "yearly") return yearExpenses;
    return monthExpenses;
  }, [monthExpenses, selectedDayExpenses, timeFilter, weeklyExpenses, yearExpenses]);

  const categoryChartData = useMemo(() => {
    const categoryMap = {};
    categoryScopeExpenses.forEach((expense) => {
      const cat = expense.category || "Others";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(expense.amount || 0);
    });
    return Object.keys(categoryMap).map((name) => ({ name, value: categoryMap[name] }));
  }, [categoryScopeExpenses]);

  const topCategory = useMemo(() => {
    let maxName = "None";
    let maxValue = 0;
    categoryChartData.forEach((entry) => {
      if (entry.value > maxValue) {
        maxValue = entry.value;
        maxName = entry.name;
      }
    });
    return maxName;
  }, [categoryChartData]);

  const weeklyChartData = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sums = {};
    weeklyExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const k = dayKey(d);
      sums[k] = (sums[k] || 0) + Number(expense.amount || 0);
    });
    return Array.from({ length: 7 }, (_, idx) => {
      const dd = new Date(weeklyWindow.weekStart);
      dd.setDate(weeklyWindow.weekStart.getDate() + idx);
      const k = dayKey(dd);
      return {
        day: labels[idx],
        dayLabel: formatDateMMDD(dd),
        amount: Number(sums[k] || 0),
        dateValue: dd
      };
    });
  }, [weeklyExpenses, weeklyWindow.weekStart]);

  const dailyTotalsChartData = useMemo(() => {
    const daysInMonth = new Date(selectedContext.year, selectedContext.month + 1, 0).getDate();
    const sums = {};
    monthExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const day = d.getDate();
      sums[day] = (sums[day] || 0) + Number(expense.amount || 0);
    });

    return Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      const dateValue = new Date(selectedContext.year, selectedContext.month, day);
      return {
        day,
        amount: Number(sums[day] || 0),
        dateValue,
        dateLabel: formatDateMMDD(dateValue)
      };
    });
  }, [monthExpenses, selectedContext.month, selectedContext.year]);

  const selectedDayForMonthView = useMemo(() => {
    if (!filterDate) return null;
    const d = new Date(filterDate);
    if (!isValidDate(d)) return null;
    if (d.getMonth() !== selectedContext.month || d.getFullYear() !== selectedContext.year) return null;
    return d.getDate();
  }, [filterDate, selectedContext.month, selectedContext.year]);

  const monthlyScatterData = useMemo(() => {
    return monthExpenses.map((expense, index) => {
      const d = new Date(expense.date || expense.createdAt);
      return {
        id: expense._id || `${index}`,
        day: d.getDate(),
        amount: Number(expense.amount || 0),
        category: expense.category || "Others",
        categoryKey: normalizeCategory(expense.category),
        dateValue: d,
        dotColor: getExpenseDotColor(expense._id || `${expense.amount}-${d.getTime()}-${index}`),
        raw: expense
      };
    });
  }, [monthExpenses]);

  const availableScatterCategories = useMemo(() => {
    const map = new Map(); // key -> display label (first seen)
    monthlyScatterData.forEach((row) => {
      if (!map.has(row.categoryKey)) map.set(row.categoryKey, row.category || "Others");
    });
    return Array.from(map.entries()).map(([key, label]) => ({
      key,
      label,
      color: getCategoryColor(label)
    }));
  }, [monthlyScatterData]);

  const filteredMonthlyScatterData = useMemo(() => {
    if (!scatterCategoryFilters.length) return monthlyScatterData;
    const allowed = new Set(scatterCategoryFilters);
    return monthlyScatterData.filter((row) => allowed.has(row.categoryKey));
  }, [monthlyScatterData, scatterCategoryFilters]);

  const dailySpendingScatterData = useMemo(() => {
    const selectedDateKey = filterDate ? dayKey(filterDate) : null;
    return monthExpenses.map((expense, index) => {
      const expenseDate = new Date(expense.date || expense.createdAt);
      const created = expense.createdAt ? new Date(expense.createdAt) : expenseDate;
      return {
        id: expense._id || `${index}`,
        day: expenseDate.getDate(),
        amount: Number(expense.amount || 0),
        category: expense.category || "Others",
        dateValue: expenseDate,
        isSelectedDate: Boolean(selectedDateKey) && dayKey(expenseDate) === selectedDateKey,
        isNew: isValidDate(created) && created.getTime() > initialLoadedAtRef.current,
        dotColor: getExpenseDotColor(expense._id || `${expense.amount}-${expenseDate.getTime()}-${index}`),
        raw: expense
      };
    });
  }, [filterDate, monthExpenses]);

  const twelveMonthChartData = useMemo(() => {
    const totals = {};
    yearExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      totals[key] = (totals[key] || 0) + Number(expense.amount || 0);
    });

    return Array.from({ length: 12 }, (_, index) => {
      const d = new Date(selectedContext.year, index, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return {
        label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
        amount: Number(totals[key] || 0),
        isSelectedMonth: d.getMonth() === selectedContext.month
      };
    });
  }, [selectedContext.month, selectedContext.year, yearExpenses]);

  const selectedMonthLabelForView = useMemo(
    () => twelveMonthChartData.find((m) => m.isSelectedMonth)?.label || null,
    [twelveMonthChartData]
  );

  const diff = monthlyTotal - lastMonthSummary.total;
  const percentChange =
    lastMonthSummary.total > 0 ? ((diff / lastMonthSummary.total) * 100).toFixed(1) : "0.0";

  const resetFilters = () => {
    setFilterMonth("");
    setFilterYear("");
    setFilterDate(null);
  };

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <h1 className="page-title">Reports & Analytics</h1>

        <div className="report-time-filters">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`time-filter-btn ${timeFilter === f.key ? "active" : ""}`}
              onClick={() => {
                setTimeFilter(f.key);
                setClickedMonthlyExpense(null);
                setClickedDailyExpense(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="report-filters">
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setFilterDate(null);
            }}
          >
            <option value="">Month</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setFilterDate(null);
            }}
          >
            <option value="">Year</option>
            <option>2023</option>
            <option>2024</option>
            <option>2025</option>
            <option>2026</option>
          </select>

          <DatePicker
            selected={filterDate}
            onChange={(selectedDate) => {
              setFilterDate(selectedDate);
              setFilterMonth("");
              setFilterYear("");
            }}
            dateFormat="MM/dd/yyyy"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            showPopperArrow={false}
            maxDate={new Date()}
            todayButton="Today"
            isClearable
            className="date-picker-input"
            calendarClassName="modern-calendar"
            placeholderText="Select date"
            dayClassName={(day) => (hasExpenseOnDate(day) ? "expense-day-highlight" : undefined)}
          />
          <button onClick={resetFilters}>Reset</button>
        </div>

        <div className="report-cards">
          <div className="report-card">
            <h3>This Month ({currentMonthLabel})</h3>
            <h2>{money(monthlyTotal)}</h2>
          </div>

          <div className="report-card">
            <h3>Compared With ({lastMonthSummary.label})</h3>
            <h2>{money(lastMonthSummary.total)}</h2>
          </div>

          <div className="report-card">
            <h3>Transactions</h3>
            <h2>{transactions}</h2>
          </div>

          <div className="report-card">
            <h3>Top Category</h3>
            <h2>{topCategory}</h2>
          </div>

          <div className="report-card">
            <h3>Comparison</h3>
            <h2 style={{ color: diff >= 0 ? "#22c55e" : "#ef4444" }}>
              {diff >= 0 ? "Up" : "Down"} {percentChange}% ({money(diff)})
            </h2>
          </div>
        </div>

        <div className="charts-container report-chart-grid">
          {(timeFilter === "weekly" || timeFilter === "all") && (
            <div className="report-chart-card report-chart-card--wide">
              <div className="report-chart-header">
                <h3>Weekly Trend</h3>
                <div className="chart-mode-buttons">
                  {CHART_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`chart-mode-btn ${trendMode === mode ? "active" : ""}`}
                      onClick={() => setTrendMode(mode)}
                    >
                      {mode === "both" ? "Both" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">7 days shown. Days with no expense stay at 0.</p>
                  <ResponsiveContainer width="100%" height={290}>
                    <ComposedChart data={weeklyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="dayLabel" interval={0} tick={{ fill: "#fafcff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(value) => money(value)}
                        tick={{ fill: "#fefeff", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(value) => money(value)} contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }} />
                      <Legend />
                      {(trendMode === "bar" || trendMode === "both") && (
                        <Bar dataKey="amount" name="Weekly Total (Bar)" radius={[6, 6, 0, 0]} animationDuration={800} fill="#38bdf8" />
                      )}
                      {(trendMode === "line" || trendMode === "both") && (
                        <Line type="monotone" dataKey="amount" name="Weekly Total (Line)" stroke="#22d3ee" strokeWidth={3} animationDuration={900} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {(timeFilter === "weekly" || timeFilter === "all") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Weekly Expense Scatter</h3>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">
                    Each dot represents an expense in the selected week.
                  </p>

                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 16 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                      <XAxis
                        type="category"
                        dataKey="day"
                        tick={{ fill: "#fafcff", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tickFormatter={(value) => money(value)}
                        tick={{ fill: "#fefeff", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip formatter={(value) => money(value)} />

                      <Scatter
                        data={weeklyExpenses.map((e, i) => {
                          const d = new Date(e.date || e.createdAt);
                          return {
                            day: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()],
                            amount: Number(e.amount || 0),
                            dotColor: getExpenseDotColor(e._id || i),
                            raw: e
                          };
                        })}
                        shape={(props) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill={payload.dotColor}
                              stroke="#0f172a"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {(timeFilter === "all" || timeFilter === "monthly") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Daily Expenses ({currentMonthLabel})</h3>
                <div className="chart-mode-buttons">
                  {CHART_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`chart-mode-btn ${dailyMode === mode ? "active" : ""}`}
                      onClick={() => setDailyMode(mode)}
                    >
                      {mode === "both" ? "Both" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">All days of the month are shown. Days with no expense stay at 0.</p>
                  <ResponsiveContainer width="100%" height={290}>
                    <ComposedChart data={dailyTotalsChartData} margin={{ top: 20, right: 20, left: 0, bottom: 16 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(day) =>
                          formatDateMMDD(new Date(selectedContext.year, selectedContext.month, Number(day || 1)))
                        }
                        interval="preserveStartEnd"
                        minTickGap={20}
                        tick={{ fill: "#fafcff", fontSize: 11 }}
                        textAnchor="end"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        dataKey="amount"
                        tickFormatter={(value) => money(value)}
                        tick={{ fill: "#fefeff", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => money(value)}
                        labelFormatter={(label) => {
                          const day = Number(label);
                          if (!Number.isFinite(day)) return String(label);
                          const d = new Date(selectedContext.year, selectedContext.month, day);
                          return formatDateMMDDYYYY(d);
                        }}
                        contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                      />
                      <Legend />
                      {selectedDayForMonthView && (
                        <ReferenceLine x={selectedDayForMonthView} stroke="#facc15" strokeDasharray="4 4" />
                      )}
                      {(dailyMode === "bar" || dailyMode === "both") && (
                        <Bar dataKey="amount" name="Daily Total (Bar)" radius={[6, 6, 0, 0]} animationDuration={800} fill="#38bdf8" />
                      )}
                      {(dailyMode === "line" || dailyMode === "both") && (
                        <Line type="monotone" dataKey="amount" name="Daily Total (Line)" stroke="#ee22eb" strokeWidth={3} animationDuration={900} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {(!TEMP_DISABLE_MONTHLY_SCATTER && (timeFilter === "all" || timeFilter === "monthly")) && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Monthly Expense Scatter</h3>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <div className="category-filter-row">
                    <button
                      type="button"
                      className={`category-filter-btn ${scatterCategoryFilters.length === 0 ? "active" : ""}`}
                      onClick={() => {
                        setScatterCategoryFilters([]);
                        setClickedMonthlyExpense(null);
                      }}
                      title="Show all categories"
                    >
                      All
                    </button>
                    {availableScatterCategories.map((c) => {
                      const isActive = scatterCategoryFilters.includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          className={`category-filter-btn ${isActive ? "active" : ""}`}
                          onClick={() => {
                            setClickedMonthlyExpense(null);
                            setScatterCategoryFilters((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.key)) next.delete(c.key);
                              else next.add(c.key);
                              return Array.from(next);
                            });
                          }}
                          title={`Toggle ${c.label}`}
                        >
                          <span className="category-color-dot" style={{ background: c.color }} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="chart-note">Each dot is an expense. Click a dot to view details. Use the buttons above to select multiple types.</p>
                  {clickedMonthlyExpense && (
                    <div className="chart-click-tooltip">
                      <div><strong>Amount:</strong> {money(clickedMonthlyExpense.amount)}</div>
                      <div><strong>Category:</strong> {clickedMonthlyExpense.category}</div>
                      <div><strong>Date:</strong> {formatDateMMDDYYYY(clickedMonthlyExpense.dateValue)}</div>
                    </div>
                  )}

                  {filteredMonthlyScatterData.length === 0 ? (
                    <p className="chart-note">No expenses for the selected types in this month.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 16 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="day"
                          domain={[1, new Date(selectedContext.year, selectedContext.month + 1, 0).getDate()]}
                          tickFormatter={(day) =>
                            formatDateMMDD(new Date(selectedContext.year, selectedContext.month, Number(day || 1)))
                          }
                          interval="preserveStartEnd"
                          minTickGap={25}
                          tick={{ fill: "#fafcff", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis type="number" dataKey="amount" tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={() => null} />
                        <Scatter
                          name="Expenses"
                          data={filteredMonthlyScatterData}
                          shape={(props) => {
                            const { cx, cy, payload } = props;
                            const fill = payload.dotColor || getCategoryColor(payload.category);
                            const stroke = payload?.raw?._id === clickedMonthlyExpense?.raw?._id ? "#ffffff" : "#0f172a";
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={2}
                                style={{ cursor: "pointer" }}
                                onClick={() => setClickedMonthlyExpense(payload)}
                              />
                            );
                          }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          )}

          {(timeFilter === "all" || timeFilter === "daily") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Daily Spending Distribution</h3>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">
                    X-axis shows all dates in {currentMonthLabel}. Y-axis shows expense amount.
                    {filterDate ? ` Selected date ${formatDateMMDDYYYY(filterDate)} is highlighted.` : ""}
                  </p>
                  {clickedDailyExpense && (
                    <div className="chart-click-tooltip">
                      <div><strong>Amount:</strong> {money(clickedDailyExpense.amount)}</div>
                      <div><strong>Category:</strong> {clickedDailyExpense.category}</div>
                      <div><strong>Date:</strong> {formatDateMMDDYYYY(clickedDailyExpense.dateValue)}</div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 16 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="day"
                        domain={[1, new Date(selectedContext.year, selectedContext.month + 1, 0).getDate()]}
                        tickFormatter={(day) =>
                          formatDateMMDD(new Date(selectedContext.year, selectedContext.month, Number(day || 1)))
                        }
                        interval="preserveStartEnd"
                        minTickGap={25}
                        tick={{ fill: "#fafcff", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis type="number" dataKey="amount" tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={() => null} />
                      {selectedDayForMonthView && (
                        <ReferenceLine x={selectedDayForMonthView} stroke="#facc15" strokeDasharray="4 4" />
                      )}
                      <Scatter
                        name="Expenses"
                        data={dailySpendingScatterData}
                        shape={(props) => {
                          const { cx, cy, payload } = props;
                          const fill = payload.dotColor || "#22ee47";
                          const stroke = payload?.raw?._id === clickedDailyExpense?.raw?._id
                            ? "#ffffff"
                            : payload.isSelectedDate
                              ? "#facc15"
                              : "#0f172a";
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill={fill}
                              opacity={payload.isNew ? 0.55 : 1}
                              stroke={stroke}
                              strokeWidth={payload.isSelectedDate ? 2 : 1.5}
                              style={{ cursor: "pointer" }}
                              onClick={() => setClickedDailyExpense(payload)}
                            />
                          );
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          <div className="report-chart-card report-chart-card--third">
            <h3>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={isCompactPie ? 300 : 340}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx={"50%" }
                  cy={"50%" }
                  innerRadius={isCompactPie ? "26%" : "30%"}
                  outerRadius={isCompactPie ? "42%" : "54%"}
                  dataKey="value"
                  paddingAngle={3}
                  labelLine={!isCompactPie}
                  label={({ percent }) => (percent > 0.07 ? `${(percent * 100).toFixed(0)}%` : "")}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                  <Label
                    value={money(categoryScopeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                    position="center"
                    style={{ fontSize: "20px", fontWeight: "700", fill: "#fdfdfd", textAnchor: "middle", textAlign: "center" }}
                  />
                </Pie>
                <Tooltip formatter={(value) => money(value)} contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }} />
                <Legend
                  layout={isCompactPie ? "horizontal" : "vertical"}
                  align={isCompactPie ? "center" : "right"}
                  verticalAlign={isCompactPie ? "bottom" : "middle"}
                  wrapperStyle={{ paddingLeft: isCompactPie ? "0px" : "10px", fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {(!TEMP_DISABLE_TWELVE_MONTH_TREND && (timeFilter === "all" || timeFilter === "yearly")) && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>12 Months Trend (Selected Year)</h3>
                <div className="chart-mode-buttons">
                  {CHART_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`chart-mode-btn ${monthMode === mode ? "active" : ""}`}
                      onClick={() => setMonthMode(mode)}
                    >
                      {mode === "both" ? "Both" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <p className="chart-note">Jan to Dec of selected year are shown. Months with no expense stay at 0.</p>

              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={twelveMonthChartData} margin={{ top: 20, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    minTickGap={20}
                    tick={{ fill: "#fafcff", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => money(value)}
                    tick={{ fill: "#fefeff", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => money(value)} labelFormatter={(value) => value} contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }} />
                  <Legend />
                  {selectedMonthLabelForView && <ReferenceLine x={selectedMonthLabelForView} stroke="#facc15" strokeDasharray="4 4" />}

                  {(monthMode === "bar" || monthMode === "both") && (
                    <Bar dataKey="amount" name="Monthly Total (Bar)" radius={[6, 6, 0, 0]}>
                      {twelveMonthChartData.map((entry, index) => (
                        <Cell key={`month-bar-${entry.label}-${index}`} fill={entry.isSelectedMonth ? "#facc15" : "#4ade80"} />
                      ))}
                    </Bar>
                  )}

                  {(monthMode === "line" || monthMode === "both") && (
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Monthly Total (Line)"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      dot={({ cx, cy, payload }) => (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={payload?.isSelectedMonth ? 6 : 4}
                          fill={payload?.isSelectedMonth ? "#facc15" : "#22d3ee"}
                          stroke={payload?.isSelectedMonth ? "#fff" : "#0f172a"}
                          strokeWidth={payload?.isSelectedMonth ? 2 : 1}
                        />
                      )}
                      activeDot={{ r: 6, fill: "#facc15", stroke: "#fff", strokeWidth: 2 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
