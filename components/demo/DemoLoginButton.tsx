"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { DEMO_CREDENTIALS } from "@/lib/demo/credentials";

type SignInResult = {
  error: string | null;
  status: number;
  ok: boolean;
  url: string | null;
};

export default function DemoLoginButton({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const signInAsDemo = useCallback(async (): Promise<void> => {
    setPending(true);
    setError(null);

    const result = (await signIn("credentials", {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      clinicSlug: DEMO_CREDENTIALS.clinicSlug,
      redirect: false,
    })) as SignInResult | undefined;

    if (!result || result.error || !result.ok) {
      setError("Couldn't start the demo. Please try again.");
      setPending(false);
      return;
    }

    router.push("/dashboard?tour=1&fresh=true");
  }, [router]);

  const isPrimary = variant === "primary";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={signInAsDemo}
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: isPrimary ? "#72554D" : "#FBFAF7",
          color: isPrimary ? "#FBFAF7" : "#4A352E",
          border: isPrimary ? "none" : "1px solid #D8D0C4",
          borderRadius: 6,
          padding: "11px 22px",
          fontSize: 14,
          fontWeight: 600,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Starting demo…" : "View live demo"}
      </button>
      {error && (
        <span style={{ fontSize: 12.5, color: "#B4423A" }}>{error}</span>
      )}
    </div>
  );
}
