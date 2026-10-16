import { useEffect, useRef, useState } from 'react';
import '../components/StarMessageReveal.css';

const STAR_COLORS = ['#f6d77d', '#f4e8c2', '#d8f0df', '#c9e3d1', '#e7b95c', '#f8efe1'];
const MIN_TOUCH_HIT_RADIUS = 28;
const MAX_STAR_USES_PER_PASS = 4;
const MESSAGE_STAR_OPACITY = 0.4;
const MESSAGE_REVEAL_NOTES = 14;
const TWINKLE_MELODY = [
  261.63, 261.63, 392.0, 392.0, 440.0, 440.0, 392.0,
  349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
  392.0, 392.0, 349.23, 349.23, 329.63, 329.63, 293.66,
  392.0, 392.0, 349.23, 349.23, 329.63, 329.63, 293.66,
  261.63, 261.63, 392.0, 392.0, 440.0, 440.0, 392.0,
  349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
];

function drawStar(context, x, y, outerRadius, innerRadius, rotation, fillStyle, opacity) {
  context.save();
  context.globalAlpha = opacity;
  context.translate(x, y);
  context.rotate(rotation);
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * radius;
    if (i === 0) {
      context.moveTo(sx, sy);
    } else {
      context.lineTo(sx, sy);
    }
  }
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  context.restore();
}

export default function Day02() {
  const canvasRef = useRef(null);
  const messageRef = useRef(null);
  const audioContextRef = useRef(null);
  const [notesPlayed, setNotesPlayed] = useState(0);
  const revealProgress = Math.min(1, notesPlayed / MESSAGE_REVEAL_NOTES);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const starCount = Math.max(TWINKLE_MELODY.length, Math.floor((width * height) / 32000));
    const stars = Array.from({ length: starCount }, (_, index) => {
      const size = Math.random() * 10 + 7;
      return {
        id: index,
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        interactionId: index,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        note: null,
        rotation: Math.random() * Math.PI * 2,
        shimmer: Math.random() * Math.PI * 2,
        driftOffsetX: Math.random() * Math.PI * 2,
        driftOffsetY: Math.random() * Math.PI * 2,
        driftRadiusX: Math.random() * 10 + 6,
        driftRadiusY: Math.random() * 8 + 4,
      };
    });

    let nextMelodyIndex = 0;
    let lastTriggeredStarId = null;
    let lastPlayedNoteIndex = null;
    let messageRevealed = false;
    let disposed = false;
    let audioResumePromise = null;
    const starUseCounts = new Map();

    const getAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContextRef.current = new AudioContextClass();
      }
      return audioContextRef.current;
    };

    const resumeAudio = () => {
      const audioContext = getAudioContext();
      if (!audioContext || audioContext.state === 'running') return null;
      if (!audioResumePromise) {
        audioResumePromise = audioContext.resume().catch(() => {}).finally(() => {
          audioResumePromise = null;
        });
      }
      return audioResumePromise;
    };

    const playTone = (audioContext, frequency) => {
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.25);
    };

    const playStar = async (starId) => {
      await resumeAudio();
      const audioContext = getAudioContext();
      if (disposed || !audioContext || audioContext.state !== 'running') return;
      const starUses = starUseCounts.get(starId) ?? 0;
      if (starUses >= MAX_STAR_USES_PER_PASS) return;

      // Resolve taps in playback order after audio unlocks. Failed playback earns no progress.
      if (starId === lastTriggeredStarId && lastPlayedNoteIndex !== null) {
        playTone(audioContext, TWINKLE_MELODY[lastPlayedNoteIndex]);
        nextMelodyIndex = 0;
        starUseCounts.clear();
        if (!messageRevealed) {
          setNotesPlayed(0);
        }
      } else {
        const noteIndex = nextMelodyIndex % TWINKLE_MELODY.length;
        playTone(audioContext, TWINKLE_MELODY[noteIndex]);
        lastPlayedNoteIndex = noteIndex;
        nextMelodyIndex += 1;
        starUseCounts.set(starId, starUses + 1);
        if (!messageRevealed) {
          setNotesPlayed(nextMelodyIndex);
          messageRevealed = nextMelodyIndex >= MESSAGE_REVEAL_NOTES;
        }
        if (nextMelodyIndex % TWINKLE_MELODY.length === 0) starUseCounts.clear();
      }
      lastTriggeredStarId = starId;
    };

    const onPointerDown = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      resumeAudio();
      let closestHit = null;
      // Compare taps and visible star centers in the same screen coordinates.
      const bounds = canvas.getBoundingClientRect();
      const scaleX = bounds.width / canvas.width;
      const scaleY = bounds.height / canvas.height;
      for (const star of stars) {
        const distance = Math.hypot(
          bounds.left + (star.drawX ?? star.x) * scaleX - event.clientX,
          bounds.top + (star.drawY ?? star.y) * scaleY - event.clientY
        );
        const visibleHitRadius = star.size * 1.7 * Math.max(scaleX, scaleY);
        const hitRadius = event.pointerType === 'touch'
          ? Math.max(MIN_TOUCH_HIT_RADIUS, visibleHitRadius)
          : visibleHitRadius;
        if (distance < hitRadius && (!closestHit || distance < closestHit.distance)) {
          closestHit = { interactionId: star.interactionId, distance };
        }
      }
      // Only a new tap counts; hover, holding, and drifting stars cannot reset a run.
      if (closestHit) playStar(closestHit.interactionId);
    };

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    setSize();
    document.body.classList.add('day-lock-scroll');
    document.documentElement.classList.add('day-lock-scroll');
    window.addEventListener('resize', setSize);
    window.addEventListener('pointerdown', onPointerDown);

    let frameId = 0;
    let tick = 0;

    const render = () => {
      tick += 1;
      context.clearRect(0, 0, width, height);
      const messageBounds = messageRef.current?.getBoundingClientRect();
      const canvasBounds = canvas.getBoundingClientRect();
      const scaleX = canvasBounds.width / width;
      const scaleY = canvasBounds.height / height;

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];

        star.rotation += 0.0012;
        const pulse = 0.86 + 0.24 * Math.sin(tick * 0.05 + star.shimmer);
        const driftX = Math.sin(tick * 0.006 + star.driftOffsetX) * star.driftRadiusX;
        const driftY = Math.cos(tick * 0.0045 + star.driftOffsetY) * star.driftRadiusY;
        const drawX = star.x + driftX;
        const drawY = star.y + driftY;
        star.drawX = drawX;
        star.drawY = drawY;

        let messageOpacity = 1;
        if (messageBounds) {
          const screenX = canvasBounds.left + drawX * scaleX;
          const screenY = canvasBounds.top + drawY * scaleY;
          const distanceOutside = Math.max(
            messageBounds.left - screenX, screenX - messageBounds.right,
            messageBounds.top - screenY, screenY - messageBounds.bottom, 0
          );
          // Fade across the card's edge instead of switching opacity abruptly.
          const fadeDistance = star.size * 1.7 * Math.max(scaleX, scaleY);
          const outsideBlend = Math.min(1, distanceOutside / fadeDistance);
          messageOpacity = MESSAGE_STAR_OPACITY + (1 - MESSAGE_STAR_OPACITY) * outsideBlend;
        }
        const usageOpacity = (starUseCounts.get(star.id) ?? 0) >= MAX_STAR_USES_PER_PASS ? 0.25 : 1;

        drawStar(
          context,
          drawX,
          drawY,
          star.size * pulse,
          star.size * 0.45,
          star.rotation,
          star.color,
          usageOpacity * messageOpacity
        );
      }

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('pointerdown', onPointerDown);
      document.body.classList.remove('day-lock-scroll');
      document.documentElement.classList.remove('day-lock-scroll');
    };
  }, []);

  return (
    <main className="page day02-page">
      <canvas ref={canvasRef} className="stars-canvas" aria-hidden="true" />
      <section className="day01-card day02-card day02-reveal-card">
        <p className="day01-date">Diciembre 2</p>
        <article ref={messageRef} className="day01-note day02-note day02-message">
          <div
            className="day02-message-content"
            aria-hidden={notesPlayed < MESSAGE_REVEAL_NOTES}
            style={{
              '--message-blur': `${12 * (1 - revealProgress)}px`,
              '--message-opacity': revealProgress === 0 ? 0 : 0.2 + 0.8 * revealProgress,
            }}
          >
            <h1 className="day01-title day02-title-modern">
              <span>Una estrellita para ustedes,</span>
              <span>Feliz Navidad!!!</span>
            </h1>
            <p className="day01-lead day02-lead">
              Que melodia tocan las estrellas?
            </p>
            <p className="day01-lead day02-lead">
              Mi princesa y mi corazón. Que van a hacer especial hoy? Piensen en algo, planeenlo y disfrutenlo.
            </p>
            <p className="day01-lead day02-lead">
              Saben que los requeteamo, cierto?
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
