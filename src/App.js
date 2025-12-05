// src/App.jsx
import React, { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./Components/Navbar";
import Sidebar from "./Components/Sidebar";

import InOut from "./Components/InOut";
import Turning from "./Components/Turning";
import Inspection from "./Components/Inspection";
import DownholeInOut from "./Components/DownholeInOut";
import GroupOpsPage from "./Components/GroupOpsPage";
import Reports from "./Components/Report";
import Request from "./Components/Request";
import Login from "./Components/Login";
import RigStock from "./Components/RigStock";
import Dashboard from "./Components/Dashboard";


import { AuthProvider, useAuth } from "./Components/Context/AuthContext";

import "./styles/base.css";
import "./App.css";

/* ✅ روت محافظت شده: اگر لاگین نباشه می‌فرسته /login */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ✅ شِل اصلی برنامه: کنترل نمایش Navbar/Sidebar بر اساس لاگین و آدرس */
function AppContent() {
  const [sbOpen, setSbOpen] = useState(false);
  const holidaysFa = ["1403-01-01", "1403-01-02", "1403-03-14", "1403-06-31"];
  const { user, logout } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  return (
    <div dir="rtl">
      {/* 🔒 فقط وقتی لاگین کرده و توی /login نیست، Navbar و Sidebar نمایش داده می‌شود */}
      {!isLoginPage && user && (
        <>
          <Navbar
            onLogout={logout}
            onHamburger={() => setSbOpen(true)}
            holidaysFa={holidaysFa}
            notifications={[]}
          />
          <Sidebar open={sbOpen} onClose={() => setSbOpen(false)} />
        </>
      )}

      {/* برای صفحه لاگین استایل ساده، برای بقیه همان .page */}
      <main className={!isLoginPage && user ? "page" : ""}>
        <Routes>
          {/* صفحه لاگین: اگر لاگین است، دیگه نگذار اینجا بماند */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <Login />
            }
          />

          {/* داشبورد و بقیه صفحات همگی محافظت‌شده */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* نگهداری - رسید/ارسال */}
          <Route
            path="/maintenance/inout"
            element={
              <ProtectedRoute>
                <InOut />
              </ProtectedRoute>
            }
          />

          {/* درخواست‌ها */}
          <Route
            path="/maintenance/request"
            element={
              <ProtectedRoute>
                <Request />
              </ProtectedRoute>
            }
          />

          {/* تراشکاری */}
          <Route
            path="/maintenance/turning"
            element={
              <ProtectedRoute>
                <Turning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/inspection"
            element={
              <ProtectedRoute>
                <Inspection />
              </ProtectedRoute>
            }
          />
       

          {/* گزارش‌ها */}
          <Route
            path="/maintenance/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* داون‌هول */}
          <Route
            path="/downhole/inout"
            element={
              <ProtectedRoute>
                <DownholeInOut />
              </ProtectedRoute>
            }
          />

          {/* گروه‌های عملیاتی */}
          <Route
            path="/groupops"
            element={
              <ProtectedRoute>
                <GroupOpsPage />
              </ProtectedRoute>
            }
          />

          {/* موجودی دکل‌ها */}
          <Route
            path="/rigs"
            element={
              <ProtectedRoute>
                <RigStock />
              </ProtectedRoute>
            }
          />

          {/* هر آدرس اشتباه → اگر لاگین است بفرست داشبورد؛ اگر نه → لاگین */}
          <Route
            path="*"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

/* ✅ روت اصلی: کل اپ داخل AuthProvider */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
