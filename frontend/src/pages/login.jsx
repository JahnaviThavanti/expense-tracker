import { useState } from "react";
import API from "../utils/api";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/auth/login", {
        email:email,
        password:password
      });

      console.log("LOGIN RESPONSE:", res.data);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user",JSON.stringify(res.data.user));
      window.location.href = "/dashboard";
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.msg || "Login failed");

    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1 className="auth-title">Expense Tracker</h1>
        <p className="auth-sub">Login to continue</p>

        <form onSubmit={handleLogin} className="auth-form">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          <button className="auth-btn">Login</button>
        </form>

        <p className="auth-switch">
          New user? <span onClick={()=>window.location.href="/signup"}>Create account</span>
        </p>
      </div>
    </div>
  );
}
