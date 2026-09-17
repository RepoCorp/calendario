import { useMemo, useState } from 'react';

const MAGIC_STAGES = [
  {
    shape: 'star',
    title: 'Una estrella',
    text: 'La nieve encantada encontro primero una estrellita para alumbrar el globo.',
  },
  {
    shape: 'tree',
    title: 'Un pino',
    text: 'Ahora el polvo magico se junta para dibujar un arbolito navideno.',
  },
  {
    shape: 'heart',
    title: 'Un corazon',
    text: 'Con otro agite suave, toda la magia se acomoda formando un corazon.',
  },
  {
    shape: 'wish',
    title: 'Un deseo',
    text: 'La ultima forma guarda el secreto: que nunca les falte amor, hogar y maravilla.',
  },
];

function createSnowPieces() {
  return Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: 16 + ((index * 37) % 64),
    top: 18 + ((index * 23) % 56),
    size: 6 + (index % 4) * 2,
    x: `${((index % 5) - 2) * 18}px`,
    y: `${24 + (index % 4) * 20}px`,
    rotate: `${(index % 7) * 42}deg`,
    delay: `${(index % 6) * 40}ms`,
  }));
}

export default function Day15() {
  const [isAwake, setIsAwake] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [burstCount, setBurstCount] = useState(0);

  const currentStage = stageIndex >= 0 ? MAGIC_STAGES[Math.min(stageIndex, MAGIC_STAGES.length - 1)] : null;
  const canShake = stageIndex < MAGIC_STAGES.length - 1;
  const snowPieces = useMemo(() => createSnowPieces(), [burstCount]);

  const wakeGlobe = () => {
    setIsAwake(true);
  };

  const shakeMagic = () => {
    if (!isAwake) {
      setIsAwake(true);
      setStageIndex(0);
      setBurstCount((current) => current + 1);
      return;
    }

    setBurstCount((current) => current + 1);
    setStageIndex((current) => Math.min(current + 1, MAGIC_STAGES.length - 1));
  };

  return (
    <main className="page day15-page">
      <section className="day01-card day15-card">
        <div className="day15-layout">
          <article className="day01-note day15-note">
            <p className="day01-date">Diciembre 15</p>
            <h1 className="day01-title day15-title">
              <span>Un globo encantado,</span>
              <span>agiten su magia.</span>
            </h1>
            <p className="day01-lead day15-lead">
              Primero despierten el globo y luego agiten la nieve magica. Cada remolino junta el
              polvito brillante en una forma nueva y cada forma trae un pedacito de encanto.
            </p>
          </article>

          <div className="day15-scene">
            <p className="day15-subtitle">
              {currentStage ? currentStage.text : 'Toquen la estrella para despertar el globo y luego hagan aparecer la magia.'}
            </p>

            <div className={`day15-globe${isAwake ? ' is-awake' : ''}${burstCount ? ' is-bursting' : ''}`}>
              <button type="button" className="day15-wake-star" onClick={wakeGlobe} aria-label="Despertar el globo magico">
                <span className="day15-wake-star-shape" />
              </button>

              <div className="day15-globe-glass">
                <div className="day15-globe-glow" aria-hidden="true" />
                <div className="day15-snow-floor" aria-hidden="true" />

                {snowPieces.map((piece) => (
                  <span
                    key={`${piece.id}-${burstCount}`}
                    className="day15-snow-piece"
                    style={{
                      left: `${piece.left}%`,
                      top: `${piece.top}%`,
                      width: `${piece.size}px`,
                      height: `${piece.size}px`,
                      '--x': piece.x,
                      '--y': piece.y,
                      '--rotate': piece.rotate,
                      animationDelay: piece.delay,
                    }}
                    aria-hidden="true"
                  />
                ))}

                <div className={`day15-magic-shape day15-magic-shape-${currentStage?.shape ?? 'sleep'}`}>
                  <span className="day15-shape-star" />
                  <span className="day15-shape-tree">
                    <span className="day15-shape-tree-top" />
                    <span className="day15-shape-tree-middle" />
                    <span className="day15-shape-tree-bottom" />
                    <span className="day15-shape-tree-trunk" />
                  </span>
                  <span className="day15-shape-heart" />
                  <span className="day15-shape-wish">
                    <span className="day15-shape-wish-line" />
                    <span className="day15-shape-wish-word">magia</span>
                  </span>
                </div>
              </div>

              <div className="day15-globe-base" aria-hidden="true">
                <span className="day15-globe-base-band" />
              </div>
            </div>

            <div className="day15-actions">
              <button type="button" className="day15-action-button" onClick={shakeMagic} disabled={!canShake && stageIndex >= 0}>
                {stageIndex < 0 ? 'Agitar por primera vez' : canShake ? 'Agitar la nieve magica' : 'Toda la magia despierta'}
              </button>
              {currentStage ? <p className="day15-stage-label">{currentStage.title}</p> : <p className="day15-stage-label">Dormidito</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
