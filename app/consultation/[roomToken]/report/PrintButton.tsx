"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        background: "#72554D",
        color: "#FBFAF7",
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
  );
}
