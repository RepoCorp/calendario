import { useCallback, useEffect, useRef, useState } from 'react';
import Day19Firefly from '../components/Day19Firefly';
import Day19Lantern from '../components/Day19Lantern';
import { createFirefly, HOLE, OBSTACLES, START, orientationToTilt, stepFirefly } from './day19Physics';

const clamp = (value) => Math.max(-1, Math.min(1, value));
const screenAngle = () => window.screen.orientation?.angle ?? window.orientation ?? 0;
const DEAD_ZONE = 0.05;
const GLOW_DELAY = 550;
const GLOW_CYCLE = 2800;
const GLOW_CYCLES = 2;
const tiltInput = (value) => Math.abs(value) < DEAD_ZONE ? 0 : clamp(value);

function releaseCamera(stream) {
  stream?.getTracks().forEach((track) => {
    if (track.kind === 'video' && track.readyState === 'live') {
      track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    track.stop();
  });
}

export default function Day19() {
  const [showEntry, setShowEntry] = useState(true);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('Sostén el teléfono casi plano, con la pantalla hacia arriba.');
  const [lightNote, setLightNote] = useState('');
  const [lightPlaying, setLightPlaying] = useState(false);
  const fireflyRef = useRef(null);
  const lanternRef = useRef(null);
  const gameRef = useRef(createFirefly());
  const sessionRef = useRef({
    mounted: false, generation: 0, phase: 'idle', stream: null,
    cameraGeneration: 0, cameraPromise: null,
    timers: new Set(), baseline: null, angle: 0, input: { x: 0, y: 0 },
    smooth: { x: 0, y: 0 }, calibrationTimer: null,
  });

  const changePhase = useCallback((next) => {
    sessionRef.current.phase = next;
    if (sessionRef.current.mounted) setPhase(next);
  }, []);

  const paint = useCallback(() => {
    const game = gameRef.current;
    if (fireflyRef.current) {
      fireflyRef.current.style.left = `${game.x}%`;
      fireflyRef.current.style.top = `${game.y}%`;
      if (Math.hypot(game.vx, game.vy) > 1) {
        fireflyRef.current.style.setProperty('--heading', `${Math.atan2(game.vy, game.vx) * 180 / Math.PI + 90}deg`);
      }
    }
    lanternRef.current?.style.setProperty('--capture', `${game.hold / 0.8 * 100}%`);
  }, []);

  const stopResources = useCallback(() => {
    const session = sessionRef.current;
    session.generation += 1;
    session.timers.forEach(window.clearTimeout);
    session.timers.clear();
    session.calibrationTimer = null;
    session.cameraGeneration += 1;
    session.cameraPromise = null;
    const stream = session.stream;
    session.stream = null;
    releaseCamera(stream);
    session.input = { x: 0, y: 0 };
    session.smooth = { x: 0, y: 0 };
    if (session.mounted) setLightPlaying(false);
  }, []);

  const later = useCallback((callback, delay) => {
    const session = sessionRef.current;
    const generation = session.generation;
    const timer = window.setTimeout(() => {
      session.timers.delete(timer);
      if (session.mounted && generation === session.generation && !document.hidden) callback();
    }, delay);
    session.timers.add(timer);
    return timer;
  }, []);

  const pause = useCallback(() => {
    if (['idle', 'paused'].includes(sessionRef.current.phase)) {
      stopResources();
      return;
    }
    const wasCaught = sessionRef.current.phase === 'caught';
    stopResources();
    if (!wasCaught) {
      changePhase('paused');
      setMessage('En pausa. Cuando quieras, seguimos.');
    }
  }, [changePhase, stopResources]);

  const finishLight = useCallback(() => {
    const session = sessionRef.current;
    const stream = session.stream;
    session.stream = null;
    releaseCamera(stream);
    if (session.mounted) setLightPlaying(false);
  }, []);

  const prepareCamera = useCallback(() => {
    const session = sessionRef.current;
    if (session.cameraPromise) return session.cameraPromise;
    const existingTrack = session.stream?.getVideoTracks()[0];
    if (existingTrack?.readyState === 'live' && !existingTrack.muted) return Promise.resolve();

    const generation = session.cameraGeneration;
    const current = () => session.mounted && generation === session.cameraGeneration && !document.hidden;
    if (!current()) return Promise.resolve();
    setLightNote('Permite la cámara para preparar la linterna. No se toman fotos ni se graba video.');

    const request = (async () => {
      let stream;
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('camera');
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        if (!current()) { releaseCamera(stream); return; }
        const track = stream.getVideoTracks()[0];
        const torch = track?.getCapabilities?.().torch;
        if (torch !== true && !(Array.isArray(torch) && torch.includes(true))) throw new Error('torch');
        session.stream = stream;
        await track.applyConstraints({ advanced: [{ torch: false }] });
        if (!current()) { releaseCamera(stream); return; }
        if (track.readyState !== 'live' || track.muted) throw new Error('camera');
        const interrupted = () => {
          if (session.stream !== stream) return;
          finishLight();
          if (session.mounted) setLightNote('La linterna se desconectó. La luciérnaga sigue contigo en la pantalla.');
        };
        track.addEventListener('ended', interrupted, { once: true });
        track.addEventListener('mute', interrupted, { once: true });
        setLightNote('La linterna se encenderá al atraparla.');
      } catch {
        releaseCamera(stream);
        if (!current()) return;
        session.stream = null;
        setLightNote('La linterna no está disponible. Puedes jugar igualmente.');
      }
    })();
    session.cameraPromise = request;
    void request.finally(() => {
      if (session.cameraPromise === request) session.cameraPromise = null;
    });
    return request;
  }, [finishLight]);

  const celebrate = useCallback(() => {
    const session = sessionRef.current;
    changePhase('caught');
    setMessage('¡La atrapaste! Su pequeña luz encendió el farol.');
    const stream = session.stream;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const generation = session.generation;
    const current = () => session.mounted && generation === session.generation
      && !document.hidden && session.stream === stream;
    // Torch constraints are binary. Use slow pulses while the screen glow eases.
    const shine = async (on, cycle) => {
      if (!current()) return;
      try {
        await track.applyConstraints({ advanced: [{ torch: on }] });
        if (!current()) {
          releaseCamera(stream);
          return;
        }
        if (on) {
          setLightPlaying(true);
          setLightNote('La linterna se apagará en un momento.');
          later(() => shine(false, cycle), GLOW_CYCLE / 2);
        } else if (cycle + 1 < GLOW_CYCLES) {
          later(() => shine(true, cycle + 1), GLOW_CYCLE / 2);
        } else {
          finishLight();
          setLightNote('La linterna está apagada.');
        }
      } catch {
        if (current()) {
          finishLight();
          setLightNote('Esta vez la luz se queda en la pantalla.');
        }
      }
    };
    later(() => shine(true, 0), GLOW_DELAY);
  }, [changePhase, finishLight, later]);

  const calibrate = useCallback(() => {
    const session = sessionRef.current;
    if (session.calibrationTimer) {
      window.clearTimeout(session.calibrationTimer);
      session.timers.delete(session.calibrationTimer);
    }
    session.baseline = null;
    session.input = { x: 0, y: 0 };
    session.smooth = { x: 0, y: 0 };
    gameRef.current = { ...gameRef.current, vx: 0, vy: 0, hold: 0 };
    changePhase('calibrating');
    setMessage('Sostén el teléfono casi plano y quieto un momento…');
    session.calibrationTimer = later(() => {
      stopResources();
      changePhase('paused');
      setMessage('No recibimos la inclinación. Puedes volver a intentarlo.');
    }, 3500);
  }, [changePhase, later, stopResources]);

  useEffect(() => {
    const session = sessionRef.current;
    session.mounted = true;
    let frame;
    let previous = 0;
    const orientation = (event) => {
      if (!['calibrating', 'playing'].includes(session.phase)) return;
      if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const angle = screenAngle();
      const tilt = orientationToTilt(event.beta, event.gamma, angle);
      if (!session.baseline || angle !== session.angle) {
        session.baseline = tilt;
        session.angle = angle;
        session.smooth = { x: 0, y: 0 };
        gameRef.current = { ...gameRef.current, vx: 0, vy: 0, hold: 0 };
        window.clearTimeout(session.calibrationTimer);
        session.timers.delete(session.calibrationTimer);
        session.calibrationTimer = null;
        changePhase('playing');
        setMessage('Inclina suavemente para rodear los adornos. Frena sobre la abertura del farol y quédate allí un instante.');
      }
      session.input = {
        x: tiltInput((tilt.x - session.baseline.x) / Math.sin(Math.PI / 10)),
        y: tiltInput((tilt.y - session.baseline.y) / Math.sin(Math.PI / 10)),
      };
    };
    const tick = (time) => {
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      if (session.phase === 'playing') {
        const target = session.input;
        const blend = 1 - Math.exp(-12 * dt);
        session.smooth.x += (target.x - session.smooth.x) * blend;
        session.smooth.y += (target.y - session.smooth.y) * blend;
        gameRef.current = stepFirefly(gameRef.current, session.smooth, dt);
        paint();
        if (gameRef.current.caught) celebrate();
      }
      frame = window.requestAnimationFrame(tick);
    };
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('deviceorientation', orientation);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pause);
    frame = window.requestAnimationFrame(tick);
    return () => {
      session.mounted = false;
      stopResources();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('deviceorientation', orientation);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pause);
    };
  }, [celebrate, changePhase, paint, pause, stopResources]);

  async function start() {
    const session = sessionRef.current;
    if (['preparing', 'calibrating', 'playing'].includes(session.phase)) return;
    const reset = session.phase !== 'paused' || gameRef.current.caught;
    stopResources();
    const generation = session.generation;
    const current = () => session.mounted && generation === session.generation && !document.hidden;
    if (reset) gameRef.current = createFirefly();
    else gameRef.current = { ...gameRef.current, vx: 0, vy: 0, hold: 0 };
    paint();
    changePhase('preparing');

    try {
      if (!window.isSecureContext || !window.DeviceOrientationEvent) {
        throw new Error('motion');
      }
      // iOS requires this permission request directly inside the start gesture.
      const permission = typeof window.DeviceOrientationEvent.requestPermission === 'function'
        ? await window.DeviceOrientationEvent.requestPermission() : 'granted';
      if (!current()) return;
      if (permission !== 'granted') throw new Error('motion');
    } catch {
      if (current()) {
        stopResources();
        changePhase('paused');
        setMessage('Para inclinar, permite el acceso al movimiento del teléfono.');
      }
      return;
    }
    setMessage('Preparando la linterna…');
    await prepareCamera();
    if (!current()) return;
    if (session.stream) {
      setLightNote('La linterna se encenderá al atraparla.');
    }
    calibrate();
  }

  const active = ['preparing', 'calibrating', 'playing'].includes(phase);

  return (
    <main className="day19-page" lang="es">
      {showEntry && (
        <div className="day19-entry" role="dialog" aria-modal="true" aria-label="Empezar el juego">
          <button
            type="button"
            className="day19-primary day19-entry-button"
            autoFocus
            onClick={() => {
              setShowEntry(false);
              start();
            }}
          >
            Empezar
          </button>
        </div>
      )}
      <section className="day19-game" aria-labelledby="day19-title" inert={showEntry ? '' : undefined} aria-hidden={showEntry || undefined}>
        <header className="day19-heading">
          <p className="day19-date">Diciembre 19</p>
          <h1 id="day19-title">Luz</h1>
          <p>Guía la luciérnaga hasta el farol.</p>
        </header>
        <div
          className={`day19-ground ${phase === 'caught' ? 'is-caught' : ''}`}
          style={{ '--glow-delay': `${GLOW_DELAY}ms`, '--glow-cycle': `${GLOW_CYCLE}ms`, '--glow-cycles': GLOW_CYCLES }}
          role="group" aria-label="Luciérnaga, adornos de Navidad y un farol de cristal" aria-describedby="day19-instructions"
        >
          <div className="day19-moss day19-moss-one" aria-hidden="true" />
          <div className="day19-moss day19-moss-two" aria-hidden="true" />
          <div className="day19-frost" aria-hidden="true" />
          {OBSTACLES.map((decoration, index) => (
            <span
              key={index}
              className={`day19-decoration is-${decoration.variant || decoration.type}`}
              style={{ left: `${decoration.x}%`, top: `${decoration.y}%`, width: `${decoration.radius * 2}%`, height: `${decoration.radius * 2}%`, '--decoration-turn': `${decoration.rotation ?? (index === 0 ? -28 : 132)}deg` }}
              aria-hidden="true"
            >
              <span className="day19-decoration-art">
                <img src={`/images/day19-${decoration.type === 'star' ? 'wooden-star' : `${decoration.variant}-bauble`}.png`} alt="" draggable="false" decoding="async" />
              </span>
            </span>
          ))}
          <Day19Lantern position={HOLE} captureRef={lanternRef} />
          <div className="day19-firefly" ref={fireflyRef} style={{ left: `${START.x}%`, top: `${START.y}%` }} data-phase={phase} aria-hidden="true">
            <div className="day19-firefly-body">
              <Day19Firefly />
            </div>
          </div>
          {phase === 'idle' && <span className="day19-ground-hint" aria-hidden="true">Un poquito de equilibrio.</span>}
          {phase === 'caught' && <span className="day19-ground-hint">¡La atrapaste!</span>}
        </div>
        <div className="day19-instructions" id="day19-instructions" role="status">{message}</div>
        <div className="day19-actions">
          {!active && <button type="button" className="day19-primary" onClick={start}>
            {phase === 'caught' ? 'Otra vez' : phase === 'paused' ? 'Continuar' : 'Empezar'}
          </button>}
          {phase === 'playing' && <button type="button" className="day19-secondary" onClick={calibrate}>Recentrar</button>}
          {active && <button type="button" className="day19-secondary" onClick={pause}>{phase === 'playing' ? 'Pausar' : 'Cancelar'}</button>}
          {lightPlaying && <button type="button" className="day19-secondary" onClick={() => { finishLight(); setLightNote('La linterna está apagada.'); }}>Apagar linterna</button>}
        </div>
        <p className="day19-light-note" role="status">{lightNote || 'Permite el movimiento y la cámara para jugar con la linterna. No se toman fotos ni se graba video.'}</p>
      </section>
    </main>
  );
}
