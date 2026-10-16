import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './Day11MessageCylinder.css';

const RADIUS = 88;
const CENTER = 110;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Conservative widths keep whole words away from the decorated edges on phones.
function textWidth(text, size) {
  return Array.from(text).reduce((width, letter) => width + (
    /[ilI.,'!:; ]/.test(letter) ? 0.28 : /[MWÁÓ]/.test(letter) ? 0.9 : 0.56
  ) * size, 0);
}

function wrapMessage(message, size, maxWidth) {
  const rows = [];
  let row = '';
  for (const word of message.trim().split(/\s+/)) {
    const candidate = row ? `${row} ${word}` : word;
    if (row && textWidth(candidate, size) > maxWidth) {
      rows.push(row);
      row = word;
    } else row = candidate;
  }
  if (row) rows.push(row);
  return rows;
}

export default function Day11MessageCylinder({ progress = 0, complete = false, message = 'Una cajita musical' }) {
  const id = useId().replace(/:/g, '');
  const scrollRef = useRef(null);
  const [bounds, setBounds] = useState({ width: 362, height: 222 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setBounds({ width, height });
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);
  const scaleX = bounds.width / 304;
  const scaleY = bounds.height / 230;
  const textScaleX = scaleY / scaleX;
  const maxTextWidth = 260 / textScaleX;
  const { rows, fontSize } = useMemo(() => {
    // Compensate for SVG sizing: center-facing text is 18 CSS pixels on any phone.
    let size = 18 / scaleY;
    let wrapped = wrapMessage(message, size, maxTextWidth);
    while (wrapped.length > 6 && size > 15 / scaleY) {
      size -= 1 / scaleY;
      wrapped = wrapMessage(message, size, maxTextWidth);
    }
    return { rows: wrapped, fontSize: size };
  }, [message, scaleY, maxTextWidth]);
  const amount = complete ? 1 : clamp(progress, 0, 1);
  const spacing = Math.min(0.3, 1.7 / Math.max(1, rows.length - 1));
  const halfSpan = (rows.length - 1) * spacing / 2;
  // The first row crosses the lower horizon at 60%; the last pose faces front.
  // All markings share this angle, so they roll with the ink on the paper.
  const phase = (1 - amount) * (Math.PI / 2 + halfSpan) / 0.4;
  const textOpacity = Math.min(0.78, clamp((amount - 0.6) / 0.28, 0, 1));

  return (
    <div ref={scrollRef} className="day11-message-cylinder" data-complete={complete}>
      <svg viewBox="28 0 304 230" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3d101a" />
            <stop offset=".12" stopColor="#681326" />
            <stop offset=".34" stopColor="#8b2035" />
            <stop offset=".57" stopColor="#7a1024" />
            <stop offset=".84" stopColor="#651326" />
            <stop offset="1" stopColor="#401019" />
          </linearGradient>
          <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="11" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <radialGradient id={`${id}-age`}>
            <stop stopColor="#310b16" stopOpacity=".19" />
            <stop offset="1" stopColor="#310b16" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-wine`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#28191b" />
            <stop offset=".4" stopColor="#4e2529" />
            <stop offset=".65" stopColor="#421d24" />
            <stop offset="1" stopColor="#2b171c" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop stopColor="#160c03" stopOpacity=".5" />
            <stop offset="1" stopColor="#160c03" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-surface`}>
            <rect x="28" y={CENTER - RADIUS} width="304" height={RADIUS * 2} />
          </clipPath>
        </defs>
        <ellipse cx="180" cy="207" rx="174" ry="17" fill={`url(#${id}-shadow)`} />
        <rect x="28" y={CENTER - RADIUS} width="304" height={RADIUS * 2} fill={`url(#${id}-paper)`} />
        <g clipPath={`url(#${id}-surface)`}>
          <rect x="28" y="22" width="304" height="176" fill="#9f5962" filter={`url(#${id}-grain)`} opacity=".16" />
          <ellipse cx="63" cy="70" rx="69" ry="48" fill={`url(#${id}-age)`} />
          <ellipse cx="280" cy="172" rx="85" ry="43" fill={`url(#${id}-age)`} />
          {[34, 326].map((x) => (
            <g key={x}>
              <rect x={x - 4} y="22" width="8" height="176" fill={`url(#${id}-wine)`} />
              <path d={`M${x - 5} 22V198M${x + 5} 22V198`} stroke="#aa803b" strokeWidth=".8" opacity=".8" />
              {Array.from({ length: 16 }, (_, index) => {
                const angle = phase + index * Math.PI / 8;
                const facing = Math.cos(angle);
                if (facing <= 0) return null;
                return <path key={index} d="M0 -4L2 0 0 4 -2 0Z" transform={`translate(${x} ${CENTER + RADIUS * Math.sin(angle)}) scale(1 ${facing})`} fill="#e5c17b" opacity={facing * .85} />;
              })}
            </g>
          ))}
          {[-1.2, 1.2].map((offset) => {
            const angle = phase + offset;
            const facing = Math.cos(angle);
            if (facing <= 0) return null;
            return (
              <g key={offset} transform={`translate(180 ${CENTER + RADIUS * Math.sin(angle)}) scale(1 ${facing})`} opacity={facing}>
                <path d="M-128 0H-45Q-34 -10 -24 0Q-34 10 -41 3M128 0H45Q34 -10 24 0Q34 10 41 3" fill="none" stroke="#c69b56" strokeWidth="1.2" />
                <path d="M-3 0C-10 -14 -22 -4 -25 -13C-27 -4 -18 7 -3 0M3 0C10 -14 22 -4 25 -13C27 -4 18 7 3 0" fill="#36543b" stroke="#7d884c" strokeWidth=".6" />
                <path d="M-4 0L-21 -9M4 0L21 -9" stroke="#b5a064" strokeWidth=".6" />
                <circle cx="-3" cy="1" r="3" fill="#8f302d" />
                <circle cx="3" cy="1" r="3" fill="#a44033" />
                <circle cy="-3" r="3" fill="#b04b3e" />
                <path d="M-1 -4L0 -5M2 0L3 -1" stroke="#e0a478" strokeWidth="1" strokeLinecap="round" />
              </g>
            );
          })}
          {[0, 1].map((index) => {
            const angle = phase + index * Math.PI + 1.05;
            const facing = Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);
            return facing > 0 && (
              <g key={index} opacity={facing * 0.3}>
                <path d={`M29 ${y} Q175 ${y + 2} 331 ${y}`} fill="none" stroke="#46101e" strokeWidth=".8" />
                <path d={`M29 ${y - 1} Q175 ${y + 1} 331 ${y - 1}`} fill="none" stroke="#c27a77" strokeWidth="1" />
              </g>
            );
          })}
          {Array.from({ length: 26 }, (_, index) => {
            const angle = phase + index * 2.4;
            const facing = Math.cos(angle);
            const x = 42 + (index % 13) * 22;
            const y = CENTER + RADIUS * Math.sin(angle);
            return facing > 0 && <path key={index} d={`M${x} ${y}l${4 + index % 4} ${facing * .8}`} stroke="#d69a85" strokeWidth=".5" opacity={facing * .2} />;
          })}
          {amount > 0.6 && rows.map((row, index) => {
            const angle = phase + index * spacing - halfSpan;
            const facing = Math.cos(angle);
            if (angle >= Math.PI / 2 || angle <= -Math.PI / 2) return null;
            const y = CENTER + RADIUS * Math.sin(angle);
            const scale = Math.pow(facing, 1.5);
            return (
              <g key={index} transform={`translate(180 ${y}) scale(${textScaleX} ${scale})`} opacity={textOpacity * clamp(facing * 5, 0, 1)}>
                <text className="day11-message-cylinder__words" textAnchor="middle" dominantBaseline="central" fontSize={fontSize}>{row}</text>
              </g>
            );
          })}
        </g>
      </svg>
      {complete && <p className="day11-message-cylinder__accessible">{message}</p>}
    </div>
  );
}
