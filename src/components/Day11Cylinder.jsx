const SCALE = 82;
const FAR_X = -1.07;
const NEAR_X = 1.03;
const DIAMETER_SCALE = 1.12;
const RADIUS = 0.28 * DIAMETER_SCALE;
// Keep the lower surface at the same clearance above the bed and comb.
// Shafts and bearings share this center, so their alignment follows the barrel.
const CENTER_Y = 1.14 + (RADIUS - 0.28);
const CENTER_Z = -0.3;
const BED_Y = 0.84;

const BRASS_TONES = [
  [0, [43, 32, 19]],
  [0.16, [111, 84, 44]],
  [0.27, [161, 130, 77]],
  [0.315, [201, 171, 111]],
  [0.345, [210, 183, 128]],
  [0.39, [176, 143, 84]],
  [0.55, [135, 103, 55]],
  [0.72, [91, 68, 37]],
  [0.84, [112, 87, 48]],
  [0.94, [74, 55, 32]],
  [1, [40, 30, 19]],
];

function brassTone(position) {
  const upperIndex = BRASS_TONES.findIndex(([stop]) => stop >= position);
  const [upperStop, upperColor] = BRASS_TONES[Math.max(1, upperIndex)];
  const [lowerStop, lowerColor] = BRASS_TONES[Math.max(0, upperIndex - 1)];
  const mix = (position - lowerStop) / (upperStop - lowerStop);
  return `rgb(${lowerColor.map((value, index) => Math.round(value + (upperColor[index] - value) * mix)).join(',')})`;
}

function pointOnBarrel(x, phase, radius = RADIUS) {
  return [x, CENTER_Y + radius * Math.cos(phase), CENTER_Z + radius * Math.sin(phase)];
}

function pathThrough(points, project, close = true) {
  return points.map((point, index) => {
    const { x, y } = project(point);
    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ') + (close ? ' Z' : '');
}

function capPlane(x, plane) {
  return plane([x, CENTER_Y, CENTER_Z], [0, 0, -1 / SCALE], [0, -1 / SCALE, 0]);
}

function Shaft({ from, to, project }) {
  const start = project([from, CENTER_Y, CENTER_Z]);
  const end = project([to, CENTER_Y, CENTER_Z]);
  return (
    <g>
      <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} stroke="#423620" strokeWidth="7" strokeLinecap="round" />
      <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} stroke="url(#day11-steel)" strokeWidth="4.8" strokeLinecap="round" />
      <path d={`M${start.x - 0.7} ${start.y - 0.7} L${end.x - 0.7} ${end.y - 0.7}`} stroke="#fff2c4" strokeWidth="0.85" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Bearing({ x, project, plane }) {
  const bottom = (CENTER_Y - BED_Y) * SCALE;
  const frontX = x + 0.035;
  return (
    <g>
      <path
        d={pathThrough([
          [x - 0.08, BED_Y + 0.002, CENTER_Z - 0.14],
          [x + 0.1, BED_Y + 0.002, CENTER_Z - 0.14],
          [x + 0.1, BED_Y + 0.002, CENTER_Z + 0.14],
          [x - 0.08, BED_Y + 0.002, CENTER_Z + 0.14],
        ], project)}
        fill="#251e12" opacity="0.35"
      />
      <path
        d={pathThrough([
          [x - 0.035, BED_Y, CENTER_Z - 0.085],
          [frontX, BED_Y, CENTER_Z - 0.085],
          [frontX, CENTER_Y, CENTER_Z - 0.085],
          [x - 0.035, CENTER_Y, CENTER_Z - 0.085],
        ], project)}
        fill="#775622" stroke="#59431e" strokeWidth="0.5"
      />
      <g transform={capPlane(frontX, plane)}>
        <path d={`M-7 ${bottom} V0 A7 7 0 0 1 7 0 V${bottom} Z`} fill="url(#day11-brass)" stroke="#73572b" strokeWidth="0.8" />
        <path d={`M-5 ${bottom - 1} V2`} fill="none" stroke="#f5d995" strokeWidth="0.7" opacity="0.65" />
        <path d={`M-8.5 ${bottom} H8.5`} stroke="#d8b66c" strokeWidth="2.4" strokeLinecap="round" />
        <circle r="4.6" fill="#594624" stroke="#ecd393" strokeWidth="0.7" />
        <circle r="2.8" fill="url(#day11-steel)" stroke="#625838" strokeWidth="0.7" />
      </g>
    </g>
  );
}

const GEAR_PATH = Array.from({ length: 48 }, (_, index) => {
  const phase = index * Math.PI * 2 / 48;
  const radius = index % 4 < 2 ? 8.6 : 7.2;
  return `${index === 0 ? 'M' : 'L'}${Math.cos(phase) * radius} ${Math.sin(phase) * radius}`;
}).join(' ') + ' Z';

export default function Day11Cylinder({ rotation, project, plane, viewDirection }) {
  // Only this half of the curved surface faces the shared camera.
  const facingPhase = Math.atan2(viewDirection[2], viewDirection[1]);
  const firstPhase = facingPhase - Math.PI / 2;
  const farLight = project([FAR_X, CENTER_Y, CENTER_Z]);
  const nearLight = project([NEAR_X, CENTER_Y, CENTER_Z]);
  const segmentCount = 64;
  const surfaceOutline = pathThrough([
    ...Array.from({ length: 33 }, (_, i) => pointOnBarrel(FAR_X, firstPhase + Math.PI * i / 32)),
    ...Array.from({ length: 33 }, (_, i) => pointOnBarrel(NEAR_X, firstPhase + Math.PI * (32 - i) / 32)),
  ], project);
  // A restrained, uneven reflection follows the existing surface, not its silhouette.
  const highlightEdge = (side) => Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    const unevenness = Math.sin(t * 19) * .003 + Math.sin(t * 43) * .0015;
    const halfWidth = .009 + .003 * Math.sin(t * 11);
    return pointOnBarrel(
      FAR_X + .025 + t * (NEAR_X - FAR_X - .05),
      firstPhase + Math.PI * (.33 + unevenness + side * halfWidth),
    );
  });
  const pins = Array.from({ length: 76 }, (_, index) => {
    const phase = rotation * 0.65 + index * 2.4;
    const facing = viewDirection[1] * Math.cos(phase) + viewDirection[2] * Math.sin(phase);
    const x = FAR_X + 0.12 + (index % 19) * (NEAR_X - FAR_X - 0.24) / 18;
    const base = pointOnBarrel(x, phase, RADIUS + 0.003 * DIAMETER_SCALE);
    return {
      index,
      facing,
      base: project(base),
      tip: project(pointOnBarrel(x, phase, RADIUS + 0.024 * DIAMETER_SCALE)),
      shadow: project(pointOnBarrel(x + .016 * DIAMETER_SCALE, phase + .036, RADIUS + .003 * DIAMETER_SCALE)),
      depth: base.reduce((sum, value, axis) => sum + value * viewDirection[axis], 0),
    };
  }).filter(({ facing }) => facing > 0).sort((left, right) => left.depth - right.depth);

  return (
    <g>
      <defs>
        <clipPath id="day11-cylinder-surface-clip"><path d={surfaceOutline} /></clipPath>
        <linearGradient id="day11-cylinder-rim" x1=".1" y1="0" x2=".9" y2="1">
          <stop stopColor="#d4bc86" /><stop offset=".28" stopColor="#9b7c44" />
          <stop offset=".55" stopColor="#66502f" /><stop offset=".85" stopColor="#392a17" />
          <stop offset="1" stopColor="#957646" />
        </linearGradient>
        <radialGradient id="day11-cylinder-hub-shadow">
          <stop offset=".48" stopColor="#20170c" stopOpacity=".65" />
          <stop offset="1" stopColor="#20170c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="day11-cylinder-length-light" gradientUnits="userSpaceOnUse" x1={farLight.x} y1={farLight.y} x2={nearLight.x} y2={nearLight.y}>
          {/* A gradual falloff replaces the abrupt dark band at the far end. */}
          <stop stopColor="#2b1502" stopOpacity=".1" />
          <stop offset=".08" stopColor="#2b1502" stopOpacity=".075" />
          <stop offset=".18" stopColor="#2b1502" stopOpacity=".05" />
          <stop offset=".55" stopColor="#c4a366" stopOpacity=".04" />
          <stop offset=".9" stopColor="#2b1502" stopOpacity=".08" />
          <stop offset="1" stopColor="#201004" stopOpacity=".45" />
        </linearGradient>
        <radialGradient id="day11-cylinder-shadow">
          <stop stopColor="#130f08" stopOpacity="0.58" />
          <stop offset="0.65" stopColor="#211608" stopOpacity="0.24" />
          <stop offset="1" stopColor="#211608" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="day11-cylinder-end" x1="0.15" y1="0" x2="0.8" y2="1">
          <stop stopColor="#b99c62" />
          <stop offset="0.3" stopColor="#96753e" />
          <stop offset="0.5" stopColor="#c1a267" />
          <stop offset="0.8" stopColor="#856332" />
          <stop offset="1" stopColor="#4c391f" />
        </linearGradient>
      </defs>

      <g transform={plane([(FAR_X + NEAR_X) / 2, BED_Y + 0.005, CENTER_Z], [1 / SCALE, 0, 0], [0, 0, 1 / SCALE])}>
        <ellipse rx={(NEAR_X - FAR_X) * SCALE / 2 + 9} ry={25 * DIAMETER_SCALE} fill="url(#day11-cylinder-shadow)" />
      </g>
      <Bearing x={FAR_X - 0.15} project={project} plane={plane} />
      <Shaft from={FAR_X - 0.22} to={FAR_X + 0.015} project={project} />

      <g transform={capPlane(FAR_X, plane)}>
        <circle r={RADIUS * SCALE} fill="#88652e" stroke="#d8bb78" strokeWidth="0.85" />
        <circle r={RADIUS * SCALE - 1.2 * DIAMETER_SCALE} fill="none" stroke="url(#day11-cylinder-rim)" strokeWidth={1.6 * DIAMETER_SCALE} />
        <circle r={RADIUS * SCALE - 1.5 * DIAMETER_SCALE} fill="none" stroke="#705022" strokeWidth={.8 * DIAMETER_SCALE} />
      </g>

      {/* Narrow projected surface strips preserve the curved silhouette and metal roll. */}
      {Array.from({ length: segmentCount }, (_, index) => {
        const start = firstPhase + Math.PI * index / segmentCount;
        const end = firstPhase + Math.PI * (index + 1) / segmentCount;
        const overlap = 0.0015;
        return (
          <path
            key={index}
            d={pathThrough([
              pointOnBarrel(FAR_X, start - (index === 0 ? 0 : overlap)),
              pointOnBarrel(NEAR_X, start - (index === 0 ? 0 : overlap)),
              pointOnBarrel(NEAR_X, end + (index === segmentCount - 1 ? 0 : overlap)),
              pointOnBarrel(FAR_X, end + (index === segmentCount - 1 ? 0 : overlap)),
            ], project)}
            fill={brassTone((index + 0.5) / segmentCount)}
          />
        );
      })}
      <path d={pathThrough([...highlightEdge(-1), ...highlightEdge(1).reverse()], project)} fill="#efdbac" opacity=".22" />
      <path d={surfaceOutline} fill="url(#day11-brass-texture)" opacity=".65" style={{ mixBlendMode: 'multiply' }} />
      <path d={surfaceOutline} fill="url(#day11-cylinder-length-light)" />
      {/* Fine wear rotates with the barrel, while the broad lighting stays fixed. */}
      {Array.from({ length: 54 }, (_, index) => {
        const phase = rotation * 0.65 + index * 2.39996;
        const facing = viewDirection[1] * Math.cos(phase) + viewDirection[2] * Math.sin(phase);
        if (facing <= 0) return null;
        const x = FAR_X + .08 + ((index * 0.618034) % 1) * (NEAR_X - FAR_X - .28);
        return <path key={index} d={pathThrough([
          pointOnBarrel(x, phase, RADIUS + .001),
          pointOnBarrel(x + .04 + (index % 4) * .024, phase, RADIUS + .001),
        ], project, false)} stroke={index % 3 ? '#503b1d' : '#cbb17c'} strokeWidth={index % 4 ? .45 : 1.1} opacity={facing * .42} />;
      })}
      {/* Cast shadows stay on the barrel and are drawn beneath every raised pin. */}
      <g clipPath="url(#day11-cylinder-surface-clip)">
        {pins.map(({ index, facing, base, shadow }) => (
          <path key={index} d={`M${base.x} ${base.y} L${shadow.x} ${shadow.y}`}
            stroke="#2d2112" strokeWidth={1.35 * DIAMETER_SCALE} strokeLinecap="round"
            opacity={.42 * Math.min(1, facing / .18)} />
        ))}
      </g>
      {pins.map(({ index, facing, base, tip }) => {
        const size = DIAMETER_SCALE * (.72 + .28 * Math.min(1, facing));
        const capAngle = Math.atan2(tip.y - base.y, tip.x - base.x) * 180 / Math.PI - 90;
        return (
          <g key={index} opacity={Math.min(1, facing / .16)}>
            <path d={`M${base.x} ${base.y} L${tip.x} ${tip.y}`} stroke="#4b351b" strokeWidth={1.8 * size} strokeLinecap="round" />
            <path d={`M${base.x - .17} ${base.y - .17} L${tip.x - .17} ${tip.y - .17}`} stroke="#b99a5c" strokeWidth={.7 * size} strokeLinecap="round" />
            <ellipse cx={tip.x} cy={tip.y} rx={.63 * size} ry={.63 * size * (.25 + .75 * facing)}
              transform={`rotate(${capAngle} ${tip.x} ${tip.y})`} fill="#ceb27a" />
            <circle cx={tip.x - .15} cy={tip.y - .18} r={.21 * size} fill="#f0dcb0" opacity={.45 + .3 * facing} />
          </g>
        );
      })}

      <g transform={capPlane(NEAR_X, plane)}>
        <circle r={RADIUS * SCALE} fill="url(#day11-cylinder-end)" stroke="#715322" strokeWidth="1" />
        <circle r={RADIUS * SCALE - .6} fill="url(#day11-brass-texture)" opacity=".65" style={{ mixBlendMode: 'multiply' }} />
        {/* Bevels grow with the disk; the central hub still fits the same shaft. */}
        <circle r={RADIUS * SCALE - 1.65 * DIAMETER_SCALE} fill="none" stroke="url(#day11-cylinder-rim)" strokeWidth={2.1 * DIAMETER_SCALE} />
        <circle r={RADIUS * SCALE - 2.9 * DIAMETER_SCALE} fill="none" stroke="#352817" strokeWidth={.65 * DIAMETER_SCALE} opacity=".7" />
        <circle r={RADIUS * SCALE - 3.4 * DIAMETER_SCALE} fill="none" stroke="#795a27" strokeWidth={.55 * DIAMETER_SCALE} opacity="0.55" />
        <circle r={RADIUS * SCALE - 4.4 * DIAMETER_SCALE} fill="none" stroke="#bca26d" strokeWidth={.4 * DIAMETER_SCALE} opacity="0.35" />
        <path d="M-12 -7 A14 14 0 0 1 4 -13" transform={`scale(${DIAMETER_SCALE})`} fill="none" stroke="#c1a670" strokeWidth=".7" strokeLinecap="round" opacity="0.25" />
        <circle r="8" fill="url(#day11-cylinder-hub-shadow)" />
        <circle r="6" fill="none" stroke="#b29862" strokeWidth=".4" opacity=".5" />
        <circle r="5.2" fill="url(#day11-brass)" stroke="#735627" strokeWidth="0.8" />
      </g>
      <Shaft from={NEAR_X} to={NEAR_X + 0.33} project={project} />
      <g transform={capPlane(NEAR_X + 0.1, plane)}>
        <g transform={`rotate(${-rotation * 0.65 * 180 / Math.PI})`}>
          <path d={GEAR_PATH} fill="url(#day11-brass)" stroke="#765523" strokeWidth="0.7" />
          <circle r="5.7" fill="#ac863f" stroke="#edcf88" strokeWidth="0.7" />
          <path d="M-4.5 0 H4.5 M0 -4.5 V4.5" stroke="#62491f" strokeWidth="1.1" />
          <circle r="2.1" fill="url(#day11-steel)" stroke="#645c41" strokeWidth="0.6" />
        </g>
      </g>
      <Bearing x={NEAR_X + 0.27} project={project} plane={plane} />
    </g>
  );
}
