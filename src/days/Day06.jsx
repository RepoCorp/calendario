import { useEffect, useRef, useState } from 'react';
import '../components/Day06Layout.css';

const DECORATIONS = [
  { type: 'gumdrop-red', label: 'Gomita roja' },
  { type: 'gumdrop-green', label: 'Gomita verde' },
  { type: 'peppermint', label: 'Menta' },
  { type: 'icing-star', label: 'Estrellita' },
  { type: 'icing-dot', label: 'Glaseado' },
  { type: 'snowflake', label: 'Copo de nieve' },
];

const DRAG_LIFT_PX = 52;
const ICING_COLORS = [
  { color: '#fff7df', label: 'Blanco' },
  { color: '#d93648', label: 'Rojo' },
  { color: '#37965a', label: 'Verde' },
  { color: '#191919', label: 'Negro' },
];
const MESSAGE_DECORATIONS = 5;
const MESSAGE_OPACITY = [0, 0.015, 0.03, 0.05, 0.08, 1];

function icingShade(color, target, amount) {
  const channels = [1, 3, 5].map(offset => {
    const from = parseInt(color.slice(offset, offset + 2), 16);
    const to = parseInt(target.slice(offset, offset + 2), 16);
    return Math.round(from + (to - from) * amount);
  });
  return `rgb(${channels.join(',')})`;
}

const ICING_MATERIALS = Object.fromEntries(ICING_COLORS.map(({ color }) => [color, {
  base: color === '#fff7df' ? '#d9c9ae' : icingShade(color, '#20150e', 0.22),
  shoulder: color === '#fff7df' ? '#eee3cd' : icingShade(color, '#20150e', 0.08),
  body: color,
}]));

function decorationPositionFromPointer(clientX, clientY, stageRect) {
  return {
    x: clientX - stageRect.left,
    y: clientY - stageRect.top - DRAG_LIFT_PX,
  };
}

function liftStartFromSweet(sweet, event) {
  const rect = sweet.getBoundingClientRect();
  return {
    liftStartX: rect.left + rect.width / 2 - event.clientX,
    liftStartY: rect.top + rect.height / 2 - event.clientY + DRAG_LIFT_PX,
  };
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pointInsideRect(x, y, rect) {
  return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

export default function Day06() {
  const stageRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const trashTargetRef = useRef(null);
  const dragRef = useRef(null);
  const icingStrokeRef = useRef(null);
  const [placedDecorations, setPlacedDecorations] = useState([]);
  const [revealCount, setRevealCount] = useState(0);
  const [dragPreview, setDragPreview] = useState(null);
  const [draggingDecorationId, setDraggingDecorationId] = useState(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [icingTool, setIcingTool] = useState(null);
  const [icingColor, setIcingColor] = useState(ICING_COLORS[0].color);
  const [icingPaletteOpen, setIcingPaletteOpen] = useState(false);
  const [pencilTip, setPencilTip] = useState({ x: 50, y: 35 });
  const [pencilMoveOnly, setPencilMoveOnly] = useState(true);
  const [icingStrokes, setIcingStrokes] = useState([]);
  const showTrash = dragPreview !== null && draggingDecorationId !== null;

  useEffect(() => {
    const updatePreview = (clientX, clientY) => {
      if (!dragRef.current) return;

      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      setDragPreview((current) =>
        current
          ? {
              ...current,
              ...decorationPositionFromPointer(clientX, clientY, stageRect),
            }
          : current
      );
    };

    const handlePointerMove = (event) => {
      updatePreview(event.clientX, event.clientY);
    };

    const clearDrag = () => {
      dragRef.current = null;
      setDragPreview(null);
      setDraggingDecorationId(null);
      setIsOverTrash(false);
    };

    const finishDrag = (clientX, clientY) => {
      const dragData = dragRef.current;
      if (!dragData) return;

      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) {
        clearDrag();
        return;
      }

      // Keep the drop at the rendered center, even when released partway through the lift.
      const previewRect = dragPreviewRef.current?.getBoundingClientRect();
      const { x, y } = previewRect
        ? {
            x: previewRect.left + previewRect.width / 2 - stageRect.left,
            y: previewRect.top + previewRect.height / 2 - stageRect.top,
          }
        : decorationPositionFromPointer(clientX, clientY, stageRect);

      if (
        dragData.mode === 'move' &&
        pointInsideRect(x + stageRect.left, y + stageRect.top, trashTargetRef.current?.getBoundingClientRect())
      ) {
        setPlacedDecorations((current) => current.filter((item) => item.id !== dragData.id));
        clearDrag();
        return;
      }

      const insideCookie =
        x >= 0 && x <= stageRect.width && y >= 0 && y <= stageRect.height;

      if (insideCookie) {
        const xPercent = (x / stageRect.width) * 100;
        const yPercent = (y / stageRect.height) * 100;
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
        if (dragData.mode === 'create') {
          setRevealCount(count => Math.min(MESSAGE_DECORATIONS, count + 1));
        }
      } else if (dragData.mode === 'move') {
        setPlacedDecorations((current) => current);
      }

      clearDrag();
    };

    const handlePointerUp = (event) => {
      finishDrag(event.clientX, event.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearDrag);
    };
  }, []);

  useEffect(() => {
    if (!showTrash) return undefined;

    let frameId;
    const updateTrashFeedback = () => {
      const previewRect = dragPreviewRef.current?.getBoundingClientRect();
      const trashRect = trashTargetRef.current?.getBoundingClientRect();
      // The lift can still move the sweet after the pointer stops.
      setIsOverTrash(Boolean(previewRect && pointInsideRect(
        previewRect.left + previewRect.width / 2,
        previewRect.top + previewRect.height / 2,
        trashRect
      )));
      frameId = window.requestAnimationFrame(updateTrashFeedback);
    };
    frameId = window.requestAnimationFrame(updateTrashFeedback);

    return () => window.cancelAnimationFrame(frameId);
  }, [showTrash]);

  const beginPaletteDrag = (type, event) => {
    event.preventDefault();
    setIcingTool(null);
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    dragRef.current = { mode: 'create', type, id: null };
    setDraggingDecorationId(null);
    setDragPreview({
      type,
      ...decorationPositionFromPointer(event.clientX, event.clientY, stageRect),
      ...liftStartFromSweet(event.currentTarget.querySelector('.day06-decoration-static'), event),
    });
  };

  const beginPlacedDrag = (decoration, event) => {
    if (icingTool) return;
    event.preventDefault();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    dragRef.current = { mode: 'move', type: decoration.type, id: decoration.id };
    setDraggingDecorationId(decoration.id);
    setDragPreview({
      type: decoration.type,
      ...decorationPositionFromPointer(event.clientX, event.clientY, stageRect),
      ...liftStartFromSweet(event.currentTarget, event),
    });
  };

  const pointFromEvent = (event, offset = { x: 0, y: 0 }) => {
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return null;

    return {
      x: ((event.clientX - stageRect.left + offset.x) / stageRect.width) * 100,
      y: ((event.clientY - stageRect.top + offset.y) / stageRect.height) * 100,
    };
  };

  const beginIcing = (event) => {
    if (!icingTool || dragRef.current || icingStrokeRef.current || !event.isPrimary || event.button !== 0) return;

    let offset = { x: 0, y: 0 };
    if (icingTool === 'draw') {
      // Only the pencil starts a paint/move gesture. A near miss must never
      // relocate its tip or leave an unintended stroke on the cookie.
      if (!event.target.closest('[data-icing-pencil]')) return;
      const rect = stageRef.current.getBoundingClientRect();
      // Keep the exact grab point when picking up the pencil again.
      offset = {
        x: rect.left + pencilTip.x * rect.width / 100 - event.clientX,
        y: rect.top + pencilTip.y * rect.height / 100 - event.clientY,
      };
    }
    const point = pointFromEvent(event, offset);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (icingTool === 'draw') {
      setPencilTip(point);
      setIcingPaletteOpen(false);
    }
    const stroke = { id: createId(), tool: icingTool, moveOnly: icingTool === 'draw' && pencilMoveOnly, started: icingTool === 'erase', color: icingColor, pointerId: event.pointerId, offset, points: [point] };
    icingStrokeRef.current = stroke;
    if (stroke.started && !stroke.moveOnly) setIcingStrokes((current) => [...current, stroke]);
  };

  const drawIcing = (event) => {
    const stroke = icingStrokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;

    const point = pointFromEvent(event, stroke.offset);
    if (!point) return;

    event.preventDefault();
    if (stroke.tool === 'draw') setPencilTip(point);
    if (stroke.moveOnly) return;
    if (!stroke.started) {
      const rect = stageRef.current.getBoundingClientRect();
      const first = stroke.points[0];
      if (Math.hypot((point.x - first.x) * rect.width / 100, (point.y - first.y) * rect.height / 100) < 2) return;
      stroke.started = true;
      stroke.points.push(point);
      setIcingStrokes(current => [...current, { ...stroke, points: [...stroke.points] }]);
      return;
    }
    stroke.points.push(point);
    setIcingStrokes((current) =>
      current.map((item) => (item.id === stroke.id ? { ...stroke, points: [...stroke.points] } : item))
    );
  };

  const finishIcing = (event) => {
    const stroke = icingStrokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;

    icingStrokeRef.current = null;
    if (event.type !== 'pointerup') {
      setIcingStrokes(current => current.filter(item => item.id !== stroke.id));
    }
    if (
      event.type === 'pointerup' &&
      stroke.tool === 'draw' &&
      !stroke.moveOnly &&
      stroke.points.some(point => point.x !== stroke.points[0].x || point.y !== stroke.points[0].y)
    ) {
      setRevealCount(count => Math.min(MESSAGE_DECORATIONS, count + 1));
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <main className="page day06-page">
      <section className="day01-card day06-card">
        <div className="day06-layout">
          <p className="day01-date day06-date">Diciembre 6</p>
          <article className="day01-note day06-note"
            style={{ '--message-opacity': MESSAGE_OPACITY[revealCount], '--message-blur': revealCount < MESSAGE_DECORATIONS ? '5px' : '0px' }}
            aria-hidden={revealCount < MESSAGE_DECORATIONS}>
            <h1 className="day01-title day06-title">
              <span>Una galletita de jengibre.</span>
            </h1>
            <p className="day01-lead day06-lead">
              Llenen la cocina de detalles ricos y divertidos.
            </p>
          </article>

          <div className="day06-scene"
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}>
            <div className="day06-cookie-space">
            <div
              className={`day06-cookie-stage${icingTool ? ' is-icing' : ''}`}
              ref={stageRef}
              onPointerDown={beginIcing}
              onPointerMove={drawIcing}
              onPointerUp={finishIcing}
              onPointerCancel={finishIcing}
              onLostPointerCapture={finishIcing}
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
                  ref={dragPreviewRef}
                  className={`day06-decoration day06-decoration-preview day06-decoration-${dragPreview.type}`}
                  style={{
                    left: dragPreview.x,
                    top: dragPreview.y,
                    '--day06-lift-start-x': `${dragPreview.liftStartX}px`,
                    '--day06-lift-start-y': `${dragPreview.liftStartY}px`,
                  }}
                  aria-hidden="true"
                />
              ) : null}

              <svg
                className="day06-icing-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {icingStrokes.map((stroke, index) => {
                  if (stroke.tool === 'erase') return null;
                  // Only later eraser strokes affect this icing, so drawing again
                  // can cover an area that was previously erased.
                  const erasers = icingStrokes.slice(index + 1).filter(item => item.tool === 'erase');
                  const maskId = `day06-erase-${stroke.id}`;
                  const points = stroke.points.map(point => `${point.x},${point.y}`).join(' ');
                  const material = ICING_MATERIALS[stroke.color] || ICING_MATERIALS['#fff7df'];
                  return (
                    <g key={stroke.id}>
                      {erasers.length > 0 && (
                        <defs>
                          <mask id={maskId} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120" style={{ maskType: 'luminance' }}>
                            <rect x="-10" y="-10" width="120" height="120" fill="white" />
                            {erasers.map(eraser => (
                              <g key={eraser.id} fill="black" stroke="black" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx={eraser.points[0].x} cy={eraser.points[0].y} r="4" stroke="none" />
                                <path fill="none" d={eraser.points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} />
                              </g>
                            ))}
                          </mask>
                        </defs>
                      )}
                      <g mask={erasers.length > 0 ? `url(#${maskId})` : undefined}>
                        {/* Nested, gently offset strokes round the bead without
                            relying on Safari's masked SVG shadow/blur filters.
                            Keep the original 2.2-wide footprint and contact shadow. */}
                        <polyline points={points} transform="translate(0 0.4)" style={{ stroke: '#824924', strokeWidth: 2.5, opacity: 0.32 }} />
                        <polyline points={points} style={{ stroke: material.base, strokeWidth: 2.2 }} />
                        <polyline points={points} transform="translate(-0.035 -0.055)" style={{ stroke: material.shoulder, strokeWidth: 2.02 }} />
                        <polyline points={points} transform="translate(-0.08 -0.12)" style={{ stroke: material.body, strokeWidth: 1.76 }} />
                        {/* Broad, low-opacity highlights overlap to feather into
                            the creamy body instead of drawing a bright stripe. */}
                        <polyline points={points} transform="translate(-0.13 -0.2)" style={{ stroke: '#fffef7', strokeWidth: 1.42, opacity: 0.1 }} />
                        <polyline points={points} transform="translate(-0.17 -0.25)" style={{ stroke: '#fffef7', strokeWidth: 1.08, opacity: 0.12 }} />
                        <polyline points={points} transform="translate(-0.19 -0.28)" style={{ stroke: '#ffffff', strokeWidth: 0.7, opacity: 0.09 }} />
                      </g>
                    </g>
                  );
                })}
              </svg>
              {icingTool === 'draw' && (
                <div className="day06-pencil" style={{ left: `${pencilTip.x}%`, top: `${pencilTip.y}%` }}>
                  <svg viewBox="0 0 64 100" aria-hidden="true">
                    <path d="M0 0 6 27 22 19Z" fill="#d9ad75" />
                    <path d="M0 0 2 10 8 7Z" fill={icingColor} />
                    <path d="m6 27 16-8 32 64-16 8Z" fill={icingColor} />
                    <path d="m6 27 5-2 32 64-5 2Z" fill="#000" opacity=".18" />
                    <path d="m17 22 5-3 32 64-5 3Z" fill="#fff" opacity=".3" />
                    <path d="m38 91 16-8 3 6q2 4-2 6l-8 4q-4 2-6-2Z" fill="#c7a56d" />
                    <path d="m39 92 16-8" stroke="#f3dfae" strokeWidth="2" />
                  </svg>
                  <button type="button" data-icing-pencil className="day06-pencil-grip" aria-label="Lápiz de glaseado" />
                </div>
              )}
            </div>

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
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`day06-icing-button${icingTool === 'draw' ? ' is-active' : ''}`}
              onClick={() => {
                if (icingTool === 'draw' && icingPaletteOpen) {
                  setIcingTool(null);
                  setIcingPaletteOpen(false);
                } else {
                  if (icingTool !== 'draw') setPencilMoveOnly(true);
                  setIcingTool('draw');
                  setIcingPaletteOpen(true);
                }
              }}
              aria-pressed={icingTool === 'draw'}
              aria-label="Pintar con glaseado"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m7 15 3 3 10-9-5-5-8 11Z M7 15l-2 5 5-2 M15 4l2-2 5 5-2 2 M3 22c4 0 4-2 8-2" />
              </svg>
            </button>

            <button
              type="button"
              className={`day06-icing-button day06-eraser-button${icingTool === 'erase' ? ' is-active' : ''}`}
              onClick={() => setIcingTool(current => current === 'erase' ? null : 'erase')}
              aria-pressed={icingTool === 'erase'}
              aria-label="Borrar glaseado"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m14 3 7 7-11 11H6l-4-4L14 3Z M7 11l7 7 M10 21h11" />
              </svg>
            </button>

            {icingTool === 'draw' && (
              <button
                type="button"
                className={`day06-icing-button day06-pencil-move-button${pencilMoveOnly ? ' is-active' : ''}`}
                aria-label="Mover lápiz sin pintar"
                aria-pressed={pencilMoveOnly}
                onClick={() => {
                  setPencilMoveOnly(current => !current);
                  setIcingPaletteOpen(false);
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
                </svg>
              </button>
            )}

            {icingTool === 'draw' && icingPaletteOpen && (
              <div className="day06-icing-colors" role="group" aria-label="Color del glaseado">
                {ICING_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    className="day06-icing-color"
                    style={{ '--icing-color': color }}
                    aria-label={label}
                    aria-pressed={icingColor === color}
                    onClick={() => {
                      setIcingColor(color);
                      setIcingPaletteOpen(false);
                    }}
                  >
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {showTrash ? (
              <div
                ref={trashTargetRef}
                className={`day06-trash-target${isOverTrash ? ' is-over' : ''}`}
                role="status"
                aria-atomic="true"
                aria-label={isOverTrash ? 'Quitar dulce al soltar' : 'Quitar dulce'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                </svg>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
