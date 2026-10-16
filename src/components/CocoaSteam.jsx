import { useEffect, useRef } from 'react';

export default function CocoaSteam({ progress }) {
  const canvas = useRef(null);
  const amount = useRef(progress);
  amount.current = progress;
  useEffect(() => {
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const width = 160, height = 100;
    const pixels = ctx.createImageData(width, height);
    let frame, last = 0;
    const draw = now => {
      frame = requestAnimationFrame(draw);
      if (now - last < 33) return;
      last = now;
      const t = now / 1000, density = 1 - amount.current;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Upward advection with broad, independently curling wisps.
          const v = y / height * 5 + t * .38;
          const u = x / width * 6 + .4 * Math.sin(v * 1.4 + t * .19);
          const mist = .5 + .22 * Math.sin(u * 1.7 + v * .8)
            + .17 * Math.sin(v * 2.7 - u * .9 + t * .13)
            + .1 * Math.sin(u * 3.1 + v * 3.3);
          const i = (y * width + x) * 4;
          pixels.data[i] = 217 + mist * 26;
          pixels.data[i + 1] = 217 + mist * 24;
          pixels.data[i + 2] = 211 + mist * 24;
          pixels.data[i + 3] = 255 * Math.min(1, density * (1.1 + mist * 1.4));
        }
      }
      ctx.putImageData(pixels, 0, 0);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} width="160" height="100" className="day09-steam" aria-hidden="true" />;
}
