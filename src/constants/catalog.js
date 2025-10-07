// src/constants/catalog.js

// ——— دکل‌ها ———
export const RIGS = [
  "دکل 13", "دکل 21", "دکل 24", "دکل 28", "دکل 31", "دکل 38"
];

// ——— اعضای تیم تعمیرات (برای مولتی‌سلکت) ———
export const TEAM_MEMBERS = [
  "محسن جلالی زاده",
  "هومن رجبی",
  "همیار پلیس",
  "سینا نوذری",
  "شایان مرادی",
  "میثم عزیزی"
];

// ——— کاتالوگ تجهیزات هر واحد ———
// هر آیتم: { name, code, size? | sizes?[] }
const SURFACE_TOOLS = [
  { name: "Kelly",               code: "KLY-2005", sizes: ["3.5in","4in"] },
  { name: "Drill Pipe",          code: "DPI-4500", sizes: ["3.5in","5in","5.5in"] },
  { name: "Drill Collar",        code: "DCL-3012", sizes: ["6.5in","8in"] },
  { name: "HWDP",                code: "HWD-5507", sizes: ["3.5in","5in"] },
  { name: "Rotary Hose",         code: "RHS-2210", sizes: ["2in","3in"] },
  { name: "Stand Pipe",          code: "STP-1180", sizes: ["3in","4in"] },
];

const BOP_ITEMS = [
  { name: "BOP Stack",           code: "BOP-7000", sizes: ["7-1/16in","9in","13-5/8in"] },
  { name: "Annular Preventer",   code: "ANN-5100", sizes: ["7-1/16in","13-5/8in"] },
  { name: "Ram Preventer",       code: "RAM-5200", sizes: ["13-5/8in"] },
  { name: "Accumulator Unit",    code: "ACC-5300", sizes: ["3000psi","5000psi"] },
  { name: "Hydraulic Control",   code: "HCU-5400", sizes: ["STD"] },
];

const CHOKE_MANIFOLD = [
  { name: "Choke Valve",         code: "CHK-6100", sizes: ["2in","3in"] },
  { name: "Kill Line",           code: "KIL-6200", sizes: ["2in","3in"] },
  { name: "Choke Manifold",      code: "CMF-6300", sizes: ["3in","4in"] },
  { name: "Pressure Gauge",      code: "GAG-6400", sizes: ["5000psi","10000psi"] },
  { name: "Buffer Tank",         code: "BFT-6500", sizes: ["2m³","5m³"] },
];

// ——— دسترسی به کاتالوگ براساس واحد ———
export function getCatalogForUnit(unitId) {
  switch (unitId) {
    case "surface": return SURFACE_TOOLS;
    case "bop":     return BOP_ITEMS;
    case "choke":   return CHOKE_MANIFOLD;
    default:        return [];
  }
}
