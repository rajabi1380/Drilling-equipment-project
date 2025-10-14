// src/utils/breadcrumbs.js
import { matchPath } from "react-router-dom";

const ROUTES = [
  // --- برون چاهی
  { pattern: "/downhole/inout/*",      title: "برون چاهی / ورود و خروج" },
  { pattern: "/downhole/groupops/*",     title: "برون چاهی / گروه های عملیاتی" },

  // --- گروه‌های عملیاتی (جهانی)
  { pattern: "/ops/groups/*",          title: "گروه‌های عملیاتی" },

  // --- تعمیرات و نگهداری لوله
  { pattern: "/maintenance/inout/*",   title: "تعمیرات و نگهداری لوله / ورود و خروج" },
  { pattern: "/maintenance/request/*", title: "تعمیرات و نگهداری لوله / ثبت درخواست" },
  { pattern: "/maintenance/reports/*", title: "تعمیرات و نگهداری لوله / گزارشات" },
  { pattern: "/maintenance/turning/*", title: "تراشکاری" },
];

function normalizePath(input) {
  // اگر کل location پاس داده شده
  if (input && typeof input === "object") {
    const hashPath =
      input.hash && typeof input.hash === "string" && input.hash.startsWith("#/")
        ? input.hash.slice(1)
        : null;
    const path = hashPath || input.pathname || "/";
    return typeof path === "string" ? path : "/";
  }
  // اگر مستقیماً pathname (string) پاس داده شده
  if (typeof input === "string") return input || "/";
  // هیچ‌کدام نبود
  return "/";
}

export function resolveBreadcrumb(locationOrPathname) {
  let currentPath = normalizePath(locationOrPathname).trim();

  // حذف اسلش پایانی (به‌جز ریشه)
  if (currentPath.length > 1 && currentPath.endsWith("/")) {
    currentPath = currentPath.slice(0, -1);
  }

  for (const r of ROUTES) {
    // v6: matchPath(pattern, pathname)
    if (matchPath(r.pattern, currentPath)) return r.title;
  }
  return "داشبورد";
}

// سازگاری با کد قدیمی
export const getBreadcrumbTitle = resolveBreadcrumb;
