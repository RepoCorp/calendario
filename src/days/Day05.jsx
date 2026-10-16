import { useEffect, useRef, useState } from 'react';
import { BELL_MELODY, BELL_REQUIRED_NOTES, createBellRhythm, advanceBellRhythm } from '../components/bellRhythm';
import '../components/Day05Reveal.css';

const LIGHT_COLORS = ['#ef4545', '#38b96b', '#ffc653', '#ef4545', '#38b96b', '#ffc653', '#ef4545', '#38b96b'];
const NOTES_PER_LIGHT = BELL_REQUIRED_NOTES / LIGHT_COLORS.length;
const HINTS = [
  'Intenta reconocer la canción tocando todas las notas.',
  'Estamos en Navidad, obvio es un villancico.',
  'El nombre de la canción está relacionado con la actividad.',
  'La canción es «Carol of the Bells» (Villancico de las campanas).',
  'Sigue el ritmo.',
  'Ten en cuenta la duración de las notas.',
  'Prueba mantenerla presionada durante distintos tiempos.',
  'El ritmo combina sonidos largos y cortos.',
  'Largo, corto, corto, largo. Repite ese ritmo cuatro veces.',
];

function startBellTone(audioContext, frequency) {
  const now = audioContext.currentTime;
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.008);

  // The high partials fade after the strike while the core bell tone holds until release.
  const partials = [
    { ratio: 1, level: 0.42, sustain: 0.38 },
    { ratio: 2.01, level: 0.18, sustain: 0.13 },
    { ratio: 2.68, level: 0.13, sustain: 0.065 },
    { ratio: 3.89, level: 0.09, sustain: 0.022 },
    { ratio: 5.43, level: 0.055, sustain: 0.006 },
  ];
  const oscillators = partials.map(({ ratio, level, sustain }, index) => {
    const oscillator = audioContext.createOscillator();
    const partialGain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency * ratio, now);
    oscillator.detune.setValueAtTime(index * 2.5, now);
    partialGain.gain.setValueAtTime(level, now);
    partialGain.gain.exponentialRampToValueAtTime(sustain, now + 0.48 + index * 0.08);
    oscillator.connect(partialGain);
    partialGain.connect(gainNode);
    oscillator.start(now);
    return oscillator;
  });

  gainNode.connect(audioContext.destination);

  return { audioContext, oscillators, gainNode, startedAt: now };
}

function stopBellTone(tone, cancelled = false) {
  if (!tone) return;

  const now = tone.audioContext.currentTime;
  if (cancelled) {
    tone.gainNode.gain.cancelScheduledValues(now);
    tone.gainNode.gain.setValueAtTime(0, now);
    tone.oscillators.forEach((oscillator) => oscillator.stop(now));
    return;
  }
  // A suspended context's clock has not advanced: preserve the initial strike
  // even when the finger is released before the browser unlocks audio.
  const releaseAt = Math.max(now, tone.startedAt + 0.03);
  tone.gainNode.gain.cancelScheduledValues(releaseAt);
  tone.gainNode.gain.setValueAtTime(0.28, releaseAt);
  tone.gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseAt + 0.3);
  tone.oscillators.forEach((oscillator) => oscillator.stop(releaseAt + 0.32));
}

export default function Day05() {
  const audioContextRef = useRef(null);
  const melodyIndexRef = useRef(0);
  const timeoutRef = useRef(null);
  const activeToneRef = useRef(null);
  const activeNoteRef = useRef(null);
  const bellArtRef = useRef(null);
  const bellButtonRef = useRef(null);
  const audioStartingRef = useRef(false);
  const swingRef = useRef(null);
  const swingDirectionRef = useRef(-1);
  const rhythmRef = useRef(createBellRhythm());
  const [isRinging, setIsRinging] = useState(false);
  const [litCount, setLitCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const [audioState, setAudioState] = useState('idle');
  const hintDialogRef = useRef(null);
  const [hintCount, setHintCount] = useState(0);
  const [confirmHint, setConfirmHint] = useState(true);

  const openHints = () => {
    stopRing(undefined, true);
    setConfirmHint(hintCount === 0);
    hintDialogRef.current.showModal();
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  };

  const prepareAudio = async () => {
    if (audioStartingRef.current) return;
    audioStartingRef.current = true;
    setAudioState('loading');
    let context;
    let deadline;
    try {
      context = getAudioContext();
      if (!context) throw new Error('Web Audio unavailable');
      // Resume directly from the start-button gesture, before playing any note.
      await Promise.race([
        context.resume(),
        new Promise((_, reject) => { deadline = window.setTimeout(() => reject(new Error('Audio startup timed out')), 8000); }),
      ]);
      if (audioContextRef.current !== context) return;
      setAudioState(context.state === 'running' ? 'ready' : 'error');
    } catch {
      if (!context || audioContextRef.current === context) setAudioState('error');
    } finally {
      window.clearTimeout(deadline);
      audioStartingRef.current = false;
    }
  };

  useEffect(() => {
    if (audioState === 'ready') bellButtonRef.current?.focus({ preventScroll: true });
  }, [audioState]);

  const swingBellTo = (angle, duration) => {
    const art = bellArtRef.current;
    if (!art) return;
    const currentTransform = getComputedStyle(art).transform;
    swingRef.current?.cancel();
    swingRef.current = art.animate([
      { transform: currentTransform },
      { transform: `rotate(${angle}deg)` },
    ], { duration, easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)', fill: 'forwards' });
  };

  const startRing = (pointerId) => {
    // One physical hold produces one note, even with extra fingers or key repeats.
    if (audioState !== 'ready' || activeNoteRef.current) return;
    const note = { pointerId, noteIndex: melodyIndexRef.current, startedAt: performance.now() };
    activeNoteRef.current = note;
    melodyIndexRef.current = (melodyIndexRef.current + 1) % BELL_MELODY.length;
    setIsRinging(true);
    window.clearTimeout(timeoutRef.current);
    // Follow the hold: lean on press, then return on release. Continue from
    // the visible angle when a new press interrupts the return.
    swingBellTo(swingDirectionRef.current * 10, 180);
    swingDirectionRef.current *= -1;
    // The first light is provisional until release establishes the child's pace.
    if (!rhythmRef.current.count && note.noteIndex % 4 === 0) setLitCount(1);

    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      // Queue on the audio clock before resuming so a quick first tap is not lost.
      activeToneRef.current = startBellTone(audioContext, BELL_MELODY[note.noteIndex]);
      if (audioContext.state !== 'running') audioContext.resume().catch(() => {});
    } catch {
      // Keep the activity usable if this browser cannot start Web Audio.
    }
  };

  const stopRing = (pointerId, cancelled = false) => {
    const note = activeNoteRef.current;
    if (!note || (pointerId !== undefined && pointerId !== note.pointerId)) return;
    activeNoteRef.current = null;
    swingBellTo(0, 420);

    if (activeToneRef.current) {
      stopBellTone(activeToneRef.current, cancelled);
      activeToneRef.current = null;
    }

    const rhythm = cancelled && !rhythmRef.current.complete
      ? createBellRhythm()
      : advanceBellRhythm(rhythmRef.current, {
        noteIndex: note.noteIndex,
        durationMs: performance.now() - note.startedAt,
      });
    rhythmRef.current = rhythm;
    setLitCount(rhythm.count);
    setComplete(rhythm.complete);

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsRinging(false);
    }, 120);
  };

  useEffect(() => {
    const cancelHold = () => stopRing(undefined, true);
    const onVisibilityChange = () => { if (document.hidden) cancelHold(); };
    window.addEventListener('blur', cancelHold);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', cancelHold);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      activeNoteRef.current = null;
      swingRef.current?.cancel();
      window.clearTimeout(timeoutRef.current);
      stopBellTone(activeToneRef.current, true);
      activeToneRef.current = null;
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  return (
    <main className="page day05-page">
      <section className="day01-card day05-card">
        <div className="day05-layout">
          <p className="day01-date day05-date">Diciembre 5</p>
          <div className={`day05-message-frame${complete ? ' is-complete' : ''}`}>
            <div className="day05-lights" role="img" aria-label={`${litCount} de ${BELL_REQUIRED_NOTES} notas completadas`}>
              <svg className="day05-light-wire" viewBox="0 0 320 48" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 6 Q 160 28 320 6" />
              </svg>
              {LIGHT_COLORS.map((color, index) => (
                <span key={index} className={`day05-light${litCount >= (index + 1) * NOTES_PER_LIGHT ? ' is-lit' : litCount > index * NOTES_PER_LIGHT ? ' is-warming' : ''}`}
                  style={{ '--light-y': `${[15, 20, 23, 25, 25, 23, 20, 15][index]}px`, '--light-tilt': `${[9, -7, 6, -5, 5, -6, 7, -9][index]}deg`, '--light-color': color, '--bulb-x': `${[-22.925, -57.75, -92.75][index % 3]}px` }}>
                  <span className="day05-light-glass" />
                </span>
              ))}
            </div>
            <article className="day01-note day05-note" aria-hidden={!complete}>
              <h1 className="day01-title day05-title">
                <span>Campanita.</span>
              </h1>
              <p className="day01-lead day05-lead">
                Cada tintineo es una invitacion a seguir celebrando juntos.
              </p>
            </article>
          </div>

          <div className="day05-scene">
            <button type="button" className="day05-hint-trigger" onClick={openHints}>
              {hintCount ? 'Ver pistas' : '¿Una pista?'}
            </button>
            {audioState !== 'ready' && (
              <div className="day05-audio-gate" aria-busy={audioState === 'loading'}>
                {audioState === 'loading' ? (
                  <p role="status">Preparando el sonido…</p>
                ) : (
                  <>
                    {audioState === 'error' && <p role="status">No se pudo activar el sonido. Intenta de nuevo.</p>}
                    <button type="button" className="day05-start" onClick={prepareAudio}>
                      {audioState === 'error' ? 'Intentar de nuevo' : 'Empezar'}
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              ref={bellButtonRef}
              type="button"
              disabled={audioState !== 'ready'}
              className={`day05-bell-button${isRinging ? ' is-ringing' : ''}`}
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0 || activeNoteRef.current) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                startRing(event.pointerId);
              }}
              onPointerUp={(event) => stopRing(event.pointerId)}
              onPointerCancel={(event) => stopRing(event.pointerId, true)}
              onLostPointerCapture={(event) => stopRing(event.pointerId, true)}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key !== ' ' && event.key !== 'Enter') return;
                event.preventDefault();
                if (!event.repeat) startRing('keyboard');
              }}
              onKeyUp={(event) => {
                if (event.key !== ' ' && event.key !== 'Enter') return;
                event.preventDefault();
                stopRing('keyboard');
              }}
              onBlur={() => stopRing(undefined, true)}
              aria-label="Hacer sonar la campana"
            >
              <img
                ref={bellArtRef}
                className="day05-bell-art"
                src="/images/day05-christmas-bell.png"
                alt="Campana navidena dorada con un moño rojo"
                draggable={false}
              />
            </button>
          </div>
        </div>
      </section>
      <dialog ref={hintDialogRef} className="day05-hint-dialog" aria-labelledby="day05-hint-heading">
        {confirmHint ? <>
          <h2 id="day05-hint-heading">¿Estás seguro de que no quieres intentarlo otro poquito?</h2>
          <div className="day05-hint-actions">
            <button type="button" autoFocus onClick={() => hintDialogRef.current.close()}>Voy a intentar otro poquito</button>
            <button type="button" onClick={() => { setHintCount(count => Math.min(count + 1, HINTS.length)); setConfirmHint(false); }}>Quiero ver la pista</button>
          </div>
        </> : <>
          <h2 id="day05-hint-heading">Pistas</h2>
          <ol>{HINTS.slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol>
          <div className="day05-hint-actions">
            <button type="button" onClick={() => hintDialogRef.current.close()}>Seguir intentando</button>
            {hintCount < HINTS.length && <button type="button" onClick={() => setConfirmHint(true)}>Otra pista</button>}
          </div>
        </>}
      </dialog>
    </main>
  );
}
