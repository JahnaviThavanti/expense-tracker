import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, Wallet } from "lucide-react";
import API from "../utils/api";

export default function Navbar({ setMobileOpen }) {

  const [user, setUser] = useState(null);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [hasNotification, setHasNotification] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
    loadMonthlySpend();
    checkReportNotification();
  }, []);

  /* USER LOAD */
  const loadUser = async () => {
    try {
      const res = await API.get("/user/me");
      setUser(res.data);
    } catch (err) {
      console.log("Navbar user load failed", err);
    }
  };

  /* MONTHLY SPEND */
  const loadMonthlySpend = async () => {
    try {
      const res = await API.get("/expenses?page=1&limit=200");
      const data = Array.isArray(res.data) ? res.data : [];

      let total = 0;
      const now = new Date();

      data.forEach(e => {
        const d = new Date(e.date || e.createdAt);
        if (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        ) {
          total += Number(e.amount || 0);
        }
      });

      setMonthlySpend(total);
    } catch (err) {
      console.log("Monthly spend load error", err);
    }
  };

  /* CHECK IF REPORT VIEWED */
  const checkReportNotification = () => {
    const seen = localStorage.getItem("reports_seen");
    if (!seen) {
      setHasNotification(true);
    }
  };

  /* OPEN REPORTS PAGE */
  const openReports = () => {
    localStorage.setItem("reports_seen", "true");
    setHasNotification(false);
    navigate("/reports");
  };

  return (
    <div className="navbar">

      {/* LEFT */}
      <div className="nav-left">

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <Menu size={22} />
        </button>

        <h2
          className="nav-title"
          onClick={() => navigate("/dashboard")}
        >
          ExpenseTracker
        </h2>
      </div>

      {/* RIGHT */}
      <div className="nav-right">

        {/* MONTHLY SPEND CHIP */}
        <div className="nav-stat">
          <Wallet size={18} />
          <span>$ {monthlySpend}</span>
        </div>

        {/* 🔔 NOTIFICATION */}
        <div className="nav-icon notification" onClick={openReports}>
          <Bell size={20} />
          {hasNotification && <span className="notif-dot"></span>}
        </div>

        {/* USER PROFILE */}
        <div
          className="nav-user"
          onClick={() => navigate("/profile")}
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt="profile"
              className="nav-avatar-img"
            />
          ) : (
            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
