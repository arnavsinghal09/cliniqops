"use client";

// Pure-SVG stand-in for the 3D scene: a soft green orb with a faint ring.
// Sized identically to the canvas slot so swapping in/out causes zero shift.
export default function HeroPoster() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-full w-full max-h-115"
        aria-hidden
      >
        <defs>
          <radialGradient id="orb" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#E8F5EE" />
            <stop offset="55%" stopColor="#4CAF7D" />
            <stop offset="100%" stopColor="#1D4D35" />
          </radialGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle
          cx="200"
          cy="205"
          r="120"
          fill="#1D4D35"
          opacity="0.12"
          filter="url(#soft)"
        />
        <circle cx="200" cy="200" r="110" fill="url(#orb)" />
        <ellipse
          cx="170"
          cy="165"
          rx="34"
          ry="20"
          fill="#FFFFFF"
          opacity="0.35"
        />
        <circle
          cx="200"
          cy="200"
          r="135"
          fill="none"
          stroke="#4CAF7D"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
