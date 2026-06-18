"use client";

export default function TakeTourButton() {
  const start = (): void => {
    try {
      window.localStorage.removeItem("cliniqops_has_completed_tour");
    } catch {
      /* noop */
    }
    window.dispatchEvent(new Event("cliniqops:start-tour"));
  };

  return (
    <button
      type="button"
      onClick={start}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#EDE6DF",
        color: "#4A352E",
        border: "1px solid #D8D0C4",
        borderRadius: 6,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Take a tour
    </button>
  );
}
