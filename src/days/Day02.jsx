import { useEffect, useRef } from 'react';

const STAR_COLORS = ['#f6d77d', '#f4e8c2', '#d8f0df', '#c9e3d1', '#e7b95c', '#f8efe1'];
const TWINKLE_MELODY = [
  261.63, 261.63, 392.0, 392.0, 440.0, 440.0, 392.0,
  349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
  392.0, 392.0, 349.23, 349.23, 329.63, 329.63, 293.66,
  392.0, 392.0, 349.23, 349.23, 329.63, 329.63, 293.66,
  261.63, 261.63, 392.0, 392.0, 440.0, 440.0, 392.0,
  349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
];

function drawStar(context, x, y, outerRadius, innerRadius, rotation, fillStyle) {
  context.save();
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
  const audioContextRef = useRef(null);

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

    const pointer = {
      x: -1000,
      y: -1000,
      active: false,
    };

    let hoveredIds = new Set();
    let nextMelodyIndex = 0;
    let lastTriggeredStarId = null;
    let lastPlayedNoteIndex = null;

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
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    };

    const playTone = (frequency) => {
      const audioContext = getAudioContext();
      if (!audioContext || audioContext.state !== 'running') return;

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

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const onPointerMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      resumeAudio();
    };

    const onPointerLeave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
      pointer.active = false;
      hoveredIds = new Set();
    };

    const onTouchMove = (event) => {
      if (!event.touches[0]) return;
      event.preventDefault();
      pointer.x = event.touches[0].clientX;
      pointer.y = event.touches[0].clientY;
      pointer.active = true;
      resumeAudio();
    };

    const onTouchEnd = () => {
      pointer.x = -1000;
      pointer.y = -1000;
      pointer.active = false;
      hoveredIds = new Set();
    };

    setSize();
    document.body.classList.add('day-lock-scroll');
    document.documentElement.classList.add('day-lock-scroll');
    window.addEventListener('resize', setSize);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('pointerdown', resumeAudio);

    let frameId = 0;
    let tick = 0;

    const render = () => {
      tick += 1;
      context.clearRect(0, 0, width, height);

      const nextHoveredIds = new Set();

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];

        star.rotation += 0.0012;
        const pulse = 0.86 + 0.24 * Math.sin(tick * 0.05 + star.shimmer);
        const driftX = Math.sin(tick * 0.006 + star.driftOffsetX) * star.driftRadiusX;
        const driftY = Math.cos(tick * 0.0045 + star.driftOffsetY) * star.driftRadiusY;
        const drawX = star.x + driftX;
        const drawY = star.y + driftY;

        drawStar(
          context,
          drawX,
          drawY,
          star.size * pulse,
          star.size * 0.45,
          star.rotation,
          star.color
        );

        if (pointer.active) {
          const distance = Math.hypot(drawX - pointer.x, drawY - pointer.y);
          if (distance < star.size * 1.7) {
            nextHoveredIds.add(star.id);
            if (!hoveredIds.has(star.id)) {
              if (star.id === lastTriggeredStarId && lastPlayedNoteIndex !== null) {
                playTone(TWINKLE_MELODY[lastPlayedNoteIndex % TWINKLE_MELODY.length]);
              } else {
                const noteIndex = nextMelodyIndex % TWINKLE_MELODY.length;
                playTone(TWINKLE_MELODY[noteIndex]);
                lastPlayedNoteIndex = noteIndex;
                nextMelodyIndex += 1;
              }
              lastTriggeredStarId = star.id;
            }
          }
        }
      }

      hoveredIds = nextHoveredIds;
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('pointerdown', resumeAudio);
      document.body.classList.remove('day-lock-scroll');
      document.documentElement.classList.remove('day-lock-scroll');
    };
  }, []);

  return (
    <main className="page day02-page">
      <canvas ref={canvasRef} className="stars-canvas" aria-hidden="true" />
      <section className="day01-card day02-card">
        <div className="day01-layout day02-layout">
          <article className="day01-note day02-note">
            <p className="day01-date">Diciembre 2</p>
            <h1 className="day01-title day02-title-modern">
              <span>Una estrellita para ustedes,</span>
              <span>Feliz Navidad!!!</span>
            </h1>
            <p className="day01-lead day02-lead">
              Deslicen su dedo por el cielo y dejen que cada estrella les responda con una nota.
              Que esta noche les recuerde lo bonito que es seguir jugando, descubriendo y
              maravillandose juntos.
            </p>
          </article>

          <aside className="day01-side-card day02-side-card">
            <div className="day01-side-glow" aria-hidden="true" />
            <p>
              Esta estrellita suena diferente cuando la tocan con el mouse o con el dedo.
            </p>
            <p>
              Pasen por varias estrellas y armen su propia mini cancion navideña.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
