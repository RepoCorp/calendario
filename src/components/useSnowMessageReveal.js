import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { buildSnowBoundary } from './snowRevealBoundary';

const BRUSH_RADIUS = 52;
const CLEAR_RADIUS_RATIO = 0.72;
const COMPLETION_RATIO = 0.98;
const GRID_COLUMNS = 36;
const GRID_INSET = 0;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function paintCover(context, width, height) {
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
}

function eraseStamp(context, stamp, width, height) {
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.translate(stamp.x * width, stamp.y * height);
  context.scale(stamp.radiusX * width, stamp.radiusY * height);
  const feather = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  feather.addColorStop(0, 'rgba(0, 0, 0, 1)');
  feather.addColorStop(CLEAR_RADIUS_RATIO, 'rgba(0, 0, 0, 1)');
  feather.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = feather;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export default function useSnowMessageReveal({ canvasRef, surfaceRef, onComplete }) {
  const engineRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const [completed, setCompleted] = useState(false);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return undefined;

    const context = canvas.getContext('2d');
    if (!context) {
      if (!completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        onCompleteRef.current?.();
      }
      return undefined;
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let previousPoint = null;
    let finished = completedRef.current;
    let coveredCount = 0;
    let cells = [];
    let boundary = null;
    let boundaryDirty = true;
    const stamps = [];
    const stampKeys = new Set();

    const endStroke = () => {
      previousPoint = null;
    };

    const resize = () => {
      const rect = surface.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (width === rect.width && height === rect.height && pixelRatio === nextRatio) return;
      width = rect.width;
      height = rect.height;
      pixelRatio = nextRatio;
      boundaryDirty = true;
      canvas.width = Math.ceil(width * pixelRatio);
      canvas.height = Math.ceil(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paintCover(context, width, height);
      for (const stamp of stamps) eraseStamp(context, stamp, width, height);
      endStroke();

      // A fixed normalized grid preserves earned progress when the note reflows.
      if (!cells.length) {
        const rows = clamp(Math.round((GRID_COLUMNS * height) / width), 18, 90);
        const span = 1 - GRID_INSET * 2;
        cells = Array.from({ length: GRID_COLUMNS * rows }, (_, index) => ({
          x: GRID_INSET + (((index % GRID_COLUMNS) + 0.5) / GRID_COLUMNS) * span,
          y: GRID_INSET + ((Math.floor(index / GRID_COLUMNS) + 0.5) / rows) * span,
          covered: false,
        }));
      }
    };

    const addStamp = (x, y) => {
      const stamp = { x: x / width, y: y / height, radiusX: BRUSH_RADIUS / width, radiusY: BRUSH_RADIUS / height };
      const key = [stamp.x, stamp.y, stamp.radiusX, stamp.radiusY].map((value) => Math.round(value * 1024)).join(':');
      if (stampKeys.has(key)) return;
      stampKeys.add(key);
      stamps.push(stamp);
      eraseStamp(context, stamp, width, height);

      // Only the fully erased center counts, and each cell can count just once.
      for (const cell of cells) {
        if (cell.covered) continue;
        const dx = (cell.x - stamp.x) / stamp.radiusX;
        const dy = (cell.y - stamp.y) / stamp.radiusY;
        if (dx * dx + dy * dy <= CLEAR_RADIUS_RATIO * CLEAR_RADIUS_RATIO) {
          cell.covered = true;
          coveredCount += 1;
          boundaryDirty = true;
        }
      }
    };

    const revealAt = (clientX, clientY) => {
      if (finished || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
      resize();
      if (!width || !height) return;
      const rect = surface.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        endStroke();
        return;
      }
      const x = clamp(clientX - rect.left, 0, width);
      const y = clamp(clientY - rect.top, 0, height);
      if (previousPoint) {
        const distance = Math.hypot(x - previousPoint.x, y - previousPoint.y);
        if (distance < 2) return;
        const steps = Math.ceil(distance / (BRUSH_RADIUS * 0.3));
        for (let step = 1; step <= steps; step += 1) {
          const portion = step / steps;
          addStamp(previousPoint.x + (x - previousPoint.x) * portion, previousPoint.y + (y - previousPoint.y) * portion);
        }
      } else {
        addStamp(x, y);
      }
      previousPoint = { x, y };
      if (cells.length && coveredCount / cells.length >= COMPLETION_RATIO) {
        finished = true;
        boundaryDirty = true;
        completedRef.current = true;
        endStroke();
        setCompleted(true);
        onCompleteRef.current?.();
      }
    };

    const revealNext = () => {
      if (finished) return;
      resize();
      const nextCell = cells.find((cell) => !cell.covered);
      if (!nextCell) return;
      const rect = surface.getBoundingClientRect();
      endStroke();
      // One keyboard action makes a sweep, just like dragging a finger across the note.
      revealAt(rect.left + GRID_INSET * width, rect.top + nextCell.y * height);
      revealAt(rect.right - GRID_INSET * width, rect.top + nextCell.y * height);
      endStroke();
    };

    const getBoundary = () => {
      if (boundaryDirty) {
        boundary = buildSnowBoundary(cells, GRID_COLUMNS, width, height, finished);
        boundaryDirty = false;
      }
      return boundary;
    };
    engineRef.current = { revealAt, endStroke, revealNext, getBoundary };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(surface);
    window.addEventListener('resize', resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      engineRef.current = null;
    };
  }, [canvasRef, surfaceRef]);

  const revealAt = useCallback((clientX, clientY) => engineRef.current?.revealAt(clientX, clientY), []);
  const endStroke = useCallback(() => engineRef.current?.endStroke(), []);
  const revealNext = useCallback(() => engineRef.current?.revealNext(), []);
  const getBoundary = useCallback(() => engineRef.current?.getBoundary(), []);

  return { revealAt, endStroke, revealNext, getBoundary, completed };
}
