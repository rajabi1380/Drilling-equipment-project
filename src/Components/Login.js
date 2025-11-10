// src/Components/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext"; // مسیر درست ✅
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const res = login(username.trim(), password.trim());
    if (!res.ok) {
      setError(res.message || "ورود ناموفق بود.");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="login-container" dir="rtl">
      <h2>ورود به سامانه مدیریت تجهیزات</h2>

      <form onSubmit={handleSubmit}>
        <label>نام کاربری:</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label>رمز عبور:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <div className="error-message">{error}</div>}

        <button type="submit">ورود</button>
      </form>

      <div className="login-hint">
        <div>نمونه کاربران:</div>
        <code>admin / 1234</code>
        <code>manager / 1234</code>
        <code>pipe / 1234</code>
        <code>downhole / 1234</code>
        <code>uphole / 1234</code>
        <code>mandeyabi / 1234</code>
        <code>inspection / 1234</code>
        <code>turning / 1234</code>
      </div>
    </div>
  );
}
