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
  const [allExpenses, setAllExpenses] = useState([]);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    fetchDashboardData();

    // AI insight disabled for Week-4
    // API.get("/expenses/analytics/unusual")
    //   .then(res => setInsight(res.data.insight))
    //   .catch(() => {});

    API.get("/expenses/notifications/weekly")
      .then(res => setNotification(res.data.message))
      .catch(() => {});
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all expenses across all dates and pages.
      const limit = 1000;
      let page = 1;
      let allData = [];

      while (true) {
        const res = await API.get("/expenses", {
          params: {
            startDate: "01/01/1970",
            endDate: "31/12/2999",
            page,
            limit
          }
        });

        const pageData = Array.isArray(res.data) ? res.data : [];
        allData = allData.concat(pageData);

        if (pageData.length < limit) break;
        page += 1;
      }

      // 1. Calculate Total Spent
      const totalSpent = allData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      setTotal(totalSpent);

      // 2. Calculate Monthly Spent
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const monthlySpent = allData
        .filter(item => {
          const d = new Date(item.date || item.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      setMonthly(monthlySpent);

      // 3. Set Expenses for Activity List (Top 5 recent)
      setAllExpenses(allData);
      setExpenses(allData.slice(0, 5));
      setCount(allData.length);

    } catch (err) {
      console.log("Dashboard load error:", err);
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

          
          <div className="dashboard-card">
            <h2>Overall Spending Analytics</h2>
            <ChartSection expenses={allExpenses} />
          </div>

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
