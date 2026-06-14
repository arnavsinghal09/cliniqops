"use client";
function tokenColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return v || fallback;
}

export const chart = {
  brand: () => tokenColor("--color-brand", "#72554D"), 
  clay: () => tokenColor("--color-clay", "#9B4E45"), 
  amber: () => tokenColor("--color-amber", "#E8A06A"), 
  ok: () => tokenColor("--color-ok", "#4E6B4F"), 
  danger: () => tokenColor("--color-danger", "#B4423A"), 
  ink3: () => tokenColor("--color-ink-3", "#8A827A"), 
  line: () => tokenColor("--color-line", "#E3DDD3"), 
};
