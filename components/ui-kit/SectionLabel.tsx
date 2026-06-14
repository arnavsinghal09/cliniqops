import type { JSX } from "react";

type Props = {
  eyebrow: string;
  title: string;
  level?: 1 | 2 | 3;
  align?: "left" | "center";
  serif?: boolean;
  className?: string;
};

const SIZE: Record<NonNullable<Props["level"]>, string> = {
  1: "text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.05]",
  2: "text-3xl md:text-4xl leading-[1.1]",
  3: "text-xl md:text-2xl leading-snug",
};

export default function SectionLabel({
  eyebrow,
  title,
  level = 2,
  align = "left",
  serif = false,
  className = "",
}: Props) {
  const Heading = `h${level}` as keyof JSX.IntrinsicElements;
  const fontClass = serif ? "font-serif" : "font-display";

  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
        {eyebrow}
      </p>
      <Heading
        className={`mt-2 ${fontClass} font-medium tracking-tight text-ink ${SIZE[level]}`}
      >
        {title}
      </Heading>
    </div>
  );
}
