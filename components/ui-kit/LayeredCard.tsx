
type Props = {
  children: React.ReactNode;
  offset?: boolean; 
  interactive?: boolean;
  grain?: boolean;
  className?: string;
};

export default function LayeredCard({
  children,
  offset = false,
  interactive = false,
  grain = true,
  className = "",
}: Props) {
  return (
    <div className="group relative">
      {(offset || interactive) && (
        <div
          aria-hidden
          className={`absolute left-0 top-0 h-full w-full rounded-md border border-line-2 bg-sand/60 transition-transform duration-200 ${
            interactive
              ? "translate-x-0 translate-y-0 group-hover:translate-x-1.5 group-hover:translate-y-1.5"
              : "translate-x-1.5 translate-y-1.5"
          }`}
        />
      )}

      <div
        className={`relative overflow-hidden rounded-md border border-line bg-surface shadow-card transition-transform duration-200 ${
          interactive
            ? "group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
            : ""
        } ${className}`}
      >
        {grain && <span aria-hidden className="grain-tex" />}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
