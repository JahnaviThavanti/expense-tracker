import { useEffect, useState } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-charts.css";

export default function Reports() {

  const [expenses, setExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [topCategory, setTopCategory] = useState("");
  const [transactions, setTransactions] = useState(0);
  const [summaryData, setSummaryData] = useState({});
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);

  /* FILTER STATES */
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    loadReport();
  }, [filterMonth, filterYear, filterDate]);

  const loadReport = async () => {
    try {
      setLoading(true);

      let query = `/expenses?limit=1000`;

      if (filterMonth && filterYear)
        query += `&month=${filterMonth}&year=${filterYear}`;

      if (filterDate)
        query += `&date=${filterDate}`;

      const res = await API.get(query);
      const data = Array.isArray(res.data) ? res.data : [];

      setExpenses(data);

      if (!data.length) {
        setMonthlyTotal(0);
        setLastMonthTotal(0);
        setTransactions(0);
        setTopCategory("None");
        return;
      }

      const dates = data
        .map(e => new Date(e.date || e.timestamp || e.createdAt))
        .filter(d => !isNaN(d));

      const latestDate =
        dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

      setReportDate(latestDate);

      const month = filterMonth
        ? Number(filterMonth) - 1
        : latestDate.getMonth();

      const year = filterYear
        ? Number(filterYear)
        : latestDate.getFullYear();

      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;

      let total = 0;
      let prevTotal = 0;
      let count = 0;
      let prevCount = 0;
      let categoryMap = {};

      data.forEach(e => {
        const d = new Date(e.date || e.timestamp || e.createdAt);
        if (isNaN(d)) return;

        const amt = Number(e.amount || 0);

        if (d.getMonth() === month && d.getFullYear() === year) {
          total += amt;
          count++;

          const cat = e.category || "Other";
          categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        }

        if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
          prevTotal += amt;
          prevCount++;
        }
      });

      setMonthlyTotal(total);
      setLastMonthTotal(prevTotal);
      setTransactions(count);

      let maxCat = "";
      let maxVal = 0;
      Object.keys(categoryMap).forEach(c => {
        if (categoryMap[c] > maxVal) {
          maxVal = categoryMap[c];
          maxCat = c;
        }
      });
      setTopCategory(maxCat || "None");

      const avgThisMonth = count ? Math.round(total / count) : 0;
      const avgLastMonth = prevCount ? Math.round(prevTotal / prevCount) : 0;

      setSummaryData({
        total,
        prevTotal,
        avgThisMonth,
        avgLastMonth,
        count,
        prevCount
      });

      if (prevTotal > 0) {
        const diff = total - prevTotal;
        const percent = ((diff / prevTotal) * 100).toFixed(1);

        setAiInsight(
          diff > 0
            ? `Spending increased by ${percent}% ($${diff}) compared to last month.`
            : `Spending decreased by ${Math.abs(percent)}% ($${Math.abs(diff)}) compared to last month.`
        );
      } else {
        setAiInsight("No previous month data available for comparison.");
      }

    } catch (err) {
      console.log("Report error:", err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // ❌ disable PDF for week-4
  const downloadPDF = () => {
    alert("PDF export available in later phase.");
  };

  const diff = monthlyTotal - lastMonthTotal;
  const percentChange =
    lastMonthTotal > 0 ? ((diff / lastMonthTotal) * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <h1 className="page-title">Reports & Analytics</h1>

        {/* FILTER BAR */}
        <div className="report-filters">
          <select value={filterMonth} onChange={(e)=>setFilterMonth(e.target.value)}>
            <option value="">Month</option>
            {[...Array(12)].map((_,i)=>(
              <option key={i} value={i+1}>{i+1}</option>
            ))}
          </select>

          <select value={filterYear} onChange={(e)=>setFilterYear(e.target.value)}>
            <option value="">Year</option>
            <option>2023</option>
            <option>2024</option>
            <option>2025</option>
            <option>2026</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e)=>setFilterDate(e.target.value)}
          />

          <button onClick={()=> {
            setFilterMonth("");
            setFilterYear("");
            setFilterDate("");
          }}>
            Reset
          </button>

          <button className="pdf-btn" onClick={downloadPDF}>
            Download PDF
          </button>
        </div>

        {loading && <p>Loading report...</p>}

        {/* SUMMARY CARDS */}
        <div className="report-cards">
          <div className="report-card">
            <h3>This Month</h3>
            <h2>$ {monthlyTotal}</h2>
          </div>

          <div className="report-card">
            <h3>Last Month</h3>
            <h2>$ {lastMonthTotal}</h2>
          </div>

          <div className="report-card">
            <h3>Transactions</h3>
            <h2>{transactions}</h2>
          </div>

          <div className="report-card">
            <h3>Top Category</h3>
            <h2>{topCategory}</h2>
          </div>
        </div>

        {/* CHART DISABLED */}
        <div style={{marginTop:"20px",padding:"20px",background:"#fff",borderRadius:"10px"}}>
          <h3>Charts available in next phase</h3>
        </div>

      </div>
    </div>
  );
}
