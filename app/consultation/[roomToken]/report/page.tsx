import { format } from "date-fns";
import prisma from "@/lib/prisma";
import FollowUpRequest from "./FollowUpRequest";

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border: "#E3DDD3",
  border2: "#D8D0C4",
  accent: "#72554D",
  accentDk: "#4A352E",
  accentMut: "#EDE6DF",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
};

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rpt-card"
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 22,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: C.ink3,
          margin: "0 0 4px",
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: C.ink,
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ roomToken: string }>;
}) {
  const { roomToken } = await params;

  const room = await prisma.consultationRoom.findUnique({
    where: { roomToken },
    include: {
      doctor: { select: { email: true, name: true } },
      clinic: { select: { name: true } },
      scribeSession: { include: { soapNote: true } },
    },
  });

  const soap = room?.scribeSession?.soapNote ?? null;

  if (!room) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: C.bg,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            background: C.surface,
            border: `1px solid ${C.border2}`,
            borderRadius: 6,
            padding: 28,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: C.ink3,
              margin: "0 0 6px",
            }}
          >
            INVALID LINK
          </p>
          <h1
            style={{ fontSize: 22, fontWeight: 600, color: C.ink, margin: 0 }}
          >
            This summary link is not valid
          </h1>
        </div>
      </main>
    );
  }

  if (!soap || !soap.approvedAt) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: C.bg,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: C.surface,
            border: `1px solid ${C.border2}`,
            borderRadius: 6,
            padding: 28,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: C.ink3,
              margin: "0 0 6px",
            }}
          >
            VISIT SUMMARY
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 10px",
            }}
          >
            Being prepared
          </h1>
          <p
            style={{ fontSize: 14, color: C.ink2, margin: 0, lineHeight: 1.55 }}
          >
            Your doctor is reviewing your consultation notes. This page will be
            ready soon. You can bookmark this link and return.
          </p>
        </div>
      </main>
    );
  }

  // Mark first view (fine to do directly in a Server Component).
  if (!room.reportViewedAt) {
    await prisma.consultationRoom.update({
      where: { id: room.id },
      data: { reportViewedAt: new Date() },
    });
  }

  const doctorName = room.doctor.name ?? room.doctor.email;
  const visitDate = room.endedAt ? format(room.endedAt, "dd MMMM yyyy") : "—";

  return (
    <main
      style={{ minHeight: "100vh", background: C.bg, padding: "32px 16px" }}
    >
      <style>{`
        @media print {
          .rpt-noprint { display: none !important; }
          .rpt-card { box-shadow: none !important; border-color: #ccc !important; }
          body, main { background: #fff !important; }
          * { color: #000 !important; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: C.accent,
              margin: "0 0 12px",
            }}
          >
            {room.clinic.name}
          </p>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: C.ink3,
              margin: "0 0 4px",
            }}
          >
            VISIT SUMMARY
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            {room.patientName}
          </h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>
            {visitDate} · {doctorName}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section eyebrow="SUBJECTIVE" title="What you told us">
            {soap.subjective}
          </Section>
          <Section eyebrow="OBJECTIVE" title="What we found">
            {soap.objective}
          </Section>

          <Section eyebrow="ASSESSMENT" title="Diagnosis">
            {soap.assessment}
            {soap.icd10Codes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, color: C.ink3, margin: "0 0 6px" }}>
                  Diagnosis codes
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {soap.icd10Codes.map((code) => (
                    <span
                      key={code}
                      style={{
                        background: C.accentMut,
                        color: C.accentDk,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 4,
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section eyebrow="PLAN" title="Your care plan">
            {soap.plan}
          </Section>

          {/* Highlighted instructions */}
          <div
            className="rpt-card"
            style={{
              background: C.okBg,
              border: `1px solid ${C.ok}`,
              borderRadius: 6,
              padding: 22,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: C.ok,
                margin: "0 0 4px",
              }}
            >
              INSTRUCTIONS FOR YOU
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: C.ink,
                margin: "0 0 10px",
              }}
            >
              What to do next
            </p>
            <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
              {soap.patientInstructions}
            </div>
          </div>

          {soap.followUpDate && (
            <div
              className="rpt-card"
              style={{
                background: C.warningBg,
                border: `1px solid ${C.warning}33`,
                borderRadius: 6,
                padding: "14px 18px",
                fontSize: 14,
                color: C.warning,
                fontWeight: 600,
              }}
            >
              📅 Follow-up suggested: {format(soap.followUpDate, "dd MMM yyyy")}
            </div>
          )}

          {soap.prescriptions.length > 0 && (
            <Section eyebrow="MEDICATIONS" title="Your prescriptions">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {soap.prescriptions.map((rx, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    💊 {rx}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <div
          className="rpt-noprint"
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <FollowUpRequest
            roomToken={roomToken}
            patientName={room.patientName}
          />
          <PrintButton />
          <p
            style={{ fontSize: 12, color: C.ink3, lineHeight: 1.5, margin: 0 }}
          >
            This summary was generated with AI assistance and reviewed by your
            doctor. If you have questions, contact your clinic directly.
          </p>
        </div>
      </div>
    </main>
  );
}

function PrintButton() {
  return (
    <form action="">
      <button
        formAction={undefined}
        type="button"
        // @ts-expect-error inline handler on a server-rendered button is fine here
        onClick="window.print()"
        style={{
          background: C.accent,
          color: C.surface,
          border: "none",
          borderRadius: 6,
          padding: "10px 18px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Print this page
      </button>
    </form>
  );
}
