// §58 the settings gear, flat: one hairline outline in currentColor, no
// emoji, so it takes the colour of whatever it sits in (night / day
// console, the stage's white header). Shared by the console's 主控 head and
// the stage's corner control.

/** Eight square-ish teeth around a ring, as one closed path (24 × 24 box). */
function gearPath({ teeth = 8, outer = 10, inner = 7.6, cx = 12, cy = 12 } = {}) {
  const step = (Math.PI * 2) / teeth;
  const half = step / 4; // tooth = half the pitch, centred on its angle
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    // valley → up the flank → across the tooth top → down → valley
    d += `${i ? 'L' : 'M'} ${pt(inner, a - half * 1.25)} `;
    d += `L ${pt(outer, a - half * 0.8)} L ${pt(outer, a + half * 0.8)} L ${pt(inner, a + half * 1.25)} `;
    d += `A ${inner} ${inner} 0 0 1 ${pt(inner, a + step - half * 1.25)} `;
  }
  return `${d}Z`;
}

const GEAR_D = gearPath();

export function GearIcon({ size = 20, strokeWidth = 1.5 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={GEAR_D} />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

/** The matching flat close mark, for a gear whose panel is open. */
export function CloseIcon({ size = 20, strokeWidth = 1.5 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}
