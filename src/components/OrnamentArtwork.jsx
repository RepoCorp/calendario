import { RADIUS } from './ornamentBounce';

export const ornamentImageUrl = name => `/images/day13-${name}.png`;

// The supplied baubles contain checkerboards; share the existing silhouette mask.
export function OrnamentClip({ id = 'day13-bauble-cutout' }) {
  return (
            <clipPath id={id}>
              <ellipse cx="625" cy="780" rx="422" ry="405"/>
              <path d="M485 370V275Q485 244 520 244H735Q769 244 769 275V370Q747 398 727 367Q702 409 678 375Q650 417 624 380Q595 415 571 375Q544 407 523 370Q502 393 485 370Z"/>
              <path clipRule="evenodd" d="M625 76A106 89 0 1 1 624.99 76ZM625 110A73 57 0 1 0 625.01 110Z"/>
            </clipPath>
  );
}

export function Ornament({ x, y, color, clipId = 'day13-bauble-cutout' }) {
  const scale = RADIUS / 422;
  return <g pointerEvents="none" transform={`translate(${x - 625 * scale} ${y - 780 * scale}) scale(${scale})`}><image href={ornamentImageUrl(color)} width="1254" height="1254" clipPath={`url(#${clipId})`}/></g>;
}

// The bright strip is the contact plane; mirror it for an opponent facing down.
export function CloudArt({ x, y, facingDown = false }) {
  return <g pointerEvents="none" transform={`translate(${x} ${y}) scale(1 ${facingDown ? -1 : 1})`}>
    <image href={ornamentImageUrl('cloud')} x="-87" y="-42.6" width="174" height="87"/>
  </g>;
}
