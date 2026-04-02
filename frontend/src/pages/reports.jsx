import { useEffect, useMemo, useState } from "react";
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
  BarChart,
  Bar,
  Line,
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
const STACK_VIEW_MODES = ["stack", "scatter", "both"];

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

const getDayOnlyLabel = (dateValue) => {
  if (!isValidDate(dateValue)) return "";
  return String(dateValue.getDate()).padStart(2, "0");
};

const getCategoryColor = (category) => {
  const c = String(category || "").trim().toLowerCase();
  if (c === "food") return "#f97316";
  if (c === "transport") return "#3b82f6";
  if (c === "shopping") return "#a855f7";
  if (c === "bills") return "#ef4444";
  if (c === "entertainment") return "#22c55e";
  if (c === "others" || c === "other") return "#94a3b8";

  const s = c || "others";
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 75%, 60%)`;
};

export default function Reports() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [trendMode, setTrendMode] = useState("line");
  const [monthMode, setMonthMode] = useState("line");
  const [monthlySummaryMode, setMonthlySummaryMode] = useState("line");
  const [weeklyExpenseMode, setWeeklyExpenseMode] = useState("stack");
  const [dailyExpenseMode, setDailyExpenseMode] = useState("stack");
  const [monthlyExpenseMode, setMonthlyExpenseMode] = useState("stack");

  const TEMP_DISABLE_TWELVE_MONTH_TREND = true;

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState(null);

  const [rangeExpenses, setRangeExpenses] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [isCompactPie, setIsCompactPie] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : false
  );

  const { hasExpenseOnDate } = useExpenseDateHighlights();

  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(value || 0));

  const renderNonZeroScatterDot = ({ cx, cy, fill, payload, dataKey }) => {
    const value = Number(payload?.[dataKey] || 0);
    if (!Number.isFinite(value) || value <= 0) return null;
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={fill} />;
  };


  const renderExpenseTooltip = (props, formatLabel) => {
    const { active, payload, label } = props || {};
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const valueByCategory = new Map();

    payload.forEach((entry) => {
      const rawName = String(entry?.name || entry?.dataKey || "").trim();
      const normalized = rawName.replace(/\s*\(Scatter\)\s*$/i, "").trim();
      if (!normalized) return;
      if (normalized === "day" || normalized === "weekIndex" || normalized === "monthLabel") return;

      const value = Number(entry?.value || 0);
      if (!Number.isFinite(value) || value <= 0) return;

      const existing = valueByCategory.get(normalized);
      if (!existing || value > existing.value) {
        valueByCategory.set(normalized, { value, color: getCategoryColor(normalized) });
      }
    });

    const rows = Array.from(valueByCategory.entries()).sort((a, b) => b[1].value - a[1].value);
    if (!rows.length) return null;

    const title = typeof formatLabel === "function" ? formatLabel(label) : String(label ?? "");

    return (
      <div className="chart-click-tooltip" style={{ margin: 0, minWidth: 220 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>{title}</div>
        <div style={{ display: "grid", gap: 4 }}>
          {rows.map(([name, meta]) => (
            <div key={`tt-${name}`} style={{ color: meta.color, fontWeight: 600 }}>
              {name}: {money(meta.value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

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

  const fourWeekWindow = useMemo(() => {
    const base = filterDate
      ? new Date(filterDate)
      : new Date(selectedContext.year, selectedContext.month, 1);
    const rangeEnd = toStartOfDay(base);
    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeEnd.getDate() - 27);
    return { rangeStart, rangeEnd };
  }, [filterDate, selectedContext.month, selectedContext.year]);

  const fourWeekExpenses = useMemo(() => {
    const { rangeStart, rangeEnd } = fourWeekWindow;
    const endMs = rangeEnd.getTime() + 24 * 60 * 60 * 1000;
    return rangeExpenses.filter((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return false;
      const t = d.getTime();
      return t >= rangeStart.getTime() && t < endMs;
    });
  }, [rangeExpenses, fourWeekWindow]);

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
    if (timeFilter === "weekly") return fourWeekExpenses;
    if (timeFilter === "yearly") return yearExpenses;
    return monthExpenses;
  }, [fourWeekExpenses, monthExpenses, selectedDayExpenses, timeFilter, yearExpenses]);

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

  const weeklyTrendData = useMemo(() => {
    const rows = Array.from({ length: 4 }, (_, weekIdx) => {
      const startDate = new Date(fourWeekWindow.rangeStart);
      startDate.setDate(fourWeekWindow.rangeStart.getDate() + weekIdx * 7);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return {
        weekIndex: weekIdx + 1,
        rangeLabel: `${getDayOnlyLabel(startDate)}-${getDayOnlyLabel(endDate)}`,
        startDate,
        endDate,
        amount: 0
      };
    });

    fourWeekExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const diffDays = Math.floor(
        (toStartOfDay(d).getTime() - fourWeekWindow.rangeStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      const weekIdx = Math.floor(diffDays / 7);
      if (weekIdx < 0 || weekIdx > 3) return;
      rows[weekIdx].amount += Number(expense.amount || 0);
    });

    return rows;
  }, [fourWeekExpenses, fourWeekWindow.rangeStart]);

  const weeklyStackCategories = useMemo(() => {
    const set = new Set();
    fourWeekExpenses.forEach((expense) => set.add(expense.category || "Others"));
    return Array.from(set);
  }, [fourWeekExpenses]);

  const weeklyStackedData = useMemo(() => {
    const rows = Array.from({ length: 4 }, (_, weekIdx) => {
      const startDate = new Date(fourWeekWindow.rangeStart);
      startDate.setDate(fourWeekWindow.rangeStart.getDate() + weekIdx * 7);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      const base = {
        weekIndex: weekIdx + 1,
        rangeLabel: `${getDayOnlyLabel(startDate)}-${getDayOnlyLabel(endDate)}`,
        startDate,
        endDate
      };
      weeklyStackCategories.forEach((cat) => {
        base[cat] = 0;
      });
      return base;
    });

    fourWeekExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const diffDays = Math.floor(
        (toStartOfDay(d).getTime() - fourWeekWindow.rangeStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      const weekIdx = Math.floor(diffDays / 7);
      if (weekIdx < 0 || weekIdx > 3) return;
      const category = expense.category || "Others";
      rows[weekIdx][category] = Number(rows[weekIdx][category] || 0) + Number(expense.amount || 0);
    });

    return rows;
  }, [fourWeekExpenses, fourWeekWindow.rangeStart, weeklyStackCategories]);

  const dailyStackCategories = useMemo(() => {
    const set = new Set();
    monthExpenses.forEach((expense) => set.add(expense.category || "Others"));
    return Array.from(set);
  }, [monthExpenses]);

  const dailyStackedData = useMemo(() => {
    const daysInMonth = new Date(selectedContext.year, selectedContext.month + 1, 0).getDate();
    const rows = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      const dateValue = new Date(selectedContext.year, selectedContext.month, day);
      const base = { day, dayLabel: getDayOnlyLabel(dateValue), dateValue };
      dailyStackCategories.forEach((cat) => {
        base[cat] = 0;
      });
      return base;
    });

    monthExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const dayIndex = d.getDate() - 1;
      const category = expense.category || "Others";
      rows[dayIndex][category] = Number(rows[dayIndex][category] || 0) + Number(expense.amount || 0);
    });

    return rows;
  }, [dailyStackCategories, monthExpenses, selectedContext.month, selectedContext.year]);
  const monthlyStackCategories = useMemo(() => {
    const set = new Set();
    yearExpenses.forEach((expense) => set.add(expense.category || "Others"));
    return Array.from(set);
  }, [yearExpenses]);

  const monthlyStackedData = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, idx) => {
      const dateValue = new Date(selectedContext.year, idx, 1);
      const base = {
        monthIndex: idx + 1,
        monthLabel: dateValue.toLocaleString("en-US", { month: "short" }),
        dateValue
      };
      monthlyStackCategories.forEach((cat) => {
        base[cat] = 0;
      });
      return base;
    });

    yearExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const monthIdx = d.getMonth();
      const category = expense.category || "Others";
      rows[monthIdx][category] = Number(rows[monthIdx][category] || 0) + Number(expense.amount || 0);
    });

    return rows;
  }, [monthlyStackCategories, selectedContext.year, yearExpenses]);

  const weeklyStackedChartData = useMemo(() => {
    return weeklyStackedData.map((row) => ({
      ...row,
      total: weeklyStackCategories.reduce((sum, category) => sum + Number(row[category] || 0), 0)
    }));
  }, [weeklyStackCategories, weeklyStackedData]);

  const dailyStackedChartData = useMemo(() => {
    return dailyStackedData.map((row) => ({
      ...row,
      total: dailyStackCategories.reduce((sum, category) => sum + Number(row[category] || 0), 0)
    }));
  }, [dailyStackCategories, dailyStackedData]);

  const monthlyStackedChartData = useMemo(() => {
    return monthlyStackedData.map((row) => ({
      ...row,
      total: monthlyStackCategories.reduce((sum, category) => sum + Number(row[category] || 0), 0)
    }));
  }, [monthlyStackCategories, monthlyStackedData]);

  const topExpenseStackData = useMemo(() => {
    const map = {};
    monthExpenses.forEach((expense) => {
      const category = expense.category || "Others";
      map[category] = (map[category] || 0) + Number(expense.amount || 0);
    });

    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount: Number(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const monthlyTrendData = useMemo(() => {
    const daysInMonth = new Date(selectedContext.year, selectedContext.month + 1, 0).getDate();
    const rows = Array.from({ length: 4 }, (_, weekIdx) => {
      const startDay = weekIdx * 7 + 1;
      const endDay = weekIdx === 3 ? daysInMonth : Math.min(daysInMonth, startDay + 6);
      return {
        weekIndex: weekIdx + 1,
        rangeLabel: `${String(startDay).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
        amount: 0
      };
    });

    monthExpenses.forEach((expense) => {
      const d = new Date(expense.date || expense.createdAt);
      if (!isValidDate(d)) return;
      const day = d.getDate();
      const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
      rows[weekIdx].amount += Number(expense.amount || 0);
    });

    return rows;
  }, [monthExpenses, selectedContext.month, selectedContext.year]);

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

  const diff = monthlyTotal - lastMonthSummary.total;
  const percentChange =
    lastMonthSummary.total > 0 ? ((diff / lastMonthSummary.total) * 100).toFixed(1) : "0.0";


  const noExpenseDays = useMemo(() => {
    return dailyStackedData.filter((row) => {
      const total = dailyStackCategories.reduce((sum, category) => {
        return sum + Number(row[category] || 0);
      }, 0);
      return total === 0;
    }).length;
  }, [dailyStackCategories, dailyStackedData]);

  const monthlyHighestExpense = useMemo(() => {
    let amount = 0;
    let category = "None";
    let date = "-";

    monthExpenses.forEach((expense) => {
      const value = Number(expense.amount || 0);
      if (value > amount) {
        amount = value;
        category = expense.category || "Others";
        const d = new Date(expense.date || expense.createdAt);
        date = isValidDate(d) ? formatDateMMDDYYYY(d) : "-";
      }
    });

    return { amount, category, date };
  }, [monthExpenses]);

  const alerts = useMemo(() => {
    const items = [];

    if (lastMonthSummary.total > 0) {
      const change = ((monthlyTotal - lastMonthSummary.total) / lastMonthSummary.total) * 100;
      items.push({
        level: change < 0 ? "warn" : "info",
        text: `Month vs last month: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
      });
    }

    if (monthlyHighestExpense.amount > 0) {
      items.push({
        level: "info",
        text: `Highest expense: ${money(monthlyHighestExpense.amount)} (${monthlyHighestExpense.category}) on ${monthlyHighestExpense.date}`
      });
    }

    items.push({
      level: noExpenseDays > 0 ? "warn" : "ok",
      text: `No-expense days in This month: ${noExpenseDays}`
    });

    return items;
  }, [lastMonthSummary.total, money, monthlyHighestExpense, monthlyTotal, noExpenseDays]);
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
              onClick={() => setTimeFilter(f.key)}
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
            placeholderText="Select date"
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
                    {(timeFilter === "all" || timeFilter === "weekly" || timeFilter === "monthly") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Alerts</h3>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">Quick monthly alert summary.</p>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {alerts.map((alert, idx) => (
                      <div
                        key={`alert-${idx}`}
                        className="chart-click-tooltip"
                        style={{
                          margin: 0,
                          borderColor:
                            alert.level === "warn"
                              ? "rgba(248,113,113,0.55)"
                              : alert.level === "ok"
                                ? "rgba(74,222,128,0.55)"
                                : "rgba(56,189,248,0.55)"
                        }}
                      >
                        {alert.text}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {(timeFilter === "all" || timeFilter === "monthly") && (
            <div className="report-chart-card report-chart-card--wide report-chart-card--daily">
              <div className="report-chart-header">
                <h3>Daily Trend ({currentMonthLabel})</h3>
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

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : (
                <>
                  <p className="chart-note">All days in selected month are shown (30/31). Days with no expense stay at 0.</p>
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={dailyStackedChartData} margin={{ top: 20, right: 20, left: 0, bottom: 22 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        interval={0}
                        tickFormatter={(day) => String(day).padStart(2, "0")}
                        tick={{ fill: "#fafcff", fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        height={54}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => money(value)}
                        labelFormatter={(day) => {
                          const d = new Date(selectedContext.year, selectedContext.month, Number(day));
                          return formatDateMMDDYYYY(d);
                        }}
                        contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                      />
                      <Legend />
                      {(monthMode === "bar" || monthMode === "both") && (
                        <Bar dataKey="total" name="Daily Total (Bar)" radius={[6, 6, 0, 0]} animationDuration={800} fill="#7c3aed" />
                      )}
                      {(monthMode === "line" || monthMode === "both") && (
                        <Line type="monotone" dataKey="total" name="Daily Total (Line)" stroke="#1bc86c" strokeWidth={3} animationDuration={900} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
          {(timeFilter === "all" || timeFilter === "monthly" || timeFilter === "yearly") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Monthly Line/Bar Overview</h3>
                <div className="chart-mode-buttons">
                  {CHART_MODES.map((mode) => (
                    <button
                      key={`monthly-summary-${mode}`}
                      type="button"
                      className={`chart-mode-btn ${monthlySummaryMode === mode ? "active" : ""}`}
                      onClick={() => setMonthlySummaryMode(mode)}
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
                  <p className="chart-note">12-month totals view. Switch between line, bar, or both.</p>
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={monthlyStackedChartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="monthLabel"
                        interval={0}
                        tick={{ fill: "#fafcff", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => money(value)}
                        labelFormatter={(monthLabel) => `${monthLabel} ${selectedContext.year}`}
                        contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                      />
                      <Legend />

                      {(monthlySummaryMode === "bar" || monthlySummaryMode === "both") && (
                        <Bar dataKey="total" name="Monthly Total (Bar)" radius={[6, 6, 0, 0]} animationDuration={800} fill="#38bdf8" />
                      )}

                      {(monthlySummaryMode === "line" || monthlySummaryMode === "both") && (
                        <Line type="monotone" dataKey="total" name="Monthly Total (Line)" stroke="#ee229c" strokeWidth={3} animationDuration={900} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {(timeFilter === "all" || timeFilter === "monthly") && (
            <div className="report-chart-card report-chart-card--wide report-chart-card--daily">
              <div className="report-chart-header">
                <h3>Daily Expenses ({currentMonthLabel})</h3>
                <div className="chart-mode-buttons">
                  {STACK_VIEW_MODES.map((mode) => (
                    <button
                      key={`daily-expense-mode-${mode}`}
                      type="button"
                      className={`chart-mode-btn ${dailyExpenseMode === mode ? "active" : ""}`}
                      onClick={() => setDailyExpenseMode(mode)}
                    >
                      {mode === "both" ? "Both" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : dailyStackCategories.length === 0 ? (
                <p className="chart-note">No expenses found for this month.</p>
              ) : (
                <>
                  <p className="chart-note">Switch view: stacked categories, category-wise scatter points, or both together.</p>
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={dailyStackedChartData} margin={{ top: 20, right: 20, left: 0, bottom: 28 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        interval={0}
                        tickFormatter={(day) => String(day).padStart(2, "0")}
                        tick={{ fill: "#fafcff", fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        height={56}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        content={(props) =>
                          renderExpenseTooltip(props, (day) => {
                            const d = new Date(selectedContext.year, selectedContext.month, Number(day));
                            return formatDateMMDDYYYY(d);
                          })
                        }
                      />
                      <Legend />
                      {(dailyExpenseMode === "stack" || dailyExpenseMode === "both") && dailyStackCategories.map((category) => (
                        <Bar
                          key={`daily-${category}`}
                          dataKey={category}
                          stackId="daily"
                          fill={getCategoryColor(category)}
                          name={category}
                        />
                      ))}
                      {(dailyExpenseMode === "scatter" || dailyExpenseMode === "both") && dailyStackCategories.map((category) => (
                        <Scatter
                          key={`daily-scatter-${category}`}
                          dataKey={category}
                          name={`${category} (Scatter)`}
                          fill={getCategoryColor(category)}
                          stroke={getCategoryColor(category)}
                          shape={(props) => renderNonZeroScatterDot({ ...props, dataKey: category })}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

                    {(timeFilter === "all" || timeFilter === "monthly" || timeFilter === "yearly") && (
            <div className="report-chart-card report-chart-card--third">
              <div className="report-chart-header">
                <h3>Monthly Expenses (12 Months)</h3>
                <div className="chart-mode-buttons">
                  {STACK_VIEW_MODES.map((mode) => (
                    <button
                      key={`monthly-expense-mode-${mode}`}
                      type="button"
                      className={`chart-mode-btn ${monthlyExpenseMode === mode ? "active" : ""}`}
                      onClick={() => setMonthlyExpenseMode(mode)}
                    >
                      {mode === "both" ? "Both" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : monthlyStackCategories.length === 0 ? (
                <p className="chart-note">No expenses found for selected year.</p>
              ) : (
                <>
                  <p className="chart-note">Switch view: stacked categories, category-wise scatter points, or both together for all 12 months.</p>
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={monthlyStackedChartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="monthLabel"
                        interval={0}
                        tick={{ fill: "#fafcff", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        content={(props) =>
                          renderExpenseTooltip(props, (monthLabel) => `${monthLabel} ${selectedContext.year}`)
                        }
                      />
                      <Legend />
                      {(monthlyExpenseMode === "stack" || monthlyExpenseMode === "both") && monthlyStackCategories.map((category) => (
                        <Bar
                          key={`monthly-${category}`}
                          dataKey={category}
                          stackId="monthly"
                          fill={getCategoryColor(category)}
                          name={category}
                        />
                      ))}
                      {(monthlyExpenseMode === "scatter" || monthlyExpenseMode === "both") && monthlyStackCategories.map((category) => (
                        <Scatter
                          key={`monthly-scatter-${category}`}
                          dataKey={category}
                          name={`${category} (Scatter)`}
                          fill={getCategoryColor(category)}
                          stroke={getCategoryColor(category)}
                          shape={(props) => renderNonZeroScatterDot({ ...props, dataKey: category })}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {(timeFilter === "all" || timeFilter === "monthly") && (
            <div className="report-chart-card report-chart-card--wide report-chart-card--daily">
              <div className="report-chart-header">
                <h3>Top Expense Stack (High To Low)</h3>
              </div>

              {rangeLoading ? (
                <p className="chart-note">Loading...</p>
              ) : topExpenseStackData.length === 0 ? (
                <p className="chart-note">No expenses found for this month.</p>
              ) : (
                <>
                  <p className="chart-note">Highest categories are shown at the top and lowest at the bottom.</p>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart layout="vertical" data={topExpenseStackData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fill: "#fefeff", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={90}
                        tick={{ fill: "#fafcff", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const category = item?.payload?.category || "Others";
                          return [
                            <span style={{ color: getCategoryColor(category), fontWeight: 700 }}>
                              {money(value)}
                            </span>,
                            "Expense Amount"
                          ];
                        }}
                        labelFormatter={(label) => (
                          <span style={{ color: getCategoryColor(String(label || "")), fontWeight: 700 }}>
                            {`Category: ${label}`}
                          </span>
                        )}
                        itemStyle={{ color: "#e2e8f0" }}
                        contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                      />
                      <Legend
                        payload={topExpenseStackData.map((entry) => ({
                          value: entry.category,
                          type: "square",
                          color: getCategoryColor(entry.category)
                        }))}
                      />
                      <Bar dataKey="amount" name="Expense Amount" radius={[0, 8, 8, 0]} fill="#64748b">
                        {topExpenseStackData.map((entry, index) => (
                          <Cell key={`top-expense-${entry.category}-${index}`} fill={getCategoryColor(entry.category)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
          <div className="report-chart-card report-chart-card--third">
            <h3>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={isCompactPie ? 360 : 420}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx={"50%"}
                  cy={"50%"}
                  innerRadius={isCompactPie ? "28%" : "34%"}
                  outerRadius={isCompactPie ? "45%" : "62%"}
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
                    style={{ fontSize: "15px", fontWeight: "700", fill: "#fdfdfd", textAnchor: "middle", textAlign: "center" }}
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
            <div className="report-chart-card report-chart-card--full">
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
                  <XAxis dataKey="label" interval={0} angle={-17} height={56} textAnchor="end" tick={{ fill: "#fafcff", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#fefeff", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => money(value)} labelFormatter={(value) => value} contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }} />
                  <Legend />

                  {(monthMode === "bar" || monthMode === "both") && (
                    <Bar dataKey="amount" name="Monthly Total (Bar)" radius={[6, 6, 0, 0]} fill="#4ade80" />
                  )}

                  {(monthMode === "line" || monthMode === "both") && (
                    <Line type="monotone" dataKey="amount" name="Monthly Total (Line)" stroke="#22d3ee" strokeWidth={3} />
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










































