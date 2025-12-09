// src/App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import Main from "./Components/Main";

import { AuthProvider, useAuth } from "./Components/Context/AuthContext";

import "./styles/base.css";
import "./App.css";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  const [sbOpen, setSbOpen] = useState(false);
  const holidaysFa = ["1403-01-01", "1403-01-02", "1403-03-14", "1403-06-31"];
  const { user, logout } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";
  const isLandingPage = location.pathname === "/";

  return (
    <div dir="rtl">
      {!isLoginPage && !isLandingPage && user && (
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

      <main className={!isLoginPage && !isLandingPage && user ? "page" : ""}>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <Main />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance/inout"
            element={
              <ProtectedRoute>
                <InOut />
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance/request"
            element={
              <ProtectedRoute>
                <Request />
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/maintenance/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/downhole/inout"
            element={
              <ProtectedRoute>
                <DownholeInOut />
              </ProtectedRoute>
            }
          />

          <Route
            path="/groupops"
            element={
              <ProtectedRoute>
                <GroupOpsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rigs"
            element={
              <ProtectedRoute>
                <RigStock />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
