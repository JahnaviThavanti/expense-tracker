import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import {
  Home,
  CreditCard,
  PlusCircle,
  BarChart3,
  User,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Sidebar({ mobileOpen, setMobileOpen }) {

  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  // detect mobile
  const isMobile = window.innerWidth < 900;

  // auto close sidebar when navigating (mobile)
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname]);

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Expenses", path: "/expenses", icon: CreditCard },
    { name: "Add Expense", path: "/add-expense", icon: PlusCircle },
    { name: "Categories", path:"/categories", icon: Folder},
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <>
      {/* MOBILE OVERLAY */}
      {mobileOpen && isMobile && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`sidebar 
          ${collapsed ? "collapsed" : ""} 
          ${mobileOpen ? "open" : ""}`}
      >
        <div>

          {/* BRAND HEADER */}
          <div className="sidebar-header">

            {!collapsed && (
              <div
                className="sidebar-brand"
                onClick={() => navigate("/dashboard")}
                style={{ cursor: "pointer" }}
              >
                <div className="brand-dot"></div>
                <h1>ExpenseTracker</h1>
              </div>
            )}

            {/* DESKTOP COLLAPSE */}
            {!isMobile && (
              <button
                className="collapse-btn"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed
                  ? <ChevronRight size={20} />
                  : <ChevronLeft size={20} />}
              </button>
            )}
          </div>

          {/* MENU */}
          <ul className="menu">
            {menu.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  key={index}
                  className={location.pathname === item.path ? "active" : ""}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.name}</span>}
                </li>
              );
            })}
          </ul>
        </div>

        {/* SETTINGS */}
        <div className="sidebar-bottom">
          <li
            className={location.pathname === "/settings" ? "active" : ""}
            onClick={() => {
              navigate("/settings");
              if (isMobile) setMobileOpen(false);
            }}
          >
            <Settings size={20} />
            {!collapsed && <span>Settings</span>}
          </li>
        </div>
      </div>
    </>
  );
}
