import { useEffect, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-charts.css";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from "recharts";

export default function Reports() {

  const [expenses, setExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [lastMonthLabel, setLastMonthLabel] = useState("");
  const [currentMonthLabel, setCurrentMonthLabel] = useState("");
  const [topCategory, setTopCategory] = useState("None");
  const [transactions, setTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [dailyChartData, setDailyChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);

  const COLORS = ["#6C5DD3","#00C49F","#FFBB28","#FF8042","#AF19FF","#FF4560","#22c55e","#ef4444"];

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const money = (val) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(val || 0));

  const getMonthName = (month, year) =>
    new Date(year, month).toLocaleString("en-US", { month: "short", year: "numeric" });

  useEffect(() => {
    loadReport();
  }, [filterMonth, filterYear, filterDate]);

  const resetAllStates = () => {
    setMonthlyTotal(0);
    setLastMonthTotal(0);
    setTransactions(0);
    setTopCategory("None");
    setDailyChartData([]);
    setCategoryChartData([]);
  };

  const loadReport = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const selectedMonth = filterMonth ? Number(filterMonth) - 1 : now.getMonth();
      const selectedYear = filterYear ? Number(filterYear) : now.getFullYear();

      setCurrentMonthLabel(getMonthName(selectedMonth, selectedYear));

      let query = `/expenses?limit=8000`;

      if (filterDate) {
        query += `&date=${filterDate}`;
      } else {
        query += `&month=${selectedMonth + 1}&year=${selectedYear}`;
      }

      const res = await API.get(query);
      const data = Array.isArray(res.data) ? res.data : [];
      setExpenses(data);

      if (!data.length) {
        resetAllStates();
        setLastMonthLabel("No data");
        return;
      }

      let total = 0;
      let count = 0;
      let categoryMap = {};
      let dailyMap = {};

      data.forEach(e => {
        const d = new Date(e.date || e.createdAt);
        if (isNaN(d)) return;

        const amt = Number(e.amount || 0);

        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          total += amt;
          count++;

          const cat = e.category || "Other";
          categoryMap[cat] = (categoryMap[cat] || 0) + amt;

          const day = d.getDate();
          dailyMap[day] = (dailyMap[day] || 0) + amt;
        }
      });

      setMonthlyTotal(total);
      setTransactions(count);

      // AUTO FIND PREVIOUS MONTH WITH DATA
      let prevTotal = 0;
      let searchMonth = selectedMonth;
      let searchYear = selectedYear;

      for (let i = 0; i < 12; i++) {
        searchMonth--;
        if (searchMonth < 0) {
          searchMonth = 11;
          searchYear--;
        }

        const prevRes = await API.get(`/expenses?month=${searchMonth + 1}&year=${searchYear}`);
        const prevData = prevRes.data || [];

        if (prevData.length) {
          prevTotal = prevData.reduce((s, e) => s + Number(e.amount || 0), 0);
          setLastMonthLabel(getMonthName(searchMonth, searchYear));
          break;
        }
      }

      setLastMonthTotal(prevTotal);

      // TOP CATEGORY
      let maxCat = "";
      let maxVal = 0;
      Object.keys(categoryMap).forEach(c => {
        if (categoryMap[c] > maxVal) {
          maxVal = categoryMap[c];
          maxCat = c;
        }
      });
      setTopCategory(maxCat || "None");

      // CATEGORY CHART DATA
      const cData = Object.keys(categoryMap).map(key => ({
        name: key,
        value: categoryMap[key]
      }));
      setCategoryChartData(cData);

      // DAILY DATA
      const dData = Object.keys(dailyMap).map(key => ({
        day: key,
        amount: dailyMap[key]
      }));
      dData.sort((a, b) => Number(a.day) - Number(b.day));
      setDailyChartData(dData);

    } catch (err) {
      console.log("Report error:", err);
      resetAllStates();
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterMonth("");
    setFilterYear("");
    setFilterDate("");
  };

  const diff = monthlyTotal - lastMonthTotal;
  const percentChange =
    lastMonthTotal > 0 ? ((diff / lastMonthTotal) * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <h1 className="page-title">Reports & Analytics</h1>

        <div className="report-filters">
          <select value={filterMonth} onChange={(e)=>setFilterMonth(e.target.value)}>
            <option value="">Month</option>
            {[...Array(12)].map((_,i)=>(<option key={i} value={i+1}>{i+1}</option>))}
          </select>

          <select value={filterYear} onChange={(e)=>setFilterYear(e.target.value)}>
            <option value="">Year</option>
            <option>2023</option><option>2024</option><option>2025</option><option>2026</option>
          </select>

          <input type="date" value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} />
          <button onClick={resetFilters}>Reset</button>
        </div>

        {/* SUMMARY */}
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
            <h2 style={{ color: diff>=0?"#22c55e":"#ef4444" }}>
              {diff>=0?"↑":"↓"} {percentChange}% ({money(diff)})
            </h2>
          </div>
        </div>

        {/* CHARTS */}
        <div className="charts-container" style={{ display:"flex",flexWrap:"wrap",gap:"20px",marginTop:"20px" }}>
          
          {/* BAR */}
          <div style={{ flex:"1 1 600px",background:"#3d2c5c",padding:"20px",borderRadius:"10px" }}>
            <h3>Daily Expenses</h3>
            <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={dailyChartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >

              {/* Gradient definition */}
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#25bd55" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#58c47d" stopOpacity={0.6}/>
                </linearGradient>
              </defs>


              {/* Axis styling */}
              <XAxis
                dataKey="day"
                tick={{ fill: "#fafcff", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: "#fefeff", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              {/* Tooltip */}
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
                formatter={(v)=>money(v)}
                contentStyle={{
                  background: "#0f172a",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff"
                }}
              />

              {/* Legend */}
              <Legend />

              {/* Premium bars */}
              <Bar
                dataKey="amount"
                fill="url(#barGradient)"
                radius={[8, 8, 0, 0]}
                barSize={28}
                animationDuration={900}
              />

            </BarChart>
          </ResponsiveContainer>

          </div>

          {/* PREMIUM DONUT */}
          <div
            style={{
              flex: "1 1 420px",
              background: "#3d2c5c",
              padding: "24px",
              borderRadius: "14px",
              position: "relative",
              minHeight: "420px"
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  dataKey="value"
                  paddingAngle={3}
                  lableLine={true}
                  label={({ cdname, percent }) =>
                    percent > 0.07 ? `${name} ${(percent * 100).toFixed(0)}%`: ""
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
                {/* TOOLTIP*/}
                <Tooltip
                  formatter={(v)=>money(v)}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff"
                  }}
                />

                {/* RESPONSIVE LEGEND */}
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{
                    paddingLeft: "10px",
                    frontSize: "13px",

                  }}
                />

                
              </PieChart>
            </ResponsiveContainer>

            



          </div>

        </div>
      </div>
    </div>
  );
}
