import { BookOpen, Warning } from "@phosphor-icons/react";

/** Decorative hero illustration: a serum bottle being scanned, with the chips the checker would show. */
export default function ScanArt({ flag, sources }: { flag: string; sources: string }) {
  return (
    <div className="scan-art" aria-hidden="true">
      <div className="scan-glow" />
      <svg viewBox="0 0 320 440" className="scan-bottle">
        <defs>
          <linearGradient id="glass" x1="0" x2="1">
            <stop offset="0" stopColor="var(--glass-edge)" />
            <stop offset="0.45" stopColor="var(--glass-mid)" />
            <stop offset="1" stopColor="var(--glass-edge)" />
          </linearGradient>
          <clipPath id="label-clip">
            <rect x="70" y="190" width="180" height="200" rx="14" />
          </clipPath>
        </defs>
        {/* dropper cap */}
        <rect x="128" y="20" width="64" height="78" rx="30" fill="var(--noir)" />
        <rect x="118" y="92" width="84" height="40" rx="8" fill="var(--noir-2)" className="bottle-body" />
        {/* bottle */}
        <rect x="50" y="128" width="220" height="292" rx="46" fill="url(#glass)" className="bottle-body" />
        <rect x="66" y="146" width="14" height="230" rx="7" fill="#fff" opacity="0.45" />
        {/* label */}
        <rect x="70" y="190" width="180" height="200" rx="14" fill="#ffffff" />
        <text x="88" y="222" className="art-label-title">SERUM</text>
        <text x="88" y="246" className="art-label-small">INGREDIENTS:</text>
        {[264, 280, 296, 312, 328, 344, 360].map((y, i) => (
          <rect key={y} x="88" y={y} width={[140, 120, 132, 98, 136, 110, 72][i]} height="7" rx="3.5" fill="var(--noir)" opacity={i === 2 || i === 4 ? 0.85 : 0.25} />
        ))}
        <g clipPath="url(#label-clip)">
          <rect className="scan-beam" x="70" y="190" width="180" height="26" fill="var(--rose)" opacity="0.28" />
        </g>
      </svg>
      <div className="art-chip chip-a" dir="ltr">
        <strong>Retinol</strong> <span>retinoid</span>
      </div>
      <div className="art-chip chip-b" dir="ltr">
        <strong>Glycolic Acid</strong> <span>AHA</span>
      </div>
      <div className="art-chip chip-flag">
        <Warning size={18} weight="bold" /> {flag}
      </div>
      <div className="art-chip chip-src">
        <BookOpen size={18} weight="bold" /> {sources}
      </div>
    </div>
  );
}
