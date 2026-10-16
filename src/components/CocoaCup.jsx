import { useEffect, useId, useState } from 'react';
import './CocoaCup.css';

const CENTER_X = 166;
const RIM_Y = 137;
const PIVOT_Y = 247;
const SAUCER_RADIUS_X = 143;
const SAUCER_RADIUS_Y = 37;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getCocoaGeometry(tilt = { x: 0, y: 0 }, gameOver = false, liquidTilt = tilt, spillRate = 0) {
  const x = clamp(Number(tilt.x) || 0, -30, 30);
  const y = clamp(Number(tilt.y) || 0, -30, 30);
  const liquidX = clamp(Number(liquidTilt.x) || 0, -30, 30);
  const liquidY = clamp(Number(liquidTilt.y) || 0, -30, 30);
  const angle = clamp(x * 1.1, -16, 16);
  const rimRadiusY = 28 + clamp(y * 0.56, -8.4, 8.4);
  const magnitude = Math.hypot(liquidX, liquidY);
  const directionX = liquidX / (magnitude || 1);
  const directionY = liquidY / (magnitude || 1);
  // Liquid imbalance selects the rim; actual phone tilt rotates that rim in space.
  const rimX = CENTER_X + directionX * 87;
  const rimY = RIM_Y + directionY * (rimRadiusY - 2);
  const radians = angle * Math.PI / 180;
  const origin = {
    x: CENTER_X + (rimX - CENTER_X) * Math.cos(radians) - (rimY - PIVOT_Y) * Math.sin(radians),
    y: PIVOT_Y + (rimX - CENTER_X) * Math.sin(radians) + (rimY - PIVOT_Y) * Math.cos(radians),
  };
  const flow = gameOver ? 0 : clamp((Number(spillRate) || 0) / 12, 0, 1);
  const rear = liquidY < 0;
  const sway = clamp(magnitude / 7, 0, 1.45);
  const saucerDepth = Math.sqrt(Math.max(0, 1 - ((origin.x - CENTER_X) / SAUCER_RADIUS_X) ** 2));

  return {
    angle,
    fluidAngle: clamp(-liquidX * 1.1, -16, 16),
    fluidOffset: { x: directionX * sway * 10, y: directionY * sway * 7 },
    liquidDirection: Math.atan2(liquidY, liquidX),
    rimRadiusY,
    mouthCenter: {
      x: CENTER_X - (RIM_Y - PIVOT_Y) * Math.sin(radians),
      y: PIVOT_Y + (RIM_Y - PIVOT_Y) * Math.cos(radians),
    },
    origin,
    landing: { x: origin.x, y: PIVOT_Y + (rear ? -10 : 18) * saucerDepth },
    flow,
    rear,
  };
}

export function recordCocoaResidue(current, spill, geometry) {
  const increment = spill - current.previous;
  const peak = Math.max(current.peak, spill);
  if (increment <= 0 || geometry.flow <= 0) {
    return spill === current.previous && peak === current.peak
      ? current
      : { ...current, previous: spill, peak };
  }

  // Eight columns on each half of the saucer bound memory without relocating deposits.
  const column = clamp(Math.floor((geometry.landing.x - (CENTER_X - SAUCER_RADIUS_X)) / (SAUCER_RADIUS_X * 2 / 8)), 0, 7);
  const bin = column + (geometry.rear ? 0 : 8);
  const existing = current.puddles[bin];
  return {
    peak,
    previous: spill,
    puddles: {
      ...current.puddles,
      [bin]: {
        x: existing?.x ?? geometry.landing.x,
        y: existing?.y ?? geometry.landing.y,
        amount: Math.min(100, (existing?.amount ?? 0) + increment),
      },
    },
  };
}

export default function CocoaCup({
  tilt = { x: 0, y: 0 },
  liquidTilt = tilt,
  spillRate = 0,
  warning = 0,
  spill = 0,
  gameOver = false,
}) {
  const id = `cocoa-${useId().replace(/:/g, '')}`;
  const geometry = getCocoaGeometry(tilt, gameOver, liquidTilt, spillRate);
  const currentSpill = clamp(spill, 0, 100);
  const rimWarning = clamp(warning, 0, 1);
  const [residue, setResidue] = useState(() => ({ peak: 0, previous: 0, puddles: {} }));

  useEffect(() => {
    setResidue((current) => recordCocoaResidue(current, currentSpill, geometry));
  }, [currentSpill, geometry.landing.x, geometry.landing.y, geometry.flow, geometry.rear]);

  const loss = Math.max(residue.peak, currentSpill) / 100;
  const liquidY = RIM_Y + 3 + loss * 15;
  const liquidRadiusY = Math.max(12, geometry.rimRadiusY - 8 - loss * 6);
  // The crest grows from inside the mouth to the exact lip used by the stream.
  // Its placement follows the liquid, including drift while the ceramic is still.
  const crestHalfAngle = 0.2 + rimWarning * 0.3;
  const crestRadiusX = 79 + rimWarning * 8;
  const crestRadiusY = geometry.rimRadiusY - 6 + rimWarning * 4;
  const rimPoint = (angle, radiusX, radiusY) => `${CENTER_X + Math.cos(angle) * radiusX} ${RIM_Y + Math.sin(angle) * radiusY}`;
  const crestStart = geometry.liquidDirection - crestHalfAngle;
  const crestEnd = geometry.liquidDirection + crestHalfAngle;
  const crestOuterStart = rimPoint(crestStart, crestRadiusX, crestRadiusY);
  const crestOuterEnd = rimPoint(crestEnd, crestRadiusX, crestRadiusY);
  const surfacePoint = (angle) => {
    const localX = Math.cos(angle) * 91 * 0.72;
    const localY = liquidY - RIM_Y + Math.sin(angle) * liquidRadiusY * 0.72;
    const radians = geometry.fluidAngle * Math.PI / 180;
    let x = localX * Math.cos(radians) - localY * Math.sin(radians) + geometry.fluidOffset.x;
    let y = localX * Math.sin(radians) + localY * Math.cos(radians) + geometry.fluidOffset.y;
    // A depleted surface can move under the lip; keep the visible bridge inside it.
    const edgeDistance = Math.hypot(x / 77, y / (geometry.rimRadiusY - 7));
    if (edgeDistance > 1) {
      x /= edgeDistance;
      y /= edgeDistance;
    }
    return `${CENTER_X + x} ${RIM_Y + y}`;
  };
  const crestInnerStart = surfacePoint(crestStart);
  const crestInnerMiddle = surfacePoint(geometry.liquidDirection);
  const crestInnerEnd = surfacePoint(crestEnd);
  const crestEdge = `M ${crestOuterStart} A ${crestRadiusX} ${crestRadiusY} 0 0 1 ${crestOuterEnd}`;
  const url = (name) => `url(#${id}-${name})`;
  const direction = Math.abs(liquidTilt.x) > Math.abs(liquidTilt.y)
    ? (liquidTilt.x > 0 ? 'hacia la derecha' : 'hacia la izquierda')
    : (liquidTilt.y > 0 ? 'hacia adelante' : 'hacia atras');
  const description = geometry.flow > 0
    ? `Chocolate derramandose ${direction} sobre el plato.`
    : rimWarning > 0
      ? `Chocolate acercandose al borde de la taza ${direction}.`
      : loss > 0
        ? 'Taza de chocolate con menos chocolate y un derrame sobre el plato.'
        : 'Taza de ceramica roja con chocolate caliente y vapor sobre un plato marfil.';

  const stream = geometry.flow > 0 ? (
    <g className="cocoa-cup__flow" opacity={0.62 + geometry.flow * 0.38}>
      <path
        d={`M ${geometry.origin.x} ${geometry.origin.y} L ${geometry.landing.x} ${geometry.landing.y - 4}`}
        stroke={url('stream')}
        strokeWidth={2.5 + geometry.flow * 5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${geometry.origin.x - 0.8} ${geometry.origin.y + 3} L ${geometry.landing.x - 0.8} ${geometry.landing.y - 9}`}
        stroke="#d09c70"
        strokeOpacity=".38"
        strokeWidth="1.1"
        fill="none"
      />
      {[0, 1, 2].map((drop) => (
        <ellipse
          key={drop}
          className="cocoa-cup__drop"
          cx={geometry.origin.x + (drop - 1) * 3}
          cy={geometry.origin.y + 8}
          rx={1.7 + geometry.flow}
          ry={2.8 + geometry.flow * 1.6}
          fill="#77432b"
          style={{
            '--fall-distance': `${geometry.landing.y - geometry.origin.y - 12}px`,
            animationDelay: `${drop * -0.23}s`,
          }}
        />
      ))}
      <g clipPath={url('saucer-surface')}>
        <ellipse cx={geometry.landing.x} cy={geometry.landing.y} rx={7 + geometry.flow * 7} ry="3.4" fill="#78442c" />
        <ellipse className="cocoa-cup__splash" cx={geometry.landing.x} cy={geometry.landing.y} rx="11" ry="4" fill="none" stroke="#9c6949" strokeWidth="1" />
      </g>
    </g>
  ) : null;

  return (
    <svg className="cocoa-cup" viewBox="0 0 360 326" role="img" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>{description}</title>
      <defs>
        <linearGradient id={`${id}-ceramic`} x1="0" y1="0" x2="1" y2=".3">
          <stop offset="0" stopColor="#4c0d21" />
          <stop offset=".18" stopColor="#9c233e" />
          <stop offset=".39" stopColor="#b93950" />
          <stop offset=".69" stopColor="#8f1732" />
          <stop offset="1" stopColor="#420b1d" />
        </linearGradient>
        <linearGradient id={`${id}-body-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0d5" stopOpacity=".16" />
          <stop offset=".5" stopColor="#38071a" stopOpacity="0" />
          <stop offset="1" stopColor="#280819" stopOpacity=".58" />
        </linearGradient>
        <linearGradient id={`${id}-ivory`} x1="0" y1="0" x2=".2" y2="1">
          <stop offset="0" stopColor="#fffcef" />
          <stop offset=".45" stopColor="#f7e9ce" />
          <stop offset="1" stopColor="#b9a27d" />
        </linearGradient>
        <linearGradient id={`${id}-inside`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9c795a" />
          <stop offset=".4" stopColor="#d8c0a0" />
          <stop offset="1" stopColor="#f8e8cb" />
        </linearGradient>
        <linearGradient id={`${id}-saucer-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff9eb" />
          <stop offset=".55" stopColor="#e8d8b9" />
          <stop offset="1" stopColor="#fff4de" />
        </linearGradient>
        <linearGradient id={`${id}-saucer-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bba585" />
          <stop offset=".4" stopColor="#e5d4b5" />
          <stop offset="1" stopColor="#fbefd6" />
        </linearGradient>
        <linearGradient id={`${id}-handle`} gradientUnits="userSpaceOnUse" x1="248" y1="143" x2="292" y2="231">
          <stop offset="0" stopColor="#d48283" />
          <stop offset=".24" stopColor="#ab3a50" />
          <stop offset=".6" stopColor="#821c35" />
          <stop offset="1" stopColor="#460e22" />
        </linearGradient>
        <radialGradient id={`${id}-chocolate`} cx=".35" cy=".25" r=".85">
          <stop offset="0" stopColor="#a36b43" />
          <stop offset=".36" stopColor="#754329" />
          <stop offset="1" stopColor="#3d2118" />
        </radialGradient>
        <linearGradient id={`${id}-stream`} gradientUnits="userSpaceOnUse" x1={geometry.origin.x - 4} y1="0" x2={geometry.origin.x + 4} y2="0">
          <stop offset="0" stopColor="#452318" />
          <stop offset=".5" stopColor="#99603a" />
          <stop offset="1" stopColor="#633320" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop offset="0" stopColor="#160913" stopOpacity=".5" />
          <stop offset="1" stopColor="#160913" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glaze`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff5dc" stopOpacity=".45" />
          <stop offset=".55" stopColor="#fff5dc" stopOpacity=".09" />
          <stop offset="1" stopColor="#fff5dc" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-mouth`}>
          <ellipse cx={CENTER_X} cy={RIM_Y} rx="80" ry={geometry.rimRadiusY - 6} />
        </clipPath>
        <clipPath id={`${id}-saucer-surface`}>
          <ellipse cx={CENTER_X} cy={PIVOT_Y} rx={SAUCER_RADIUS_X - 1} ry={SAUCER_RADIUS_Y - 1} />
        </clipPath>
      </defs>

      <ellipse cx={CENTER_X} cy={PIVOT_Y + 12} rx="148" ry="38" fill={url('shadow')} />
      <ellipse cx={CENTER_X} cy={PIVOT_Y + 4} rx={SAUCER_RADIUS_X} ry={SAUCER_RADIUS_Y} fill="#bca483" />
      <ellipse cx={CENTER_X} cy={PIVOT_Y} rx={SAUCER_RADIUS_X} ry={SAUCER_RADIUS_Y} fill={url('saucer-rim')} stroke="#fff3dc" strokeWidth="1" />
      <ellipse cx={CENTER_X} cy={PIVOT_Y} rx="117" ry="26" fill={url('saucer-well')} />
      <path d="M 49 247 A 117 26 0 0 1 283 247" fill="none" stroke="#a48a66" strokeOpacity=".35" strokeWidth="1.2" />
      <path d="M 49 247 A 117 26 0 0 0 283 247" fill="none" stroke="#fff9e9" strokeOpacity=".8" strokeWidth="1.2" />
      <g clipPath={url('saucer-surface')}>
        {Object.entries(residue.puddles).map(([bin, puddle]) => {
        const amount = puddle.amount / 100;
        return (
        <g key={bin} opacity={Math.min(0.9, 0.3 + amount)}>
          <path
            d={`M ${puddle.x - 11 - amount * 17} ${puddle.y} C ${puddle.x - 19 - amount * 15} ${puddle.y - 8}, ${puddle.x + 22 + amount * 7} ${puddle.y - 8}, ${puddle.x + 21 + amount * 8} ${puddle.y} C ${puddle.x + 15 + amount * 13} ${puddle.y + 8}, ${puddle.x - 19 - amount * 12} ${puddle.y + 7}, ${puddle.x - 11 - amount * 17} ${puddle.y} Z`}
            fill={url('chocolate')}
          />
          <ellipse cx={puddle.x - 3} cy={puddle.y - 1} rx={7 + amount * 7} ry="1.4" fill="#dca677" opacity=".35" />
        </g>
        );
        })}
      </g>
      <ellipse cx={CENTER_X} cy={PIVOT_Y + 2} rx="62" ry="15" fill={url('shadow')} />
      <ellipse cx={CENTER_X} cy={PIVOT_Y + 1} rx="48" ry="10" fill="#4b3524" opacity=".2" />

      {geometry.rear ? stream : null}

      <g transform={`rotate(${geometry.angle} ${CENTER_X} ${PIVOT_Y})`}>
        <path d="M 246 145 C 280 134, 310 146, 315 173 C 321 205, 294 233, 263 230 C 250 229, 240 223, 233 216 L 242 201 C 250 208, 259 213, 269 212 C 288 211, 302 195, 300 178 C 299 162, 286 154, 269 157 L 250 163 Z" fill={url('handle')} />
        <path d="M 251 162 L 269 157 C 286 154, 299 162, 300 178 C 302 195, 288 211, 269 212 C 259 213, 250 208, 242 201" fill="none" stroke="#3d0b1d" strokeOpacity=".48" strokeWidth="2" strokeLinecap="round" />
        <path d="M 257 145 C 282 140, 303 151, 310 170" fill="none" stroke="#f4c4ad" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="166" cy="247" rx="48" ry="11" fill="#541125" />
        <path d="M 76 137 C 79 184, 87 221, 111 238 C 137 256, 195 256, 221 238 C 245 221, 253 184, 256 137 Z" fill={url('ceramic')} />
        <path d="M 76 137 C 79 184, 87 221, 111 238 C 137 256, 195 256, 221 238 C 245 221, 253 184, 256 137 Z" fill={url('body-shade')} />
        <path d="M 96 155 C 96 186, 103 215, 119 227 C 108 207, 110 176, 115 157 Z" fill={url('glaze')} />
        <path d="M 129 242 Q 166 252, 204 242" fill="none" stroke="#d37074" strokeOpacity=".34" strokeWidth="2" strokeLinecap="round" />
        <path d="M 82 153 C 86 203, 94 221, 108 234" fill="none" stroke="#f3b39d" strokeOpacity=".16" strokeWidth="1.4" />

        <ellipse cx={CENTER_X} cy={RIM_Y} rx="91" ry={geometry.rimRadiusY} fill={url('ivory')} stroke="#fff1d6" strokeWidth="1.2" />
        <ellipse cx={CENTER_X} cy={RIM_Y} rx="80" ry={geometry.rimRadiusY - 6} fill={url('inside')} />
        <g clipPath={url('mouth')}>
          <g transform={`translate(${geometry.fluidOffset.x} ${geometry.fluidOffset.y}) rotate(${geometry.fluidAngle} ${CENTER_X} ${RIM_Y})`}>
            <ellipse cx={CENTER_X} cy={liquidY} rx="91" ry={liquidRadiusY} fill={url('chocolate')} />
            <ellipse cx={CENTER_X} cy={liquidY} rx="89" ry={Math.max(9, liquidRadiusY - 1)} fill="none" stroke="#bc875a" strokeOpacity=".5" strokeWidth="1.2" />
            <path className="cocoa-cup__sheen" d={`M 111 ${liquidY - 4} C 129 ${liquidY - 11}, 161 ${liquidY - 12}, 180 ${liquidY - 7}`} fill="none" stroke="#ebc597" strokeOpacity=".46" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="202" cy={liquidY + 2} rx="10" ry="2.2" fill="#d8a170" opacity=".25" />
            {[112, 120, 132, 213, 221].map((x, index) => (
              <ellipse key={x} cx={x} cy={liquidY + (index % 2 ? 3 : 6)} rx={index % 2 ? 1.8 : 1.2} ry=".8" fill="#d2a071" opacity=".65" />
            ))}
          </g>
        </g>
        <path d={`M 77 ${RIM_Y} A 89 ${geometry.rimRadiusY} 0 0 0 255 ${RIM_Y}`} fill="none" stroke="#ffefd2" strokeWidth="2.1" strokeOpacity=".9" />
        {rimWarning > 0 ? (
          <g opacity={rimWarning}>
            <path
              d={`${crestEdge} L ${crestInnerEnd} Q ${crestInnerMiddle} ${crestInnerStart} Z`}
              fill={url('chocolate')}
            />
            <path className="cocoa-cup__crest-highlight" d={crestEdge} fill="none" stroke="#e2ad7c" strokeWidth={0.8 + rimWarning * 1.1} strokeLinecap="round" />
          </g>
        ) : null}
      </g>

      {!geometry.rear ? stream : null}

      <g className="cocoa-cup__steam" transform={`translate(${geometry.mouthCenter.x - CENTER_X} ${geometry.mouthCenter.y - RIM_Y})`} fill="none" strokeLinecap="round" pointerEvents="none">
        <path className="cocoa-cup__wisp cocoa-cup__wisp--one" d="M 133 103 C 112 85, 150 73, 131 52 C 120 39, 131 26, 140 17" stroke="#fff0dd" strokeWidth="3.5" />
        <path className="cocoa-cup__wisp cocoa-cup__wisp--two" d="M 169 101 C 186 78, 151 64, 168 44 C 180 30, 174 21, 168 12" stroke="#ffefd8" strokeWidth="4" />
        <path className="cocoa-cup__wisp cocoa-cup__wisp--three" d="M 200 105 C 219 83, 188 72, 203 55 C 212 45, 212 34, 203 26" stroke="#fff1e0" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
