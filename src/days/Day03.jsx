import { useState } from 'react';

const CONFETTI_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f7b801', '#fb8b24'];

function createConfetti(count = 72) {
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 220 + Math.random() * 520;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const size = 6 + Math.random() * 11;
    const duration = 2 + Math.random() * 1.4;
    const delay = Math.random() * 0.22;
    const rotate = 200 + Math.random() * 520;

    return {
      id: `${index}-${Math.random().toString(36).slice(2, 7)}`,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      x,
      y,
      size,
      duration,
      delay,
      rotate,
    };
  });
}

export default function Day03() {
  const [isOpened, setIsOpened] = useState(false);
  const [confetti, setConfetti] = useState([]);

  const openGift = () => {
    if (isOpened) return;
    setIsOpened(true);
    setConfetti(createConfetti(380));
  };

  const closeGift = () => {
    if (!isOpened) return;
    setIsOpened(false);
    setConfetti([]);
  };

  return (
    <main className="page day03-page">
      <section className="day01-card day03-card">
        <div className="day03-layout">
          <div className="day03-scene">
            <p className="day03-subtitle">Haz click en el regalo para abrirlo.</p>

            <article className="day01-note day03-note">
              <p className="day01-date">Diciembre 3</p>
              <h1 className="day01-title day03-title-modern">
                <span>Un regalito para ustedes,</span>
                <span>abranlo con amor.</span>
              </h1>
              <p className="day01-lead day03-lead">
                Toquen el regalo para descubrir la sorpresa. Hoy la magia esta en abrir despacito,
                celebrar lo inesperado y guardar el detalle en el corazon.
              </p>
            </article>

            <div className={`day03-present ${isOpened ? 'is-open' : ''}`}>
              <div className="present-shadow" aria-hidden="true" />

              <div className="present-box" aria-hidden="true">
                <span className="present-ribbon-vertical" />
                <span className="present-ribbon-horizontal" />
              </div>

              <div className="present-lid" aria-hidden="true">
                <span className="present-ribbon-vertical" />
              </div>

              <button
                type="button"
                className="present-click-target"
                onClick={openGift}
                aria-label="Open gift"
              />

              <div className={`confetti-burst ${isOpened ? 'show' : ''}`} aria-hidden="true">
                {confetti.map((piece) => (
                  <span
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                      ['--color']: piece.color,
                      ['--x']: `${piece.x}px`,
                      ['--y']: `${piece.y}px`,
                      ['--size']: `${piece.size}px`,
                      ['--duration']: `${piece.duration}s`,
                      ['--delay']: `${piece.delay}s`,
                      ['--rotate']: `${piece.rotate}deg`,
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                className={`heart-paper ${isOpened ? 'show' : ''}`}
                onClick={closeGift}
                aria-label="Close gift"
              >
                <div className="heart-paper-shape">
                  <div className="heart-paper-content">
                    <h2>Dia 03</h2>
                    <p>Hoy te regalo un corazon lleno de amor.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
