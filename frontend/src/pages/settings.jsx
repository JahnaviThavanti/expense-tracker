import { useState, useEffect } from "react";
import API from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/expense-tracker-settings.css";

export default function Settings() {

  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);


  /* LOAD USER PREFERENCES FROM DB */
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await API.get("/user/me");

      setDarkMode(res.data.darkMode ?? true);
      setNotifications(res.data.notifications ?? true);

      setLoading(false);
    } catch (err) {
      console.log("Settings load failed:", err);
      setLoading(false);
    }
  };

  /* SAVE THEME + NOTIFICATIONS TO DB */
  const savePreferences = async () => {
    try {
      await API.put("/user/update-preferences", {
        darkMode,
        notifications
      });

      if (darkMode) {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      }

      alert("Preferences saved");
    } catch (err) {
      console.log(err);
      alert("Failed to save preferences");
    }
  };

  /* CHANGE PASSWORD */
  const changePassword = async () => {
    if (!password) return alert("Enter new password");

    try {
      await API.put("/user/change-password", { password });
      setPassword("");
      alert("Password updated");
    } catch (err) {
      console.log(err);
      alert("Password update failed");
    }
  };

  /* LOGOUT */
  const handleLogout = () => {
    try { localStorage.clear(); } catch(e){}
    window.location.href = "/";
  };

  /* DELETE ACCOUNT */
  const deleteAccount = async () => {
    const confirmDelete = window.confirm("Delete account permanently?");
    if (!confirmDelete) return;

    try {
      await API.delete("/user/delete");
      try { localStorage.clear(); } catch(e){}
      window.location.href = "/";
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) return <h2 style={{ padding: 30 }}>Loading settings...</h2>;

  return (
    <div className="dashboard-container">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>

      <div className="main-section">
        <Navbar setMobileOpen={setMobileOpen} />

        <h1 className="page-title">Settings</h1>

        <div className="settings-container">

          {/* PREFERENCES */}
          <div className="settings-card">
            <h3>Appearance & Preferences</h3>

            <div className="toggle-row">
              <span>Dark Mode</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
            </div>

            <div className="toggle-row">
              <span>Notifications</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
            </div>

            <button className="save-btn" onClick={savePreferences}>
              Save Preferences
            </button>
          </div>

          {/* SECURITY */}
          <div className="settings-card">
            <h3>Security</h3>

            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />

            <button className="save-btn" onClick={changePassword}>
              Change Password
            </button>
          </div>

          {/* ACCOUNT */}
          <div className="settings-card danger">
            <h3>Account</h3>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>

            <button className="delete-btn" onClick={deleteAccount}>
              Delete Account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
