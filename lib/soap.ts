import { getGeminiModel } from "@/lib/gemini";

export type GeneratedSoap = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: string[];
  suggestedCptCode: string;
  cptRationale: string;
  patientInstructions: string;
  followUpDate: string | null; // ISO date or null
  prescriptions: string[];
};

const SYSTEM_PROMPT = `You are a clinical documentation assistant. You convert a raw consultation transcript between a doctor and a patient into a structured SOAP note.

Rules:
- Output ONLY valid JSON, no markdown, no backticks, no preamble.
- Base everything strictly on the transcript. Do not invent symptoms, findings, or history that isn't supported by what was said.
- If a field genuinely cannot be determined from the transcript, use an empty string "" (or [] for arrays, null for followUpDate). Never fabricate.
- patientInstructions must be written in plain second-person language the patient can understand ("You should...", "Take..."), not clinical jargon.
- icd10Codes: best-guess ICD-10 codes for the assessment, as an array of code strings (e.g. ["E11.9"]). Empty array if unclear.
- suggestedCptCode: a single office-visit E/M CPT code (99211–99215) appropriate to the visit complexity. cptRationale: one sentence explaining the choice.
- followUpDate: if a follow-up timeframe is mentioned (e.g. "come back in 2 weeks"), compute an ISO date (YYYY-MM-DD) relative to today. Otherwise null.
- prescriptions: array of medication strings as prescribed (name + dose + frequency if stated). Empty array if none.

Return JSON with exactly these keys: subjective, objective, assessment, plan, icd10Codes, suggestedCptCode, cptRationale, patientInstructions, followUpDate, prescriptions.`;

export async function generateSoapFromTranscript(
  transcript: string,
): Promise<GeneratedSoap> {
  const model = getGeminiModel();
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `${SYSTEM_PROMPT}

Today's date is ${today} (use this for any relative follow-up date calculation).

TRANSCRIPT:
"""
${transcript}
"""

Return the JSON now.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  // Gemini sometimes wraps in ```json fences despite instructions — strip them.
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: Partial<GeneratedSoap>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "The model returned an unparseable note. Try regenerating.",
    );
  }

  // Normalize / guard every field so a missing key never crashes the writer.
  return {
    subjective: String(parsed.subjective ?? ""),
    objective: String(parsed.objective ?? ""),
    assessment: String(parsed.assessment ?? ""),
    plan: String(parsed.plan ?? ""),
    icd10Codes: Array.isArray(parsed.icd10Codes)
      ? parsed.icd10Codes.map(String)
      : [],
    suggestedCptCode: String(parsed.suggestedCptCode ?? ""),
    cptRationale: String(parsed.cptRationale ?? ""),
    patientInstructions: String(parsed.patientInstructions ?? ""),
    followUpDate:
      parsed.followUpDate &&
      /^\d{4}-\d{2}-\d{2}/.test(String(parsed.followUpDate))
        ? String(parsed.followUpDate).slice(0, 10)
        : null,
    prescriptions: Array.isArray(parsed.prescriptions)
      ? parsed.prescriptions.map(String)
      : [],
  };
}
