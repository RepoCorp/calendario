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
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const icingStrokeRef = useRef(null);
  const [placedDecorations, setPlacedDecorations] = useState([]);
  const [dragPreview, setDragPreview] = useState(null);
  const [draggingDecorationId, setDraggingDecorationId] = useState(null);
  const [icingMode, setIcingMode] = useState(false);
  const [icingStrokes, setIcingStrokes] = useState([]);

  useEffect(() => {
    const updatePreview = (clientX, clientY) => {
      if (!dragRef.current) return;

      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      setDragPreview((current) =>
        current
          ? {
              ...current,
              x: clientX - stageRect.left,
              y: clientY - stageRect.top,
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
        setDraggingDecorationId(null);
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
      setDraggingDecorationId(null);
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
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    dragRef.current = { mode: 'create', type, id: null };
    setDraggingDecorationId(null);
    setDragPreview({
      type,
      x: event.clientX - stageRect.left,
      y: event.clientY - stageRect.top,
    });
  };

  const beginPlacedDrag = (decoration, event) => {
    event.preventDefault();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    dragRef.current = { mode: 'move', type: decoration.type, id: decoration.id };
    setDraggingDecorationId(decoration.id);
    setDragPreview({
      type: decoration.type,
      x: event.clientX - stageRect.left,
      y: event.clientY - stageRect.top,
    });
  };

  const pointFromEvent = (event) => {
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return null;

    return {
      x: ((event.clientX - stageRect.left) / stageRect.width) * 100,
      y: ((event.clientY - stageRect.top) / stageRect.height) * 100,
    };
  };

  const beginIcing = (event) => {
    if (!icingMode || dragRef.current) return;

    const point = pointFromEvent(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = { id: createId(), points: [point] };
    icingStrokeRef.current = stroke;
    setIcingStrokes((current) => [...current, stroke]);
  };

  const drawIcing = (event) => {
    const stroke = icingStrokeRef.current;
    if (!stroke) return;

    const point = pointFromEvent(event);
    if (!point) return;

    event.preventDefault();
    stroke.points.push(point);
    setIcingStrokes((current) =>
      current.map((item) => (item.id === stroke.id ? { ...stroke, points: [...stroke.points] } : item))
    );
  };

  const finishIcing = (event) => {
    if (!icingStrokeRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    icingStrokeRef.current = null;
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

          <div className="day06-scene">
            <p className="day06-subtitle">Arrastra los dulces hasta la galletita.</p>

            <div
              className={`day06-cookie-stage${icingMode ? ' is-icing' : ''}`}
              ref={stageRef}
              onPointerDown={beginIcing}
              onPointerMove={drawIcing}
              onPointerUp={finishIcing}
              onPointerCancel={finishIcing}
            >
              <div className="day06-cookie">
                <img
                  className="day06-cookie-image"
                  src="/gingerbread-cookie.png"
                  alt="Galletita de jengibre"
                  draggable="false"
                />
              </div>

              {placedDecorations.map((item) => (
                item.id === draggingDecorationId ? null : (
                  <button
                    key={item.id}
                    type="button"
                    className={`day06-decoration day06-decoration-${item.type}`}
                    style={{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }}
                    onPointerDown={(event) => beginPlacedDrag(item, event)}
                    aria-label={`Mover ${item.type}`}
                  />
                )
              ))}

              {dragPreview ? (
                <div
                  className={`day06-decoration day06-decoration-preview day06-decoration-${dragPreview.type}`}
                  style={{ left: dragPreview.x, top: dragPreview.y }}
                  aria-hidden="true"
                />
              ) : null}

              <svg
                className="day06-icing-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {icingStrokes.map((stroke) => (
                  <polyline
                    key={stroke.id}
                    points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  />
                ))}
              </svg>
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

            <button
              type="button"
              className={`day06-icing-button${icingMode ? ' is-active' : ''}`}
              onClick={() => setIcingMode((current) => !current)}
              aria-pressed={icingMode}
            >
              {icingMode ? 'Listo: vuelve a decorar' : 'Pinta con glaseado'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
