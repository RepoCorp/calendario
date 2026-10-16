import { useEffect, useRef, useState } from 'react';

// Sample messages for the first version. Replace or extend this bank with our own notes.
const MESSAGES = [
  'Qué suerte tan bonita tenernos.',
  'Si el amor fuera un lugar, sería donde estamos juntos.',
  'Hay abrazos que se sienten como llegar a casa. Los nuestros son así.',
  'Mi parte favorita de la Navidad es compartirla con ustedes.',
  'Ustedes hacen especiales hasta los días más sencillos.',
  'Un recordatorio chiquito: los quiero muchísimo.',
  'La distancia se hace más pequeña cuando nos pensamos con cariño.',
  'Gracias por llenar mi vida de recuerdos que me hacen sonreír.',
  'Con ustedes, siempre hay una razón para celebrar.',
  'Que nunca nos falten las risas, los abrazos y las ganas de estar juntos.',
  'El mejor regalo es seguir sumando momentos en familia.',
  'Les mando un abrazo de esos que duran un poquito más.',
];

const BALLOONS = [
  { color: 'rojo', fill: '#cf3c49', shade: '#942039', x: 17, y: 17, size: 103, tilt: '-12deg' },
  { color: 'dorado', fill: '#e8bf61', shade: '#b88932', x: 52, y: 10, size: 78, tilt: '8deg' },
  { color: 'verde pino', fill: '#458d63', shade: '#236041', x: 84, y: 25, size: 88, tilt: '13deg' },
  { color: 'rojo cereza', fill: '#e25351', shade: '#ac2936', x: 29, y: 48, size: 120, tilt: '8deg' },
  { color: 'dorado claro', fill: '#f1d58a', shade: '#c49a45', x: 73, y: 53, size: 108, tilt: '-9deg' },
  { color: 'verde', fill: '#68a477', shade: '#3a744f', x: 14, y: 79, size: 75, tilt: '-10deg' },
  { color: 'rojo granate', fill: '#b8334a', shade: '#801c32', x: 48, y: 84, size: 93, tilt: '5deg' },
  { color: 'marfil', fill: '#f4e7c4', shade: '#cfb98a', x: 85, y: 86, size: 79, tilt: '14deg' },
];

function shuffledMessages() {
  const messages = [...MESSAGES];
  for (let index = messages.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [messages[index], messages[swapIndex]] = [messages[swapIndex], messages[index]];
  }
  return messages;
}

function HeartBalloon() {
  return (
    <svg className="day18-heart" viewBox="0 0 120 114" fill="none" aria-hidden="true">
      <path
        d="M60 99C49 89 9 63 7 37C5 8 41 0 60 24C79 0 115 8 113 37C111 63 71 89 60 99Z"
        fill="var(--balloon-fill)"
      />
      <path
        d="M101 19C109 55 81 76 60 99C83 81 111 59 113 37C114 29 109 21 101 19Z"
        fill="var(--balloon-shade)"
      />
      <path
        d="M60 99C49 89 9 63 7 37C5 8 41 0 60 24C79 0 115 8 113 37C111 63 71 89 60 99Z"
        stroke="#43372b" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path d="M57 100L53 109Q60 106 67 109L63 100" fill="var(--balloon-shade)" stroke="#43372b" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M23 37C23 25 35 19 43 25" stroke="#fff9ed" strokeWidth="6" strokeLinecap="round" opacity=".8" />
      <path d="M24 47L25 50" stroke="#fff9ed" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export default function Day18() {
  const [reveal, setReveal] = useState(null);
  const [opened, setOpened] = useState(0);
  const [round, setRound] = useState(0);
  const [motion, setMotion] = useState('running');
  const messageDeck = useRef([]);
  const lastMessage = useRef(null);
  const dialogRef = useRef(null);
  const balloonRefs = useRef([]);
  const popLock = useRef(false);

  useEffect(() => {
    if (!reveal) return;
    // Let the little burst finish before bringing the note into focus.
    const timeout = window.setTimeout(() => dialogRef.current?.showModal(), 240);
    return () => window.clearTimeout(timeout);
  }, [reveal]);

  function popBalloon(index) {
    if (popLock.current) return;
    popLock.current = true;

    if (!messageDeck.current.length) {
      messageDeck.current = shuffledMessages();
      // Avoid an immediate repeat even at the boundary between two shuffled banks.
      if (messageDeck.current.length > 1 && messageDeck.current.at(-1) === lastMessage.current) {
        messageDeck.current.unshift(messageDeck.current.pop());
      }
    }

    const message = messageDeck.current.pop();
    lastMessage.current = message;
    setOpened((count) => count + 1);
    setReveal({ index, message });
  }

  function returnToBalloons() {
    const index = reveal?.index;
    setReveal(null);
    setRound((value) => value + 1);
    popLock.current = false;
    window.requestAnimationFrame(() => balloonRefs.current[index]?.focus({ preventScroll: true }));
  }

  return (
    <main className="day18-page">
      <header className="day18-heading">
        <p className="day18-date">18 de diciembre</p>
        <h1>Amor en el aire<span aria-hidden="true">.</span></h1>
        <p>Cada globito guarda algo bonito.</p>
      </header>

      <div className={`day18-sky is-${motion}${reveal ? ' is-reading' : ''}`} role="group" aria-label="Globitos con mensajes de amor">
        <span className="day18-doodle day18-doodle-one" aria-hidden="true">✧</span>
        <span className="day18-doodle day18-doodle-two" aria-hidden="true">✳</span>
        <span className="day18-doodle day18-doodle-three" aria-hidden="true">✧</span>
        {BALLOONS.map((balloon, index) => (
          <div
            className="day18-balloon-anchor"
            key={index}
            style={{
              left: `${balloon.x}%`,
              '--balloon-rest-y': `${balloon.y}%`,
              '--balloon-size': balloon.size,
              '--balloon-fill': balloon.fill,
              '--balloon-shade': balloon.shade,
              '--balloon-tilt': balloon.tilt,
              '--float-delay': `${index * -0.9}s`,
              '--float-duration': `${5 + (index % 3)}s`,
              '--rise-delay': `${-6 - index * 3.1}s`,
              '--rise-duration': `${24 + (index % 3) * 2}s`,
            }}
          >
            <div className="day18-balloon-float">
              <button
                ref={(node) => { balloonRefs.current[index] = node; }}
                type="button"
                className={`day18-balloon${reveal?.index === index ? ' is-popped' : ''}`}
                aria-label={`Reventar globo ${balloon.color} y descubrir un mensaje`}
                disabled={Boolean(reveal)}
                onClick={() => popBalloon(index)}
              >
                <HeartBalloon />
              </button>
              <svg className={`day18-string${reveal?.index === index ? ' is-popped' : ''}`} viewBox="0 0 50 110" fill="none" aria-hidden="true">
                <path d="M25 2C9 25 42 36 27 58S9 85 26 108" stroke="#cbb98a" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {reveal?.index === index && (
                <span className="day18-burst" aria-hidden="true" key={round}>
                  {Array.from({ length: 8 }, (_, piece) => (
                    <i key={piece} style={{ '--burst-angle': `${piece * 45}deg` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="day18-footer">
        <span className="day18-footer-heart" aria-hidden="true">♡</span>
        <p>{opened ? `${Math.min(opened, MESSAGES.length)} de ${MESSAGES.length} mensajitos descubiertos` : 'Un poquito de amor en cada uno.'}</p>
        <button
          type="button"
          className="day18-motion-toggle"
          onClick={() => setMotion((current) => current === 'running' ? 'paused' : 'running')}
        >
          {motion === 'running' ? 'Pausar globitos' : 'Hacerlos flotar'}
        </button>
      </footer>

      <dialog ref={dialogRef} className="day18-message" aria-labelledby="day18-message-title" aria-describedby="day18-message-text" onClose={returnToBalloons}>
        {reveal && (
          <>
            <div className="day18-message-heart" style={{ '--balloon-fill': BALLOONS[reveal.index].fill, '--balloon-shade': BALLOONS[reveal.index].shade }}>
              <HeartBalloon />
            </div>
            <h2 id="day18-message-title">Este es para ustedes</h2>
            <p id="day18-message-text" className="day18-message-text">{reveal.message}</p>
            <span className="day18-message-divider" aria-hidden="true">✧</span>
            <button type="button" className="day18-another" onClick={() => dialogRef.current?.close()}>Elegir otro globito <span aria-hidden="true">↗</span></button>
          </>
        )}
      </dialog>
    </main>
  );
}
