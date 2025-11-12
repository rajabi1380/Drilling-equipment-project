// src/Components/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");
    const res = login(username.trim(), password.trim());
    if (!res?.ok) {
      setError(res?.message || "ورود ناموفق بود.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="login-page" dir="rtl">
      

      {/* Glass Card */}
      <main className="login-glass">
        <h2>ورود به سامانه</h2>

        <form onSubmit={onSubmit}>
          <label>نام کاربری</label>
          <div className="input-wrap">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
         
          </div>

          <label>رمز عبور</label>
          <div className="input-wrap">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button type="submit" className="btn-primary">ورود</button>

       
        </form>

   

        {/* نمونه دسترسی‌ها (اختیاری) */}
        <div className="samples">
          <span>نمونه کاربران:</span>
          <code>admin / 1234</code>
          <code>manager / 1234</code>
          <code>pipe / 1234</code>
          <code>downhole / 1234</code>
          <code>uphole / 1234</code>
          <code>mandeyabi / 1234</code>
        </div>
      </main>
    </div>
  );
}
