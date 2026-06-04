// ProcureTrack brand mark components — derived from the brand guide.
// Three exports:
//   LogoFull   — horizontal lockup (symbol + wordmark), light or dark
//   LogoMark   — square app-icon / favicon version (navy bg, arc on cream)
//   LogoSymbol — bare arc symbol, no background box

export function LogoFull({
  height = 36,
  dark = false,
  className,
}: {
  height?: number;
  dark?: boolean;
  className?: string;
}) {
  // Tight viewBox crops the 440×120 master to just the content region so the
  // component scales cleanly at small nav sizes without empty whitespace.
  const textColor   = dark ? "#FAF7F2" : "#0B1B2B";
  const trackColor  = dark ? "#cfd9e3" : "#1f3247";
  const strokeColor = dark ? "#FAF7F2" : "#0B1B2B";
  const nodeColor   = dark ? "#FAF7F2" : "#0B1B2B";
  const vbW = 372;
  const vbH = 58;
  const width = Math.round(height * (vbW / vbH));
  return (
    <svg
      width={width}
      height={height}
      viewBox={`14 32 ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProcureTrack"
      className={className}
    >
      <g transform="translate(10, 30)">
        <path d="M 8 52 Q 30 8, 60 8 T 112 52" fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
        <path d="M 8 52 Q 30 8, 60 8" fill="none" stroke="#C9A227" strokeWidth="6" strokeLinecap="round" />
        <circle cx="60" cy="8"  r="9" fill="#C9A227" stroke={strokeColor} strokeWidth="3" />
        <circle cx="8"  cy="52" r="4" fill={nodeColor} />
        <circle cx="112" cy="52" r="4" fill={nodeColor} />
      </g>
      <text
        x="150" y="78"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="34"
        fontWeight="600"
        fill={textColor}
        letterSpacing="-0.8"
      >
        Procure<tspan fontWeight="400" fill={trackColor}>Track</tspan>
      </text>
    </svg>
  );
}

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProcureTrack"
      className={className}
    >
      <rect width="64" height="64" rx="12" fill="#0B1B2B" />
      <path d="M 12 44 Q 22 18, 32 18 T 52 44" fill="none" stroke="#FAF7F2" strokeWidth="5" strokeLinecap="round" />
      <path d="M 12 44 Q 22 18, 32 18"           fill="none" stroke="#C9A227" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="18" r="6" fill="#C9A227" stroke="#FAF7F2" strokeWidth="2" />
    </svg>
  );
}

export function LogoSymbol({
  size = 48,
  dark = false,
  className,
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  const strokeColor = dark ? "#FAF7F2" : "#0B1B2B";
  const nodeColor   = dark ? "#FAF7F2" : "#0B1B2B";
  const h = Math.round(size * 0.5);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 120 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProcureTrack symbol"
      className={className}
    >
      <path d="M 8 52 Q 30 8, 60 8 T 112 52" fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
      <path d="M 8 52 Q 30 8, 60 8"           fill="none" stroke="#C9A227"    strokeWidth="6" strokeLinecap="round" />
      <circle cx="60" cy="8"   r="9" fill="#C9A227" stroke={strokeColor} strokeWidth="3" />
      <circle cx="8"  cy="52"  r="4" fill={nodeColor} />
      <circle cx="112" cy="52" r="4" fill={nodeColor} />
    </svg>
  );
}
