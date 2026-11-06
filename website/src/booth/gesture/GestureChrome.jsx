// The camera page's chrome, borrowed wholesale from the booth console so
// /gesture reads as the same product (CONTRACTS.md §2 「摄影感的光」).
//
// Same top bar structure as BoothConsole's `.vb-topbar`: the mark, the
// VIBERAVE wordmark — on one baseline through
// `.vb-wordmark`'s `--brand-cap` — then the room line and the dark/light
// switch on the right. Same grain plate over the whole page.
//
// The mark and the grain plate are drawn here rather than imported from
// BoothConsole.jsx: that file is the console's own page component and does
// not export them. Worth folding into one shared module once both pages
// stop moving.
import { PhaseToggle } from '../PhaseToggle.jsx';
import { PHASE_LABEL } from '../useTimePhase.mjs';
import { AiLabel, PrivacyLink } from '../ComplianceNotice.jsx';

/** The eight-ray mark next to the wordmark — the console's, unchanged. */
export function SunMark({ color }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 28 28"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="14" y1="2" x2="14" y2="8" />
      <line x1="14" y1="20" x2="14" y2="26" />
      <line x1="2" y1="14" x2="8" y2="14" />
      <line x1="20" y1="14" x2="26" y2="14" />
      <line x1="5.5" y1="5.5" x2="9.8" y2="9.8" />
      <line x1="18.2" y1="18.2" x2="22.5" y2="22.5" />
      <line x1="22.5" y1="5.5" x2="18.2" y2="9.8" />
      <line x1="9.8" y1="18.2" x2="5.5" y2="22.5" />
    </svg>
  );
}

/** Film grain over the whole page — the console's plate, unchanged. */
export function Grain() {
  return (
    <svg className="vb-grain" width="100%" height="100%" aria-hidden>
      <filter id="vbGrainGesture">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="2.2" intercept="-0.6" />
          <feFuncG type="linear" slope="2.2" intercept="-0.6" />
          <feFuncB type="linear" slope="2.2" intercept="-0.6" />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#vbGrainGesture)" />
    </svg>
  );
}

/**
 * @param {{
 *   phase: string,
 *   clock: string,
 *   markColor: string,
 *   room: string,          // §15.1 head line: where the console is
 * }} props
 */
export function GestureTopbar({ phase, clock, markColor, room, mode }) {
  return (
    <header className="vb-topbar vb-gesture-topbar">
      <div className="vb-wordmark">
        <SunMark color={markColor} />
        <div className="vb-wordmark-text">VIBERAVE</div>
        <AiLabel />
      </div>
      <div className="vb-topbar-right">
        <div className="vb-cap is-warm">
          {PHASE_LABEL[phase]?.zh} {PHASE_LABEL[phase]?.en} · {clock}
        </div>
        <div className="vb-cap vb-gesture-link">{room}</div>
        <PrivacyLink mode={mode} className="vb-cap" />
        <PhaseToggle />
      </div>
    </header>
  );
}

export default GestureTopbar;
