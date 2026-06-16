export const CPT_CODES = [
  { code: "99211", minMinutes: 0, maxMinutes: 9, cmsFee: 24, label: "Minimal" },
  {
    code: "99212",
    minMinutes: 10,
    maxMinutes: 19,
    cmsFee: 46,
    label: "Low complexity",
  },
  {
    code: "99213",
    minMinutes: 20,
    maxMinutes: 29,
    cmsFee: 77,
    label: "Moderate complexity",
  },
  {
    code: "99214",
    minMinutes: 30,
    maxMinutes: 39,
    cmsFee: 110,
    label: "Moderate-high complexity",
  },
  {
    code: "99215",
    minMinutes: 40,
    maxMinutes: 999,
    cmsFee: 148,
    label: "High complexity",
  },
] as const;

export type CptCode = (typeof CPT_CODES)[number]["code"];

export type LeakageType = "UNDERCODE" | "OVERCODE" | "CORRECT";

export function getSuggestedCpt(durationMinutes: number): string {
  const match = CPT_CODES.find(
    (c) => durationMinutes >= c.minMinutes && durationMinutes <= c.maxMinutes,
  );
  return match ? match.code : "99215";
}

export function calculateLeakage(
  billedCode: string,
  durationMinutes: number,
): { suggestedCode: string; leakageAmount: number; leakageType: LeakageType } {
  const billedFee = CPT_CODES.find((c) => c.code === billedCode)?.cmsFee ?? 0;
  const suggestedCode = getSuggestedCpt(durationMinutes);
  const suggestedFee =
    CPT_CODES.find((c) => c.code === suggestedCode)?.cmsFee ?? 0;

  const leakageAmount = suggestedFee - billedFee;

  let leakageType: LeakageType;
  if (billedCode === suggestedCode) {
    leakageType = "CORRECT";
  } else if (leakageAmount > 0) {
    leakageType = "UNDERCODE";
  } else {
    leakageType = "OVERCODE";
  }

  return { suggestedCode, leakageAmount, leakageType };
}
