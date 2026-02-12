import { useEffect, useState } from "react";
import API from "../utils/api";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import SummaryCard from "../components/SummaryCard";
import ChartSection from "../components/ChartSection";
import ActivityList from "../components/ActivityList";
import "../styles/expense-tracker-dashboard.css";

export default function Dashboard() {

  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [count, setCount] = useState(0);
  const [insight, setInsight] = useState("");
  const [notification, setNotification] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    fetchExpenses();
    fetchStats();

    // AI insight disabled for Week-4
    // API.get("/expenses/analytics/unusual")
    //   .then(res => setInsight(res.data.insight))
    //   .catch(() => {});

    API.get("/expenses/notifications/weekly")
      .then(res => setNotification(res.data.message))
      .catch(() => {});
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/user/stats");
      setTotal(res.data.totalSpent);
      setMonthly(res.data.monthlySpent);
      setCount(res.data.transactions);
    } catch (err) {
      console.log("Dashboard stats error:", err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await API.get("/expenses?page=1&limit=200");
      const data = Array.isArray(res.data) ? res.data : [];

      setExpenses(data);

    } catch (err) {
      console.log("Dashboard error:", err);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN */}
      <div className="main-section">

        {/* NAVBAR */}
        <Navbar setMobileOpen={setMobileOpen} />

        {/* PAGE TITLE */}
        <h1 className="page-title">Expense Tracker Dashboard</h1>

        {/* SUMMARY CARDS */}
        <div className="summary-grid">
          <SummaryCard title="Total Expense" amount={`$ ${total}`} />
          <SummaryCard title="This Month" amount={`$ ${monthly}`} />
          <SummaryCard title="Transactions" amount={count} />
        </div>

        {/* NOTIFICATION CARD */}
        {notification && (
          <div className="info-card notification">
            {notification}
          </div>
        )}

        {/* AI INSIGHT CARD */}
        {/* {insight && (
          <div className="info-card insight">
            <strong>AI Insight:</strong> {insight}
          </div>
        )} */}

        {/* MAIN DASHBOARD CONTENT */}
        <div className="dashboard-sections">

          {/* CHART (disabled for Week-4) */}
          {/* <div className="dashboard-card">
            <ChartSection expenses={expenses} />
          </div> */}

          {/* RECENT ACTIVITIES */}
          <div className="dashboard-card">
            <h2>Recent Activities</h2>
            <ActivityList expenses={expenses} />
          </div>

        </div>

      </div>
    </div>
  );
}
