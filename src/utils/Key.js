// utils/keys.js
export const norm = (s = "") => String(s).trim();

export const keyOf = (name, code, size) =>
  `${norm(name)}|${norm(code)}|${norm(size)}`;

export const splitKey = (k) => {
  const [name, code, size] = k.split("|");
  return { name, code, size };
};
