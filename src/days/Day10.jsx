import { useState } from 'react';

const INITIAL_LANTERN = { x: 52, y: 58 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function Day10() {
  const [lantern, setLantern] = useState(INITIAL_LANTERN);
  const [isDragging, setIsDragging] = useState(false);

  const updateLantern = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setLantern({
      x: clamp(x, 14, 86),
      y: clamp(y, 18, 84),
    });
  };

  const handlePointerDown = (event) => {
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateLantern(event);
  };

  const handlePointerMove = (event) => {
    if (!isDragging) return;
    updateLantern(event);
  };

  const handlePointerEnd = (event) => {
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <main className="page day10-page">
      <section className="day01-card day10-card">
        <div className="day10-layout">
          <article className="day01-note day10-note">
            <p className="day01-date">Diciembre 10</p>
            <h1 className="day01-title day10-title">
              <span>Un farolito navideno,</span>
              <span>muevanlo para leer.</span>
            </h1>
            <p className="day01-lead day10-lead">
              La noche esta casi a oscuras. Arrastren el farol para iluminar poquito a poquito el
              mensaje escondido y dejar que la luz haga su magia.
            </p>
          </article>

          <div className="day10-scene">
            <p className="day10-subtitle">Deslicen el farol sobre la oscuridad para descubrir la tarjeta.</p>

            <div
              className={`day10-night${isDragging ? ' is-dragging' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              style={{
                '--lantern-x': `${lantern.x}%`,
                '--lantern-y': `${lantern.y}%`,
              }}
            >
              <div className="day10-stars" aria-hidden="true">
                <span className="day10-star day10-star-a" />
                <span className="day10-star day10-star-b" />
                <span className="day10-star day10-star-c" />
                <span className="day10-star day10-star-d" />
                <span className="day10-star day10-star-e" />
              </div>

              <div className="day10-message-card">
                <p className="day10-message-date">Para esta noche de diciembre</p>
                <p className="day10-message-text">
                  Que la luz los encuentre siempre juntitos, aun en los ratitos mas callados.
                  Donde haya ternura, casa y familia, siempre habra un farol encendido esperandolos.
                </p>
              </div>

              <div className="day10-darkness" aria-hidden="true" />

              <div className="day10-lantern" aria-hidden="true">
                <span className="day10-lantern-ring" />
                <span className="day10-lantern-top" />
                <span className="day10-lantern-body" />
                <span className="day10-lantern-glow" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
