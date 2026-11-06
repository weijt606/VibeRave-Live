// /crowd — the audience page (docs/booth/CONTRACTS.md §21.2). Anyone in
// front of the big screen scans the small QR and gets one button: 打 call.
// Taps go to the room as `cheer`; the console sends the meter back as
// `hype`, and a full meter drops the music. No seat, no name, no mic —
// up to BOOTH_CROWD_MAX phones, booth Wi-Fi only.
import { useEffect, useRef, useState } from 'react';
import { apiBaseUrl, boothWsUrl, createBoothSocket, readRoomParams } from '../wsClient.mjs';
import { AiLabel, PrivacyLink } from '../ComplianceNotice.jsx';

const STATUS = {
  connecting: '连接中…',
  open: '一起点，打满就 Drop',
  full: '观众太多了，稍等自动再进',
  offline: '连不上展台 · 请连展台 Wi-Fi',
};

export function CrowdApp() {
  const sockRef = useRef(null);
  const [state, setState] = useState('connecting');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(false);
  const [taps, setTaps] = useState(0);
  const peakTimer = useRef(0);

  useEffect(() => {
    const { room, token } = readRoomParams(location.search);
    let failures = 0;
    const sock = createBoothSocket({
      url: boothWsUrl({ apiUrl: apiBaseUrl(), room, token }),
      role: 'crowd',
      onOpen: () => {
        failures = 0;
        setState('open');
      },
      onClose: () => {
        failures += 1;
        setState((s) => (s === 'full' ? 'full' : failures > 2 ? 'offline' : 'connecting'));
      },
      onMessage: (msg) => {
        if (msg.t === 'error' && msg.code === 'crowd_full') setState('full');
        if (msg.t === 'welcome') setState('open');
        if (msg.t === 'hype') {
          setLevel(Number(msg.level) || 0);
          if (msg.peak) {
            setPeak(true);
            clearTimeout(peakTimer.current);
            peakTimer.current = setTimeout(() => setPeak(false), 2400);
          }
        }
      },
    });
    sockRef.current = sock;
    return () => {
      clearTimeout(peakTimer.current);
      sock.close();
    };
  }, []);

  function cheer() {
    if (state !== 'open') return;
    sockRef.current?.send({ t: 'cheer' });
    setTaps((n) => n + 1);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* not on iOS */
    }
  }

  return (
    <div className={`gm-crowdpage vb-root${peak ? ' is-peak' : ''}`} style={{ '--lvl': level }}>
      <header>
        <AiLabel />
        <h1>{peak ? '全场一起，Drop！' : '给台上的音乐打 call'}</h1>
        <div className="vb-cap">VIBERAVE</div>
      </header>
      <button
        type="button"
        className="gm-tap"
        onPointerDown={(e) => {
          e.preventDefault();
          cheer();
        }}
        disabled={state !== 'open'}
      >
        打 call
      </button>
      <div className="gm-foot">
        <div className="gm-meter" aria-label={`热度 ${Math.round(level * 100)}`}>
          <span style={{ transform: `scaleX(${level})` }} />
        </div>
        <div className="gm-status" role="status">
          {STATUS[state]}
          {state === 'open' && taps > 0 ? ` · 你点了 ${taps} 下` : ''}
        </div>
        <PrivacyLink mode="adult" className="vb-cap" />
      </div>
    </div>
  );
}

export default CrowdApp;
