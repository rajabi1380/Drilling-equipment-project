// src/constants/catalog.js

// ——— دکل‌ها ———
export const RIGS = ["دکل 13", "دکل 21", "دکل 24", "دکل 28", "دکل 31", "دکل 38"];

// ——— اعضای تیم تعمیرات (در صورت نیاز) ———
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
  { name: "Kelly",        code: "KLY-2005", sizes: ["3.5in","4in"] },
  { name: "Drill Pipe",   code: "DPI-4500", sizes: ["3.5in","5in","5.5in"] },
  { name: "Drill Collar", code: "DCL-3012", sizes: ["6.5in","8in"] },
  { name: "HWDP",         code: "HWD-5507", sizes: ["3.5in","5in"] },
  { name: "Rotary Hose",  code: "RHS-2210", sizes: ["2in","3in"] },
  { name: "Stand Pipe",   code: "STP-1180", sizes: ["3in","4in"] },
];

const BOP_ITEMS = [
  { name: "BOP Stack",         code: "BOP-7000", sizes: ["7-1/16in","9in","13-5/8in"] },
  { name: "Annular Preventer", code: "ANN-5100", sizes: ["7-1/16in","13-5/8in"] },
  { name: "Ram Preventer",     code: "RAM-5200", sizes: ["13-5/8in"] },
  { name: "Accumulator Unit",  code: "ACC-5300", sizes: ["3000psi","5000psi"] },
  { name: "Hydraulic Control", code: "HCU-5400", sizes: ["STD"] },
];

const CHOKE_MANIFOLD = [
  { name: "Choke Valve",    code: "CHK-6100", sizes: ["2in","3in"] },
  { name: "Kill Line",      code: "KIL-6200", sizes: ["2in","3in"] },
  { name: "Choke Manifold", code: "CMF-6300", sizes: ["3in","4in"] },
  { name: "Pressure Gauge", code: "GAG-6400", sizes: ["5000psi","10000psi"] },
  { name: "Buffer Tank",    code: "BFT-6500", sizes: ["2m³","5m³"] },
];

// ——— کاتالوگ واحد «تعمیرات و نگهداری لوله» (PIPE) ———
const PIPE_ITEMS = [
  { name: "Drill Pipe",               code: "PIPE-DP-35",  sizes: ["3.5in"] },
  { name: "Drill Pipe",               code: "PIPE-DP-50",  sizes: ["5in"] },
  { name: "Drill Pipe",               code: "PIPE-DP-55",  sizes: ["5.5in"] },

  { name: "Heavy Weight Drill Pipe",  code: "PIPE-HWDP-35", sizes: ["3.5in"] },
  { name: "Heavy Weight Drill Pipe",  code: "PIPE-HWDP-50", sizes: ["5in"] },

  { name: "Drill Collar",             code: "PIPE-DC-65",  sizes: ["6.5in"] },
  { name: "Drill Collar",             code: "PIPE-DC-80",  sizes: ["8in"] },

  { name: "Kelly",                    code: "PIPE-KLY-35", sizes: ["3.5in"] },
  { name: "Kelly",                    code: "PIPE-KLY-40", sizes: ["4in"] },

  { name: "Kelly T",                  code: "PIPE-KT-4",   sizes: ["4in"] },

  // چند مورد تکمیلیِ رایج
  { name: "Casing",                   code: "PIPE-CSG-95", sizes: ["9-5/8in"] },
  { name: "Tubing",                   code: "PIPE-TBG-27", sizes: ["2-7/8in"] },
];

// ——— دسترسی به کاتالوگ براساس واحد ———
export function getCatalogForUnit(unitId) {
  switch (String(unitId || "").toLowerCase()) {
    case "surface": return SURFACE_TOOLS;
    case "bop":     return BOP_ITEMS;
    case "choke":   return CHOKE_MANIFOLD;
    case "pipe":
    case "pipes":
    case "pipe-maintenance":
      return PIPE_ITEMS;
    default:
      return [];
  }
}

// در صورت نیاز به import مستقیم
export const CATALOG = {
  surface: SURFACE_TOOLS,
  bop: BOP_ITEMS,
  choke: CHOKE_MANIFOLD,
  pipe: PIPE_ITEMS,
};
