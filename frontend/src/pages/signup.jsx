import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import "../styles/auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);

  const handleSignup = async (e)=>{
    e.preventDefault();
    setLoading(true);

    try{
      await API.post("/auth/signup",{
        name,email,password
      });

      alert("Account created successfully 🎉");

      // redirect to login page
      navigate("/");

    }catch(err){
      alert(err?.response?.data?.msg || "Signup failed");
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>

        <form onSubmit={handleSignup} className="auth-form">

          <input
            placeholder="Name"
            value={name}
            onChange={e=>setName(e.target.value)}
            required
          />

          <input
            placeholder="Email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
          />

          <button className="auth-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>

          {/* NEW BACK TO LOGIN BUTTON */}
          <button
            type="button"
            className="auth-secondary-btn"
            onClick={()=>navigate("/")}
          >
            Back to Login
          </button>

        </form>
      </div>
    </div>
  );
}
