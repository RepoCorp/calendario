import { useEffect, useRef, useState } from 'react';

export default function Day01() {
  const canvasRef = useRef(null);
  const [showSnowTip, setShowSnowTip] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const flakeCount = Math.max(220, Math.floor((width * height) / 6500));
    const flakes = Array.from({ length: flakeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.8 + 1.8,
      speedY: Math.random() * 1.1 + 0.5,
      drift: (Math.random() - 0.5) * 0.6,
      vx: 0,
      vy: 0,
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
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const onMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    };

    const onLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const onTouchMove = (event) => {
      if (!event.touches[0]) return;
      event.preventDefault();
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
      mouse.active = true;
    };

    const onTouchEnd = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    setSize();
    document.body.classList.add('day-lock-scroll');
    document.documentElement.classList.add('day-lock-scroll');
    window.addEventListener('resize', setSize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    let frameId = 0;
    let tickCount = 0;
    const tick = () => {
      tickCount += 1;
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';

      for (let i = 0; i < flakes.length; i += 1) {
        const flake = flakes[i];

        if (mouse.active) {
          const dx = flake.x - mouse.x;
          const dy = flake.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < mouse.radius && distance > 0.01) {
            const force = (mouse.radius - distance) / mouse.radius;
            flake.vx += (dx / distance) * force * 0.8;
            flake.vy += (dy / distance) * force * 0.6;
          }
        }

        flake.vx *= 0.94;
        flake.vy *= 0.94;
        flake.x += flake.drift + flake.vx;
        flake.y += flake.speedY + flake.vy;

        if (flake.y > height + flake.r) {
          flake.y = -flake.r;
          flake.x = Math.random() * width;
          flake.vx = 0;
          flake.vy = 0;
          flake.twinkleOffset = Math.random() * Math.PI * 2;
          const festive = Math.random() < 0.2;
          flake.hue = festive ? 45 : 0;
          flake.saturation = festive ? 95 : 0;
          flake.lightness = festive ? 74 : 100;
          flake.spin = (Math.random() - 0.5) * 0.05;
          flake.angle = Math.random() * Math.PI * 2;
        }

        if (flake.x < -flake.r) flake.x = width + flake.r;
        if (flake.x > width + flake.r) flake.x = -flake.r;

        const twinkle = 0.72 + 0.28 * Math.sin(tickCount * 0.04 + flake.twinkleOffset);
        const alpha = 0.68 + 0.32 * twinkle;
        const stroke = `hsla(${flake.hue}, ${flake.saturation}%, ${flake.lightness}%, ${alpha})`;
        flake.angle += flake.spin;

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
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      document.body.classList.remove('day-lock-scroll');
      document.documentElement.classList.remove('day-lock-scroll');
    };
  }, []);

  return (
    <main className="page day01-page">
      <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />
      <section className="day01-card">
        <div className="day01-layout">
          <article className="day01-note">
            <div className="day01-eyebrow-wrap">
              <button
                type="button"
                className="day01-eyebrow"
                aria-expanded={showSnowTip}
                aria-controls="day01-snow-tip"
                onClick={() => setShowSnowTip((current) => !current)}
                onBlur={() => {
                  window.setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (!activeElement || !activeElement.closest('.day01-eyebrow-wrap')) {
                      setShowSnowTip(false);
                    }
                  }, 0);
                }}
              >
                Un mensajito nevado de la mamá
              </button>
              <p
                id="day01-snow-tip"
                className={`day01-tooltip${showSnowTip ? ' is-visible' : ''}`}
                role="status"
                aria-live="polite"
              >
                Jueguen con la nieve como la primera vez que la vieron
              </p>
            </div>
            <p className="day01-date">Diciembre 1</p>
            <h1 className="day01-title">
              <span>A mis hijitos hermosos que los amo hasta el infinito,</span>
              <span>Feliz Navidad!!!</span>
            </h1>
            <p className="day01-lead">
              Que esta navidad esté llenita de cosas buenas. Que disfruten todo lo que venga,
                que aprovechen las cosas especiales que hay en esta epoca como lo disfruta un niño que lo ve por primera vez.
                Que nunca pierdan la capacidad de asombro y disfrute de lo grande y lo pequeño
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
