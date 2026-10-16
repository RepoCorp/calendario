import { useEffect, useRef, useState } from 'react';
import useSnowMessageReveal from '../components/useSnowMessageReveal';
import { canResumeSnowMotion, collideWithSnowBoundary, rollFromSnowContact, touchesSnowBoundary, trackSnowRest } from '../components/snowRevealBoundary';
import '../components/SnowMessageReveal.css';

// Velocities use pixels per nominal 60 Hz frame, as does the existing snowfall.
const SURFACE_GRAVITY = 0.045;
const AIR_DRAG = 0.008;

export default function Day01() {
  const canvasRef = useRef(null);
  const messageRef = useRef(null);
  const coverRef = useRef(null);
  const [isMessageRevealed, setMessageRevealed] = useState(false);
  const { revealAt, endStroke, revealNext, getBoundary } = useSnowMessageReveal({
    canvasRef: coverRef,
    surfaceRef: messageRef,
    onComplete: () => setMessageRevealed(true),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const flakeCount = Math.max(220, Math.floor((width * height) / 6500));
    const flakes = Array.from({ length: flakeCount }, (_, index) => ({
      passesOverMessage: index % 10 === 0,
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.8 + 1.8,
      speedY: Math.random() * 1.1 + 0.5,
      drift: (Math.random() - 0.5) * 0.6,
      vx: 0,
      vy: 0,
      restingBoundary: null,
      restProgress: null,
      hasRolled: false,
      twinkleOffset: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.16 ? 45 : 0,
      saturation: Math.random() < 0.16 ? 95 : 0,
      lightness: Math.random() < 0.16 ? 74 : 100,
      spin: (Math.random() - 0.5) * 0.05,
      angle: Math.random() * Math.PI * 2,
    }));

    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
      radius: 90,
    };

    const setSize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = width;
      canvas.height = height;
    };

    const onMove = (event) => {
      if (!event.isPrimary) return;
      const bounds = canvas.getBoundingClientRect();
      mouse.x = (event.clientX - bounds.left) * width / bounds.width;
      mouse.y = (event.clientY - bounds.top) * height / bounds.height;
      mouse.active = true;
    };

    // Apply the impulse immediately so a short tap works without a move event.
    const onPress = (event) => {
      if (!event.isPrimary) return;
      onMove(event);
      for (const flake of flakes) {
        const dx = flake.x - mouse.x;
        const dy = flake.y - mouse.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= mouse.radius) continue;

        const angle = distance > 0.01 ? Math.atan2(dy, dx) : flake.angle;
        const impulse = (1 - distance / mouse.radius) * 8;
        flake.restingBoundary = null;
        flake.restProgress = null;
        flake.vx += Math.cos(angle) * impulse;
        flake.vy += Math.sin(angle) * impulse;
      }
    };

    const onLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const onRelease = (event) => {
      if (event.isPrimary && event.pointerType !== 'mouse') onLeave();
    };

    setSize();
    document.body.classList.add('day-lock-scroll');
    document.documentElement.classList.add('day-lock-scroll');
    window.addEventListener('resize', setSize);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onPress);
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);

    let frameId = 0;
    let tickCount = 0;
    let lastTime = null;
    const tick = (now) => {
      const step = lastTime === null ? 1 : Math.min(2, Math.max(0, (now - lastTime) / (1000 / 60)));
      lastTime = now;
      tickCount += 1;
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const boundary = getBoundary();
      const messageBounds = messageRef.current?.getBoundingClientRect();
      const canvasBounds = canvas.getBoundingClientRect();
      const offsetX = (messageBounds?.left ?? 0) - canvasBounds.left;
      const offsetY = (messageBounds?.top ?? 0) - canvasBounds.top;

      for (let i = 0; i < flakes.length; i += 1) {
        const flake = flakes[i];
        if (flake.restingBoundary && (flake.restingBoundary !== boundary
          || canResumeSnowMotion(boundary, flake.x - offsetX, flake.y - offsetY))) {
          flake.restingBoundary = null;
          flake.restProgress = null;
          flake.vx = -flake.drift;
          flake.vy = -flake.speedY;
        }

        if (mouse.active) {
          const dx = flake.x - mouse.x;
          const dy = flake.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < mouse.radius && distance > 0.01) {
            flake.restingBoundary = null;
            flake.restProgress = null;
            const force = (mouse.radius - distance) / mouse.radius;
            flake.vx += (dx / distance) * force * 0.8;
            flake.vy += (dy / distance) * force * 0.6;
          }
        }

        if (!flake.restingBoundary) {
          if (flake.hasRolled) {
            // After touching the surface, carry actual momentum through rolling
            // and free fall; don't pull the flake back to its old snowfall speed.
            const drag = Math.exp(-AIR_DRAG * step);
            flake.vx = (flake.drift + flake.vx) * drag - flake.drift;
            flake.vy = (flake.speedY + flake.vy) * drag + SURFACE_GRAVITY * step - flake.speedY;
          } else {
            flake.vx *= Math.pow(0.94, step);
            flake.vy *= Math.pow(0.94, step);
          }
          const previousX = flake.x;
          const previousY = flake.y;
          flake.x += (flake.drift + flake.vx) * step;
          flake.y += (flake.speedY + flake.vy) * step;
          const collision = flake.passesOverMessage ? null : collideWithSnowBoundary(
            boundary, previousX - offsetX, previousY - offsetY,
            flake.x - offsetX, flake.y - offsetY,
          );
          if (collision) {
            const rolled = rollFromSnowContact(
              boundary, collision,
              { left: -offsetX, top: -offsetY, width, height },
              { vx: flake.drift + flake.vx, vy: flake.speedY + flake.vy }, step,
            );
            flake.hasRolled = true;
            flake.x = rolled.x + offsetX;
            flake.y = rolled.y + offsetY;
            flake.vx = rolled.vx - flake.drift;
            flake.vy = rolled.vy - flake.speedY;
            flake.restProgress = trackSnowRest(flake.restProgress, rolled.blocked,
              touchesSnowBoundary(boundary, rolled.x, rolled.y), rolled.x, rolled.y, now);
            if (flake.restProgress?.resting) {
              flake.restingBoundary = boundary;
              flake.vx = -flake.drift;
              flake.vy = -flake.speedY;
            }
          } else flake.restProgress = null;
        }

        if (flake.y > height + flake.r) {
          flake.y = -flake.r;
          flake.x = Math.random() * width;
          flake.vx = 0;
          flake.vy = 0;
          flake.hasRolled = false;
          flake.restingBoundary = null;
          flake.restProgress = null;
          flake.twinkleOffset = Math.random() * Math.PI * 2;
          const festive = Math.random() < 0.2;
          flake.hue = festive ? 45 : 0;
          flake.saturation = festive ? 95 : 0;
          flake.lightness = festive ? 74 : 100;
          flake.spin = (Math.random() - 0.5) * 0.05;
          flake.angle = Math.random() * Math.PI * 2;
        }

        // Offscreen flakes keep falling; recycle only below the bottom edge.

        const twinkle = 0.72 + 0.28 * Math.sin(tickCount * 0.04 + flake.twinkleOffset);
        const alpha = 0.68 + 0.32 * twinkle;
        const stroke = `hsla(${flake.hue}, ${flake.saturation}%, ${flake.lightness}%, ${alpha})`;
        if (!flake.restingBoundary) flake.angle += flake.spin;

        context.strokeStyle = stroke;
        context.lineWidth = Math.max(1, flake.r * 0.35);
        context.lineCap = 'round';
        context.beginPath();
        for (let arm = 0; arm < 6; arm += 1) {
          const armAngle = flake.angle + arm * (Math.PI / 3);
          const x2 = flake.x + Math.cos(armAngle) * flake.r * 2.5;
          const y2 = flake.y + Math.sin(armAngle) * flake.r * 2.5;
          context.moveTo(flake.x, flake.y);
          context.lineTo(x2, y2);

          const branchLen = flake.r * 0.9;
          const bx1 = x2 - Math.cos(armAngle - Math.PI / 6) * branchLen;
          const by1 = y2 - Math.sin(armAngle - Math.PI / 6) * branchLen;
          const bx2 = x2 - Math.cos(armAngle + Math.PI / 6) * branchLen;
          const by2 = y2 - Math.sin(armAngle + Math.PI / 6) * branchLen;
          context.moveTo(x2, y2);
          context.lineTo(bx1, by1);
          context.moveTo(x2, y2);
          context.lineTo(bx2, by2);
        }
        context.stroke();

        if (flake.hue === 45 && flake.r > 2.2) {
          context.strokeStyle = `hsla(45, 95%, 72%, ${alpha * 0.55})`;
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(flake.x - flake.r * 1.4, flake.y);
          context.lineTo(flake.x + flake.r * 1.4, flake.y);
          context.moveTo(flake.x, flake.y - flake.r * 1.4);
          context.lineTo(flake.x, flake.y + flake.r * 1.4);
          context.stroke();
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onPress);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      document.body.classList.remove('day-lock-scroll');
      document.documentElement.classList.remove('day-lock-scroll');
    };
  }, [getBoundary]);

  return (
    <main className="page day01-page">
      <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />
      <section className="day01-card day01-reveal-card">
        <header className="day01-reveal-intro">
          <p className="day01-date">Diciembre 1</p>
        </header>
        <article
          ref={messageRef}
          className={`day01-note day01-snow-message${isMessageRevealed ? ' is-revealed' : ''}`}
          role={isMessageRevealed ? undefined : 'button'}
          tabIndex={isMessageRevealed ? undefined : 0}
          aria-label={isMessageRevealed ? undefined : 'Apartar la nieve del mensaje'}
          aria-describedby={isMessageRevealed ? undefined : 'day01-keyboard-hint'}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || isMessageRevealed) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            endStroke();
            revealAt(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              revealAt(event.clientX, event.clientY);
            }
          }}
          onPointerUp={(event) => {
            endStroke();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
          onKeyDown={(event) => {
            if (isMessageRevealed || event.repeat || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            endStroke();
            revealNext();
          }}
        >
          <div className="day01-message-content" aria-hidden={!isMessageRevealed}>
            <h1 className="day01-title">
              <span>A mis hijitos hermosos que los amo hasta el infinito,</span>
              <span>Feliz Navidad!!!</span>
            </h1>
            <p className="day01-lead">
              Que esta navidad esté llenita de cosas buenas. Que disfruten todo lo que venga,
                que aprovechen las cosas especiales que hay en esta epoca como lo disfruta un niño que lo ve por primera vez.
                Que nunca pierdan la capacidad de asombro y disfrute de lo grande y lo pequeño
            </p>
          </div>
          <canvas ref={coverRef} className="day01-message-cover" aria-hidden="true" />
        </article>
        {!isMessageRevealed && (
          <span id="day01-keyboard-hint" className="day01-keyboard-hint">Con teclado: Enter o espacio para apartar la nieve.</span>
        )}
      </section>
    </main>
  );
}
