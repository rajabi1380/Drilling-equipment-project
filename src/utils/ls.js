// utils/ls.js
// localStorage helper with namespacing, JSON safety, and role-based support

const APP_NAMESPACE = "my_app"; // در صورت نیاز ثابت نگه دار

// تولید کلید کامل با فضای نام
const nsKey = (key) => `${APP_NAMESPACE}:${key}`;

// ---------- ابزارهای عمومی ----------
export function loadLS(key, fallback = null) {
  try {
    const raw = localStorage.getItem(nsKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS(key, data) {
  try {
    localStorage.setItem(nsKey(key), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function removeLS(key) {
  try {
    localStorage.removeItem(nsKey(key));
    return true;
  } catch {
    return false;
  }
}

// ---------- سازگاری با AuthContext ----------
const AUTH_KEY = "auth_user_v1"; // همان چیزی که در AuthContext.jsx استفاده می‌شود

// خواندن کاربر (ابتدا بدون namespace برای سازگاری با AuthContext، در صورت نبود، namespaced)
function readAuthUser() {
  try {
    const rawDirect = localStorage.getItem(AUTH_KEY);
    if (rawDirect) return JSON.parse(rawDirect);

    // fallback: اگر قبلاً با namespace ذخیره شده بود
    const rawNS = localStorage.getItem(nsKey(AUTH_KEY));
    if (rawNS) return JSON.parse(rawNS);

    // fallback قدیمی: auth_user (قدیمی/بدون نسخه)
    const rawOld = localStorage.getItem("auth_user");
    if (rawOld) return JSON.parse(rawOld);

    const rawOldNS = localStorage.getItem(nsKey("auth_user"));
    if (rawOldNS) return JSON.parse(rawOldNS);

    return null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!readAuthUser();
}

export function getUserRole() {
  const user = readAuthUser();
  return user?.role || null;
}

export function getUserName() {
  const user = readAuthUser();
  // با AuthContext: displayName داریم؛ name هم برای سازگاری پشتیبانی می‌شود
  return user?.displayName || user?.name || null;
}
