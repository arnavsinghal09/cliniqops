"use server";

import { auth } from "@/auth";

export async function getScribeToken(): Promise<
  { token: string } | { error: string }
> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    // AssemblyAI v3 streaming temp token. Minted server-side so the API key
    // never reaches the browser; the browser only gets this short-lived token.
    const res = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
      { headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! } },
    );
    if (!res.ok) {
      const body = await res.text();
      return { error: `Token request failed: ${res.status} ${body}` };
    }
    const data = (await res.json()) as { token: string };
    return { token: data.token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Token request failed" };
  }
}
