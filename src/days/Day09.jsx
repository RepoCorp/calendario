import { useEffect, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function Day09() {
  const animationRef = useRef(0);
  const sensorRef = useRef({
    active: false,
    baselineBeta: null,
    baselineGamma: null,
    beta: 0,
    gamma: 0,
  });

  const [sensorReady, setSensorReady] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [spill, setSpill] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [bestSeconds, setBestSeconds] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Inclinen el telefono con cuidado para que no se derrame el chocolate.');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleOrientation = (event) => {
      if (!sensorRef.current.active) return;
      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') return;

      if (sensorRef.current.baselineBeta === null || sensorRef.current.baselineGamma === null) {
        sensorRef.current.baselineBeta = event.beta;
        sensorRef.current.baselineGamma = event.gamma;
      }

      sensorRef.current.beta = event.beta - sensorRef.current.baselineBeta;
      sensorRef.current.gamma = event.gamma - sensorRef.current.baselineGamma;
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    let previousTime = performance.now();
    let secondAccumulator = 0;

    const tick = (time) => {
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      if (sensorReady && !gameOver) {
        const x = clamp(sensorRef.current.gamma, -30, 30);
        const y = clamp(sensorRef.current.beta, -30, 30);
        const lateralDanger = Math.max(0, Math.abs(x) - 7);
        const forwardDanger = Math.max(0, Math.abs(y) - 9);
        const totalDanger = lateralDanger * 1.2 + forwardDanger;

        setTilt({ x, y });

        setSpill((current) => {
          const next = clamp(current + totalDanger * deltaSeconds * 1.45 - 8 * deltaSeconds, 0, 100);
          if (next >= 100) {
            setGameOver(true);
            setBestSeconds((best) => Math.max(best, Math.floor(seconds)));
            setMessage('Ay no, se derramo. Toquen reiniciar y vuelvan a intentarlo.');
          } else if (next > 70) {
            setMessage('Mucho cuidado, la taza ya esta al borde.');
          } else if (next > 35) {
            setMessage('Se esta moviendo bastante. Enderecen el telefono un poquito.');
          } else {
            setMessage('Muy bien, sigan manteniendo el chocolate en calma.');
          }
          return next;
        });

        secondAccumulator += deltaSeconds;
        if (secondAccumulator >= 0.2) {
          secondAccumulator = 0;
          setSeconds((current) => current + 0.2);
        }
      }

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
    };
  }, [gameOver, seconds, sensorReady]);

  const activateSensors = async () => {
    try {
      setError('');

      if (
        typeof window.DeviceOrientationEvent !== 'undefined' &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const permission = await window.DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          setError('Hace falta permitir el acceso al movimiento del telefono.');
          return;
        }
      }

      sensorRef.current.active = true;
      sensorRef.current.baselineBeta = null;
      sensorRef.current.baselineGamma = null;
      sensorRef.current.beta = 0;
      sensorRef.current.gamma = 0;
      setSensorReady(true);
      setMessage('Listo. Sostengan el telefono como quieran y el juego tomara esa posicion como centro.');
    } catch (sensorError) {
      setError('No pude activar los sensores. Prueben desde un telefono y acepten el permiso.');
    }
  };

  const restartGame = () => {
    sensorRef.current.baselineBeta = null;
    sensorRef.current.baselineGamma = null;
    sensorRef.current.beta = 0;
    sensorRef.current.gamma = 0;
    setTilt({ x: 0, y: 0 });
    setSpill(0);
    setSeconds(0);
    setGameOver(false);
    setMessage(
      sensorReady
        ? 'Taza lista otra vez. Quedense tranquilos y eviten que se derrame.'
        : 'Activen el movimiento del telefono para empezar.'
    );
  };

  const rotate = clamp(tilt.x * 0.6, -14, 14);
  const surfaceShift = clamp(tilt.x * 0.4, -10, 10);
  const surfaceTilt = clamp(-tilt.x * 0.8, -18, 18);
  const steamLean = clamp(tilt.x * 0.16, -4, 4);
  const dripsVisible = spill > 58 || Math.abs(tilt.x) > 14 || Math.abs(tilt.y) > 16;

  return (
    <main className="page day09-page">
      <section className="day01-card day09-card">
        <div className="day09-layout">
          <article className="day01-note day09-note">
            <p className="day01-date">Diciembre 9</p>
            <h1 className="day01-title day09-title">
              <span>Chocolate calientito,</span>
              <span>que no se derrame.</span>
            </h1>
            <p className="day01-lead day09-lead">
              Inclinen el telefono suavemente para cuidar la taza. Si se mueven demasiado, el
              chocolate se ira saliendo y se pierde el reto.
            </p>
          </article>

          <div className="day09-scene">
            <p className="day09-subtitle">{message}</p>

            <div className="day09-status" aria-live="polite">
              <span>Tiempo: {seconds.toFixed(1)} s</span>
              <span>Mejor: {Math.max(bestSeconds, Math.floor(seconds))} s</span>
            </div>

            <div className="day09-cup-scene">
              <div
                className={`day09-cup-wrap${dripsVisible ? ' is-wobbling' : ''}${gameOver ? ' is-spilled' : ''}`}
                style={{ transform: `rotate(${rotate}deg)` }}
                aria-label="Taza de chocolate"
              >
                <span className="day09-steam day09-steam-left" style={{ '--steam-lean': steamLean }} aria-hidden="true" />
                <span className="day09-steam day09-steam-center" style={{ '--steam-lean': steamLean }} aria-hidden="true" />
                <span className="day09-steam day09-steam-right" style={{ '--steam-lean': steamLean }} aria-hidden="true" />
                <div className="day09-cup">
                  <div
                    className="day09-cocoa-surface"
                    style={{
                      transform: `translateX(${surfaceShift}px) rotate(${surfaceTilt}deg)`,
                    }}
                  />
                  <div className="day09-cup-highlight" />
                  <div className="day09-cup-handle" />
                  {dripsVisible ? <div className="day09-cup-drip day09-cup-drip-left" aria-hidden="true" /> : null}
                  {dripsVisible ? <div className="day09-cup-drip day09-cup-drip-right" aria-hidden="true" /> : null}
                </div>
                <div className="day09-saucer" />
              </div>
            </div>

            <div className="day09-meter-block">
              <div className="day09-meter-labels">
                <span>Derrame</span>
                <span>{Math.round(spill)}%</span>
              </div>
              <div className="day09-meter-track" aria-hidden="true">
                <div className="day09-meter-fill" style={{ transform: `scaleX(${spill / 100})` }} />
              </div>
            </div>

            <div className="day09-tilt-readout">
              <span>Izq./Der.: {Math.round(tilt.x)}°</span>
              <span>Adel./Atras: {Math.round(tilt.y)}°</span>
            </div>

            <div className="day09-actions">
              <button type="button" className="day09-button" onClick={activateSensors}>
                {sensorReady ? 'Recalibrar inclinacion' : 'Activar inclinacion'}
              </button>
              <button type="button" className="day09-button day09-button-secondary" onClick={restartGame}>
                Reiniciar taza
              </button>
            </div>

            {error ? <p className="day09-error">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
