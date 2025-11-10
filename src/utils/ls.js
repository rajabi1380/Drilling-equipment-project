// utils/ls.js
// localStorage helper with namespacing, JSON safety, and role-based support

const APP_NAMESPACE = "my_app"; // می‌تونی به اسم پروژه‌ت تغییر بدی

// تولید کلید کامل با فضای نام
const nsKey = (key) => `${APP_NAMESPACE}:${key}`;

/**
 * خواندن داده از localStorage
 * @param {string} key - کلید بدون namespace
 * @param {any} fallback - مقدار پیش‌فرض در صورت نبود یا خطا
 */
export function loadLS(key, fallback = null) {
  try {
    const raw = localStorage.getItem(nsKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ذخیره‌سازی داده در localStorage
 * @param {string} key - کلید بدون namespace
 * @param {any} data - داده‌ای که باید ذخیره شود
 */
export function saveLS(key, data) {
  try {
    localStorage.setItem(nsKey(key), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * حذف کلید از localStorage
 * @param {string} key - کلید بدون namespace
 */
export function removeLS(key) {
  try {
    localStorage.removeItem(nsKey(key));
    return true;
  } catch {
    return false;
  }
}

/**
 * بررسی لاگین بودن کاربر
 */
export function isLoggedIn() {
  return !!loadLS("auth_user");
}

/**
 * دریافت نقش کاربر لاگین‌شده
 */
export function getUserRole() {
  const user = loadLS("auth_user");
  return user?.role || null;
}

/**
 * دریافت نام کامل کاربر
 */
export function getUserName() {
  const user = loadLS("auth_user");
  return user?.name || null;
}
