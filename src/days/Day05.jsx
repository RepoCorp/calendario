import { useRef, useState } from 'react';

const CAROL_OF_THE_BELLS = [
  659.25, 622.25, 659.25, 523.25,
  659.25, 622.25, 659.25, 523.25,
  659.25, 622.25, 659.25, 523.25,
  659.25, 622.25, 659.25, 523.25,
  523.25, 587.33, 659.25, 698.46,
  783.99, 698.46, 659.25, 587.33,
];

function startBellTone(audioContext, frequency) {
  const now = audioContext.currentTime;

  const fundamental = audioContext.createOscillator();
  const overtone = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  fundamental.type = 'triangle';
  overtone.type = 'sine';

  fundamental.frequency.setValueAtTime(frequency, now);
  overtone.frequency.setValueAtTime(frequency * 1.5, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.02);

  fundamental.connect(gainNode);
  overtone.connect(gainNode);
  gainNode.connect(audioContext.destination);

  fundamental.start(now);
  overtone.start(now);

  return { audioContext, fundamental, overtone, gainNode };
}

function stopBellTone(tone) {
  if (!tone) return;

  const now = tone.audioContext.currentTime;
  tone.gainNode.gain.cancelScheduledValues(now);
  tone.gainNode.gain.setValueAtTime(Math.max(tone.gainNode.gain.value, 0.0001), now);
  tone.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  tone.fundamental.stop(now + 0.14);
  tone.overtone.stop(now + 0.14);
}

export default function Day05() {
  const audioContextRef = useRef(null);
  const melodyIndexRef = useRef(0);
  const timeoutRef = useRef(null);
  const activeToneRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const [isRinging, setIsRinging] = useState(false);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  };

  const startRing = async (pointerId) => {
    if (activeToneRef.current) {
      stopBellTone(activeToneRef.current);
      activeToneRef.current = null;
    }

    const audioContext = getAudioContext();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const frequency = CAROL_OF_THE_BELLS[melodyIndexRef.current % CAROL_OF_THE_BELLS.length];
    activeToneRef.current = startBellTone(audioContext, frequency);
    activePointerIdRef.current = pointerId;
    melodyIndexRef.current += 1;
    setIsRinging(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  };

  const stopRing = (pointerId) => {
    if (
      activePointerIdRef.current !== null &&
      pointerId !== undefined &&
      pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    if (activeToneRef.current) {
      stopBellTone(activeToneRef.current);
      activeToneRef.current = null;
    }

    activePointerIdRef.current = null;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsRinging(false);
    }, 120);
  };

  return (
    <main className="page day05-page">
      <section className="day01-card day05-card">
        <div className="day05-layout">
          <article className="day01-note day05-note">
            <p className="day01-date">Diciembre 5</p>
            <h1 className="day01-title day05-title">
              <span>Una campanita navidena,</span>
              <span>hazla sonar.</span>
            </h1>
            <p className="day01-lead day05-lead">
              Toquen la campanita y dejen que suene como un saludo de Navidad. Cada tintineo es
              una invitacion a seguir celebrando juntos este camino de diciembre.
            </p>
          </article>

          <div className="day05-scene">
            <p className="day05-subtitle">Toca la campana para escucharla.</p>

            <button
              type="button"
              className={`day05-bell-button${isRinging ? ' is-ringing' : ''}`}
              onPointerDown={(event) => startRing(event.pointerId)}
              onPointerUp={(event) => stopRing(event.pointerId)}
              onPointerLeave={(event) => stopRing(event.pointerId)}
              onPointerCancel={(event) => stopRing(event.pointerId)}
              aria-label="Hacer sonar la campana"
            >
              <span className="day05-bell-hanger" aria-hidden="true" />
              <span className="day05-bell-top" aria-hidden="true" />
              <span className="day05-bell-body" aria-hidden="true" />
              <span className="day05-bell-rim" aria-hidden="true" />
              <span className="day05-bell-clapper" aria-hidden="true" />
              <span className="day05-bell-shine" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
