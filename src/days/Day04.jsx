import { useEffect, useRef, useState } from 'react';
import '../components/Day04Reveal.css';

const FADE_MS = 5000;
const BACKGROUND_DELAY_MS = 2000;
const REVEAL_MS = BACKGROUND_DELAY_MS + FADE_MS;

const fadeAt = (elapsedMs) => {
  const fraction = Math.max(0, Math.min(1, elapsedMs / FADE_MS));
  return fraction * fraction * (3 - 2 * fraction);
};

export default function Day04() {
  const [progress, setProgress] = useState(0);
  const [noseLit, setNoseLit] = useState(false);
  const elapsed = useRef(0);
  const complete = progress === 1;
  // One clock gives Rodolfo a head start without delaying his own five-second fade.
  const elapsedMs = progress * REVEAL_MS;
  const portraitIllumination = noseLit ? fadeAt(elapsedMs) : 0;
  const illumination = noseLit ? fadeAt(elapsedMs - BACKGROUND_DELAY_MS) : 0;

  useEffect(() => {
    if (!noseLit || complete) return;
    let frame;
    let previous = performance.now();
    const tick = (now) => {
      elapsed.current = Math.min(REVEAL_MS, elapsed.current + now - previous);
      previous = now;
      setProgress(elapsed.current / REVEAL_MS);
      if (elapsed.current < REVEAL_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Do not count time spent in a hidden tab toward the reveal.
    const resetClock = () => { previous = performance.now(); };
    document.addEventListener('visibilitychange', resetClock);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resetClock);
    };
  }, [noseLit, complete]);

  return (
    <main className="page day04-page day04-reveal" style={{
      '--illumination': illumination,
      '--portrait-illumination': portraitIllumination,
    }}>
      <div className="day04-background-reveal" aria-hidden="true" />
      <section className="day04-composition">
        <p className="day01-date day04-date">Diciembre 4</p>
        <article className="day01-note day04-message"
          style={{ visibility: noseLit ? 'visible' : 'hidden' }}>
          <div className="day04-message-words" aria-hidden={!complete || !noseLit}>
            <h1 className="day01-title day04-title"><span>El Rodolfo.</span></h1>
            <p className="day01-lead day04-lead">
              Ya van 4 dias!! Como corre el tiempo. Y no vuelve, así que hay que aprovecharlo. Tienen todo lo necesario para vivir
                muy felices y satisfechos, y si lo aprovechan! Que orgullo.
            </p>
          </div>
        </article>
        <div className="day04-portrait-space">
          <div className="day04-reindeer-wrap">
            <img className="day04-reindeer-art" src="/images/day04-reindeer-portrait.png"
              alt="Rodolfo con gorro de Navidad" draggable="false" />
            <div className="day04-lit-portrait" aria-hidden="true">
              <img className="day04-reindeer-art day04-lit-art" src="/images/day04-reindeer-lit-transparent-halo.png"
                alt="" draggable="false" />
            </div>
            <button type="button" className="day04-nose"
              aria-label={noseLit ? 'Apagar la nariz del renito' : 'Encender la nariz del renito'}
              aria-pressed={noseLit}
              onClick={() => {
                if (noseLit) {
                  elapsed.current = 0;
                  setProgress(0);
                }
                setNoseLit((lit) => !lit);
              }}
              onKeyDown={(event) => {
                if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
              }}
              onContextMenu={(event) => event.preventDefault()}

            />
          </div>
        </div>
      </section>
    </main>
  );
}
