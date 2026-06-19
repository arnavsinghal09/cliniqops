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

export default function DemoLoginButton({ solid = false }: { solid?: boolean }) {
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

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={signInAsDemo}
        disabled={pending}
        className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold uppercase tracking-eyebrow transition-colors disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-sand ${
          solid
            ? "border border-line bg-surface text-ink hover:bg-sand"
            : "border border-sand/40 text-sand hover:bg-sand/10 focus-visible:ring-offset-clay"
        }`}
      >
        {pending ? "Starting…" : "Take a tour"}
      </button>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
