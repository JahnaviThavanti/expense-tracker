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
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
  ReferenceLine
} from "recharts";

const DAILY_GRAPH_MODES = ["line", "bar", "both"];
const MONTH_GRAPH_MODES = ["line", "bar", "both"];
const COLORS = [
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
  const day = String(dateValue.getDate()).padStart(2, "0");
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const year = dateValue.getFullYear();
  return `${day}/${month}/${year}`;
};

const getMonthName = (month, year) =>
  new Date(year, month, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

export default function Reports() {
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [lastMonthLabel, setLastMonthLabel] = useState("No data");
  const [currentMonthLabel, setCurrentMonthLabel] = useState("");
  const [topCategory, setTopCategory] = useState("None");
  const [transactions, setTransactions] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [dailyChartData, setDailyChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [twelveMonthChartData, setTwelveMonthChartData] = useState([]);

  const [dailyGraphMode, setDailyGraphMode] = useState("line");
  const [monthGraphMode, setMonthGraphMode] = useState("line");
  const [isCompactPie, setIsCompactPie] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : false
  );

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState(null);
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

  useEffect(() => {
    loadReport();
  }, [selectedContext.month, selectedContext.year, filterDate]);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactPie(window.innerWidth < 1200);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadReport = async () => {
    try {
      const selectedMonth = selectedContext.month;
      const selectedYear = selectedContext.year;
      setCurrentMonthLabel(getMonthName(selectedMonth, selectedYear));

      const monthRes = await API.get(
        `/expenses?limit=8000&month=${selectedMonth + 1}&year=${selectedYear}`
      );
      const monthRows = Array.isArray(monthRes.data) ? monthRes.data : [];

      const categoryMap = {};
      const dailyMap = {};
      let total = 0;
      let count = 0;

      monthRows.forEach((expense) => {
        const dateValue = new Date(expense.date || expense.createdAt);
        if (!isValidDate(dateValue)) return;

        const amount = Number(expense.amount || 0);
        total += amount;
        count += 1;

        const category = expense.category || "Other";
        categoryMap[category] = (categoryMap[category] || 0) + amount;

        const day = dateValue.getDate();
        dailyMap[day] = (dailyMap[day] || 0) + amount;
      });

      setMonthlyTotal(total);
      setTransactions(count);

      const categoryEntries = Object.keys(categoryMap).map((name) => ({
        name,
        value: categoryMap[name]
      }));
      setCategoryChartData(categoryEntries);

      let maxCategory = "None";
      let maxValue = 0;
      categoryEntries.forEach((entry) => {
        if (entry.value > maxValue) {
          maxValue = entry.value;
          maxCategory = entry.name;
        }
      });
      setTopCategory(maxCategory);

      const selectedDay =
        filterDate &&
        filterDate.getMonth() === selectedMonth &&
        filterDate.getFullYear() === selectedYear
          ? filterDate.getDate()
          : null;

      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const dailySeries = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        return {
          day,
          amount: Number(dailyMap[day] || 0),
          isSelected: selectedDay === day
        };
      });
      setDailyChartData(dailySeries);

      let previousTotal = 0;
      let previousLabel = "No data";
      for (let offset = 1; offset <= 12; offset += 1) {
        const d = new Date(selectedYear, selectedMonth - offset, 1);
        const res = await API.get(
          `/expenses?month=${d.getMonth() + 1}&year=${d.getFullYear()}&limit=8000`
        );
        const rows = Array.isArray(res.data) ? res.data : [];

        if (rows.length) {
          previousTotal = rows.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
          );
          previousLabel = getMonthName(d.getMonth(), d.getFullYear());
          break;
        }
      }
      setLastMonthTotal(previousTotal);
      setLastMonthLabel(previousLabel);

      const rangeStart = new Date(selectedYear, 0, 1);
      const rangeEnd = new Date(selectedYear, 11, 31);
      const rangeRes = await API.get("/expenses", {
        params: {
          startDate: formatDateForApi(rangeStart),
          endDate: formatDateForApi(rangeEnd),
          limit: 20000
        }
      });
      const rangeRows = Array.isArray(rangeRes.data) ? rangeRes.data : [];

      const monthlyTotalsMap = {};
      rangeRows.forEach((expense) => {
        const d = new Date(expense.date || expense.createdAt);
        if (!isValidDate(d)) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyTotalsMap[key] =
          (monthlyTotalsMap[key] || 0) + Number(expense.amount || 0);
      });

      const monthSeries = Array.from({ length: 12 }, (_, index) => {
        const d = new Date(selectedYear, index, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        return {
          label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
          amount: Number(monthlyTotalsMap[key] || 0),
          monthIndex: d.getMonth(),
          year: d.getFullYear(),
          isSelectedMonth:
            d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
        };
      });
      setTwelveMonthChartData(monthSeries);
    } catch (err) {
      console.log("Report error:", err);
      setMonthlyTotal(0);
      setLastMonthTotal(0);
      setLastMonthLabel("No data");
      setTransactions(0);
      setTopCategory("None");
      setDailyChartData([]);
      setCategoryChartData([]);
      setTwelveMonthChartData([]);
    }
  };

  const resetFilters = () => {
    setFilterMonth("");
    setFilterYear("");
    setFilterDate(null);
  };

  const diff = monthlyTotal - lastMonthTotal;
  const percentChange =
    lastMonthTotal > 0 ? ((diff / lastMonthTotal) * 100).toFixed(1) : "0.0";
  const selectedDayForView =
    dailyChartData.find((item) => item.isSelected)?.day || null;
  const selectedMonthLabelForView =
    twelveMonthChartData.find((item) => item.isSelectedMonth)?.label || null;

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <h1 className="page-title">Reports & Analytics</h1>

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
            dateFormat="dd/MM/yyyy"
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
            dayClassName={(day) =>
              hasExpenseOnDate(day) ? "expense-day-highlight" : undefined
            }
          />
          <button onClick={resetFilters}>Reset</button>
        </div>

        <div className="report-cards">
          <div className="report-card">
            <h3>This Month ({currentMonthLabel})</h3>
            <h2>{money(monthlyTotal)}</h2>
          </div>

          <div className="report-card">
            <h3>Compared With ({lastMonthLabel})</h3>
            <h2>{money(lastMonthTotal)}</h2>
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
          <div className="report-chart-card report-chart-card--wide">
            <div className="report-chart-header">
              <h3>Daily Expenses</h3>
              <div className="chart-mode-buttons">
                {DAILY_GRAPH_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`chart-mode-btn ${
                      dailyGraphMode === mode ? "active" : ""
                    }`}
                    onClick={() => setDailyGraphMode(mode)}
                  >
                    {mode === "both"
                      ? "Both"
                      : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filterDate && (
              <p className="chart-note">
                Showing monthly data for {currentMonthLabel}. Selected date{" "}
                {filterDate.toLocaleDateString("en-GB")} is highlighted.
              </p>
            )}

            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart
                data={dailyChartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  interval={0}
                  tick={{ fill: "#fafcff", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#fefeff", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => money(value)}
                  labelFormatter={(value) => `Day ${value}`}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff"
                  }}
                />
                <Legend />

                {selectedDayForView && (
                  <ReferenceLine
                    x={selectedDayForView}
                    stroke="#facc15"
                    strokeDasharray="4 4"
                  />
                )}

                {(dailyGraphMode === "bar" || dailyGraphMode === "both") && (
                  <Bar
                    dataKey="amount"
                    name="Daily Total (Bar)"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  >
                    {dailyChartData.map((entry, index) => (
                      <Cell
                        key={`daily-bar-${entry.day}-${index}`}
                        fill={entry.isSelected ? "#facc15" : "#38bdf8"}
                      />
                    ))}
                  </Bar>
                )}

                {(dailyGraphMode === "line" || dailyGraphMode === "both") && (
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Daily Total (Line)"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    animationDuration={900}
                    dot={({ cx, cy, payload }) => (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload?.isSelected ? 6 : 4}
                        fill={payload?.isSelected ? "#facc15" : "#22d3ee"}
                        stroke={payload?.isSelected ? "#fff" : "#0f172a"}
                        strokeWidth={payload?.isSelected ? 2 : 1}
                      />
                    )}
                    activeDot={{
                      r: 6,
                      fill: "#facc15",
                      stroke: "#fff",
                      strokeWidth: 2
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="report-chart-card report-chart-card--narrow">
            <h3>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={isCompactPie ? 360 : 420}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx={isCompactPie ? "50%" : "42%"}
                  cy={isCompactPie ? "44%" : "50%"}
                  innerRadius={isCompactPie ? "28%" : "34%"}
                  outerRadius={isCompactPie ? "45%" : "62%"}
                  dataKey="value"
                  paddingAngle={3}
                  labelLine={!isCompactPie}
                  label={({ percent }) =>
                    percent > 0.07 ? `${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}

                  <Label
                    value={money(monthlyTotal)}
                    position="center"
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      fill: "#fdfdfd"
                    }}
                  />
                </Pie>
                <Tooltip
                  formatter={(value) => money(value)}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff"
                  }}
                />
                <Legend
                  layout={isCompactPie ? "horizontal" : "vertical"}
                  align={isCompactPie ? "center" : "right"}
                  verticalAlign={isCompactPie ? "bottom" : "middle"}
                  wrapperStyle={{
                    paddingLeft: isCompactPie ? "0px" : "10px",
                    fontSize: "13px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="report-chart-card report-chart-card--full">
            <div className="report-chart-header">
              <h3>Last 12 Months Trend</h3>
              <div className="chart-mode-buttons">
                {MONTH_GRAPH_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`chart-mode-btn ${
                      monthGraphMode === mode ? "active" : ""
                    }`}
                    onClick={() => setMonthGraphMode(mode)}
                  >
                    {mode === "both"
                      ? "Both"
                      : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <p className="chart-note">
              Jan to Dec of selected year are shown. Months with no expense stay at 0.
            </p>

            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart
                data={twelveMonthChartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 30 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  interval={0}
                  angle={-17}
                  height={56}
                  textAnchor="end"
                  tick={{ fill: "#fafcff", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#fefeff", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => money(value)}
                  labelFormatter={(value) => value}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff"
                  }}
                />
                <Legend />

                {selectedMonthLabelForView && (
                  <ReferenceLine
                    x={selectedMonthLabelForView}
                    stroke="#facc15"
                    strokeDasharray="4 4"
                  />
                )}

                {(monthGraphMode === "bar" || monthGraphMode === "both") && (
                  <Bar dataKey="amount" name="Monthly Total (Bar)" radius={[6, 6, 0, 0]}>
                    {twelveMonthChartData.map((entry, index) => (
                      <Cell
                        key={`month-bar-${entry.label}-${index}`}
                        fill={entry.isSelectedMonth ? "#facc15" : "#4ade80"}
                      />
                    ))}
                  </Bar>
                )}

                {(monthGraphMode === "line" || monthGraphMode === "both") && (
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
                    activeDot={{
                      r: 6,
                      fill: "#facc15",
                      stroke: "#fff",
                      strokeWidth: 2
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
