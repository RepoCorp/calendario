import { useEffect, useRef, useState } from 'react';
import { WORLD, STEP } from './ornamentBounce';
import { createPong, startServe, stepPong } from './ornamentPong';
import { CloudArt, Ornament, OrnamentClip } from './OrnamentArtwork';
import './OrnamentPong.css';

const snapshot = ({ random, ...state }) => structuredClone(state);

export default function OrnamentPong({ active, ready }) {
  const svgRef = useRef(null);
  const game = useRef(null);
  if (!game.current) game.current = createPong();
  const gesture = useRef(null);
  const [view, setView] = useState(() => snapshot(game.current));

  useEffect(() => {
    if (!active || !ready) return;
    let frame, previous, accumulator = 0;
    const cancelGesture = () => {
      gesture.current = null;
      game.current.target = { x: game.current.player.x, y: game.current.player.y };
      previous = undefined;
      accumulator = 0;
    };
    const update = now => {
      if (!document.hidden) {
        accumulator += previous === undefined ? 0 : Math.min((now - previous) / 1000, .05);
        while (accumulator >= STEP) { stepPong(game.current, STEP); accumulator -= STEP; }
        setView(snapshot(game.current));
      }
      previous = document.hidden ? undefined : now;
      frame = requestAnimationFrame(update);
    };
    document.addEventListener('visibilitychange', cancelGesture);
    window.addEventListener('blur', cancelGesture);
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      cancelGesture();
      document.removeEventListener('visibilitychange', cancelGesture);
      window.removeEventListener('blur', cancelGesture);
    };
  }, [active, ready]);

  const point = event => new DOMPoint(event.clientX, event.clientY).matrixTransform(svgRef.current.getScreenCTM().inverse());
  const down = event => {
    if (!ready || !event.isPrimary || event.button !== 0 || gesture.current) return;
    event.preventDefault();
    const p = point(event), cloud = game.current.player;
    if (Math.abs(p.x - cloud.x) > 78 || Math.abs(p.y - cloud.y) > 36) return;
    startServe(game.current);
    gesture.current = {
      id: event.pointerId,
      dx: cloud.x - p.x, dy: cloud.y - p.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = event => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    event.preventDefault();
    const p = point(event);
    game.current.target = { x: p.x + g.dx, y: p.y + g.dy };
  };
  const up = event => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    game.current.target = { x: game.current.player.x, y: game.current.player.y };
    setView(snapshot(game.current));
  };
  const serve = () => { startServe(game.current); setView(snapshot(game.current)); };
  const key = event => {
    const delta = { ArrowLeft: [-25, 0], ArrowRight: [25, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
    if (delta) {
      event.preventDefault();
      game.current.target = { x: game.current.target.x + delta[0], y: game.current.target.y + delta[1] };
    } else if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); serve(); }
  };
  const pointMessage = view.lastScorer === 'player' ? '¡Punto para ti!' : view.lastScorer === 'ai' ? 'Punto para la otra nube' : '';
  const winnerMessage = view.winner === 'player' ? '¡Ganaste!' : 'Ganó la otra nube';

  return <div className="ornament-pong" hidden={!active}>
    <svg ref={svgRef} className="day13-world" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
      aria-label="Pong navideño" style={{ visibility: ready ? 'visible' : 'hidden' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)}
      onPointerCancel={up} onLostPointerCapture={up}>
      <defs><OrnamentClip id="pong-bauble-cutout"/></defs>
      <path d={`M12 ${WORLD.height / 2}H${WORLD.width - 12}`} stroke="#fff1ca" strokeOpacity=".25" strokeDasharray="3 10" pointerEvents="none"/>
      <CloudArt {...view.ai} facingDown/>
      <g className="day13-paddle" role="button" tabIndex={active && ready ? 0 : -1} aria-label="Mover tu nube" onKeyDown={key}>
        <CloudArt {...view.player}/>
        <rect x={view.player.x - 78} y={view.player.y - 26} width="156" height="60" rx="25" fill="transparent"/>
      </g>
      <Ornament {...view.ball} color="red" clipId="pong-bauble-cutout"/>
    </svg>
    <div className="ornament-pong-score" aria-label={`Tú ${view.scores.player}, otra nube ${view.scores.ai}`}>
      <span>Tú <b>{view.scores.player}</b></span><span aria-hidden="true">·</span><span><b>{view.scores.ai}</b> Nube</span>
    </div>
    <div className="ornament-pong-announcement" role="status" aria-live="polite">
      {view.phase === 'ready' ? pointMessage : view.phase === 'over' ? winnerMessage : ''}
    </div>
  </div>;
}
