import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '../components/Day10Layout.css';

const INITIAL_LANTERN = { x: 52, y: 90 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function Day10() {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const artworkRef = useRef(null);
  const swingRef = useRef({ angle: 0, velocity: 0, handVelocity: 0, frame: 0, time: 0, x: 0 });
  const lanternRef = useRef(INITIAL_LANTERN);
  const [lantern, setLantern] = useState(INITIAL_LANTERN);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => () => cancelAnimationFrame(swingRef.current.frame), []);

  const animateSwing = (time) => {
    const swing = swingRef.current;
    const stage = stageRef.current;
    const artwork = artworkRef.current;
    if (!stage || !artwork) return;
    const dt = clamp((time - swing.time) / 1000, 0.001, 0.032);
    const x = lanternRef.current.x * stage.clientWidth / 100;
    const handVelocity = swing.handVelocity + (clamp((x - swing.x) / dt, -1200, 1200) - swing.handVelocity) * (1 - Math.exp(-20 * dt));
    // A moving handle gives the hanging body an inertial kick. Reversing or
    // stopping the hand drives the opposite response; gravity restores upright.
    const length = artwork.offsetHeight * 0.55;
    swing.velocity += (handVelocity - swing.handVelocity) * 0.45 / Math.max(60, length);
    swing.velocity += (-42 * Math.sin(swing.angle) - 4.8 * swing.velocity) * dt;
    swing.velocity = clamp(swing.velocity, -3.5, 3.5);
    swing.angle += swing.velocity * dt;
    const limit = 22 * Math.PI / 180;
    if (Math.abs(swing.angle) > limit) {
      swing.angle = clamp(swing.angle, -limit, limit);
      if (swing.angle * swing.velocity > 0) swing.velocity = 0;
    }
    swing.handVelocity = handVelocity;
    swing.x = x;
    swing.time = time;
    const settled = !dragRef.current && Math.abs(swing.angle) < 0.001
      && Math.abs(swing.velocity) < 0.004 && Math.abs(handVelocity) < 0.3;
    if (settled) {
      swing.angle = 0;
      swing.velocity = 0;
      swing.handVelocity = 0;
    }
    artwork.style.setProperty('--lantern-swing', `${swing.angle}rad`);
    // The light follows the candle as the image rotates around its handle.
    const dx = -artwork.offsetWidth * 0.01;
    stage.style.setProperty('--lantern-light-offset-x', `${dx * (Math.cos(swing.angle) - 1) - length * Math.sin(swing.angle)}px`);
    stage.style.setProperty('--lantern-light-offset-y', `${dx * Math.sin(swing.angle) + length * (Math.cos(swing.angle) - 1)}px`);
    swing.frame = settled ? 0 : requestAnimationFrame(animateSwing);
  };

  const moveLantern = (position) => {
    const swing = swingRef.current;
    if (!swing.frame && stageRef.current) {
      swing.x = lanternRef.current.x * stageRef.current.clientWidth / 100;
      swing.time = performance.now();
      swing.frame = requestAnimationFrame(animateSwing);
    }
    lanternRef.current = position;
    setLantern(position);
  };

  useLayoutEffect(() => {
    const stage = stageRef.current?.getBoundingClientRect();
    const artwork = artworkRef.current?.getBoundingClientRect();
    if (!stage?.height || !artwork?.height) return;
    // The light is anchored at 65% of the image height; leave 12px below its base.
    const position = {
      x: INITIAL_LANTERN.x,
      y: 100 - ((artwork.height * 0.35 + 12) / stage.height) * 100,
    };
    lanternRef.current = position;
    setLantern(position);
  }, []);

  const constrainPosition = (x, y, rect) => {
    const artwork = artworkRef.current?.getBoundingClientRect();
    const halfWidth = (artwork?.width || 128) / 2;
    const height = artwork?.height || 192;
    return {
      x: clamp(x, (halfWidth + 4) / rect.width * 100, 100 - (halfWidth + 4) / rect.width * 100),
      y: clamp(y, (height * 0.65 + 4) / rect.height * 100, 100 - (height * 0.35 + 4) / rect.height * 100),
    };
  };

  const updateDrag = () => {
    const drag = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    // Preserve the exact grip on the handle; the lantern hangs below it.
    moveLantern(constrainPosition(
      ((drag.clientX - rect.left + drag.offsetX) / rect.width) * 100,
      ((drag.clientY - rect.top + drag.offsetY) / rect.height) * 100,
      rect,
    ));
  };

  const handlePointerDown = (event) => {
    if (dragRef.current || !event.isPrimary || event.button !== 0) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const original = lanternRef.current;
    const offsetY = rect.top + original.y * rect.height / 100 - event.clientY;
    dragRef.current = {
      id: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      original,
      offsetX: rect.left + original.x * rect.width / 100 - event.clientX,
      offsetY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current.clientX = event.clientX;
    dragRef.current.clientY = event.clientY;
    updateDrag();
  };

  const handlePointerEnd = (event) => {
    if (dragRef.current?.id !== event.pointerId) return;
    // Keep the last visible position on release; cancellation restores it.
    if (event.type !== 'pointerup') moveLantern(dragRef.current.original);
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <main className="page day10-page">
      <section className="day01-card day10-card">
        <div className="day10-layout">
          <p className="day01-date day10-date">Diciembre 10</p>
          <div className="day10-scene">
            <div
              ref={stageRef}
              className={`day10-night${isDragging ? ' is-dragging' : ''}`}
              style={{
                '--lantern-x': `${lantern.x}%`,
                '--lantern-y': `${lantern.y}%`,
              }}
            >
              <div className="day10-stars" aria-hidden="true">
                <span className="day10-star day10-star-a" />
                <span className="day10-star day10-star-b" />
                <span className="day10-star day10-star-c" />
                <span className="day10-star day10-star-d" />
                <span className="day10-star day10-star-e" />
              </div>

              <div className="day10-message-card">
                <p className="day10-message-date">Para esta noche de diciembre</p>
                <p className="day10-message-text">
                  Que la luz los encuentre siempre juntitos, aun en los ratitos mas callados.
                  Donde haya ternura, casa y familia, siempre habra un farol encendido esperandolos.
                </p>
              </div>

              <div className="day10-darkness" aria-hidden="true" />

              <div ref={artworkRef} className="day10-lantern day10-image-lantern">
                <img src="/images/day10-red-christmas-lantern.png" alt="" draggable="false" />
                <button
                  className="day10-lantern-handle"
                  type="button"
                  aria-label="Mover el farol por el asa"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onLostPointerCapture={handlePointerEnd}
                  onDragStart={event => event.preventDefault()}
                  onContextMenu={event => event.preventDefault()}
                  onKeyDown={event => {
                    const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
                    const rect = stageRef.current?.getBoundingClientRect();
                    if (!delta || !rect || dragRef.current) return;
                    event.preventDefault();
                    moveLantern(constrainPosition(lanternRef.current.x + delta[0] / rect.width * 100, lanternRef.current.y + delta[1] / rect.height * 100, rect));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
