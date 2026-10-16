import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Day24Songbook from '../components/Day24Songbook';
import '../components/Day24Scene.css';

const ACTIVITY_IDS = ['natilla', 'bunuelos', 'songbook', 'nativity'];
const VISITS_KEY = 'day24-opened-activities-v1';
function readVisits() {
  try {
    const stored = JSON.parse(localStorage.getItem(VISITS_KEY));
    return Array.isArray(stored) ? ACTIVITY_IDS.filter(id => stored.includes(id)) : [];
  } catch { return []; }
}

const GLINTS = [
  { name: 'natilla', x: 24, y: 49.6, duration: 4.8, delay: -1.2 },
  { name: 'bunuelos', x: 27, y: 65.8, duration: 5.7, delay: -3.8 },
  { name: 'songbook', x: 85, y: 66.6, duration: 5.2, delay: -2.5 },
  { name: 'nativity', x: 89, y: 47.4, duration: 6.3, delay: -0.7 },
];

function GoldenGlint({ name, x, y, duration, delay }) {
  return (
    <span
      className="day24-glint"
      data-glint={name}
      aria-hidden="true"
      style={{ left: `${x}%`, top: `${y}%`, '--glint-duration': `${duration}s`, '--glint-delay': `${delay}s` }}
    >
      <span className="day24-glint-light">
        <span className="day24-glint-aura" />
        <svg viewBox="-50 -50 100 100" focusable="false">
          <defs>
            <radialGradient id={`day24-ray-${name}`}>
              <stop stopColor="#fffef0" />
              <stop offset=".16" stopColor="#fff3bd" />
              <stop offset=".5" stopColor="#ffc35a" stopOpacity=".8" />
              <stop offset="1" stopColor="#ed951e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g fill={`url(#day24-ray-${name})`}>
            <path d="M0 -50 L2.2 -4 L50 0 L2.2 4 L0 50 L-2.2 4 L-50 0 L-2.2 -4Z" />
            <path d="M-23 -23 L0 -2 L23 -23 L2 0 L23 23 L0 2 L-23 23 L-2 0Z" opacity=".65" />
          </g>
          <circle r="2.5" fill="#fffde4" />
        </svg>
      </span>
    </span>
  );
}

export default function Day24() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visited, setVisited] = useState(readVisits);
  const activeScene = searchParams.get('scene');
  useEffect(() => {
    if (!ACTIVITY_IDS.includes(activeScene)) return;
    setVisited(previous => {
      const next = [...new Set([...readVisits(), ...previous, activeScene])];
      try { localStorage.setItem(VISITS_KEY, JSON.stringify(next)); } catch { /* Retain progress for this visit if storage is unavailable. */ }
      return next;
    });
  }, [activeScene]);
  const showSongbook = searchParams.get('scene') === 'songbook';
  const placeholder = {
    bunuelos: { src: '/images/day24-bunuelos-pan.png', alt: 'Buñuelos dorados friéndose en una sartén' },
    natilla: { src: '/images/day24-natilla-courtyard.png', alt: 'Natilla caliente en un patio colombiano' },
    nativity: { src: '/images/day24-caroling-gathering.png', alt: 'Una familia cantando villancicos junto al pesebre' },
  }[searchParams.get('scene')];
  const changeScene = (scene) => {
    const nextParams = new URLSearchParams(searchParams);
    if (scene) nextParams.set('scene', scene);
    else nextParams.delete('scene');
    setSearchParams(nextParams);
  };

  if (showSongbook) return <Day24Songbook onBack={() => changeScene(null)} />;
  if (placeholder) return (
    <main className="day24-page day24-placeholder">
      <img className="day24-placeholder-image" src={placeholder.src} alt={placeholder.alt} draggable="false" />
      <button className="day24-back" type="button" aria-label="Volver a la escena de Navidad" onClick={() => changeScene(null)} autoFocus>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M7 12h14" /></svg>
      </button>
    </main>
  );

  return <Day24Scene envelopeUnlocked={ACTIVITY_IDS.every(id => visited.includes(id))} onOpenSongbook={() => changeScene('songbook')} onOpenBunuelos={() => changeScene('bunuelos')} onOpenNatilla={() => changeScene('natilla')} onOpenNativity={() => changeScene('nativity')} />;
}

function Day24Scene({ envelopeUnlocked, onOpenSongbook, onOpenBunuelos, onOpenNatilla, onOpenNativity }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <main className="day24-page">
      <div className="day24-scene">
        <img
          className="day24-scene-image"
          src="/images/day24-colombian-evening.png"
          width="958"
          height="1641"
          alt="Diciembre 24. Una noche de Navidad colombiana: natilla, buñuelos, villancicos, un pesebre y una carta sellada junto a un balcón iluminado."
          draggable="false"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
        {imageLoaded && GLINTS.map(glint => <GoldenGlint key={glint.name} {...glint} />)}
        {imageLoaded && envelopeUnlocked && <GoldenGlint name="envelope" x={67} y={83} duration={4.8} delay={0} />}
        <button className="day24-bunuelos-target" type="button" aria-label="Abrir los buñuelos" onClick={onOpenBunuelos} />
        <button className="day24-natilla-target" type="button" aria-label="Abrir la natilla" onClick={onOpenNatilla} />
        <button className="day24-nativity-target" type="button" aria-label="Abrir el pesebre" onClick={onOpenNativity} />
        <button
          className="day24-songbook-target"
          type="button"
          aria-label="Abrir el libro de villancicos"
          onClick={onOpenSongbook}
        />
      </div>
    </main>
  );
}
