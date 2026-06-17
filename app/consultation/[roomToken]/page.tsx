import prisma from "@/lib/prisma";
import PatientConsultationRoom from "./PatientConsultationRoom";

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border2: "#D8D0C4",
  accent: "#72554D",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
  danger: "#B4423A",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
};

export default async function PatientConsultationPage({
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
    },
  });

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
            width: "100%",
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
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 10px",
            }}
          >
            This consultation link is not valid
          </h1>
          <p
            style={{ fontSize: 14, color: C.ink2, margin: 0, lineHeight: 1.55 }}
          >
            Please check the link your clinic sent you, or contact them
            directly.
          </p>
        </div>
      </main>
    );
  }

  const statusBadge: Record<
    string,
    { bg: string; color: string; label: string }
  > = {
    WAITING: { bg: C.warningBg, color: C.warning, label: "Waiting" },
    ACTIVE: { bg: "#F7ECEA", color: C.danger, label: "Live" },
    COMPLETED: { bg: C.okBg, color: C.ok, label: "Completed" },
    CANCELLED: { bg: C.bg, color: C.ink3, label: "Cancelled" },
  };
  const badge = statusBadge[room.status] ?? statusBadge.WAITING;

  return (
    <main style={{ minHeight: "100vh", background: C.bg }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: `1px solid ${C.border2}`,
          background: C.surface,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 600, color: C.accent }}>
          {room.clinic.name}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "3px 9px",
            borderRadius: 4,
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </header>

      <PatientConsultationRoom
        roomToken={roomToken}
        patientName={room.patientName}
        doctorName={room.doctor.name ?? room.doctor.email}
        clinicName={room.clinic.name}
        initialStatus={room.status}
      />
    </main>
  );
}
