import { useEffect, useRef, useState } from 'react';
import { createBlowDetector } from '../components/blowDetector';
import '../components/Day07Layout.css';

// Wick tips measured as percentages of day07-birthday-cake.png.
const CANDLES = [
  { id: 1, left: 24.72, top: 10.3 },
  { id: 2, left: 36.84, top: 7.02 },
  { id: 3, left: 50.48, top: 3.83 },
  { id: 4, left: 63.8, top: 7.1 },
  { id: 5, left: 77.27, top: 11.16 },
];

// Stable trajectories keep the burst from restarting as microphone frames arrive.
const CONFETTI = Array.from({ length: 40 }, (_, index) => ({
  id: index,
  color: ['#f4d277', '#e76f83', '#6fbc87', '#fff0c8'][index % 4],
  x: Math.round((((index * 37) % 113) / 112 - 0.5) * 320),
  rise: -60 - ((index * 29) % 85),
  fall: 130 + ((index * 23) % 150),
  spin: ((index * 97) % 720) - 360,
  delay: (index % 7) * 25,
  duration: 1900 + (index % 5) * 110,
}));

function buildLitCandles() {
  return CANDLES.map((candle) => candle.id);
}

export default function Day07() {
  const audioContextRef = useRef(null);
  const cakeReadyRef = useRef(false);
  const blowDetectorRef = useRef(null);
  if (blowDetectorRef.current === null) {
    blowDetectorRef.current = createBlowDetector({ sustainMs: 200 });
  }

  const [litCandles, setLitCandles] = useState(buildLitCandles);
  const [cakeReady, setCakeReady] = useState(false);
  const [isBlowing, setIsBlowing] = useState(false);
  const [needsAudioGesture, setNeedsAudioGesture] = useState(false);
  const [error, setError] = useState('');
  const [micAttempt, setMicAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stream;
    let context;
    let source;
    let analyser;
    let frame = 0;
    setError('');
    setNeedsAudioGesture(false);
    blowDetectorRef.current.reset();

    const release = () => {
      window.cancelAnimationFrame(frame);
      source?.disconnect();
      analyser?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      if (context) {
        context.onstatechange = null;
        if (context.state !== 'closed') void context.close().catch(() => {});
      }
      if (audioContextRef.current === context) audioContextRef.current = null;
    };

    const start = async () => {
      // Skip StrictMode's discarded mount without delaying the permission prompt.
      await Promise.resolve();
      if (cancelled) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('unsupported');
        }
        // Ask first: resume() can wait indefinitely for a gesture on mobile.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        context = new AudioContextClass();
        audioContextRef.current = context;
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.08;
        const buffer = new Uint8Array(analyser.fftSize);
        const frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);
        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const syncAudioState = () => {
          if (!cancelled) setNeedsAudioGesture(context.state !== 'running');
        };
        context.onstatechange = syncAudioState;
        syncAudioState();
        if (context.state === 'suspended') void context.resume().catch(syncAudioState);

        const monitor = () => {
          if (cancelled) return;
          if (cakeReadyRef.current && context.state === 'running') {
            analyser.getByteTimeDomainData(buffer);
            analyser.getByteFrequencyData(frequencyBuffer);
            const result = blowDetectorRef.current.sample(buffer, frequencyBuffer, performance.now());
            if (result.confirmed) {
              const randomPick = Math.random();
              setLitCandles(current => current.filter((_, index) => index !== Math.floor(randomPick * current.length)));
            }
            setIsBlowing(result.isBlowing);
          } else {
            blowDetectorRef.current.reset();
            setIsBlowing(false);
          }
          frame = window.requestAnimationFrame(monitor);
        };
        frame = window.requestAnimationFrame(monitor);
      } catch (micError) {
        release();
        if (cancelled) return;
        setIsBlowing(false);
        setNeedsAudioGesture(false);
        setError(micError.message === 'unsupported'
          ? 'Este navegador no permite usar el microfono. Abre la pagina con HTTPS en Safari o Chrome.'
          : 'No pude acceder al microfono. Revisen el permiso e intenten otra vez.');
      }
    };
    void start();
    return () => { cancelled = true; release(); };
  }, [micAttempt]);

  const resumeAudio = () => {
    const context = audioContextRef.current;
    if (context?.state === 'suspended') void context.resume().catch(() => {});
  };

  const relightCandles = () => {
    setLitCandles(buildLitCandles());
    setIsBlowing(false);
    blowDetectorRef.current.reset();
  };

  return (
    <main className="page day07-page" onPointerDownCapture={resumeAudio} onKeyDownCapture={resumeAudio}>
      <section className="day01-card day07-card">
        <div className="day07-layout">
          <p className="day01-date day07-date">Diciembre 7</p>
          <article className={`day01-note day07-note${litCandles.length === 0 ? ' is-revealed' : ''}`} aria-hidden={litCandles.length > 0}>
            <h1 className="day01-title day07-title">
              <span>Cumpleanos GKye</span>
            </h1>
            <p className="day01-lead day07-lead">
              Ojala venga con un deseo bonito tambien.
            </p>
          </article>

          <div className="day07-scene">
            {litCandles.length === 0 ? (
              <div className="day07-celebration" aria-hidden="true">
                {CONFETTI.map((piece) => (
                  <span
                    key={piece.id}
                    className="day07-confetti-piece"
                    style={{
                      '--confetti-color': piece.color,
                      '--confetti-x': `${piece.x}px`,
                      '--confetti-rise': `${piece.rise}px`,
                      '--confetti-fall': `${piece.fall}px`,
                      '--confetti-spin': `${piece.spin}deg`,
                      '--confetti-delay': `${piece.delay}ms`,
                      '--confetti-duration': `${piece.duration}ms`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            <div className="day07-cake-wrap">
              <div
                className={`day07-cake-stage${isBlowing ? ' is-blowing' : ''}`}
                role="img"
                aria-label={`Pastel de cumpleanos con ${litCandles.length} de 5 velas encendidas`}
              >
                <img
                  className="day07-cake-image"
                  src="/images/day07-birthday-cake.png"
                  alt=""
                  width="1254"
                  height="1254"
                  draggable={false}
                  onLoad={() => { cakeReadyRef.current = true; setCakeReady(true); }}
                  onError={() => { cakeReadyRef.current = false; setCakeReady(false); }}
                />

                {cakeReady && CANDLES.map((candle) => {
                  const isLit = litCandles.includes(candle.id);
                  return (
                    <div
                      key={candle.id}
                      className="day07-candle"
                      style={{
                        left: `${candle.left}%`,
                        top: `${candle.top}%`,
                        '--flame-delay': `${candle.id * -137}ms`,
                      }}
                      aria-hidden="true"
                    >
                      {isLit ? (
                        <span className="day07-flame-motion">
                          <span className="day07-flame" />
                          <span className="day07-flame-glow" />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="day07-actions">
              <button type="button" className="day07-button day07-button-secondary" onClick={relightCandles}
                style={{ visibility: litCandles.length === 0 ? 'visible' : 'hidden' }}>
                Volver a encender
              </button>
            </div>

            {needsAudioGesture ? <p className="day07-error" role="status">Toca el pastel para activar el microfono.</p> : null}
            {error ? (
              <div className="day07-mic-error">
                <p className="day07-error" role="alert">{error}</p>
                <button type="button" className="day07-button" onClick={() => setMicAttempt(attempt => attempt + 1)}>Reintentar permiso</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
