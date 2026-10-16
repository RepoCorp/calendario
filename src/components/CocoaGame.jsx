import { useEffect, useRef } from 'react';
import { mountCocoaGame } from './mountCocoaGame';

export default function CocoaGame({ onStats }) {
  const root = useRef(null);
  const canvasHost = useRef(null);
  useEffect(() => mountCocoaGame(canvasHost.current, root.current, onStats), [onStats]);
  return (
    <div ref={root} className="day09-three-game">
      <div ref={canvasHost} className="day09-three-canvas" aria-label="Taza de chocolate" />
      <span id="disturbance-cue" className="day09-disturbance-cue" aria-hidden="true" />
      <p id="error" className="day09-error" hidden>No se pudo iniciar la vista 3D. Prueba un navegador compatible con WebGL.</p>
      <div className="day09-game-toolbar">
        <button id="enable-sensors" type="button" className="day09-button">Activar movimiento</button>
        <button id="reset-cup" type="button" className="day09-button day09-reset" aria-label="Reiniciar taza">
          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path d="M7 10a10 10 0 1 1-1 10M7 4v6h6" />
          </svg>
        </button>
      </div>
      <p id="sensor-status" className="day09-error" role="status" />
    </div>
  );
}
