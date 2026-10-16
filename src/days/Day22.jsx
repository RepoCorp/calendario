import { useEffect, useRef, useState } from 'react';
import { paintExposureSegment } from '../components/sparklerExposure';
import { mountSparkler } from '../components/mountSparkler';
import '../components/Day22Sparkler.css';

function SparklerHeart() {
  const canvas = useRef(null);
  useEffect(() => {
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 180, 180);
    const points = Array.from({ length: 81 }, (_, i) => {
      const t = i * Math.PI * 2 / 80;
      return { x: .5 + .021 * 16 * Math.sin(t) ** 3,
        y: .46 - .021 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)), t: i * 25 };
    });
    points.forEach((point, index) => paintExposureSegment(ctx, points[Math.max(0, index - 1)], point,
      { width: 180, height: 180, seed: 2213, index }));
  }, []);
  return <canvas ref={canvas} width="180" height="180" className="day22-heart" aria-hidden="true" />;
}

export default function Day22() {
  const canvas = useRef(null);
  const runtime = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    runtime.current = mountSparkler(canvas.current, { onError: setError, onHeart: () => setRevealed(true) });
    return () => { runtime.current?.dispose(); runtime.current = null; };
  }, []);
  const toggleCapture = () => {
    if (capturing) runtime.current?.stopCapture();
    else runtime.current?.startCapture();
    setCapturing(!capturing);
  };
  return <main className="day22-prototype">
    <article className={`day22-message${revealed ? ' is-revealed' : ''}`} aria-hidden={!revealed}>
      <SparklerHeart />
      <h1>Un mensaje para ustedes</h1>
      <p>Aquí irá el mensaje de diciembre 22.</p>
    </article>
    <div className="day22-drawing-area"><canvas ref={canvas} className="day22-canvas" aria-label="Lienzo para pintar con chispitas mariposa"/></div>
    <header className="day22-header"><p>Diciembre 22</p></header>
    <div className="day22-controls">
      <button className="day22-capture" type="button" aria-pressed={capturing} onClick={toggleCapture}>
        {capturing ? 'Detener captura' : 'Empezar captura'}
      </button>
    </div>
    {error && <p className="day22-error" role="alert">{error}</p>}
  </main>;
}
