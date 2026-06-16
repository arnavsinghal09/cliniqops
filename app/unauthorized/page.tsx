import Link from "next/link";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import SectionLabel from "@/components/ui-kit/SectionLabel";

export default function UnauthorizedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--color-bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <LayeredCard>
          <div style={{ padding: 28 }}>
            <SectionLabel
              eyebrow="ACCESS RESTRICTED"
              title="You don't have permission to view this"
              level={3}
            />
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-ink-2)",
                margin: "14px 0 22px",
              }}
            >
              Your account role doesn&apos;t include this page. If you think
              this is a mistake, contact your clinic admin.
            </p>
            <Link
              href="/dashboard"
              style={{
                display: "inline-block",
                background: "var(--color-accent)",
                color: "var(--color-surface)",
                fontSize: 14,
                fontWeight: 600,
                padding: "9px 18px",
                borderRadius: "var(--radius-ctrl)",
                textDecoration: "none",
              }}
            >
              Back to dashboard
            </Link>
          </div>
        </LayeredCard>
      </div>
    </main>
  );
}
