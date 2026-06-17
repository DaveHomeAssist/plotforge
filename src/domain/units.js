// Internal canonical unit: millimeters as integers.
// Conversions live at the UI edge — never inside the document.

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;

export const inchesToMm = (n) => Math.round(n * MM_PER_INCH);
export const feetToMm = (n) => Math.round(n * MM_PER_FOOT);
export const mmToInches = (n) => n / MM_PER_INCH;
export const mmToFeet = (n) => n / MM_PER_FOOT;

/** "12'-6\"" → mm. Accepts feet, inches, or feet+inches. */
export function parseImperial(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  const ft = s.match(/^(-?\d+(?:\.\d+)?)'(?:\s*-?\s*(\d+(?:\.\d+)?)")?$/);
  if (ft) {
    const feet = parseFloat(ft[1]);
    const inches = ft[2] ? parseFloat(ft[2]) : 0;
    return Math.round(feet * MM_PER_FOOT + inches * MM_PER_INCH);
  }
  const inOnly = s.match(/^(-?\d+(?:\.\d+)?)"$/);
  if (inOnly) return Math.round(parseFloat(inOnly[1]) * MM_PER_INCH);
  return null;
}

/** mm → human-readable feet-inches like 12'-6". */
export function formatImperial(mm) {
  if (mm == null || Number.isNaN(mm)) return "";
  const sign = mm < 0 ? "-" : "";
  const totalIn = Math.abs(mm / MM_PER_INCH);
  let ft = Math.floor(totalIn / 12);
  let inches = Math.round((totalIn - ft * 12) * 10) / 10;

  if (inches >= 12) {
    ft += 1;
    inches = 0;
  }

  if (ft === 0) return `${sign}${inches}"`;
  return `${sign}${ft}'-${inches}"`;
}
