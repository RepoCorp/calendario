import { useId } from 'react';

const SPRITE = '/images/day19-friendly-firefly.png';
// Follow the painted shoulders so only the wings move, in one square coordinate system.
const LEFT_WING = 'M0 29 H44 C40 34 36 45 35 58 H0 Z';
const RIGHT_WING = 'M100 29 H56 C60 34 64 45 65 58 H100 Z';

export default function Day19Firefly() {
  const id = useId().replace(/:/g, '');
  const leftId = `${id}-left-wing`;
  const rightId = `${id}-right-wing`;
  const bodyId = `${id}-body`;
  const glowFadeId = `${id}-glow-fade`;
  const glowMaskId = `${id}-glow-mask`;

  return (
    <svg className="day19-firefly-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={leftId}><path d={LEFT_WING} /></clipPath>
        <clipPath id={rightId}><path d={RIGHT_WING} /></clipPath>
        <clipPath id={bodyId}>
          <path d={`M0 0 H100 V100 H0 Z ${LEFT_WING} ${RIGHT_WING}`} clipRule="evenodd" />
        </clipPath>
        <linearGradient id={glowFadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="black" />
          <stop offset="73%" stopColor="white" />
        </linearGradient>
        <mask id={glowMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill={`url(#${glowFadeId})`} />
        </mask>
      </defs>
      <g className="day19-firefly-wing day19-firefly-wing-left">
        <image href={SPRITE} width="100" height="100" clipPath={`url(#${leftId})`} />
      </g>
      <g className="day19-firefly-wing day19-firefly-wing-right">
        <image href={SPRITE} width="100" height="100" clipPath={`url(#${rightId})`} />
      </g>
      <g clipPath={`url(#${bodyId})`}>
        <image href={SPRITE} width="100" height="100" />
        <g mask={`url(#${glowMaskId})`}>
          <image className="day19-firefly-tail-dim" href={SPRITE} width="100" height="100" />
          <image className="day19-firefly-glow" href={SPRITE} width="100" height="100" />
        </g>
      </g>
    </svg>
  );
}
