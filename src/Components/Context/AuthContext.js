// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const LS_USER = "auth_user_v1";

/**
 * perms:
 *  inout       -> رسید / ارسال
 *  rigs        -> موجودی دکل‌ها
 *  reports     -> گزارشات
 *  groupops    -> گروه‌های عملیاتی
 *  inspections -> دستور کار بازرسی (در آینده)
 *  turning     -> دستورکارها (تراشکاری + بازرسی)
 */

const ACCOUNTS = [
  // ───── مدیر سیستم ─────
  {
    username: "admin",
    password: "1234",
    displayName: "مدیر سیستم",
    role: "ADMIN",
    units: [
      "DOWNHOLE",
      "UPHOLE",
      "PIPE",
      "MANDEYABI",
      "INSPECTION",
      "TURNING",
    ],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
      inspections: true,
      turning: true,
    },
  },

  // ───── مدیر اداره ابزار ─────
  {
    username: "manager",
    password: "1234",
    displayName: "مدیر اداره ابزار",
    role: "MANAGER",
    units: [
      "DOWNHOLE",
      "UPHOLE",
      "PIPE",
      "MANDEYABI",
      "INSPECTION",
      "TURNING",
    ],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
      inspections: true,
      turning: true,
    },
  },

  // ───── درون‌چاهی ─────
  {
    username: "downhole",
    password: "1234",
    displayName: "واحد درون‌چاهی",
    role: "UNIT",
    units: ["DOWNHOLE"],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
    },
  },

  // ───── برون‌چاهی ─────
  {
    username: "uphole",
    password: "1234",
    displayName: "واحد برون‌چاهی",
    role: "UNIT",
    units: ["UPHOLE"],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
    },
  },

  // ───── مانده‌یابی ─────
  {
    username: "mandeyabi",
    password: "1234",
    displayName: "واحد مانده‌یابی",
    role: "UNIT",
    units: ["MANDEYABI"],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
    },
  },

  // ───── تعمیرات و نگهداری لوله ─────
  {
    username: "pipe",
    password: "1234",
    displayName: "تعمیرات و نگهداری لوله و ابزار",
    role: "UNIT",
    units: ["PIPE"],
    perms: {
      inout: true,
      rigs: true,
      reports: true,
      groupops: true,
    },
  },

  // ───── بازرسی ─────
  {
    username: "inspection",
    password: "1234",
    displayName: "واحد بازرسی",
    role: "UNIT",
    units: ["INSPECTION"],
    perms: {
      turning: true, // دسترسی به صفحه "دستورکارها"
    },
  },

  // ───── تراشکاری ─────
  {
    username: "turning",
    password: "1234",
    displayName: "واحد تراشکاری",
    role: "UNIT",
    units: ["TURNING"],
    perms: {
      turning: true, // دسترسی به همان صفحه "دستورکارها"
    },
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // بازیابی از localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_USER);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // ورود
  const login = (username, password) => {
    const found = ACCOUNTS.find(
      (u) => u.username === username && u.password === password
    );
    if (!found) {
      return { ok: false, message: "نام کاربری یا رمز عبور اشتباه است." };
    }
    setUser(found);
    localStorage.setItem(LS_USER, JSON.stringify(found));
    return { ok: true, user: found };
  };

  // خروج
  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_USER);
  };

  // نقش‌ها و مجوزها
  const isSuper =
    !!user && (user.role === "ADMIN" || user.role === "MANAGER");

  const units = (user?.units || []).map((u) => String(u).toUpperCase());
  const currentUnit = units[0] || null;

  const hasUnit = (unitCode) => {
    if (!user) return false;
    if (isSuper) return true;
    const code = String(unitCode).toUpperCase();
    return units.includes(code);
  };

  const can = (perm) => {
    if (!user) return false;
    if (isSuper) return true;
    return !!user.perms?.[perm];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSuper,
        isAdmin: isSuper,
        units,
        currentUnit,
        hasUnit,
        can,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
