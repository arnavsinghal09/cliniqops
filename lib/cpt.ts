import { getGeminiModel } from "@/lib/gemini";

export type SuggestedCpt = {
  code: string;
  description: string;
  confidence: number;
  rationale: string;
};

const CPT_CODE_RE = /^\d{4,5}[A-Z0-9]?$/;

const SYSTEM_PROMPT = `You are a medical billing assistant. Given an approved SOAP note, suggest the most appropriate CPT E/M codes for the encounter.

Rules:
- Output ONLY valid JSON — no markdown, no backticks, no preamble.
- Return an array of objects. Each object must have exactly these keys:
    code        (string) — CPT code, e.g. "99213"
    description (string) — brief plain-English label for the code
    confidence  (number) — your confidence this code applies, between 0.0 and 1.0
    rationale   (string) — one sentence explaining why this code fits this note
- Only suggest codes you are confident apply to this specific note.
- Limit to 1–5 codes. Prioritise the primary E/M code first.
- Do not suggest codes you cannot justify from the note content.
- Return [] if the note content is insufficient to bill.`;

export async function suggestCptFromSoap(soap: {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}): Promise<SuggestedCpt[]> {
  const model = getGeminiModel();

  const prompt = `${SYSTEM_PROMPT}

SOAP NOTE:
Subjective: ${soap.subjective}
Objective: ${soap.objective}
Assessment: ${soap.assessment}
Plan: ${soap.plan}

Return the JSON array now.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("CPT suggestion returned unparseable JSON. Try again.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("CPT suggestion did not return an array.");
  }

  const validated: SuggestedCpt[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const { code, description, confidence, rationale } = item as Record<string, unknown>;

    const codeStr = String(code ?? "").trim().toUpperCase();
    if (!CPT_CODE_RE.test(codeStr)) continue;          // reject non-CPT strings
    if (typeof confidence !== "number") continue;
    const conf = Math.min(1, Math.max(0, confidence));

    validated.push({
      code: codeStr,
      description: String(description ?? "").trim(),
      confidence: conf,
      rationale: String(rationale ?? "").trim(),
    });
  }

  return validated;
}
