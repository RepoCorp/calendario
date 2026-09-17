import { useState } from 'react';

const DECORATIONS = [
  { id: 'red', label: 'bola roja', symbol: '●', className: 'is-red' },
  { id: 'gold', label: 'bola dorada', symbol: '●', className: 'is-gold' },
  { id: 'candy', label: 'baston', symbol: 'J', className: 'is-candy' },
  { id: 'blue', label: 'bola azul', symbol: '●', className: 'is-blue' },
  { id: 'bow', label: 'moño', symbol: '♢', className: 'is-bow' },
  { id: 'bell', label: 'campana', symbol: '♧', className: 'is-bell' },
  { id: 'heart', label: 'corazon', symbol: '♥', className: 'is-heart' },
];

const BRANCH_SPOTS = [
  { id: 'top-left', x: 36, y: 24 },
  { id: 'top-right', x: 62, y: 31 },
  { id: 'middle-left', x: 25, y: 48 },
  { id: 'middle', x: 49, y: 51 },
  { id: 'middle-right', x: 73, y: 53 },
  { id: 'bottom-left', x: 35, y: 73 },
  { id: 'bottom-right', x: 65, y: 76 },
];

const getDecoration = (id) => DECORATIONS.find((decoration) => decoration.id === id);

export default function Day17() {
  const [selectedId, setSelectedId] = useState('red');
  const [placed, setPlaced] = useState({});
  const [lightsOn, setLightsOn] = useState(false);
  const [message, setMessage] = useState('Elijan un adorno de la bandeja y toquen una ramita del pino.');
  const usedDecorations = Object.values(placed);
  const isComplete = usedDecorations.length === DECORATIONS.length;

  const placeDecoration = (spotId) => {
    if (lightsOn) return;

    if (placed[spotId]) {
      const pickedUp = placed[spotId];
      setPlaced((current) => {
        const next = { ...current };
        delete next[spotId];
        return next;
      });
      setSelectedId(pickedUp);
      setMessage('Ese adorno esta en su mano. Elijan otra ramita para ponerlo.');
      return;
    }

    if (!selectedId) return;
    const nextPlaced = { ...placed, [spotId]: selectedId };
    const nextDecoration = DECORATIONS.find(
      (decoration) => !Object.values(nextPlaced).includes(decoration.id),
    );

    setPlaced(nextPlaced);
    setSelectedId(nextDecoration?.id ?? null);
    setMessage(
      nextDecoration
        ? 'Que bonito. Elijan el siguiente adorno.'
        : 'El pino esta precioso. Ya pueden encender sus luces.',
    );
  };

  const turnOnLights = () => {
    if (!isComplete) return;
    setLightsOn(true);
    setMessage('El pino ya esta brillando. Feliz Navidad.');
  };

  const startAgain = () => {
    setPlaced({});
    setSelectedId('red');
    setLightsOn(false);
    setMessage('Un arbol nuevo para decorar. Elijan el primer adorno.');
  };

  return (
    <main className="page day17-page">
      <section className="day01-card day17-card">
        <div className="day17-layout">
          <article className="day01-note day17-note">
            <p className="day01-date">Diciembre 17</p>
            <h1 className="day01-title day17-title">
              <span>Decoremos el</span>
              <span>pino de Navidad.</span>
            </h1>
            <p className="day01-lead day17-lead">
              El pino esta esperando sus adornos. Pongan cada uno en una ramita y, cuando este
              listo, prendamos las luces juntos.
            </p>
          </article>

          <div className="day17-scene">
            <p className="day17-subtitle" aria-live="polite">{message}</p>

            <div className={`day17-tree-stage${lightsOn ? ' is-lit' : ''}`}>
              <div className="day17-sky-stars" aria-hidden="true" />
              <div className="day17-tree-shadow" aria-hidden="true" />
              <div className="day17-tree" aria-label="Pino de Navidad">
                <span className="day17-tree-star">★</span>
                <span className="day17-tree-layer day17-tree-layer-top" />
                <span className="day17-tree-layer day17-tree-layer-middle" />
                <span className="day17-tree-layer day17-tree-layer-bottom" />
                <span className="day17-tree-trunk" />
                <span className="day17-light-strand day17-light-strand-one" />
                <span className="day17-light-strand day17-light-strand-two" />
              </div>

              {BRANCH_SPOTS.map((spot) => {
                const decoration = getDecoration(placed[spot.id]);
                return (
                  <button
                    key={spot.id}
                    type="button"
                    className={`day17-branch-spot${decoration ? ' has-decoration' : ''}`}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    aria-label={decoration ? `Mover ${decoration.label}` : 'Poner un adorno aqui'}
                    onClick={() => placeDecoration(spot.id)}
                  >
                    {decoration && (
                      <span className={`day17-decoration ${decoration.className}`} aria-hidden="true">
                        {decoration.symbol}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="day17-tray" aria-label="Adornos">
              {DECORATIONS.map((decoration) => {
                const isUsed = usedDecorations.includes(decoration.id);
                return (
                  <button
                    key={decoration.id}
                    type="button"
                    className={`day17-tray-item ${decoration.className}${selectedId === decoration.id ? ' is-selected' : ''}`}
                    disabled={isUsed || lightsOn}
                    aria-label={`Elegir ${decoration.label}`}
                    onClick={() => {
                      setSelectedId(decoration.id);
                      setMessage(`Tienen ${decoration.label} en la mano. Toquen una ramita.`);
                    }}
                  >
                    {decoration.symbol}
                  </button>
                );
              })}
            </div>

            {lightsOn ? (
              <button type="button" className="day17-light-button" onClick={startAgain}>
                Decorar otro pino
              </button>
            ) : (
              <button type="button" className="day17-light-button" disabled={!isComplete} onClick={turnOnLights}>
                Encender las luces
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
