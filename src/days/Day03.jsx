import { useEffect, useRef, useState } from 'react';

const CONFETTI_ART = '/images/day03-realistic-confetti.png';
const LID_CLOSE_DELAY_MS = 400;
const CLOSE_SEQUENCE_DURATION_MS = 1400;

function createConfetti(width, minimumFall, count = 84) {
  const scale = width / 320;

  return Array.from({ length: count }, (_, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const sprite = (index + Math.floor(index / 8)) % 8;

    return {
      id: index,
      spritePosition: `${(sprite % 4) * (100 / 3)}% ${Math.floor(sprite / 4) * 100}%`,
      startX: (Math.random() - 0.5) * 64 * scale,
      x: direction * (65 + Math.random() * 185) * scale * 1.8,
      rise: (160 + Math.random() * 150) * scale * 1.1,
      fall: Math.max(minimumFall, (230 + Math.random() * 140) * scale),
      size: 10 + Math.random() * 10,
      duration: 3.2 + Math.random() * 1.2,
      delay: 1 + Math.random() * 0.28,
      turn: Math.random() * 360,
      flutter: 0.65 + Math.random() * 0.7,
      spin: direction * 360,
    };
  });
}

export default function Day03() {
  const presentRef = useRef(null);
  const [isOpened, setIsOpened] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    const image = new Image();
    image.src = CONFETTI_ART;
  }, []);

  useEffect(() => {
    if (confetti.length === 0) return;
    const lifetime = Math.max(...confetti.map((piece) => piece.duration + piece.delay));
    const timeout = window.setTimeout(() => setConfetti([]), lifetime * 1000 + 100);
    return () => window.clearTimeout(timeout);
  }, [confetti]);

  useEffect(() => {
    if (!isClosing) return;
    const lidTimeout = window.setTimeout(() => {
      setIsOpened(false);
    }, LID_CLOSE_DELAY_MS);
    const messageTimeout = window.setTimeout(() => {
      setIsClosing(false);
    }, CLOSE_SEQUENCE_DURATION_MS);
    return () => {
      window.clearTimeout(lidTimeout);
      window.clearTimeout(messageTimeout);
    };
  }, [isClosing]);

  const openGift = () => {
    if (isOpened || isClosing) return;
    const bounds = presentRef.current?.getBoundingClientRect();
    const originY = bounds ? bounds.top + bounds.height * 0.48 : 0;
    const minimumFall = Math.max(0, window.innerHeight - originY) + 80;
    setIsOpened(true);
    setConfetti(createConfetti(presentRef.current?.clientWidth ?? 320, minimumFall));
  };

  const closeGift = () => {
    if (!isOpened || isClosing) return;
    setIsClosing(true);
    setConfetti([]);
  };

  return (
    <main className="page day03-page">
      <section className="day01-card day03-card">
        <div className="day03-layout">
          <div className="day03-scene">
            <p className="day01-date day03-date">Diciembre 3</p>

            <article className="day01-note day03-note" hidden>
              <h1 className="day01-title day03-title-modern">
                <span>Un regalito para ustedes,</span>
                <span>abranlo con amor.</span>
              </h1>
              <p className="day01-lead day03-lead">
                Como les fue con lo que planearon especial para ayer? Si ayer no se pudo, haganle hoy que también vale, y si si se pude,
                  pues hoy también se puede hacer algo especial!
              </p>
            </article>

            <div ref={presentRef} className={`day03-present ${isOpened ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}>
              <div className="present-shadow" aria-hidden="true" />
              <img className="present-art present-box" src="/images/day03-realistic-gift.png" alt="" aria-hidden="true" draggable="false" width="1254" height="1254" />
              <img className="present-art present-box-front" src="/images/day03-realistic-gift.png" alt="" aria-hidden="true" draggable="false" width="1254" height="1254" />
              <img className="present-art present-lid" src="/images/day03-realistic-gift.png" alt="" aria-hidden="true" draggable="false" width="1254" height="1254" />

              <button type="button" className="present-click-target" onClick={openGift} aria-label="Open gift" disabled={isOpened} aria-hidden={isOpened} />

              <div className={`confetti-burst ${isOpened ? 'show' : ''}`} style={{ ['--confetti-art']: `url("${CONFETTI_ART}")` }} aria-hidden="true">
                {confetti.map((piece) => (
                  <span key={piece.id} className="confetti-piece" style={{
                    ['--sprite-position']: piece.spritePosition,
                    ['--start-x']: `${piece.startX}px`,
                    ['--x']: `${piece.x}px`,
                    ['--rise']: `${piece.rise}px`,
                    ['--fall']: `${piece.fall}px`,
                    ['--size']: `${piece.size}px`,
                    ['--duration']: `${piece.duration}s`,
                    ['--delay']: `${piece.delay}s`,
                    ['--turn']: `${piece.turn}deg`,
                    ['--flutter']: `${piece.flutter}s`,
                    ['--spin']: `${piece.spin}deg`,
                  }}>
                    <span className="confetti-fall"><span className="confetti-paper" /></span>
                  </span>
                ))}
              </div>

              <button type="button" className={`heart-paper ${isOpened ? 'show' : ''}`} onClick={closeGift} aria-label="Close gift" disabled={!isOpened || isClosing} aria-hidden={!isOpened}>
                <div className="heart-paper-shape">
                  <div className="heart-paper-content">
                    <h2>Un regalito para ustedes, abranlo con amor.</h2>
                    <p>
                      Como les fue con lo que planearon especial para ayer? Si ayer no se pudo, haganle hoy que también vale, y si si se pude,
                      pues hoy también se puede hacer algo especial!
                    </p>
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
