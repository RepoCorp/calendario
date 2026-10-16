import { isSparklerHeart } from './sparklerHeart';
import { createSparks, emitAlong, emitBurst, stepSparks, paintSparks, createCoreSprite, paintCore } from './sparklerLive';
import { paintExposureSegment } from './sparklerExposure';

// Coordinates/timestamps are recorded independently of either rendering mode.
export function mountSparkler(canvas, { onError, onHeart } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const exposure = document.createElement('canvas');
  const exposureCtx = exposure.getContext('2d');
  if (!ctx || !exposureCtx) { onError?.('Este navegador no puede mostrar el lienzo.'); return { dispose() {}, startCapture() {}, stopCapture() {} }; }
  const core = createCoreSprite();
  const sparks = createSparks();
  let strokes = [], stroke = null, pointerId = null, pointer = null;
  let capturing = false, mode = 'live', width = 1, height = 1, dpr = 1, frame, previous, disposed = false;
  let pending = [], lastDwell = 0, nextBurst = 0, heartDetected = false;
  const abort = new AbortController();
  const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal: abort.signal });
  const pixels = p => ({ x: p.x * width, y: p.y * height });
  const drawSegment = item => paintExposureSegment(exposureCtx, item.from, item.to, {
    width, height, seed: item.seed, index: item.index,
  });
  const redrawExposure = () => {
    exposureCtx.clearRect(0, 0, width, height);
    for (const recorded of strokes) recorded.points.forEach((p, index) => {
      drawSegment({ from: recorded.points[Math.max(0, index - 1)], to: p, index, seed: recorded.seed });
    });
    // Exposure pixels are rebuilt, but live emission still consumes these samples once.
    for (const item of pending) item.painted = true;
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    // Cap dense displays for mobile fill-rate; still scale the backing store for DPR.
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = exposure.width = Math.round(width * dpr);
    canvas.height = exposure.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    exposureCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sparks.particles.length = 0;
    redrawExposure();
  };
  const record = p => {
    if (!stroke) return;
    const from = stroke.points.at(-1) || p;
    const index = stroke.points.length;
    if (index && p.t <= from.t) return;
    if (index && Math.hypot((p.x - from.x) * width, (p.y - from.y) * height) < .4 && p.t - from.t < 24) return;
    stroke.points.push(p);
    pending.push({ from, to: p, index, seed: stroke.seed });
  };
  const sample = event => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      t: event.timeStamp,
    };
  };
  const release = () => {
    const id = pointerId;
    pointerId = null; stroke = null; pointer = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  listen(canvas, 'pointerdown', event => {
    if (!capturing || !event.isPrimary || event.button !== 0 || pointerId !== null) return;
    event.preventDefault(); pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    // Fixed per-stroke seed: identical recorded points always render identically.
    stroke = { seed: Math.imul(strokes.length + 1, 2654435761) >>> 0, points: [] };
    strokes.push(stroke); pointer = sample(event); record(pointer);
    lastDwell = performance.now(); nextBurst = lastDwell;
    emitBurst(sparks, pixels(pointer));
  });
  listen(canvas, 'pointermove', event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [];
    for (const e of samples.length ? samples : [event]) { pointer = sample(e); record(pointer); }
  });
  listen(canvas, 'pointerup', event => {
    if (event.pointerId !== pointerId) return;
    pointer = sample(event); record(pointer); release();
    heartDetected ||= isSparklerHeart(strokes.slice(-3), width, height);
  });
  listen(canvas, 'pointercancel', release);
  listen(canvas, 'lostpointercapture', release);
  listen(canvas, 'contextmenu', event => event.preventDefault());
  listen(window, 'blur', release);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      release(); sparks.particles.length = 0;
      for (const item of pending) if (!item.painted) drawSegment(item);
      pending = [];
    }
    previous = undefined;
  });
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  listen(window, 'resize', resize);
  resize();

  const update = now => {
    if (disposed) return;
    const dt = Math.min((now - (previous ?? now)) / 1000, .05); previous = now;
    if (!document.hidden) {
      if (pointer && now - lastDwell >= 40) {
        record({ ...pointer, t: now }); lastDwell = now;
      }
      for (const item of pending) {
        if (!item.painted) drawSegment(item);
        // Interpolate emissions on each actual segment rather than cutting across corners.
        emitAlong(sparks, pixels(item.from), pixels(item.to), 0);
      }
      pending = [];
      stepSparks(sparks, dt);
      if (pointer) {
        const p = pixels(pointer);
        emitAlong(sparks, p, p, dt);
        if (now >= nextBurst) { emitBurst(sparks, p); nextBurst = now + 90 + Math.random() * 360; }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
      if (mode === 'exposure') ctx.drawImage(exposure, 0, 0, width, height);
      paintSparks(ctx, sparks);
      if (pointer) paintCore(ctx, core, pixels(pointer), now);
    }
    frame = requestAnimationFrame(update);
  };
  frame = requestAnimationFrame(update);
  return {
    stopCapture() {
      if (pointer) record({ ...pointer, t: performance.now() });
      release(); capturing = false; mode = 'exposure';
      for (const item of pending) if (!item.painted) drawSegment(item);
      pending = []; sparks.particles.length = 0;
      if (heartDetected || isSparklerHeart(strokes.slice(-3), width, height)) onHeart?.();
    },
    startCapture() {
      capturing = true; mode = 'live'; heartDetected = false;
      release(); strokes = []; pending = []; sparks.particles.length = 0;
      exposureCtx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
    },
    dispose() {
      disposed = true; release(); cancelAnimationFrame(frame); abort.abort(); observer.disconnect();
      strokes = []; pending = []; sparks.particles.length = 0;
    },
  };
}
