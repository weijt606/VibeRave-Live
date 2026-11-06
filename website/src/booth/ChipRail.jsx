// One-line chips (tap = send immediately, source:'chip') and style tiles
// (tap = swap in a pregenerated take). Adult tiles sit on five shelves
// (styleCatalog.mjs); kids mode swaps in the kids chip set and the twelve
// genre tiles with inline icons. Whatever changed the style — a tile, a
// spoken name, a gesture, a phone — the shelf and the lit tile follow it
// (`viberave:style-applied`).
import { useEffect, useRef, useState } from 'react';
import * as ZH from './chips.zh.mjs';
import * as EN from './chips.en.mjs';
import * as KIDS from './chips.kids.mjs';
import { shelfOf } from './styleCatalog.mjs';

const FLASH_MS = 1400;

const GENRE_ICONS = {
  note: (
    <>
      <path d="M10 20V8l10-2v12" />
      <circle cx="7.5" cy="20" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
    </>
  ),
  moon: <path d="M20 15a7 7 0 1 1-7-7c0 4 3 7 7 7z" />,
  castle: (
    <>
      <path d="M5 18h18" />
      <path d="M8 18v-6l6-4 6 4v6" />
      <path d="M12 18v-4h4v4" />
    </>
  ),
  waltz: (
    <>
      <path d="M14 4v20" />
      <path d="M6 12c4-4 12-4 16 0" />
      <path d="M6 16c4 4 12 4 16 0" />
    </>
  ),
  mountain: <path d="M4 20l6-10 5 6 3-3 6 7z" />,
  gamepad: (
    <>
      <rect x="5" y="9" width="18" height="12" rx="2" />
      <path d="M9 13v4M7 15h4" />
      <circle cx="18" cy="14" r="1" />
      <circle cx="20" cy="17" r="1" />
    </>
  ),
  animal: (
    <>
      <circle cx="14" cy="15" r="6" />
      <path d="M9 11l-3-4M19 11l3-4M14 21v3" />
    </>
  ),
  rocket: (
    <>
      <path d="M14 4c4 4 5 10 2 16l-2 4-2-4c-3-6-2-12 2-16z" />
      <circle cx="14" cy="12" r="2" />
    </>
  ),
  fish: (
    <>
      <path d="M4 14c4-6 12-6 16 0-4 6-12 6-16 0z" />
      <path d="M20 14l4-4v8z" />
      <circle cx="9" cy="13" r="1" />
    </>
  ),
  dino: (
    <>
      <path d="M5 20c0-5 3-8 8-8h3l2-5 3 1-1 5c2 1 3 3 3 7" />
      <path d="M9 20v3M17 20v3" />
    </>
  ),
  cake: (
    <>
      <rect x="6" y="13" width="16" height="9" rx="1" />
      <path d="M6 17c3 2 5-2 8 0s5 2 8 0" />
      <path d="M14 13V9M14 6v1" />
    </>
  ),
  rain: (
    <>
      <path d="M8 14a5 5 0 0 1 1-9 6 6 0 0 1 11 2 4 4 0 0 1 0 7z" />
      <path d="M10 18l-1 3M15 18l-1 3M20 18l-1 3" />
    </>
  ),
};

function GenreIcon({ name }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GENRE_ICONS[name] || GENRE_ICONS.note}
    </svg>
  );
}

// Briefly mark the last-tapped chip so the tap reads as "taken".
function useFlash() {
  const [active, setActive] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    active,
    (id) => {
      clearTimeout(timer.current);
      setActive(id);
      timer.current = setTimeout(() => setActive(null), FLASH_MS);
    },
  ];
}

// onStyle(style, fallbackPrompt): style tiles go through the pregen cache
// (vibeStore.applyStyle); without it they fall back to a plain onSend.
export function ChipRail({ mode = 'adult', lang = 'zh', phase = 'night', onSend, onStyle }) {
  const [flashChip, flash] = useFlash();
  const [activeStyle, setActiveStyle] = useState(null);
  const [shelfId, setShelfId] = useState('floor');

  // Voice / gesture / phone style changes light the tile and open its shelf.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onApplied = (e) => {
      const d = e?.detail || {};
      if (d.styleId) setActiveStyle(d.styleId);
      if (d.shelfId) setShelfId(d.shelfId);
    };
    window.addEventListener('viberave:style-applied', onApplied);
    return () => window.removeEventListener('viberave:style-applied', onApplied);
  }, []);

  if (mode === 'kids') {
    const { CHIPS, GENRES, UI } = KIDS;
    return (
      <>
        <div className="vb-section">
          <div className="vb-cap">{UI.chipsCap}</div>
          <div className="vb-chips">
            {CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`vb-chip${flashChip === c.id ? ' is-on' : ''}`}
                onClick={() => {
                  flash(c.id);
                  onSend?.(KIDS.chipText(c), { source: 'chip', chip: c.id });
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="vb-section">
          <div className="vb-cap">{UI.stylesCap}</div>
          <div className="vb-genres">
            {GENRES.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`vb-tile vb-genre${activeStyle === g.id ? ' is-on' : ''}`}
                onClick={() => {
                  setActiveStyle(g.id);
                  if (onStyle) onStyle(g, KIDS.genrePrompt(g));
                  else onSend?.(KIDS.genrePrompt(g), { source: 'chip', style: g.id, intent: 'generate' });
                }}
              >
                <GenreIcon name={g.icon} />
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const L = lang === 'en' ? EN : ZH;
  const dark = phase !== 'day';
  const shelf = L.SHELVES.find((sh) => sh.id === shelfId) || L.SHELVES[0];
  return (
    <>
      <div className="vb-section">
        <div className="vb-cap">{L.UI.chipsCap}</div>
        <div className="vb-chips">
          {L.CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`vb-chip${c.hot ? ' is-hot' : ''}${flashChip === c.id ? ' is-on' : ''}`}
              onClick={() => {
                flash(c.id);
                onSend?.(c.text, { source: 'chip', chip: c.id });
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="vb-section">
        <div className="vb-cap">{L.UI.stylesCap}</div>
        <div className="vb-shelves" role="tablist" aria-label={L.UI.shelvesCap || 'shelves'}>
          {L.SHELVES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              role="tab"
              aria-selected={sh.id === shelf.id}
              className={`vb-shelf${sh.id === shelf.id ? ' is-on' : ''}${
                activeStyle && shelfOf(activeStyle)?.id === sh.id ? ' has-playing' : ''
              }`}
              onClick={() => setShelfId(sh.id)}
            >
              {lang === 'en' ? sh.en : sh.label}
            </button>
          ))}
        </div>
        <div className="vb-styles">
          {shelf.styles.map((st) => {
            const on = activeStyle === st.id;
            const style = dark
              ? {
                  background: `linear-gradient(160deg, ${st.tint[0]}, ${st.tint[1]} 60%, rgba(20,18,42,.2))`,
                }
              : undefined;
            return (
              <button
                key={st.id}
                type="button"
                className={`vb-tile vb-style${on ? ' is-on' : ''}`}
                style={style}
                onClick={() => {
                  setActiveStyle(st.id);
                  if (onStyle) onStyle(st, L.stylePrompt(st));
                  else onSend?.(L.stylePrompt(st), { source: 'chip', style: st.id, intent: 'generate' });
                }}
              >
                <div className="vb-style-name">{st.label}</div>
                <div className="vb-style-bpm">{st.bpm} bpm</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
