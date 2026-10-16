import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useBlowMicrophone from '../components/useBlowMicrophone';

const MAX_WISH_LENGTH = 160;
const SEEDS = Array.from({ length: 64 }, (_, index) => {
  const angle = index * 137.508 * Math.PI / 180;
  const radius = 12 + Math.sqrt(index / 63) * 63;
  const x = 185 + Math.cos(angle) * radius;
  const y = 140 + Math.sin(angle) * radius;
  const driftX = 30 + Math.sin(angle) * 265;
  const driftY = -85 - (index * 73) % 220 - y;
  const sway = Math.cos(angle * 1.7) * 42;
  return {
    x, y, angle: angle * 180 / Math.PI + 90, length: 17 + index % 7, index,
    flightPath: `path("M0 0 C${driftX * .18 + sway} -35 ${driftX * .7 - sway} ${driftY * .65} ${driftX} ${driftY}")`,
  };
});
const STARS = Array.from({ length: 28 }, (_, index) => ({
  x: (index * 37 + 9) % 100,
  y: (index * 23 + 5) % 80,
  size: index % 4 === 0 ? 3 : 1.5,
}));
const WISH_SEED = SEEDS[44];
// The SVG overflows into the sky beside the heading; seed and star share this point.
const WISH_STAR = { x: 380, y: -140 };
const WISH_PATH = `path("M0 0 C-28 -30 18 -58 62 -78 C90 -92 93 -113 78 -116 C63 -119 59 -102 73 -101 C92 -100 70 -140 98 -156 C125 -173 162 -165 ${WISH_STAR.x - WISH_SEED.x} ${WISH_STAR.y - WISH_SEED.y}")`;

function Seed({ seed }) {
  return (
    <g transform={`rotate(${seed.angle})`} stroke="#fff4dc" strokeLinecap="round">
      <path d={`M0 0L0 ${seed.length}`} strokeWidth=".75" strokeOpacity=".62" />
      <path className="day20-seed-fluff" d="M0 0L-10 -10M0 0L-6 -13M0 0L-2 -15M0 0L2 -15M0 0L6 -13M0 0L10 -10M0 0L12 -6M0 0L-12 -6" strokeWidth=".7" strokeOpacity=".84" />
      <path d={`M0 ${seed.length - 2}L0 ${seed.length + 1}`} stroke="#d8c29e" strokeWidth="1.8" />
      <circle cy="-1" r="1.15" fill="#fff9e9" stroke="none" />
    </g>
  );
}

function Dandelion({ onJourneyEnd }) {
  return (
    <svg className="day20-dandelion" viewBox="0 0 400 340" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="day20-stem-color" x1="178" y1="140" x2="222" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c9c894" />
          <stop offset="1" stopColor="#647575" />
        </linearGradient>
        <radialGradient id="day20-flower-glow">
          <stop stopColor="#fff3ce" stopOpacity=".13" />
          <stop offset="1" stopColor="#fff3ce" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="day20-plant">
      <circle cx="185" cy="140" r="113" fill="url(#day20-flower-glow)" />
      <path className="day20-stem" d="M185 143C177 196 212 249 199 342" stroke="url(#day20-stem-color)" strokeWidth="4" strokeLinecap="round" />
      <path className="day20-leaf" d="M200 293C168 286 151 265 140 251C172 251 195 267 200 293Z" fill="#839187" fillOpacity=".55" />
      <path className="day20-leaf" d="M200 294C214 274 235 269 251 270C241 285 221 294 200 294Z" fill="#a2ab91" fillOpacity=".45" />
      <path d="M153 259L200 293L237 276" stroke="#bbc0a1" strokeOpacity=".4" strokeWidth="1" />
      <g className="day20-flower-head">
        <circle className="day20-core" cx="185" cy="140" r="8" fill="#d1bc8d" />
        {SEEDS.filter((seed) => seed !== WISH_SEED).map((seed) => (
          <g key={seed.index} transform={`translate(${seed.x} ${seed.y})`}>
            <g
              className="day20-seed"
              style={{
                offsetPath: seed.flightPath,
                '--flight-duration': `${3800 + (seed.index * 47) % 800}ms`,
                '--delay': `${(seed.index * 31) % 470 + 100}ms`,
                '--turn': `${Math.sin(seed.index * 1.9) * 38}deg`,
              }}
            >
              <g className="day20-seed-turn"><Seed seed={seed} /></g>
            </g>
          </g>
        ))}
      </g>
      </g>
      <g transform={`translate(${WISH_SEED.x} ${WISH_SEED.y})`}>
        <g
          className="day20-wish-seed"
          style={{ offsetPath: WISH_PATH }}
          onAnimationEnd={(event) => { if (event.animationName === 'day20-wish-journey') onJourneyEnd(); }}
        >
          <g className="day20-wish-feather">
            <g className="day20-wish-sway"><Seed seed={WISH_SEED} /></g>
          </g>
          <g className="day20-wish-spark">
            <path d="M0 -20L4 -5L20 0L4 4L0 20L-4 4L-20 0L-4 -5Z" fill="#fff1ba" />
            <path d="M0 -12V12M-12 0H12" stroke="#fffdf4" strokeWidth="1.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default function Day20() {
  const [phase, setPhase] = useState('writing');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);
  const micButtonRef = useRef(null);
  const keepsakeRef = useRef(null);
  const releasedRef = useRef(false);
  const microphone = useBlowMicrophone(releaseWish);

  useEffect(() => {
    if (phase === 'ready') micButtonRef.current?.focus({ preventScroll: true });
    if (phase === 'complete') keepsakeRef.current?.focus({ preventScroll: true });
  }, [phase]);

  function prepareWish(event) {
    event.preventDefault();
    const nextWish = draft.trim();
    if (!nextWish) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    releasedRef.current = false;
    setPhase('ready');
  }

  function releaseWish() {
    if (phase !== 'ready' || releasedRef.current) return;
    releasedRef.current = true;
    setPhase('releasing');
  }

  function editWish(clear = false) {
    microphone.stop();
    releasedRef.current = false;
    if (clear) {
      setDraft('');
    }
    setError(false);
    setPhase('writing');
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  return (
    <main className={`day20-page is-${phase}${phase === 'ready' && microphone.isBlowing ? ' is-blowing' : ''}`}>
      <div className="day20-sky-specks" aria-hidden="true">
        {STARS.map((star, index) => <i key={index} style={{ '--x': `${star.x}%`, '--y': `${star.y}%`, '--size': `${star.size}px` }} />)}
      </div>
      <div className="day20-content">
        <header className="day20-heading">
          <p className="day20-date">20 de diciembre · Sueño</p>
          <h1>Pide un deseo</h1>
          <p className="day20-intro">Los sueños más bonitos empiezan con un deseo.</p>
        </header>

        <div className="day20-scene">
          <Dandelion onJourneyEnd={() => { if (phase === 'releasing') setPhase('complete'); }} />
          {phase === 'complete' && (
            <div className="day20-dream">
              <p className="day20-dream-caption">Una estrella para tu sueño</p>
            </div>
          )}
        </div>

        {phase === 'writing' && (
          <form className="day20-form" onSubmit={prepareWish} noValidate>
            <label htmlFor="day20-wish">¿Qué sueñas para ti?</label>
            <textarea
              id="day20-wish"
              ref={inputRef}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setError(false); }}
              placeholder="Un lugar, una ilusión, algo que quieras lograr…"
              rows={2}
              maxLength={MAX_WISH_LENGTH}
              required
              aria-invalid={error}
              aria-describedby={error ? 'day20-wish-error day20-input-meta' : 'day20-input-meta'}
            />
            <div className="day20-input-meta" id="day20-input-meta"><span>Tu sueño empieza aquí.</span><span>{draft.length}/{MAX_WISH_LENGTH}</span></div>
            {error && <p className="day20-error" id="day20-wish-error" role="alert">Escribe tu deseo antes de hacerlo volar.</p>}
            <button className="day20-primary" type="submit">Mi deseo está listo <span aria-hidden="true">↗</span></button>
          </form>
        )}

        {phase === 'ready' && (
          <div className="day20-ready">
            <p className="day20-gesture-hint">Sopla hacia el teléfono.<br />Deja que tu deseo vuele.</p>
            <button
              ref={micButtonRef}
              className="day20-primary day20-mic-button"
              type="button"
              disabled={microphone.status === 'requesting'}
              onClick={microphone.status === 'listening' ? microphone.stop : microphone.start}
              aria-describedby="day20-mic-note"
            >
              {microphone.status === 'requesting' ? 'Activando micrófono…' : microphone.status === 'listening' ? 'Pausar micrófono' : 'Activar micrófono'}
            </button>
            <p className="day20-mic-note" id="day20-mic-note" role="status">
              {microphone.status === 'listening' ? 'Micrófono activo. Acércate y sopla de forma continua.' : microphone.status === 'requesting' ? 'Permite el micrófono cuando el navegador lo pida.' : microphone.status === 'paused' ? 'El micrófono está en pausa. Actívalo para seguir.' : 'Activa el micrófono para soplar. No se graba ni se envía audio.'}
            </p>
            {microphone.error && <p className="day20-error" role="alert">{microphone.error}</p>}
            <div className="day20-ready-actions">
              {import.meta.env.DEV && (
                <button
                  className="day20-text-button"
                  type="button"
                  onClick={() => { microphone.stop(); releaseWish(); }}
                >
                  Simular soplido (local)
                </button>
              )}
              <button className="day20-text-button" type="button" onClick={() => editWish()}>Cambiar mi deseo</button>
            </div>
          </div>
        )}

        {phase === 'releasing' && <p className="day20-travel-note">Que tu deseo llegue muy, muy lejos…</p>}

        {phase === 'complete' && (
          <div className="day20-keepsake" ref={keepsakeRef} tabIndex={-1} role="group" aria-label="Un mensaje para ti" aria-describedby="day20-message">
            <p className="day20-message" id="day20-message">Que la vida les regale oportunidades para cumplir sus sueños. Yo siempre estaré aquí, creyendo en ustedes.</p>
            <p className="day20-signature">Con todo mi amor</p>
            <button className="day20-text-button" type="button" onClick={() => editWish(true)}>Pedir otro deseo <span aria-hidden="true">↗</span></button>
          </div>
        )}

        <p className="day20-status day20-sr-only" role="status">
          {phase === 'ready' ? 'Tu deseo está listo. Activa el micrófono y sopla para hacerlo volar.' : phase === 'releasing' ? 'Tu deseo está volando hacia las estrellas.' : ''}
        </p>
        <footer className="day20-footer"><Link to="/">Volver al calendario</Link></footer>
      </div>
    </main>
  );
}
