import { useEffect, useRef, useState } from 'react';

const FIELD_WIDTH = 360;
const FIELD_HEIGHT = 520;
const BALL_RADIUS = 16;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createInitialBall() {
  return {
    x: 86,
    y: 120,
    vx: 0,
    vy: 0,
  };
}

function createConfetti() {
  return Array.from({ length: 14 }, (_, index) => ({
    id: index,
    x: 272 + (Math.random() - 0.5) * 46,
    y: 110 + Math.random() * 60,
    dx: (Math.random() - 0.5) * 90,
    dy: -60 - Math.random() * 60,
    rotation: Math.random() * 360,
    color: ['#f4d277', '#d64555', '#6fbc87', '#fff0c8'][index % 4],
  }));
}

export default function Day13() {
  const animationRef = useRef(0);
  const successTimeoutRef = useRef(null);
  const cloudRef = useRef({
    x: 164,
    y: 324,
    angle: -12,
  });
  const ballRef = useRef(createInitialBall());
  const draggingRef = useRef(false);
  const startedRef = useRef(false);
  const treeTargetRef = useRef({
    x: 274,
    y: 104,
    width: 58,
    height: 128,
  });

  const [cloud, setCloud] = useState(cloudRef.current);
  const [ball, setBall] = useState(ballRef.current);
  const [message, setMessage] = useState(
    'Muevan la nube, cambien su altura y su inclinacion para que la esfera rebote hacia el pino.'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(animationRef.current);
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const update = () => {
      if (!startedRef.current || hasWon) {
        animationRef.current = window.requestAnimationFrame(update);
        return;
      }

      const nextBall = ballRef.current;
      nextBall.vy += 0.28;
      nextBall.x += nextBall.vx;
      nextBall.y += nextBall.vy;

      nextBall.vx *= 0.998;

      if (nextBall.x <= BALL_RADIUS) {
        nextBall.x = BALL_RADIUS;
        nextBall.vx *= -0.86;
      } else if (nextBall.x >= FIELD_WIDTH - BALL_RADIUS) {
        nextBall.x = FIELD_WIDTH - BALL_RADIUS;
        nextBall.vx *= -0.86;
      }

      if (nextBall.y <= BALL_RADIUS) {
        nextBall.y = BALL_RADIUS;
        nextBall.vy *= -0.74;
      }

      const cloudLeft = cloudRef.current.x;
      const cloudRight = cloudRef.current.x + 118;
      const cloudTop = cloudRef.current.y;
      const cloudImpactY = cloudTop + 18;

      const isOverCloud = nextBall.x > cloudLeft && nextBall.x < cloudRight;
      const touchesCloud =
        nextBall.vy > 0 &&
        nextBall.y + BALL_RADIUS >= cloudTop &&
        nextBall.y + BALL_RADIUS <= cloudImpactY + 18 &&
        isOverCloud;

      if (touchesCloud) {
        const centerX = cloudRef.current.x + 59;
        const offset = (nextBall.x - centerX) / 59;
        const angleBoost = cloudRef.current.angle / 18;

        nextBall.y = cloudTop - BALL_RADIUS - 2;
        nextBall.vy = -7.9 - Math.abs(offset) * 1.2 - Math.max(0, -angleBoost) * 0.8;
        nextBall.vx += offset * 2.9 + angleBoost * 2.4;
        setMessage('Buen rebote. Ajusten la nube otra vez si hace falta.');
      }

      const tree = treeTargetRef.current;
      const insideTree =
        nextBall.x > tree.x &&
        nextBall.x < tree.x + tree.width &&
        nextBall.y > tree.y &&
        nextBall.y < tree.y + tree.height;

      if (insideTree) {
        setHasWon(true);
        setIsPlaying(false);
        startedRef.current = false;
        setMessage('Lo lograron. La esfera llego al arbol.');
        setConfetti(createConfetti());
        successTimeoutRef.current = window.setTimeout(() => {
          setConfetti([]);
        }, 1400);
      } else if (nextBall.y > FIELD_HEIGHT + BALL_RADIUS * 2) {
        startedRef.current = false;
        setIsPlaying(false);
        setMessage('La esfera se fue. Prueben otra posicion de nube.');
      }

      setBall({ ...nextBall });
      animationRef.current = window.requestAnimationFrame(update);
    };

    animationRef.current = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
    };
  }, [hasWon]);

  const launchBall = () => {
    ballRef.current = {
      ...createInitialBall(),
      vx: 1.4,
      vy: 0.6,
    };
    setBall(ballRef.current);
    setHasWon(false);
    setConfetti([]);
    startedRef.current = true;
    setIsPlaying(true);
    setMessage('Alla va la esfera. Muevan la nube para atraparla bien.');
  };

  const resetBall = () => {
    ballRef.current = createInitialBall();
    setBall(ballRef.current);
    setIsPlaying(false);
    setHasWon(false);
    startedRef.current = false;
    setConfetti([]);
    setMessage('Todo listo de nuevo. Coloquen la nube y lancen la esfera.');
  };

  const updateCloudFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT;

    const nextCloud = {
      ...cloudRef.current,
      x: clamp(x - 59, 18, FIELD_WIDTH - 136),
      y: clamp(y - 22, 168, FIELD_HEIGHT - 96),
    };

    cloudRef.current = nextCloud;
    setCloud(nextCloud);
  };

  const handlePointerDown = (event) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateCloudFromPointer(event);
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    updateCloudFromPointer(event);
  };

  const handlePointerEnd = (event) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const adjustAngle = (delta) => {
    const nextCloud = {
      ...cloudRef.current,
      angle: clamp(cloudRef.current.angle + delta, -28, 28),
    };
    cloudRef.current = nextCloud;
    setCloud(nextCloud);
  };

  return (
    <main className="page day13-page">
      <section className="day01-card day13-card">
        <div className="day13-layout">
          <article className="day01-note day13-note">
            <p className="day01-date">Diciembre 13</p>
            <h1 className="day01-title day13-title">
              <span>Una nube trampolin,</span>
              <span>lleven la esfera al pino.</span>
            </h1>
            <p className="day01-lead day13-lead">
              La nube rebota como una cama elastica. Arrastrenla, subanla o bajenla con el dedo y
              cambien su inclinacion para mandar la bolita justo al arbol.
            </p>
          </article>

          <div className="day13-scene">
            <p className="day13-subtitle">{message}</p>

            <div className="day13-status" aria-live="polite">
              <span>{isPlaying ? 'Jugando' : 'Esperando lanzamiento'}</span>
              <span>Inclinacion: {Math.round(cloud.angle)}°</span>
            </div>

            <div
              className="day13-playfield"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
            >
              <div className="day13-sky" aria-hidden="true" />

              <div
                className="day13-ball"
                style={{
                  left: `${(ball.x / FIELD_WIDTH) * 100}%`,
                  top: `${(ball.y / FIELD_HEIGHT) * 100}%`,
                }}
              />

              <div className="day13-tree" aria-hidden="true">
                <span className="day13-tree-star" />
                <span className="day13-tree-top" />
                <span className="day13-tree-middle" />
                <span className="day13-tree-bottom" />
                <span className="day13-tree-trunk" />
              </div>

              <div
                className="day13-cloud"
                style={{
                  left: `${(cloud.x / FIELD_WIDTH) * 100}%`,
                  top: `${(cloud.y / FIELD_HEIGHT) * 100}%`,
                  transform: `rotate(${cloud.angle}deg)`,
                }}
              >
                <span className="day13-cloud-puff day13-cloud-puff-a" />
                <span className="day13-cloud-puff day13-cloud-puff-b" />
                <span className="day13-cloud-puff day13-cloud-puff-c" />
                <span className="day13-cloud-puff day13-cloud-puff-d" />
              </div>

              {confetti.map((piece) => (
                <span
                  key={piece.id}
                  className="day13-confetti"
                  style={{
                    left: `${(piece.x / FIELD_WIDTH) * 100}%`,
                    top: `${(piece.y / FIELD_HEIGHT) * 100}%`,
                    '--x': `${piece.dx}px`,
                    '--y': `${piece.dy}px`,
                    '--rotate': `${piece.rotation}deg`,
                    '--confetti-color': piece.color,
                  }}
                />
              ))}
            </div>

            <div className="day13-angle-controls">
              <button type="button" className="day13-angle-button" onClick={() => adjustAngle(-6)}>
                Inclinar a la izquierda
              </button>
              <button type="button" className="day13-angle-button" onClick={() => adjustAngle(6)}>
                Inclinar a la derecha
              </button>
            </div>

            <div className="day13-actions">
              <button type="button" className="day13-action-button" onClick={launchBall}>
                Lanzar esfera
              </button>
              <button type="button" className="day13-action-button day13-action-button-secondary" onClick={resetBall}>
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
