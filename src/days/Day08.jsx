import { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const INITIAL_SLEIGH = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 118, vx: 0, vy: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createCrater() {
  const radius = 28 + Math.random() * 30;
  const x = radius + 20 + Math.random() * (GAME_WIDTH - radius * 2 - 40);
  const drift = (Math.random() - 0.5) * 20;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x,
    y: -radius - Math.random() * 120,
    radius,
    drift,
    depth: 0.35 + Math.random() * 0.3,
  };
}

function drawMoonSky(context) {
  const sky = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, '#091018');
  sky.addColorStop(0.45, '#112236');
  sky.addColorStop(1, '#26364b');
  context.fillStyle = sky;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const glow = context.createRadialGradient(282, 88, 6, 282, 88, 108);
  glow.addColorStop(0, 'rgba(255, 239, 185, 0.82)');
  glow.addColorStop(0.4, 'rgba(255, 239, 185, 0.16)');
  glow.addColorStop(1, 'rgba(255, 239, 185, 0)');
  context.fillStyle = glow;
  context.fillRect(180, 0, 200, 200);

  context.fillStyle = '#f2e0a6';
  context.beginPath();
  context.arc(282, 88, 34, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(162, 143, 94, 0.32)';
  context.beginPath();
  context.arc(294, 79, 8, 0, Math.PI * 2);
  context.arc(268, 98, 5, 0, Math.PI * 2);
  context.arc(286, 103, 4, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255, 246, 220, 0.9)';
  for (let index = 0; index < 18; index += 1) {
    const x = ((index * 47) % 320) + 20;
    const y = ((index * 83) % 160) + 26;
    const size = index % 3 === 0 ? 2.4 : 1.5;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
}

function drawMoonGround(context) {
  const ground = context.createLinearGradient(0, 190, 0, GAME_HEIGHT);
  ground.addColorStop(0, '#7f8793');
  ground.addColorStop(0.42, '#a0a7b1');
  ground.addColorStop(1, '#d4d6d9');
  context.fillStyle = ground;
  context.fillRect(0, 180, GAME_WIDTH, GAME_HEIGHT - 180);

  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  context.beginPath();
  context.moveTo(0, 230);
  context.quadraticCurveTo(64, 206, 120, 234);
  context.quadraticCurveTo(176, 260, 236, 228);
  context.quadraticCurveTo(290, 201, 360, 244);
  context.lineTo(360, GAME_HEIGHT);
  context.lineTo(0, GAME_HEIGHT);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(71, 82, 96, 0.18)';
  for (let index = 0; index < 16; index += 1) {
    const x = ((index * 71) % 360) + 12;
    const y = 210 + ((index * 43) % 330);
    const width = 8 + (index % 5) * 3;
    const height = 3 + (index % 4) * 1.2;
    context.beginPath();
    context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    context.fill();
  }
}

function drawCrater(context, crater) {
  context.save();
  context.translate(crater.x, crater.y);

  const rim = context.createRadialGradient(0, -crater.radius * 0.2, crater.radius * 0.2, 0, 0, crater.radius);
  rim.addColorStop(0, '#f2f3f4');
  rim.addColorStop(0.4, '#b7bcc4');
  rim.addColorStop(1, '#727986');
  context.fillStyle = rim;
  context.beginPath();
  context.arc(0, 0, crater.radius, 0, Math.PI * 2);
  context.fill();

  const bowl = context.createRadialGradient(
    crater.radius * 0.08,
    crater.radius * 0.02,
    crater.radius * 0.22,
    0,
    0,
    crater.radius * 0.82
  );
  bowl.addColorStop(0, '#515a67');
  bowl.addColorStop(0.72, '#6c7581');
  bowl.addColorStop(1, '#8e96a1');
  context.fillStyle = bowl;
  context.beginPath();
  context.arc(0, 0, crater.radius * crater.depth, 0, Math.PI * 2);
  context.scale(1.18, 0.82);
  context.fill();

  context.restore();
}

function drawSleigh(context, sleigh) {
  context.save();
  context.translate(sleigh.x, sleigh.y);
  context.rotate(clamp(sleigh.vx * 0.012, -0.22, 0.22));

  context.strokeStyle = '#d8b55b';
  context.lineWidth = 4;
  context.lineCap = 'round';

  context.beginPath();
  context.moveTo(-26, 19);
  context.quadraticCurveTo(-4, 34, 30, 18);
  context.stroke();

  context.beginPath();
  context.moveTo(-24, 11);
  context.lineTo(20, 11);
  context.stroke();

  context.fillStyle = '#9b1629';
  context.beginPath();
  context.moveTo(-26, 8);
  context.quadraticCurveTo(-10, -14, 16, -10);
  context.quadraticCurveTo(30, -8, 28, 10);
  context.lineTo(-14, 10);
  context.quadraticCurveTo(-20, 10, -26, 8);
  context.fill();

  context.fillStyle = '#f1d48b';
  context.fillRect(-4, -16, 8, 12);

  context.strokeStyle = '#fff2cc';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-8, -18);
  context.lineTo(10, -18);
  context.stroke();

  context.fillStyle = '#2f9b5a';
  context.beginPath();
  context.moveTo(8, -20);
  context.lineTo(18, -14);
  context.lineTo(8, -8);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(255, 244, 218, 0.72)';
  context.beginPath();
  context.ellipse(-18, 3, 7, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

export default function Day08() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const animationRef = useRef(0);
  const pointerRef = useRef({ active: false, x: INITIAL_SLEIGH.x, y: INITIAL_SLEIGH.y });
  const gameRef = useRef({
    sleigh: { ...INITIAL_SLEIGH },
    craters: [],
    speed: 124,
    distance: 0,
    spawnTimer: 0,
  });

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [distance, setDistance] = useState(0);
  const [bestDistance, setBestDistance] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let previousTime = performance.now();
    let distanceAccumulator = 0;

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const update = (deltaSeconds) => {
      const state = gameRef.current;

      if (!started || gameOver) return;

      const pointer = pointerRef.current;
      state.speed = Math.min(250, state.speed + deltaSeconds * 2.8);

      const desiredX = pointer.active ? pointer.x : GAME_WIDTH / 2;
      const desiredY = pointer.active ? pointer.y : GAME_HEIGHT - 118;
      const accelerationX = (desiredX - state.sleigh.x) * 6.4;
      const accelerationY = (desiredY - state.sleigh.y) * 6.4;

      state.sleigh.vx += accelerationX * deltaSeconds;
      state.sleigh.vy += accelerationY * deltaSeconds;
      state.sleigh.vx *= 0.88;
      state.sleigh.vy *= 0.88;
      state.sleigh.x = clamp(state.sleigh.x + state.sleigh.vx * deltaSeconds, 44, GAME_WIDTH - 44);
      state.sleigh.y = clamp(state.sleigh.y + state.sleigh.vy * deltaSeconds, 202, GAME_HEIGHT - 70);

      state.spawnTimer -= deltaSeconds;
      if (state.spawnTimer <= 0) {
        state.craters.push(createCrater());
        state.spawnTimer = Math.max(0.34, 0.82 - state.speed / 360);
      }

      state.craters = state.craters
        .map((crater) => ({
          ...crater,
          x: clamp(crater.x + crater.drift * deltaSeconds, crater.radius + 12, GAME_WIDTH - crater.radius - 12),
          y: crater.y + state.speed * deltaSeconds,
        }))
        .filter((crater) => crater.y - crater.radius < GAME_HEIGHT + 26);

      const collision = state.craters.some((crater) => {
        const dx = state.sleigh.x - crater.x;
        const dy = state.sleigh.y - crater.y;
        const impact = crater.radius * 0.78 + 12;
        return dx * dx + dy * dy < impact * impact;
      });

      if (collision) {
        setGameOver(true);
        setBestDistance((current) => Math.max(current, Math.floor(state.distance)));
      }

      state.distance += deltaSeconds * (state.speed * 0.12);
      distanceAccumulator += deltaSeconds;

      if (distanceAccumulator >= 0.12) {
        distanceAccumulator = 0;
        setDistance(Math.floor(state.distance));
      }
    };

    const render = () => {
      context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      drawMoonSky(context);
      drawMoonGround(context);

      gameRef.current.craters.forEach((crater) => drawCrater(context, crater));

      if (started && !gameOver) {
        context.save();
        context.strokeStyle = 'rgba(255, 236, 176, 0.32)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(gameRef.current.sleigh.x - 6, gameRef.current.sleigh.y + 10);
        context.lineTo(gameRef.current.sleigh.x - 22, gameRef.current.sleigh.y + 28);
        context.moveTo(gameRef.current.sleigh.x + 4, gameRef.current.sleigh.y + 10);
        context.lineTo(gameRef.current.sleigh.x - 8, gameRef.current.sleigh.y + 32);
        context.stroke();
        context.restore();
      }

      drawSleigh(context, gameRef.current.sleigh);

      if (!started) {
        context.fillStyle = 'rgba(8, 17, 27, 0.46)';
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      if (gameOver) {
        context.fillStyle = 'rgba(66, 12, 28, 0.34)';
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
    };

    const tick = (time) => {
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.033);
      previousTime = time;
      update(deltaSeconds);
      render();
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [gameOver, started]);

  const resetGame = () => {
    gameRef.current = {
      sleigh: { ...INITIAL_SLEIGH },
      craters: [],
      speed: 124,
      distance: 0,
      spawnTimer: 0.2,
    };
    pointerRef.current = { active: false, x: INITIAL_SLEIGH.x, y: INITIAL_SLEIGH.y };
    setDistance(0);
    setGameOver(false);
  };

  const startGame = () => {
    resetGame();
    setStarted(true);
  };

  const updatePointer = (event) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * GAME_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * GAME_HEIGHT;
    pointerRef.current = {
      active: true,
      x: clamp(x, 36, GAME_WIDTH - 36),
      y: clamp(y, 212, GAME_HEIGHT - 76),
    };
  };

  const handlePointerDown = (event) => {
    if (!started) {
      startGame();
    } else if (gameOver) {
      resetGame();
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    updatePointer(event);
  };

  const handlePointerMove = (event) => {
    if (!pointerRef.current.active) return;
    updatePointer(event);
  };

  const handlePointerEnd = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pointerRef.current.active = false;
    pointerRef.current.x = GAME_WIDTH / 2;
    pointerRef.current.y = GAME_HEIGHT - 118;
  };

  return (
    <main className="page day08-page">
      <section className="day01-card day08-card">
        <div className="day08-layout">
          <article className="day01-note day08-note">
            <p className="day01-date">Diciembre 8</p>
            <h1 className="day01-title day08-title">
              <span>Un paseo en trineo lunar,</span>
              <span>guienlo entre crateres.</span>
            </h1>
            <p className="day01-lead day08-lead">
              Deslicen su dedo por la luna y ayuden al trineo a esquivar crateres. Es como una
              carrera navidena en silencio, con estrellas arriba y un viaje heladito por delante.
            </p>
          </article>

          <div className="day08-scene">
            <div className="day08-scene-head">
              <p className="day08-subtitle">Mantengan presionado y arrastren para guiar el trineo.</p>
              <div className="day08-scoreboard" aria-live="polite">
                <span>Recorrido: {distance} m</span>
                <span>Mejor: {Math.max(bestDistance, distance)} m</span>
              </div>
            </div>

            <div
              ref={sceneRef}
              className={`day08-game${started ? ' is-started' : ''}${gameOver ? ' is-over' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              role="application"
              aria-label="Juego del trineo lunar"
            >
              <canvas ref={canvasRef} className="day08-canvas" />

              {!started ? (
                <div className="day08-overlay">
                  <p className="day08-overlay-title">Toquen para despegar</p>
                  <p className="day08-overlay-text">
                    Guien el trineo con el dedo y sobrevivan el mayor tiempo posible.
                  </p>
                </div>
              ) : null}

              {gameOver ? (
                <div className="day08-overlay day08-overlay-restart">
                  <p className="day08-overlay-title">Uy, cayeron en un crater</p>
                  <p className="day08-overlay-text">Toquen de nuevo para intentarlo otra vez.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
