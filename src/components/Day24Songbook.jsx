import { useEffect, useRef, useState } from 'react';
import useDay24Rhythm from './useDay24Rhythm';

export default function Day24Songbook({ onBack }) {
  const videoRef = useRef(null);
  const visualCueRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [silentMeasures, setSilentMeasures] = useState(4);
  const [testMode, setTestMode] = useState('melody');
  const metronome = testMode === 'metronome';
  const visualOnly = testMode === 'visual';
  const { status, error, result, tapDeltaMs, tapTiming, tapAverage, returnTiming, start, tap, reset } = useDay24Rhythm(videoRef, visualCueRef);
  const playing = status === 'playing';
  const displayedResult = playing && tapDeltaMs !== null ? { deltaMs: tapDeltaMs } : result;
  const pending = status === 'loading' || status === 'starting';
  const averageMs = Math.round(tapAverage.meanMs);
  const signedMs = value => {
    const rounded = Math.round(value);
    return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} ms`;
  };

  useEffect(() => {
    const video = videoRef.current, cue = visualCueRef.current;
    const space = video.parentElement;
    const alignStar = () => {
      const box = video.getBoundingClientRect(), parent = space.getBoundingClientRect();
      const sourceWidth = video.videoWidth || 786, sourceHeight = video.videoHeight || 1178;
      const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
      const width = sourceWidth * scale, height = sourceHeight * scale;
      // Center of the tree's star in the source frame; account for contain margins.
      cue.style.left = `${box.left - parent.left + (box.width - width) / 2 + width * (357 / 786)}px`;
      cue.style.top = `${box.top - parent.top + (box.height - height) / 2 + height * (343 / 1178)}px`;
    };
    const observer = new ResizeObserver(alignStar);
    observer.observe(video); observer.observe(space);
    video.addEventListener('loadedmetadata', alignStar);
    alignStar();
    return () => { observer.disconnect(); video.removeEventListener('loadedmetadata', alignStar); };
  }, []);

  return (
    <main className="day24-page day24-songbook-activity day24-rhythm-activity">
      <div className="day24-rhythm-video-space">
      <video
        ref={videoRef}
        className="day24-music-video"
        src="/videos/day24-music-box-trimmed.mp4"
        width="786"
        height="1178"
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Cajita musical navideña en movimiento"
        onError={() => setVideoFailed(true)}
        onLoadedData={() => setVideoFailed(false)}
      />
      <span ref={visualCueRef} className="day24-visual-cue" aria-hidden="true" />
      </div>
      <button className="day24-back" type="button" aria-label="Volver a la escena de Navidad" onClick={onBack} autoFocus>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M7 12h14" /></svg>
      </button>
      <div className="day24-rhythm-controls">
      {(playing || status === 'starting') && (
        <button
          className="day24-back day24-stop"
          type="button"
          aria-label="Detener y volver al principio"
          onClick={reset}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />
          </svg>
        </button>
      )}

        <div className="day24-rhythm-result" role="status" aria-live="polite">
          {displayedResult && (displayedResult.missed ? 'Sin toque' : <>
            <strong>{displayedResult.deltaMs > 0 ? '+' : displayedResult.deltaMs < 0 ? '−' : ''}{Math.abs(displayedResult.deltaMs)} <small>ms</small></strong>
            <span>{displayedResult.deltaMs < 0 ? 'antes' : displayedResult.deltaMs > 0 ? 'tarde' : 'A tiempo'}</span>
          </>)}
        </div>
        <button
          className="day24-beat-circle"
          type="button"
          disabled={!playing}
          aria-label="Marcar el pulso"
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            tap(event);
          }}
          onKeyDown={event => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault();
              tap(event);
            }
          }}
          onClick={event => {
            // Assistive-technology clicks have no preceding physical key/pointer.
            if (event.detail === 0) tap(event);
          }}
        />
        <div className="day24-tap-average">
          Promedio: <strong>{tapAverage.count ? `${averageMs > 0 ? '+' : averageMs < 0 ? '−' : ''}${Math.abs(averageMs)} ms` : '—'}</strong>
          <span> · {tapAverage.count} {tapAverage.count === 1 ? 'toque' : 'toques'}</span>
        </div>
        {!visualOnly && <div className="day24-return-timing" aria-live="polite">
          <span>Primer toque tras volver el sonido: <strong>{returnTiming.firstReturn ? signedMs(returnTiming.firstReturn.rawMs) : '—'}</strong></span>
          <span>Respecto a tu ritmo: <strong>{returnTiming.firstReturn?.adjustedMs != null ? signedMs(returnTiming.firstReturn.adjustedMs) : '—'}</strong></span>
          {returnTiming.firstReturn && <span>Pulso más cercano: {returnTiming.firstReturn.beatFromReturn === 0 ? 'el de regreso' : `${returnTiming.firstReturn.beatFromReturn > 0 ? '+' : ''}${returnTiming.firstReturn.beatFromReturn} desde el regreso`} · {signedMs(returnTiming.firstReturn.nearestMs)}</span>}
          {returnTiming.drift && <span>Deriva estimada: <strong>{signedMs(returnTiming.drift.totalMs)}</strong>{returnTiming.drift.uncertain ? ' · incierta' : ''}
            {returnTiming.drift.skipped > 0 && ` · ${returnTiming.drift.skipped} saltos posibles`}</span>}
          {returnTiming.firstReturn?.driftMs != null && <span>Deriva al regresar: {signedMs(returnTiming.firstReturn.driftMs)}{returnTiming.firstReturn.uncertain ? ' (incierta)' : ''}</span>}
          <small>Base inicial: {returnTiming.count ? signedMs(returnTiming.meanMs) : '—'} · {returnTiming.count} toques</small>
        </div>}
        {!playing && (
          <button
            className="day24-rhythm-start"
            type="button"
            disabled={pending || status === 'error'}
            aria-label={status === 'ended' ? 'Volver a tocar la canción' : 'Reproducir la canción'}
            onClick={() => {
              if (videoFailed) videoRef.current?.load();
              start({ speed, silentMeasures, metronome, visualOnly });
            }}
          >
            {pending ? <span>Preparando…</span> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z" /></svg>}
          </button>
        )}
        <fieldset className="day24-rhythm-settings" disabled={playing || pending}>
          <label>
            <span>Velocidad <output>{speed.toFixed(2)}×</output></span>
            <input aria-label="Velocidad de la canción" type="range" min="0.5" max="1.5" step="0.05" value={speed} onChange={event => setSpeed(Number(event.target.value))} />
          </label>
          <label>
            <span>Silencio <output>{silentMeasures} {silentMeasures === 1 ? 'compás' : 'compases'}</output></span>
            <input aria-label="Duración del silencio en compases" type="range" min="1" max="7" step="1" value={silentMeasures} onChange={event => setSilentMeasures(Number(event.target.value))} />
          </label>
        </fieldset>
        <label className="day24-metronome-debug">
          Prueba
          <select aria-label="Modo de prueba del ritmo" value={testMode} disabled={playing || pending} onChange={event => setTestMode(event.target.value)}>
            <option value="melody">Melodía</option>
            <option value="metronome">Solo metrónomo</option>
            <option value="visual">Solo señal visual</option>
          </select>
        </label>
        {(error || videoFailed) && <p className="day24-rhythm-error" role="alert">{error || 'No se pudo cargar el video. Vuelve a intentar la reproducción.'}</p>}
        {tapTiming && <details className="day24-timing-debug">
          <summary>Diagnóstico de sincronización</summary>
          <span>Reloj: {tapTiming.method === 'visual' ? 'señal visual (precisión de un fotograma)' : tapTiming.method === 'output' ? 'salida de audio' : 'estimado'}</span>
          {tapTiming.method !== 'visual' && <span>Compensación aplicada: {tapTiming.correctionMs} ms</span>}
          <span>Entrega del toque: {tapTiming.eventDelayMs} ms</span>
          {tapTiming.method !== 'visual' && <span>Latencia base / salida: {tapTiming.baseLatencyMs} / {tapTiming.outputLatencyMs} ms</span>}
        </details>}
        <p className="day24-bluetooth-note">Para mayor precisión, juega sin audífonos ni altavoces Bluetooth.</p>
      </div>
    </main>
  );
}
