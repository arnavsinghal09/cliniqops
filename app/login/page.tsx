"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicSlug, setClinicSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      clinicSlug,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(
        "Invalid email, password, or clinic. Please check your details and try again.",
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-card shadow-card p-10">
        <div className="flex items-center gap-2 mb-1">
          <Leaf size={24} className="text-brand" />
          <h1 className="text-2xl font-semibold text-ink">CliniqOps</h1>
        </div>
        <p className="text-ink-3 text-sm mb-8">Sign in to your clinic</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="you@clinic.com"
              className="w-full border border-[#E5E7EB] rounded-ctrl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
              className="w-full border border-[#E5E7EB] rounded-ctrl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Clinic
            </label>
            <input
              type="text"
              value={clinicSlug}
              onChange={(e) => setClinicSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="sunrise"
              className="w-full border border-[#E5E7EB] rounded-ctrl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
            <p className="text-ink-4 text-xs mt-1.5">
              e.g. sunrise or metro
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-brand text-white rounded-ctrl py-2.5 text-sm font-medium hover:bg-[#163D2A] transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error && (
            <div className="bg-danger-light text-danger text-sm rounded-ctrl px-4 py-3 border border-[#FECACA]">
              {error}
            </div>
          )}
        </div>

        <p className="text-ink-4 text-xs mt-6 text-center">
          Demo: admin@sunrise.com / password123 / sunrise
        </p>
      </div>
    </div>
  );
}
