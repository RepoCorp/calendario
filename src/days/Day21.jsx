import '../components/Day21Story.css';

export default function Day21() {
  return (
    <main className="day21-story">
      <section className="day21-scene" aria-label="Una noche de invierno entre dos trincheras">
        <img className="day21-landscape" src="/images/day21-winter-plain.png" alt="Llanura nevada bajo un cielo estrellado" draggable="false" />
        <img className="day21-moon" src="/images/day21-moon.png" alt="Luna llena" draggable="false" />
        <img className="day21-trench day21-trench-left" src="/images/day21-german-trench.png" alt="Trinchera alemana iluminada con faroles" draggable="false" />
        <img className="day21-trench day21-trench-right" src="/images/day21-british-trench.png" alt="Trinchera británica iluminada con faroles" draggable="false" />
      </section>
      <p className="day21-date">Diciembre 21</p>
      <div className="day21-rotate" role="status">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <rect x="30" y="15" width="40" height="70" rx="7" transform="rotate(-25 50 50)" />
          <path d="M76 22a36 36 0 0 1 8 49m-1-14 2 16 13-8" />
          <path d="M45 72h10" transform="rotate(-25 50 50)" />
        </svg>
        <p>Gira el teléfono para ver la historia</p>
      </div>
    </main>
  );
}
