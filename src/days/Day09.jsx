import { useCallback, useState } from 'react';
import CocoaGame from '../components/CocoaGame';
import CocoaSteam from '../components/CocoaSteam';
import '../components/Day09Layout.css';

export default function Day09() {
  const [stats, setStats] = useState({ elapsed: 0, spill: 0 });
  const updateStats = useCallback(next => setStats(next), []);
  const seconds = stats.elapsed;
  const revealed = seconds >= 20;
  const spill = Math.min(100, stats.spill);
  const revealProgress = revealed ? 1 : spill >= 99.999 ? 0 : Math.min(1, seconds / 20);

  return (
    <main className="page day09-page">
      <section className="day01-card day09-card">
        <div className="day09-layout">
          <p className="day01-date day09-date">Diciembre 9</p>
          <article className={`day01-note day09-note${revealed ? ' is-revealed' : ''}`} aria-hidden={!revealed}>
            <h1 className="day01-title day09-title">
              <span>Chocolate calientito,</span>
              <span>que no se derrame.</span>
            </h1>
            <CocoaSteam progress={revealProgress} />
          </article>

          <div className="day09-scene">
            <span className="day09-time" aria-label={`Tiempo: ${seconds.toFixed(1)} segundos`}>{seconds.toFixed(1)} s</span>

            <div className="day09-cup-scene">
              <CocoaGame onStats={updateStats} />
            </div>

            <div className="day09-meter-block">
              <div className="day09-meter-labels">
                <span>Derrame</span>
                <span>{Math.round(spill)}%</span>
              </div>
              <div className="day09-meter-track" role="meter" aria-label="Derrame" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(spill)}>
                <div className="day09-meter-fill" style={{ transform: `scaleX(${spill / 100})` }} />
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
