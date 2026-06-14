"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { rise } from "@/lib/motion";

type Accent = "green" | "red" | "amber";

const ACCENT: Record<
  Accent,
  { bar: string; badgeBg: string; badgeText: string }
> = {
  green: { bar: "bg-ok", badgeBg: "bg-ok-bg", badgeText: "text-ok" },
  red: { bar: "bg-danger", badgeBg: "bg-danger-bg", badgeText: "text-danger" },
  amber: {
    bar: "bg-warning",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
  },
};

type Props = {
  eyebrow: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  description?: string;
  accentColor?: Accent;
  icon?: React.ReactNode;
};

export default function MetricCard({
  eyebrow,
  value,
  trend,
  trendLabel,
  description,
  accentColor = "green",
  icon,
}: Props) {
  const tone = ACCENT[accentColor];

  return (
    <motion.div
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-15%" }}
      className="relative overflow-hidden rounded-md border border-line bg-surface p-6 shadow-card transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span
        className={`absolute left-0 top-0 h-full w-0.75 ${tone.bar}`}
        aria-hidden
      />
      {icon && (
        <div className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-sm bg-brand-muted text-brand">
          {icon}
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-[32px] font-bold leading-none tracking-tight text-ink">
        {value}
      </p>

      {trend && trendLabel && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${tone.badgeBg} ${tone.badgeText}`}
        >
          {trend === "up" ? (
            <TrendingUp size={12} />
          ) : trend === "down" ? (
            <TrendingDown size={12} />
          ) : null}
          {trendLabel}
        </span>
      )}

      {description && (
        <p className="mt-2 text-[13px] text-ink-3">{description}</p>
      )}
    </motion.div>
  );
}
