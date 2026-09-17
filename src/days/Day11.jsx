import { useEffect, useRef, useState } from 'react';

const SILENT_NIGHT = [
  392.0, 440.0, 392.0, 329.63,
  392.0, 440.0, 392.0, 329.63,
  587.33, 587.33, 493.88, 523.25,
  587.33, 523.25, 493.88, 440.0,
  493.88, 493.88, 587.33, 523.25,
  493.88, 440.0, 392.0, 440.0,
  392.0, 329.63, 392.0, 440.0,
  392.0, 329.63, 293.66, 293.66,
];

const STEP_ANGLE = Math.PI / 7;

function normalizeAngle(angle) {
  if (angle > Math.PI) return angle - Math.PI * 2;
  if (angle < -Math.PI) return angle + Math.PI * 2;
  return angle;
}

function playMusicBoxTone(audioContext, frequency) {
  const now = audioContext.currentTime;
  const main = audioContext.createOscillator();
  const chime = audioContext.createOscillator();
  const gain = audioContext.createGain();

  main.type = 'triangle';
  chime.type = 'sine';

  main.frequency.setValueAtTime(frequency, now);
  chime.frequency.setValueAtTime(frequency * 2, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);

  main.connect(gain);
  chime.connect(gain);
  gain.connect(audioContext.destination);

  main.start(now);
  chime.start(now);
  main.stop(now + 0.86);
  chime.stop(now + 0.86);
}

export default function Day11() {
  const audioContextRef = useRef(null);
  const crankRef = useRef(null);
  const pointerIdRef = useRef(null);
  const lastAngleRef = useRef(null);
  const accumulatedRotationRef = useRef(0);
  const melodyIndexRef = useRef(0);

  const [rotation, setRotation] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [message, setMessage] = useState('Giren la manivela para que la cajita toque su villancico.');
  const [notesPlayed, setNotesPlayed] = useState(0);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close?.();
    };
  }, []);

  const getAudioContext = async () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const playNextNote = async () => {
    const audioContext = await getAudioContext();
    if (!audioContext) return;

    const nextIndex = melodyIndexRef.current % SILENT_NIGHT.length;
    playMusicBoxTone(audioContext, SILENT_NIGHT[nextIndex]);
    melodyIndexRef.current += 1;
    setNotesPlayed(melodyIndexRef.current);

    if ((nextIndex + 1) % 8 === 0) {
      setMessage('Sigue girando, ya se reconoce la melodia.');
    }
  };

  const angleFromEvent = (event) => {
    const rect = crankRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(event.clientY - centerY, event.clientX - centerX);
  };

  const handlePointerDown = (event) => {
    pointerIdRef.current = event.pointerId;
    lastAngleRef.current = angleFromEvent(event);
    setIsTurning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const nextAngle = angleFromEvent(event);
    if (nextAngle === null || lastAngleRef.current === null) return;

    const delta = normalizeAngle(nextAngle - lastAngleRef.current);
    lastAngleRef.current = nextAngle;

    if (delta <= 0) return;

    accumulatedRotationRef.current += delta;
    setRotation((current) => current + delta * (180 / Math.PI));

    while (accumulatedRotationRef.current >= STEP_ANGLE) {
      accumulatedRotationRef.current -= STEP_ANGLE;
      playNextNote();
    }
  };

  const handlePointerEnd = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    lastAngleRef.current = null;
    setIsTurning(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <main className="page day11-page">
      <section className="day01-card day11-card">
        <div className="day11-layout">
          <article className="day01-note day11-note">
            <p className="day01-date">Diciembre 11</p>
            <h1 className="day01-title day11-title">
              <span>Una cajita musical,</span>
              <span>denle cuerda al canto.</span>
            </h1>
            <p className="day01-lead day11-lead">
              Giren la manivela despacito para hacer sonar el villancico. Mientras mas constante el
              giro, mas bonito se siente el paseo de la melodia.
            </p>
          </article>

          <div className="day11-scene">
            <p className="day11-subtitle">{message}</p>

            <div className="day11-status" aria-live="polite">
              <span>Notas: {notesPlayed}</span>
              <span>Melodia: Noche de Paz</span>
            </div>

            <div className="day11-music-box">
              <div className="day11-box-top" />
              <div className="day11-box-lid">
                <span className="day11-lid-stars" aria-hidden="true" />
              </div>
              <div className="day11-box-front">
                <div className="day11-cylinder">
                  <span className="day11-cylinder-pin day11-cylinder-pin-a" />
                  <span className="day11-cylinder-pin day11-cylinder-pin-b" />
                  <span className="day11-cylinder-pin day11-cylinder-pin-c" />
                  <span className="day11-cylinder-pin day11-cylinder-pin-d" />
                </div>
                <div className="day11-comb" />
                <div className="day11-sound-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="day11-box-base" />

              <button
                ref={crankRef}
                type="button"
                className={`day11-crank${isTurning ? ' is-turning' : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onPointerLeave={handlePointerEnd}
                aria-label="Girar la manivela de la cajita musical"
              >
                <span className="day11-crank-arm" />
                <span className="day11-crank-knob" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
