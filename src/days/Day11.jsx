import { useEffect, useRef, useState } from 'react';
import MusicBoxArtwork, { MUSIC_BOX_VIEW } from '../components/Day11MusicBox';
import Day11MessageCylinder from '../components/Day11MessageCylinder';
import '../components/Day11Layout.css';

// Public-domain soprano melody, transposed from B-flat to C major.
// https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1295
// Durations are sixteenth-note units: 3, 1, 2 gives the dotted opening rhythm.
const NOTE_MIDI = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77 };
const SILENT_NIGHT = [
  [['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6]],
  [['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6]],
  [['D5', 4], ['D5', 2], ['B4', 6]],
  [['C5', 4], ['C5', 2], ['G4', 6]],
  [['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2]],
  [['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6]],
  [['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2]],
  [['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6]],
  [['D5', 4], ['D5', 2], ['F5', 3], ['D5', 1], ['B4', 2]],
  [['C5', 6], ['E5', 6]],
  [['C5', 3], ['G4', 1], ['E4', 2], ['G4', 3], ['F4', 1], ['D4', 2]],
  [['C4', 12]],
].flat().map(([note, duration]) => ({
  frequency: 440 * 2 ** ((NOTE_MIDI[note] - 69) / 12),
  strip: NOTE_MIDI[note] - NOTE_MIDI.C4,
  duration,
}));

const STEP_ANGLE = Math.PI / 7;
// Include the final note's full duration, not just its onset.
const SONG_TURN_ANGLE = STEP_ANGLE * (1 + SILENT_NIGHT.reduce((sum, note) => sum + note.duration, 0));
// Taps and keyboard turns ease into place; dragging follows the pointer directly.
const TAP_CRANK_SPEED = STEP_ANGLE / 0.12;
const TAP_CRANK_LEAD = Math.PI / 2;
const CRANK_PROJECTION = MUSIC_BOX_VIEW.crankProjection;
const CRANK_RADIUS = 36;
const CRANK_GRIP_OFFSET = {
  x: 18 * MUSIC_BOX_VIEW.crankShaftProjection.x,
  y: 18 * MUSIC_BOX_VIEW.crankShaftProjection.y,
};
const GRIP_RADIUS = 10;
// Tangent points of the projected grip cap, perpendicular to its outward shaft.
const gripTangent = Math.atan2(
  CRANK_GRIP_OFFSET.x * CRANK_PROJECTION.y,
  -CRANK_GRIP_OFFSET.y * CRANK_PROJECTION.x + CRANK_GRIP_OFFSET.x * CRANK_PROJECTION.shear,
);
const gripEdge = {
  x: GRIP_RADIUS * CRANK_PROJECTION.x * Math.cos(gripTangent),
  y: GRIP_RADIUS * (CRANK_PROJECTION.shear * Math.cos(gripTangent) + CRANK_PROJECTION.y * Math.sin(gripTangent)),
};
const GRIP_BODY = `M${-gripEdge.x} ${-gripEdge.y} l${CRANK_GRIP_OFFSET.x} ${CRANK_GRIP_OFFSET.y} l${2 * gripEdge.x} ${2 * gripEdge.y} l${-CRANK_GRIP_OFFSET.x} ${-CRANK_GRIP_OFFSET.y} ${Array.from({ length: 17 }, (_, index) => {
  const angle = gripTangent + index * Math.PI / 16;
  return `L${GRIP_RADIUS * CRANK_PROJECTION.x * Math.cos(angle)} ${GRIP_RADIUS * (CRANK_PROJECTION.shear * Math.cos(angle) + CRANK_PROJECTION.y * Math.sin(angle))}`;
}).join(' ')} Z`;

function normalizeAngle(angle) {
  if (angle > Math.PI) return angle - Math.PI * 2;
  if (angle < -Math.PI) return angle + Math.PI * 2;
  return angle;
}

function playMusicBoxTone(audioContext, frequency, now) {
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
  const pointerStartRef = useRef(null);
  const didDragRef = useRef(false);
  const targetRotationRef = useRef(0);
  const rotationRef = useRef(0);
  const nextNoteAngleRef = useRef(STEP_ANGLE);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const melodyIndexRef = useRef(0);

  const [rotation, setRotation] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [messageProgress, setMessageProgress] = useState(0);
  const [stripStrikes, setStripStrikes] = useState(() => Array(19).fill(0));

  // Project the crank's circular plane into the box's side perspective.
  const crankSide = Math.sin(rotation);
  const crankX = 64 + CRANK_RADIUS * CRANK_PROJECTION.x * crankSide;
  const crankY = 64 - CRANK_RADIUS * CRANK_PROJECTION.y * Math.cos(rotation)
    + CRANK_RADIUS * CRANK_PROJECTION.shear * crankSide;

  useEffect(() => {
    const cancelInteraction = () => {
      pointerIdRef.current = null;
      lastAngleRef.current = null;
      targetRotationRef.current = rotationRef.current;
      setIsTurning(false);
    };
    window.addEventListener('blur', cancelInteraction);
    return () => {
      window.removeEventListener('blur', cancelInteraction);
      cancelAnimationFrame(frameRef.current);
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const unlockAudio = () => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {
      // The mechanical interaction remains usable when audio is unavailable.
    }
  };

  const playNextNote = () => {
    const nextIndex = melodyIndexRef.current % SILENT_NIGHT.length;
    const note = SILENT_NIGHT[nextIndex];
    setStripStrikes(strikes => strikes.map((count, index) => index === note.strip ? count + 1 : count));
    nextNoteAngleRef.current += STEP_ANGLE * note.duration;
    const audioContext = audioContextRef.current;
    if (audioContext?.state === 'running') {
      playMusicBoxTone(audioContext, note.frequency, audioContext.currentTime + 0.008);
    }
    // Mechanical song progress stays consistent even if audio is unavailable.
    melodyIndexRef.current += 1;
  };

  const applyCrankRotation = (nextRotation) => {
    rotationRef.current = nextRotation;
    setRotation(nextRotation);
    setMessageProgress(current => Math.max(current, Math.min(1, nextRotation / SONG_TURN_ANGLE)));

    // Reverse travel unwinds the handle; replaying that same arc adds no notes.
    while (nextRotation >= nextNoteAngleRef.current) {
      playNextNote();
    }
  };

  const turnCrank = (delta) => {
    if (pointerIdRef.current !== null) return;
    const lead = targetRotationRef.current + delta - rotationRef.current;
    targetRotationRef.current = rotationRef.current
      + Math.max(-TAP_CRANK_LEAD, Math.min(TAP_CRANK_LEAD, lead));
    if (frameRef.current !== null) return;

    const animate = (time) => {
      const elapsed = lastFrameRef.current === null ? 16 : Math.min(time - lastFrameRef.current, 48);
      lastFrameRef.current = time;
      const remaining = targetRotationRef.current - rotationRef.current;
      const settled = Math.abs(remaining) < 0.001;
      const nextRotation = settled
        ? targetRotationRef.current
        : rotationRef.current + Math.sign(remaining) * Math.min(
          Math.abs(remaining) * (1 - Math.exp(-elapsed / 28)),
          TAP_CRANK_SPEED * elapsed / 1000,
        );
      applyCrankRotation(nextRotation);

      if (!settled) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
        lastFrameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(animate);
  };

  const angleFromEvent = (event) => {
    const rect = crankRef.current?.getBoundingClientRect();
    if (!rect) return null;

    // Follow the grip's end face, which sits just ahead of the lever plane.
    const centerX = rect.left + rect.width * (64 + CRANK_GRIP_OFFSET.x) / 128;
    const centerY = rect.top + rect.height * (64 + CRANK_GRIP_OFFSET.y) / 128;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    if (Math.hypot(dx, dy) < 12) return null;

    // Undo the same projection so an oval drag follows the handle evenly.
    const planeX = dx / CRANK_PROJECTION.x;
    const planeY = (dy - CRANK_PROJECTION.shear * planeX) / CRANK_PROJECTION.y;
    return Math.atan2(planeY, planeX);
  };

  const handlePointerDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || pointerIdRef.current !== null) return;
    unlockAudio();
    // Grabbing the handle takes over immediately from any tap animation.
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastFrameRef.current = null;
    targetRotationRef.current = rotationRef.current;
    pointerIdRef.current = event.pointerId;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    lastAngleRef.current = angleFromEvent(event);
    setIsTurning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const start = pointerStartRef.current;
    if (!didDragRef.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 4) return;
    didDragRef.current = true;
    const nextAngle = angleFromEvent(event);
    if (nextAngle === null || lastAngleRef.current === null) {
      lastAngleRef.current = nextAngle;
      return;
    }

    const delta = normalizeAngle(nextAngle - lastAngleRef.current);
    lastAngleRef.current = nextAngle;

    const nextRotation = rotationRef.current + delta;
    targetRotationRef.current = nextRotation;
    applyCrankRotation(nextRotation);
  };

  const handlePointerEnd = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (event.type === 'pointerup') handlePointerMove(event);
    pointerIdRef.current = null;
    lastAngleRef.current = null;
    setIsTurning(false);
    if (event.type !== 'pointerup') {
      didDragRef.current = true;
      targetRotationRef.current = rotationRef.current;
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = (event) => {
    if (event.detail !== 0 && didDragRef.current) return;
    unlockAudio();
    turnCrank(Math.PI / 2);
  };

  const handleKeyDown = (event) => {
    if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    unlockAudio();
    turnCrank(['ArrowRight', 'ArrowUp'].includes(event.key) ? Math.PI / 7 : -Math.PI / 7);
  };

  return (
    <main className="page day11-page">
      <section className="day01-card day11-card">
        <div className="day11-layout">
          <p className="day01-date day11-date">Diciembre 11</p>
          <Day11MessageCylinder
            progress={messageProgress}
            complete={messageProgress === 1}
            message="Que cada nota llene la casa de calma, alegría y un poquito de magia. Lo más bonito de esta Navidad es compartirla juntos."
          />

          <div className="day11-scene">
            <div className="day11-music-box">
              <MusicBoxArtwork rotation={rotation} stripStrikes={stripStrikes} />

              <button
                ref={crankRef}
                type="button"
                className={`day11-crank${isTurning ? ' is-turning' : ''}`}
                style={{
                  left: `${MUSIC_BOX_VIEW.crankX / MUSIC_BOX_VIEW.width * 100}%`,
                  top: `${MUSIC_BOX_VIEW.crankY / MUSIC_BOX_VIEW.height * 100}%`,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onLostPointerCapture={handlePointerEnd}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                aria-label="Girar la manivela de la cajita musical"
                aria-description="Arrastra en círculos hacia la derecha, toca la manivela o usa las teclas de flecha."
              >
                <svg viewBox="0 0 128 128" aria-hidden="true">
                  <defs>
                    <linearGradient id="day11-grip-body" gradientUnits="userSpaceOnUse" x1={-gripEdge.x} y1={-gripEdge.y} x2={gripEdge.x} y2={gripEdge.y}>
                      <stop stopColor="#ad774b" />
                      <stop offset=".45" stopColor="#895332" />
                      <stop offset="1" stopColor="#603921" />
                    </linearGradient>
                    <linearGradient id="day11-crank-arm" gradientUnits="userSpaceOnUse" x1="-24" y1="-36" x2="24" y2="36">
                      <stop stopColor="#e5c184" />
                      <stop offset=".5" stopColor="#b18a48" />
                      <stop offset="1" stopColor="#78572c" />
                    </linearGradient>
                    <radialGradient id="day11-grip-end" cx=".32" cy=".26" r=".85">
                      <stop stopColor="#b07c50" />
                      <stop offset=".55" stopColor="#8b5633" />
                      <stop offset="1" stopColor="#623a24" />
                    </radialGradient>
                  </defs>
                  <g transform={`matrix(${CRANK_PROJECTION.x} ${CRANK_PROJECTION.shear} 0 ${CRANK_PROJECTION.y} 64 64)`}>
                    <path d={`M0 0 L${CRANK_RADIUS * crankSide} ${-CRANK_RADIUS * Math.cos(rotation)}`} stroke="#3d2b18" strokeWidth="8" strokeLinecap="round" />
                    <path d={`M0 0 L${CRANK_RADIUS * crankSide} ${-CRANK_RADIUS * Math.cos(rotation)}`} stroke="url(#day11-crank-arm)" strokeWidth="5" strokeLinecap="round" />
                  </g>
                  <g transform={`matrix(${CRANK_PROJECTION.x} ${CRANK_PROJECTION.shear} 0 ${CRANK_PROJECTION.y} 64 64)`}>
                    <circle r="10" fill="url(#day11-brass)" stroke="#604421" />
                    <circle r="4" fill="url(#day11-steel)" stroke="#8e7441" />
                    <path d="M-2 2 L2 -2" stroke="#574d35" strokeWidth="1.2" />
                  </g>
                  <g transform={`translate(${crankX} ${crankY})`}>
                    <path d={GRIP_BODY} fill="url(#day11-grip-body)" />
                    <g transform={`matrix(${CRANK_PROJECTION.x} ${CRANK_PROJECTION.shear} 0 ${CRANK_PROJECTION.y} ${CRANK_GRIP_OFFSET.x} ${CRANK_GRIP_OFFSET.y})`}>
                      <circle r={GRIP_RADIUS} fill="url(#day11-grip-end)" stroke="#422b1b" />
                      <circle r="7" fill="none" stroke="#b49165" strokeOpacity=".13" />
                      <circle r="4" fill="none" stroke="#493422" strokeOpacity=".15" />
                    </g>
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
