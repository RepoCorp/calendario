import { useEffect, useRef, useState } from 'react';
import { WORLD, TREE, STEP, DEFAULTS, createWorld, resetBall, launchBall, stepWorld, canPlace } from '../components/ornamentBounce';
import '../components/Day13Layout.css';
import OrnamentPong from '../components/OrnamentPongGame';
import { Ornament, OrnamentClip, CloudArt } from '../components/OrnamentArtwork';

const ASSETS = ['cloud', 'tree', 'nightscape', 'red', 'gold', 'message-cloud'];
const imageUrl = name => `/images/day13-${name}.png`;
export default function Day13() {
  const [mode, setMode] = useState('decorate');
  const svgRef = useRef(null);
  const world = useRef(createWorld());
  const pointer = useRef(null);
  const config = useRef({ ...DEFAULTS });
  const nextId = useRef(0);
  const [view, setView] = useState(() => structuredClone(world.current));
  const [ornaments, setOrnaments] = useState([]);
  const [placements, setPlacements] = useState(0);
  const [gameUnlocked, setGameUnlocked] = useState(false);
  const messageComplete = placements >= 5;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ornamentTap = useRef(null);
  const color = ornaments.length % 2 ? 'gold' : 'red';
  const currentColor = useRef(color);
  if (!world.current.active) currentColor.current = color;

  useEffect(() => {
    if (!messageComplete) { setGameUnlocked(false); return; }
    // Wait for the cloud cover and words to finish their reveal before offering Pong.
    const timer = window.setTimeout(() => setGameUnlocked(true), 700);
    return () => window.clearTimeout(timer);
  }, [messageComplete]);

  useEffect(() => {
    let disposed = false;
    Promise.all(ASSETS.map(name => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = imageUrl(name);
    }))).then(() => { if (!disposed) setReady(true); }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (mode !== 'decorate') return;
    let frame, previous, accumulator = 0;
    const update = now => {
      accumulator += previous === undefined ? 0 : Math.min((now - previous) / 1000, .05);
      previous = now;
      while (accumulator >= STEP) { stepWorld(world.current, config.current, STEP); accumulator -= STEP; }
      setView(structuredClone(world.current));
      frame = requestAnimationFrame(update);
    };
    const hide = () => {
      if (document.hidden) { resetBall(world.current); pointer.current = null; accumulator = 0; previous = undefined; }
    };
    document.addEventListener('visibilitychange', hide);
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); };
  }, [mode]);

  const point = event => {
    // Invert the SVG's uniform fit, including letterboxing, rather than using viewport pixels.
    const matrix = svgRef.current.getScreenCTM();
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  };
  const start = event => {
    if (!ready || pointer.current || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const p = point(event), c = world.current.cloud;
    pointer.current = { id: event.pointerId, dx: c.x - p.x, dy: c.y - p.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    currentColor.current = color;
    launchBall(world.current);
  };
  const move = event => {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); const p = point(event);
    world.current.target = { x: p.x + drag.dx, y: p.y + drag.dy };
  };
  const end = (event, cancelled = false) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    const state = world.current;
    if (!cancelled && canPlace(state)) {
      const item = { x: state.ball.x, y: state.ball.y, color: currentColor.current, id: nextId.current++ };
      setOrnaments(items => [...items, item]);
      setPlacements(count => Math.min(5, count + 1));
    }
    state.target = { x: state.cloud.x, y: state.cloud.y };
    resetBall(state);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const switchMode = () => {
    if (!gameUnlocked) return;
    pointer.current = null;
    ornamentTap.current = null;
    resetBall(world.current);
    world.current.target = { x: world.current.cloud.x, y: world.current.cloud.y };
    setMode(current => current === 'decorate' ? 'pong' : 'decorate');
  };
  const reset = () => {
    // Cancel gestures first so a late pointer release cannot place an ornament.
    pointer.current = null;
    ornamentTap.current = null;
    world.current = createWorld();
    currentColor.current = 'red';
    setOrnaments([]);
    setPlacements(0);
    setGameUnlocked(false);
    setMode('decorate');
    setView(structuredClone(world.current));
  };
  const removeOrnament = id => setOrnaments(items => items.filter(item => item.id !== id));
  const startOrnamentTap = (event, id) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    ornamentTap.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endOrnamentTap = event => {
    const tap = ornamentTap.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    ornamentTap.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 10) removeOrnament(tap.id);
  };
  const key = event => {
    const s = world.current;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!s.active) { currentColor.current = color; launchBall(s); }
      else {
        if (canPlace(s)) {
          setOrnaments(items => [...items, { ...s.ball, color: currentColor.current, id: nextId.current++ }]);
          setPlacements(count => Math.min(5, count + 1));
        }
        resetBall(s);
      }
    }
    const delta = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] }[event.key];
    if (delta) { event.preventDefault(); s.target = { x: s.target.x + delta[0], y: s.target.y + delta[1] }; }
  };

  return <main className="page day13-page"><section className="day01-card day13-card"><div className="day13-layout">
    <p className="day01-date day13-date">Diciembre 13</p>
    <article className={`day01-note day13-note day13-cloud-message${messageComplete ? ' is-revealed' : ''}`}>
      <h1 className="day01-title day13-title" aria-hidden={!messageComplete}
        style={{ opacity: messageComplete ? 1 : placements * .015 }}>
        <span>Una nube trampolin,</span><span>lleven la esfera al pino.</span>
      </h1>
      <svg className="day13-message-clouds" viewBox="0 0 360 220" preserveAspectRatio="none" aria-hidden="true">
        <image href={imageUrl('message-cloud')} x="0" y="-2" width="360" height="224" preserveAspectRatio="none"
          style={{ opacity: messageComplete ? 0 : .99 - placements * .025 }}/>
        {[
          { x: 242, y: 38, scale: .78 },
          { x: 132, y: 170, scale: 1.08 },
          { x: 55, y: 83, scale: .92 },
          { x: 297, y: 132, scale: .86 },
        ].map(({ x, y, scale }, index) => <g key={index} style={{ opacity: placements > index ? 0 : .88 }}
          transform={`translate(${x} ${y}) scale(${scale})`}>
          <image href={imageUrl('message-cloud')} x="-85" y="-53" width="170" height="106"/>
        </g>)}
      </svg>
    </article>
    <div className="day13-scene">
      <div className="day13-field-space">
        {failed && <p role="alert">No se pudieron cargar las imágenes. Recarga la página.</p>}
        <div className="day13-decoration" hidden={mode !== 'decorate'}>
        <svg ref={svgRef} className="day13-world" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} style={{ visibility: ready ? 'visible' : 'hidden' }} aria-label={`Árbol con ${ornaments.length} adornos`}>
          <defs>
            <radialGradient id="day13-ground-shadow">
              <stop stopColor="#38396e" stopOpacity=".24"/>
              <stop offset=".45" stopColor="#454579" stopOpacity=".14"/>
              <stop offset="1" stopColor="#555a95" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="day13-root-snow" x1="0" y1="0" x2=".15" y2="1">
              <stop stopColor="#d8ddff"/>
              <stop offset=".4" stopColor="#b3c5fa"/>
              <stop offset="1" stopColor="#829ee9" stopOpacity="0"/>
            </linearGradient>
            <filter id="day13-snow-soften" x="-15%" y="-50%" width="130%" height="200%">
              <feGaussianBlur stdDeviation=".7"/>
            </filter>
            <OrnamentClip/>
          </defs>
          {/* Ground details stay anchored to the tree in logical coordinates. */}
          <g transform={`translate(${TREE.x + TREE.width / 2} ${TREE.y + 8})`} pointerEvents="none">
            <ellipse cx="1" cy={TREE.height - 4} rx="48" ry="10" fill="url(#day13-ground-shadow)"/>
            <image href={imageUrl('tree')} x={-TREE.width / 2} y="0" width={TREE.width} height={TREE.height}/>
            <g transform={`translate(0 ${TREE.height - 7})`} filter="url(#day13-snow-soften)">
              <path d="M-47 7C-38 6-34 1-27 1C-20 2-19-4-12-3C-6-2-2 1 5 0C12-2 15-5 22-2C29 1 30 4 38 4L49 9Q30 18 0 15Q-31 17-47 7Z" fill="url(#day13-root-snow)"/>
            </g>
          </g>
          {ornaments.map(item => <g key={item.id} className="day13-placed" role="button" tabIndex={0} aria-label="Quitar adorno"
            onPointerDown={event => startOrnamentTap(event, item.id)} onPointerUp={endOrnamentTap}
            onPointerCancel={() => { ornamentTap.current = null; }}
            onLostPointerCapture={() => { ornamentTap.current = null; }}
            onClick={event => { if (event.detail === 0) removeOrnament(item.id); }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeOrnament(item.id); } }}>
            <Ornament {...item}/><circle cx={item.x} cy={item.y - 3} r="22" fill="transparent" pointerEvents="all"/>
          </g>)}
          <g className="day13-paddle" role="button" tabIndex={ready ? 0 : -1} aria-label="Nube: mover y soltar adorno" onKeyDown={key}
            onPointerDown={start} onPointerMove={move} onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)}>
            <CloudArt {...view.cloud}/>
            <rect x={view.cloud.x - 78} y={view.cloud.y - 26} width="156" height="60" rx="25" fill="transparent"/>
          </g>
          <Ornament {...view.ball} color={currentColor.current}/>
        </svg>
        <button type="button" className="day13-action-button day13-reset" onClick={reset} aria-label="Reiniciar decoración">↺</button>
        </div>
        {gameUnlocked && <OrnamentPong active={mode === 'pong'} ready={ready}/>}
        {gameUnlocked && <button type="button" className="day13-mode" onClick={switchMode} aria-pressed={mode === 'pong'}>{mode === 'decorate' ? 'Jugar' : 'Decorar'}</button>}
      </div>
    </div>
  </div></section></main>;
}
