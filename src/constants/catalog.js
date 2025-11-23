// ===============================
// کاتالوگ تجهیزات و واحدها
// ===============================

// --- دکل‌ها ---
export const RIGS = ["دکل 13", "دکل 21", "دکل 24", "دکل 28", "دکل 31", "دکل 38"];

// واحدهای عملیاتی (برای فرم‌ها / گروه‌های عملیاتی)
export const OPS_UNITS = [
  { id: "inspection", label: "بازرسی" },
  { id: "pipe", label: "تعمیرات و نگهداری لوله" },
  { id: "downhole", label: "درون‌چاهی" },
  { id: "surface", label: "برون‌چاهی" },
  { id: "mandeyabi", label: "مانده‌یابی" },
];

// --- اعضای تیم (نمونه) ---
export const TEAM_MEMBERS = [
  "علی رضایی",
  "مهدی کریمی",
  "سارا اکبری",
  "مجتبی احمدی",
  "رضا محمدی",
  "لیلا جعفری",
];

// --- آیتم‌های خرابی نمونه ---
export const FAILURE_ITEMS = [
  { id: "F001", code: "BRG-01", name: "بلبرینگ آسیب‌دیده" },
  { id: "F002", code: "SEAL-02", name: "نشتی سیل" },
  { id: "F003", code: "THRD-03", name: "خرابی رزوه" },
  { id: "F004", code: "BEND-04", name: "خمیدگی یا تاب" },
  { id: "F005", code: "CRK-05", name: "ترک یا شکستگی" },
  { id: "F006", code: "COR-06", name: "خوردگی" },
  { id: "F007", code: "LEAK-07", name: "نشتی عمومی" },
  { id: "F008", code: "WORN-08", name: "سایش زیاد" },
];

// ===============================
// ژنراتور کد تجهیز
// ===============================
function makeEquipCode(baseCode, size, index) {
  const cleanSize = String(size).replace(/[^0-9.]/g, "").replace(".", "");
  const serial = String(index).padStart(3, "0");
  return `${baseCode}-${cleanSize}-${serial}`;
}

// ===============================
// کاتالوگ تجهیزات بر اساس واحد
// ===============================

// --- برون‌چاهی (Surface) ---
const SURFACE_TOOLS = [
  ...Array.from({ length: 5 }, (_, i) => ({
    name: "Kelly",
    code: makeEquipCode("KLY", "3.5in", i + 1),
    size: "3.5in",
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    name: "Drill Pipe",
    code: makeEquipCode("DPI", "5in", i + 1),
    size: "5in",
  })),
];

// --- BOP ---
const BOP_ITEMS = [
  ...Array.from({ length: 3 }, (_, i) => ({
    name: "Annular Preventer",
    code: makeEquipCode("BOP-ANN", "13-5/8in", i + 1),
    size: "13-5/8in",
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    name: "Ram Preventer",
    code: makeEquipCode("BOP-RAM", "13-5/8in", i + 1),
    size: "13-5/8in",
  })),
];

// --- Manifold ---
const CHOKE_MANIFOLD = [
  ...Array.from({ length: 4 }, (_, i) => ({
    name: "Choke Valve",
    code: makeEquipCode("CHK-VLV", "3in", i + 1),
    size: "3in",
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    name: "Pressure Gauge",
    code: makeEquipCode("CHK-GAG", "10000psi", i + 1),
    size: "10000psi",
  })),
];

// --- لوله (Pipe) ---
const PIPE_ITEMS = [
  ...Array.from({ length: 10 }, (_, i) => ({
    name: "Drill Pipe",
    code: makeEquipCode("PIPE-DP", "5in", i + 1),
    size: "5in",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    name: "Heavy Weight Drill Pipe",
    code: makeEquipCode("PIPE-HWDP", "5in", i + 1),
    size: "5in",
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    name: "Drill Collar",
    code: makeEquipCode("PIPE-DC", "6.5in", i + 1),
    size: "6.5in",
  })),
];

// --- درون‌چاهی ---
const DOWNHOLE_ITEMS = [
  ...Array.from({ length: 4 }, (_, i) => ({
    name: "Mud Motor",
    code: makeEquipCode("DH-MTR", "8in", i + 1),
    size: "8in",
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    name: "Stabilizer",
    code: makeEquipCode("DH-STB", "6.5in", i + 1),
    size: "6.5in",
  })),
];

// --- برون‌چاهی (بالادستی) ---
const UPHOLE_ITEMS = [
  ...Array.from({ length: 5 }, (_, i) => ({
    name: "Elevator",
    code: makeEquipCode("UH-ELE", "5in", i + 1),
    size: "5in",
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    name: "Spider",
    code: makeEquipCode("UH-SPD", "5in", i + 1),
    size: "5in",
  })),
];

// --- مانده‌یابی ---
const MANDEYABI_ITEMS = [
  ...Array.from({ length: 3 }, (_, i) => ({
    name: "Fishing Tool",
    code: makeEquipCode("MB-FSH", "5in", i + 1),
    size: "5in",
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    name: "Crossover",
    code: makeEquipCode("MB-CRO", "3.5in", i + 1),
    size: "3.5in",
  })),
];

// ===============================
// فهرست کامل
// ===============================
export const FULL_CATALOG = [
  ...SURFACE_TOOLS,
  ...BOP_ITEMS,
  ...CHOKE_MANIFOLD,
  ...PIPE_ITEMS,
  ...DOWNHOLE_ITEMS,
  ...UPHOLE_ITEMS,
  ...MANDEYABI_ITEMS,
];

export function getCatalogForUnit(unitId, role = "user") {
  const u = String(unitId || "").toLowerCase();
  const isAdmin = ["admin", "manager", "super"].includes(String(role).toLowerCase());
  if (isAdmin) return FULL_CATALOG;

  switch (u) {
    case "surface":
      return SURFACE_TOOLS;
    case "bop":
      return BOP_ITEMS;
    case "choke":
      return CHOKE_MANIFOLD;
    case "pipe":
    case "pipe-maintenance":
      return PIPE_ITEMS;
    case "downhole":
      return DOWNHOLE_ITEMS;
    case "uphole":
      return UPHOLE_ITEMS;
    case "mandeyabi":
      return MANDEYABI_ITEMS;
    default:
      return [];
  }
}

export const CATALOG = {
  surface: SURFACE_TOOLS,
  bop: BOP_ITEMS,
  choke: CHOKE_MANIFOLD,
  pipe: PIPE_ITEMS,
  downhole: DOWNHOLE_ITEMS,
  uphole: UPHOLE_ITEMS,
  mandeyabi: MANDEYABI_ITEMS,
};

export const FAILURE_CATALOG = FAILURE_ITEMS;
