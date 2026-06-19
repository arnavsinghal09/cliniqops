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
  const isCenter = align === "center";

  return (
    <div
      className={`${isCenter ? "text-center" : "border-l-2 border-brand pl-3"} ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
        {eyebrow}
      </p>
      <Heading
        className={`mt-1.5 ${fontClass} font-semibold tracking-tight text-ink ${SIZE[level]}`}
      >
        {title}
      </Heading>
    </div>
  );
}
