import { useEffect, useRef, useState } from 'react';

const DECORATIONS = [
  { type: 'gumdrop-red', label: 'Gomita roja' },
  { type: 'gumdrop-green', label: 'Gomita verde' },
  { type: 'peppermint', label: 'Menta' },
  { type: 'icing-star', label: 'Estrellita' },
  { type: 'icing-dot', label: 'Glaseado' },
  { type: 'bow', label: 'Moño' },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Day06() {
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [placedDecorations, setPlacedDecorations] = useState([]);
  const [dragPreview, setDragPreview] = useState(null);

  useEffect(() => {
    const updatePreview = (clientX, clientY) => {
      if (!dragRef.current) return;

      const sceneRect = sceneRef.current?.getBoundingClientRect();
      if (!sceneRect) return;

      setDragPreview((current) =>
        current
          ? {
              ...current,
              x: clientX - sceneRect.left,
              y: clientY - sceneRect.top,
            }
          : current
      );
    };

    const handlePointerMove = (event) => {
      updatePreview(event.clientX, event.clientY);
    };

    const finishDrag = (clientX, clientY) => {
      const dragData = dragRef.current;
      if (!dragData) return;

      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) {
        dragRef.current = null;
        setDragPreview(null);
        return;
      }

      const insideCookie =
        clientX >= stageRect.left &&
        clientX <= stageRect.right &&
        clientY >= stageRect.top &&
        clientY <= stageRect.bottom;

      if (insideCookie) {
        const xPercent = ((clientX - stageRect.left) / stageRect.width) * 100;
        const yPercent = ((clientY - stageRect.top) / stageRect.height) * 100;
        const nextDecoration = {
          id: dragData.id ?? createId(),
          type: dragData.type,
          xPercent,
          yPercent,
        };

        setPlacedDecorations((current) => {
          if (dragData.mode === 'move') {
            return current.map((item) => (item.id === nextDecoration.id ? nextDecoration : item));
          }

          return [...current, nextDecoration];
        });
      } else if (dragData.mode === 'move') {
        setPlacedDecorations((current) => current);
      }

      dragRef.current = null;
      setDragPreview(null);
    };

    const handlePointerUp = (event) => {
      finishDrag(event.clientX, event.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const beginPaletteDrag = (type, event) => {
    event.preventDefault();
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    if (!sceneRect) return;

    dragRef.current = { mode: 'create', type, id: null };
    setDragPreview({
      type,
      x: event.clientX - sceneRect.left,
      y: event.clientY - sceneRect.top,
    });
  };

  const beginPlacedDrag = (decoration, event) => {
    event.preventDefault();
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    if (!sceneRect) return;

    dragRef.current = { mode: 'move', type: decoration.type, id: decoration.id };
    setPlacedDecorations((current) => current.filter((item) => item.id !== decoration.id));
    setDragPreview({
      type: decoration.type,
      x: event.clientX - sceneRect.left,
      y: event.clientY - sceneRect.top,
    });
  };

  return (
    <main className="page day06-page">
      <section className="day01-card day06-card">
        <div className="day06-layout">
          <article className="day01-note day06-note">
            <p className="day01-date">Diciembre 6</p>
            <h1 className="day01-title day06-title">
              <span>Una galletita de jengibre,</span>
              <span>decorenla juntos.</span>
            </h1>
            <p className="day01-lead day06-lead">
              Arrastren dulcitos y glaseado para vestir a este panecito navideno. Hagan su mejor
              creacion, mezclen colores y llenen la cocina de detalles ricos y divertidos.
            </p>
          </article>

          <div className="day06-scene" ref={sceneRef}>
            <p className="day06-subtitle">Arrastra los dulces hasta la galletita.</p>

            <div className="day06-cookie-stage" ref={stageRef}>
              <div className="day06-cookie">
                <img
                  className="day06-cookie-image"
                  src="/gingerbread-cookie.png"
                  alt="Galletita de jengibre"
                  draggable="false"
                />
              </div>

              {placedDecorations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`day06-decoration day06-decoration-${item.type}`}
                  style={{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }}
                  onPointerDown={(event) => beginPlacedDrag(item, event)}
                  aria-label={`Mover ${item.type}`}
                />
              ))}

              {dragPreview ? (
                <div
                  className={`day06-decoration day06-decoration-preview day06-decoration-${dragPreview.type}`}
                  style={{ left: dragPreview.x, top: dragPreview.y }}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <div className="day06-tray" role="list" aria-label="Decoraciones">
              {DECORATIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="day06-tray-item"
                  onPointerDown={(event) => beginPaletteDrag(item.type, event)}
                  aria-label={`Arrastrar ${item.label}`}
                >
                  <span className={`day06-decoration day06-decoration-static day06-decoration-${item.type}`} />
                  <span className="day06-tray-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
