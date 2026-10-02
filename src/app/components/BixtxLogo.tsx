/**
 * BixtxLogo — unique geometric mark.
 *
 * Shape language:
 *   • Octagonal container (8-sided clipped square) — signals precision
 *   • Custom "B" built from two asymmetric arcs (upper tighter, lower wider)
 *   • Diagonal scan-line grid in the background — surveillance aesthetic
 *   • Teal signal-dot top-right — live-system indicator
 *   • All geometry hand-tuned on a 40×40 grid
 */

import { useId } from "react";

interface BixtxLogoProps {
  size?: number;
  className?: string;
  /** If true render the full horizontal lock-up (mark + wordmark) */
  wordmark?: boolean;
}

export function BixtxLogo({ size = 36, className = "", wordmark = false }: BixtxLogoProps) {
  const uid = useId().replace(/:/g, "");

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bixtx logo mark"
    >
      <defs>
        {/* Deep background gradient */}
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0c1a3a" />
          <stop offset="100%" stopColor="#071428" />
        </linearGradient>

        {/* B-mark fill gradient */}
        <linearGradient id={`${uid}-mark`} x1="8" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10d9a0" />
        </linearGradient>

        {/* Inner radial glow behind the B */}
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>

        {/* Clip to octagonal container */}
        <clipPath id={`${uid}-clip`}>
          {/*
            40×40 octagon — cut each corner by ~5.5 px at 45°
            points: (5.5,0)(34.5,0)(40,5.5)(40,34.5)(34.5,40)(5.5,40)(0,34.5)(0,5.5)
          */}
          <polygon points="5.5,0 34.5,0 40,5.5 40,34.5 34.5,40 5.5,40 0,34.5 0,5.5" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip)`}>
        {/* Background fill */}
        <rect width="40" height="40" fill={`url(#${uid}-bg)`} />

        {/* Background inner glow */}
        <rect width="40" height="40" fill={`url(#${uid}-glow)`} />

        {/* Diagonal scan-grid — very subtle */}
        {[-10, -4, 2, 8, 14, 20, 26, 32, 38, 44].map(x => (
          <line
            key={x}
            x1={x} y1="0" x2={x + 40} y2="40"
            stroke="#3b82f6"
            strokeWidth="0.4"
            strokeOpacity="0.12"
          />
        ))}

        {/* Horizontal centre scan-line — teal accent */}
        <line x1="2" y1="20" x2="38" y2="20" stroke="#10d9a0" strokeWidth="0.6" strokeOpacity="0.35" />

        {/* ── THE "B" MARK ───────────────────────────────────────────────── */}

        {/* Vertical stem */}
        <rect x="9.5" y="8.5" width="4" height="23" rx="2" fill={`url(#${uid}-mark)`} />

        {/* Upper bump — tighter curve (top bowl of B) */}
        <path
          d="M13.5 8.5 C19.5 8.5 24.5 11 24.5 15 C24.5 19 19.5 20 13.5 20"
          stroke={`url(#${uid}-mark)`}
          strokeWidth="3.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower bump — wider/heavier (bottom bowl of B) */}
        <path
          d="M13.5 20 C21 20 27 22.5 27 27 C27 31.5 21 31.5 13.5 31.5"
          stroke={`url(#${uid}-mark)`}
          strokeWidth="4.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ── ACCENTS ────────────────────────────────────────────────────── */}

        {/* Live signal dot — top right */}
        <circle cx="33.5" cy="7" r="2.8" fill="#10d9a0" />
        {/* Pulse ring around signal dot */}
        <circle cx="33.5" cy="7" r="4.5" stroke="#10d9a0" strokeWidth="0.7" strokeOpacity="0.4" fill="none" />

        {/* Bottom-left corner micro-bracket */}
        <path d="M3 34 L3 37 L6 37" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" fill="none" />
      </g>

      {/* Outer octagon border */}
      <polygon
        points="5.5,0 34.5,0 40,5.5 40,34.5 34.5,40 5.5,40 0,34.5 0,5.5"
        stroke="#3b82f6"
        strokeWidth="1"
        strokeOpacity="0.35"
        fill="none"
      />
    </svg>
  );

  if (!wordmark) return mark;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      {mark}
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          fontWeight: 900,
          fontSize: size * 0.52,
          letterSpacing: "0.03em",
          lineHeight: 1,
          background: "linear-gradient(90deg,#60a5fa,#3b82f6 50%,#10d9a0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        bixtx
      </span>
    </span>
  );
}
