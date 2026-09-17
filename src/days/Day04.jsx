import { useState } from 'react';

export default function Day04() {
  const [noseLit, setNoseLit] = useState(false);
  const toggleNose = () => setNoseLit((value) => !value);

  return (
    <main className="page day04-page">
      <section className="day01-card day04-card">
        <div className="day04-layout">
          <article className="day01-note day04-note">
            <p className="day01-date">Diciembre 4</p>
            <h1 className="day01-title day04-title">
              <span>El Rodolfo.</span>
            </h1>
            <p className="day01-lead day04-lead">
              Ya van 4 dias!! Como corre el tiempo. Y no vuelve, así que hay que aprovecharlo. Tienen todo lo necesario para vivir
                muy felices y satisfechos, y si lo aprovechan! Que orgullo.
            </p>
          </article>

          <div className="day04-scene">
            <p className="day04-subtitle">Toquen la nariz para encenderla.</p>

            <div className="day04-reindeer-wrap">
              <img
                className="day04-reindeer-art"
                src={noseLit ? '/images/day04-reindeer-lit.png' : '/images/day04-reindeer-portrait.png'}
                alt="Rodolfo con gorro de Navidad"
              />

              <button
                type="button"
                className={`day04-nose${noseLit ? ' is-lit' : ''}`}
                aria-pressed={noseLit}
                aria-label="Encender o apagar la nariz del renito"
                onPointerDown={toggleNose}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  toggleNose();
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
