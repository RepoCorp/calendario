import { useState } from 'react';

export default function Day04() {
  const [noseLit, setNoseLit] = useState(false);

  return (
    <main className="page day04-page">
      <section className="day01-card day04-card">
        <div className="day04-layout">
          <article className="day01-note day04-note">
            <p className="day01-date">Diciembre 4</p>
            <h1 className="day01-title day04-title">
              <span>Un renito para ustedes,</span>
              <span>toquen su naricita.</span>
            </h1>
            <p className="day01-lead day04-lead">
              Hoy nos acompana un renito tierno y jugueton. Toquen su nariz y vean como se prende
              con una lucecita navidena, como si estuviera listo para guiar el camino.
            </p>
          </article>

          <div className="day04-scene">
            <p className="day04-subtitle">Toquen la nariz para encenderla.</p>

            <div className="day04-reindeer-wrap">
              <div className="day04-reindeer" aria-hidden="true">
                <div className="day04-antlers">
                  <span className="day04-antler day04-antler-left" />
                  <span className="day04-antler day04-antler-right" />
                </div>

                <div className="day04-ears">
                  <span className="day04-ear day04-ear-left" />
                  <span className="day04-ear day04-ear-right" />
                </div>

                <div className="day04-face">
                  <span className="day04-eye day04-eye-left" />
                  <span className="day04-eye day04-eye-right" />
                  <span className="day04-cheek day04-cheek-left" />
                  <span className="day04-cheek day04-cheek-right" />
                  <span className="day04-muzzle" />
                  <span className="day04-mouth" />
                </div>
              </div>

              <button
                type="button"
                className={`day04-nose${noseLit ? ' is-lit' : ''}`}
                aria-pressed={noseLit}
                aria-label="Encender nariz del renito"
                onPointerDown={() => setNoseLit(true)}
                onPointerUp={() => setNoseLit(false)}
                onPointerLeave={() => setNoseLit(false)}
                onPointerCancel={() => setNoseLit(false)}
                onClick={() => setNoseLit((value) => !value)}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
