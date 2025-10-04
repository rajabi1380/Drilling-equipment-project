// src/utils/ls.js
export const loadLS = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveLS = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};
