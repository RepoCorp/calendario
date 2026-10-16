import { useEffect, useMemo, useRef } from 'react';
import Day11Cylinder from './Day11Cylinder';
import Day11Materials from './Day11Materials';

const SCALE = 74;
const YAW = 32 * Math.PI / 180;
const ELEVATION = 28 * Math.PI / 180;
const SIN_YAW = Math.sin(YAW);
const COS_YAW = Math.cos(YAW);
const SIN_ELEVATION = Math.sin(ELEVATION);
const COS_ELEVATION = Math.cos(ELEVATION);
const VIEW_DIRECTION = [SIN_YAW * COS_ELEVATION, SIN_ELEVATION, COS_YAW * COS_ELEVATION];

function project([x, y, z]) {
  return {
    x: 220 + SCALE * (COS_YAW * x - SIN_YAW * z),
    y: 315 + SCALE * (SIN_YAW * SIN_ELEVATION * x - COS_ELEVATION * y + COS_YAW * SIN_ELEVATION * z),
  };
}

// Each face is drawn in its own flat coordinates, then viewed by the same camera.
function plane(origin, across, down) {
  const point = project(origin);
  const horizontal = project(origin.map((value, index) => value + across[index]));
  const vertical = project(origin.map((value, index) => value + down[index]));
  return `matrix(${horizontal.x - point.x},${horizontal.y - point.y},${vertical.x - point.x},${vertical.y - point.y},${point.x},${point.y})`;
}

function polygon(points) {
  return points.map((point, index) => {
    const { x, y } = project(point);
    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ') + ' Z';
}

const crankMount = project([1.7, 0.65, 0.03]);
const crankEnd = project([2.01, 0.65, 0.03]);

export const MUSIC_BOX_VIEW = {
  width: 440,
  height: 422,
  crankX: crankEnd.x,
  crankY: crankEnd.y,
  crankProjection: { x: SIN_YAW, shear: -COS_YAW * SIN_ELEVATION, y: COS_ELEVATION },
  crankShaftProjection: { x: COS_YAW, y: SIN_YAW * SIN_ELEVATION },
};

const FRONT = plane([-1.7, 1.18, 1.1], [3.4 / 280, 0, 0], [0, -1.18 / 96, 0]);
const SIDE = plane([1.7, 1.18, 1.1], [0, 0, -2.2 / 180], [0, -1.18 / 96, 0]);
const TOP = plane([-1.7, 1.18, -1.1], [3.4 / 280, 0, 0], [0, 0, 2.2 / 160]);
const LID_ANGLE = 115 * Math.PI / 180;
const LID_DEPTH = 2.2; // Matches the opening from the rear hinge to the front rim.
function lidPoint(x, distance, thickness = 0) {
  return [
    x,
    1.18 + distance * Math.sin(LID_ANGLE) + thickness * Math.cos(LID_ANGLE),
    -1.1 + distance * Math.cos(LID_ANGLE) - thickness * Math.sin(LID_ANGLE),
  ];
}
const LID = plane(lidPoint(-1.7, LID_DEPTH), [3.4 / 280, 0, 0], [0, -LID_DEPTH * Math.sin(LID_ANGLE) / 180, -LID_DEPTH * Math.cos(LID_ANGLE) / 180]);
const MOUNT = plane([1.7, 0.65, 0.03], [0, 0, -1 / SCALE], [0, -1 / SCALE, 0]);

function Screw({ x, y, radius = 3 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill="url(#day11-steel)" stroke="#615232" strokeWidth="0.7" />
      <path d={`M${x - radius / 2} ${y + radius / 3} l${radius} ${-radius * 2 / 3}`} stroke="#4b442d" strokeWidth="0.8" />
    </g>
  );
}

const WELL_FLOOR = plane([-1.53, 0.78, -0.92], [3.06 / 252, 0, 0], [0, 0, 1.84 / 134]);
const BED = plane([-1.34, 0.84, -0.74], [2.68 / 211, 0, 0], [0, 0, 1.48 / 62]);
const COMB_BASE = plane([-1.16, 0.91, 0.50], [2.32 / 160, 0, 0], [0, 0, 0.18 / 10]);

function MetalStrip({ index, strike = 0 }) {
  const topAnimation = useRef(null);
  const sideAnimation = useRef(null);
  const textureAnimation = useRef(null);
  const frames = useMemo(() => {
    const x = -1.08 + index * 0.116;
    const edge = (across, bend, thickness = 0) => Array.from({ length: 9 }, (_, step) => {
      const t = step / 8;
      return [x + across, 0.89 + 0.075 * t + bend * t * t - thickness, 0.61 - 0.72 * t];
    });
    // Only the free end flexes; the screwed-down end never moves.
    return [0, -0.035, 0.105, -0.08, 0.058, -0.039, 0.023, -0.01, 0].map(bend => ({
      top: polygon([...edge(0, bend), ...edge(0.081, bend).reverse()]),
      side: polygon([...edge(0.081, bend), ...edge(0.081, bend, 0.02).reverse()]),
    }));
  }, [index]);
  useEffect(() => {
    if (!strike) return;
    topAnimation.current?.beginElement();
    sideAnimation.current?.beginElement();
    textureAnimation.current?.beginElement();
  }, [strike]);
  return (
    <g data-music-strip={index}>
      <path d={frames[0].side} fill="#5b5d4e">
        <animate ref={sideAnimation} attributeName="d" values={frames.map(frame => frame.side).join(';')} dur="480ms" begin="indefinite" restart="always" />
      </path>
      <path d={frames[0].top} fill="url(#day11-steel-texture)">
        <animate ref={textureAnimation} attributeName="d" values={frames.map(frame => frame.top).join(';')} dur="480ms" begin="indefinite" restart="always" />
      </path>
      <path d={frames[0].top} fill="url(#day11-steel)" fillOpacity="0.62" stroke="#c9c5ab" strokeWidth="0.3">
        <animate ref={topAnimation} attributeName="d" values={frames.map(frame => frame.top).join(';')} dur="480ms" begin="indefinite" restart="always" />
      </path>
    </g>
  );
}

function Mechanism({ rotation, stripStrikes }) {
  return (
    <>
      <path d={polygon([[-1.34, 0.80, 0.74], [1.34, 0.80, 0.74], [1.34, 0.84, 0.74], [-1.34, 0.84, 0.74]])} fill="#6b4b27" />
      <path d={polygon([[1.34, 0.80, -0.74], [1.34, 0.80, 0.74], [1.34, 0.84, 0.74], [1.34, 0.84, -0.74]])} fill="#75552d" />
      <g transform={BED}>
        <rect x="3" y="3" width="211" height="62" rx="4" fill="#100e09" opacity="0.3" />
        <rect width="211" height="62" rx="4" fill="url(#day11-brass)" stroke="#674822" />
        <rect x="5" y="4" width="201" height="54" rx="2" fill="url(#day11-brass-texture)" stroke="#ead399" strokeOpacity="0.45" />
        <rect x="5" y="4" width="201" height="54" rx="2" fill="url(#day11-wood-depth)" />
        {[[11, 9], [199, 9], [11, 53], [199, 53]].map(([x, y]) => <Screw key={`${x}-${y}`} x={x} y={y} />)}
      </g>
      {Array.from({ length: 19 }, (_, index) => <MetalStrip key={index} index={index} strike={stripStrikes?.[index]} />)}
      <g transform={COMB_BASE}>
        <rect width="160" height="10" rx="1" fill="url(#day11-steel)" stroke="#62604a" />
        <Screw x={12} y={5} /><Screw x={148} y={5} />
      </g>
      <Day11Cylinder rotation={rotation} project={project} plane={plane} viewDirection={VIEW_DIRECTION} />
    </>
  );
}

export default function MusicBoxArtwork({ rotation, stripStrikes }) {
  return (
    <svg className="day11-box-art" viewBox={`0 0 ${MUSIC_BOX_VIEW.width} ${MUSIC_BOX_VIEW.height}`} aria-hidden="true">
      <defs>
        <Day11Materials />
        <linearGradient id="day11-walnut" x2="0.15" y2="1">
          <stop stopColor="#ad7043" /><stop offset="0.3" stopColor="#784327" />
          <stop offset="0.75" stopColor="#512b1c" /><stop offset="1" stopColor="#8c502e" />
        </linearGradient>
        <linearGradient id="day11-edge" x2="0" y2="1">
          <stop stopColor="#d29c61" /><stop offset="0.25" stopColor="#9b6239" />
          <stop offset="1" stopColor="#452417" />
        </linearGradient>
        <linearGradient id="day11-side" x2="1" y2="0.3">
          <stop stopColor="#6d3d25" /><stop offset="1" stopColor="#2d1a14" />
        </linearGradient>
        <linearGradient id="day11-brass" x2="0" y2="1">
          <stop stopColor="#6e4b20" /><stop offset="0.18" stopColor="#dbb773" />
          <stop offset="0.35" stopColor="#fff0b6" /><stop offset="0.51" stopColor="#c89b4b" />
          <stop offset="0.82" stopColor="#785326" /><stop offset="1" stopColor="#d9b06b" />
        </linearGradient>
        <linearGradient id="day11-steel" x2="0.85" y2="0.4">
          <stop stopColor="#302d26" /><stop offset="0.2" stopColor="#aaa99a" />
          <stop offset="0.38" stopColor="#f5f0da" /><stop offset="0.46" stopColor="#d8d6c5" />
          <stop offset="0.58" stopColor="#565951" /><stop offset="0.85" stopColor="#b6b6a7" />
          <stop offset="1" stopColor="#49483f" />
        </linearGradient>
        <linearGradient id="day11-velvet" x2="0.4" y2="1">
          <stop stopColor="#36151a" /><stop offset="0.5" stopColor="#732c32" />
          <stop offset="1" stopColor="#3f171e" />
        </linearGradient>
        <linearGradient id="day11-handle" x2="1" y2="0.2">
          <stop stopColor="#251813" /><stop offset="0.3" stopColor="#885739" />
          <stop offset="0.48" stopColor="#a3724b" /><stop offset="0.68" stopColor="#593722" />
          <stop offset="1" stopColor="#201712" />
        </linearGradient>
        <radialGradient id="day11-shadow">
          <stop stopColor="#000" stopOpacity="0.45" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform={plane([0, -0.22, 0], [1 / SCALE, 0, 0], [0, 0, 1 / SCALE])}>
        <ellipse rx="184" ry="124" fill="url(#day11-shadow)" />
      </g>

      <path d={polygon([[-1.85, 0.08, -1.25], [1.85, 0.08, -1.25], [1.85, 0.08, 1.25], [-1.85, 0.08, 1.25]])} fill="url(#day11-edge)" stroke="#9b6b40" strokeWidth=".8" />
      <path d={polygon([[-1.85, 0.08, 1.25], [1.85, 0.08, 1.25], [1.85, -0.1, 1.25], [-1.85, -0.1, 1.25]])} fill="url(#day11-walnut)" stroke="#4a2d1f" strokeWidth=".8" />
      <path d={polygon([[1.85, 0.08, 1.25], [1.85, 0.08, -1.25], [1.85, -0.1, -1.25], [1.85, -0.1, 1.25]])} fill="url(#day11-side)" stroke="#4a2d1f" strokeWidth=".8" />
      <path d={polygon([[-1.85, -0.1, 1.25], [1.85, -0.1, 1.25], [1.76, -0.2, 1.16], [-1.76, -0.2, 1.16]])} fill="#4c2c1e" stroke="#ae7b49" strokeWidth=".6" />
      <path d={polygon([[1.85, -0.1, 1.25], [1.85, -0.1, -1.25], [1.76, -0.2, -1.16], [1.76, -0.2, 1.16]])} fill="#342219" stroke="#795333" strokeWidth=".6" />

      {/* A full-depth lid rotates around the rear rim; its thickness follows its normal. */}
      <path
        d={polygon([lidPoint(-1.7, LID_DEPTH), lidPoint(1.7, LID_DEPTH), lidPoint(1.7, LID_DEPTH, 0.1), lidPoint(-1.7, LID_DEPTH, 0.1)])}
        fill="url(#day11-edge)" stroke="#c28b54" strokeWidth="1"
      />
      <path
        d={polygon([lidPoint(1.7, LID_DEPTH), lidPoint(1.7, 0), lidPoint(1.7, 0, 0.1), lidPoint(1.7, LID_DEPTH, 0.1)])}
        fill="url(#day11-side)" stroke="#44281a" strokeWidth="1"
      />
      <g transform={LID}>
        <rect width="280" height="180" rx="5" fill="url(#day11-walnut)" stroke="#c28b54" strokeWidth="2" />
        <rect width="280" height="180" rx="5" fill="url(#day11-grain)" />
        <rect width="280" height="180" rx="5" fill="url(#day11-wood-depth)" />
        <rect x="14" y="13" width="252" height="152" rx="2" fill="url(#day11-lining)" stroke="#34170a" strokeWidth="3" />
        <rect x="14" y="13" width="252" height="152" rx="2" fill="url(#day11-lining-shadow)" />
        <path d="M14 165 V13 H266" fill="none" stroke="#170a04" strokeWidth="3" opacity=".6" />
        <path d="M3 177 V3 H277" fill="none" stroke="#f8c380" strokeWidth="1.4" opacity=".6" />
        {[[2, 2], [263, 2], [2, 161], [263, 161]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="15" height="17" rx="2" fill="url(#day11-brass)" stroke="#382916" />
            <rect x={x} y={y} width="15" height="17" rx="2" fill="url(#day11-brass-texture)" opacity=".4" />
            <Screw x={x + 7.5} y={y + 8.5} radius={4} />
          </g>
        ))}
        {[43, 213].map((x) => (
          <g key={x} fill="url(#day11-brass)" stroke="#68481f" strokeWidth="0.7">
            <rect x={x} y="166" width="25" height="14" rx="1" />
            <Screw x={x + 6} y={171} radius={2} /><Screw x={x + 19} y={171} radius={2} />
          </g>
        ))}
      </g>

      {/* A recessed floor and actual wall faces give the opening its depth. */}
      <g transform={WELL_FLOOR}>
        <rect width="252" height="134" fill="#45301f" />
        <rect width="252" height="134" fill="url(#day11-grain)" opacity="0.5" />
      </g>
      <path d={polygon([[-1.53, 1.18, -0.92], [1.53, 1.18, -0.92], [1.53, 0.78, -0.92], [-1.53, 0.78, -0.92]])} fill="#291c14" stroke="#64462b" strokeWidth="0.6" />
      <path d={polygon([[-1.53, 1.18, -0.92], [-1.53, 1.18, 0.92], [-1.53, 0.78, 0.92], [-1.53, 0.78, -0.92]])} fill="#362519" stroke="#64462b" strokeWidth="0.6" />
      <Mechanism rotation={rotation} stripStrikes={stripStrikes} />
      <path d={polygon([[-1.53, 1.18, 0.92], [1.53, 1.18, 0.92], [1.53, 0.78, 0.92], [-1.53, 0.78, 0.92]])} fill="url(#day11-side)" stroke="#6b492c" strokeWidth="0.6" />
      <path d={polygon([[1.53, 1.18, -0.92], [1.53, 1.18, 0.92], [1.53, 0.78, 0.92], [1.53, 0.78, -0.92]])} fill="#4c311d" stroke="#6b492c" strokeWidth="0.6" />
      {/* Both visible sides use the same three-quarter view as the lid. */}
      <g transform={FRONT}>
        <rect width="280" height="96" fill="url(#day11-walnut)" stroke="#3b2218" />
        <rect width="280" height="96" fill="url(#day11-grain)" />
        <rect width="280" height="96" fill="url(#day11-wood-depth)" />
        {[0, 267].map(x => <g key={x}>
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={x} y={i * 16} width="13" height="16" fill={i % 2 ? '#e4a45a' : '#170c05'} opacity={i % 2 ? '.18' : '.48'} stroke="#28170d" strokeWidth=".6" />)}
        </g>)}
        <g transform="translate(140 59)" fill="none" strokeLinecap="round">
          <path d="M-87 8 C-63 33 -55 -19 -29 -3 S-9 3 0 -18 C9 3 13 6 29 -3 S63 33 87 8 M-68 -10 C-36 -20 -33 22 0 12 C33 22 36 -20 68 -10 M0 -18 V24" stroke="#211004" strokeWidth="4" />
          <path d="M-87 7 C-63 32 -55 -20 -29 -4 S-9 2 0 -19 C9 2 13 5 29 -4 S63 32 87 7 M-68 -11 C-36 -21 -33 21 0 11 C33 21 36 -21 68 -11 M0 -19 V23" stroke="#c8944a" strokeWidth="1.3" />
          <path d="M0 -16 L5 -2 L17 3 L5 7 L0 20 L-5 7 L-17 3 L-5 -2 Z" fill="url(#day11-brass)" stroke="#3b210c" strokeWidth="1.2" />
        </g>
        <path d="M1 89 H279 M1 95 H279" fill="none" stroke="#d0a068" strokeOpacity="0.55" />
        <path d="M127 8 H153 V24 Q140 34 127 24 Z" fill="url(#day11-brass)" stroke="#68481f" strokeWidth="0.7" />
        <circle cx="140" cy="20" r="3" fill="#49361e" />
      </g>
      <g transform={SIDE}>
        <rect width="180" height="96" fill="url(#day11-walnut)" stroke="#362015" />
        <rect width="180" height="96" fill="url(#day11-side)" opacity="0.28" />
        <rect width="180" height="96" fill="url(#day11-grain)" />
        <rect width="180" height="96" fill="url(#day11-side)" opacity=".45" />
        <rect width="180" height="96" fill="url(#day11-wood-depth)" />
        <rect x="8" y="12" width="164" height="71" fill="none" stroke="#bf8b51" strokeOpacity="0.6" />
        <rect x="13" y="17" width="154" height="61" fill="none" stroke="#281b13" />
        <path d="M1 89 H179 M1 95 H179" fill="none" stroke="#d0a068" strokeOpacity="0.55" />
        <path d="M3 0 V96" stroke="#d7a56c" strokeOpacity="0.4" />
      </g>

      {/* Projecting mouldings give the body a substantial rim and bevelled base. */}
      <path d={polygon([[-1.8, 1.18, 1.2], [1.8, 1.18, 1.2], [1.8, 1.08, 1.2], [-1.8, 1.08, 1.2]])} fill="url(#day11-walnut)" stroke="#6b4229" strokeWidth=".8" />
      <path d={polygon([[1.8, 1.18, 1.2], [1.8, 1.18, -1.2], [1.8, 1.08, -1.2], [1.8, 1.08, 1.2]])} fill="url(#day11-side)" stroke="#6b4229" strokeWidth=".8" />
      <g transform={TOP}>
        <path d="M-8 -7 H288 V167 H-8 Z M14 13 V147 H266 V13 Z" fill="url(#day11-edge)" fillRule="evenodd" stroke="#c28c56" strokeWidth="1.2" />
        <path d="M-8 -7 H288 V167 H-8 Z M14 13 V147 H266 V13 Z" fill="url(#day11-grain)" fillRule="evenodd" />
        <path d="M-8 -7 H288 V167 H-8 Z M14 13 V147 H266 V13 Z" fill="url(#day11-wood-depth)" fillRule="evenodd" />
        <path d="M14 147 H266 V13 M-8 167 H288 V-7" fill="none" stroke="#d9aa6b" strokeWidth="1.2" strokeOpacity="0.65" />
        {[43, 213].map((x) => (
          <g key={x} fill="url(#day11-brass)" stroke="#68481f" strokeWidth="0.7">
            <rect x={x} y="0" width="25" height="15" rx="1" />
            <rect x={x - 1} y="0" width="27" height="5" rx="1.5" />
            <Screw x={x + 6} y={10} radius={2} /><Screw x={x + 19} y={10} radius={2} />
          </g>
        ))}
      </g>

      {/* The rotating control is supplied by Day11 at this fixed shaft endpoint. */}
      <g transform={MOUNT}>
        <circle r="15" fill="url(#day11-brass)" stroke="#533d21" strokeWidth="1.5" />
        <circle r="11" fill="none" stroke="#f0d399" strokeOpacity="0.6" />
        <circle r="5" fill="#36291d" />
        <Screw x={0} y={-11} radius={1.7} /><Screw x={0} y={11} radius={1.7} />
      </g>
      <path d={`M${crankMount.x} ${crankMount.y} L${crankEnd.x} ${crankEnd.y}`} stroke="#2b2015" strokeWidth="11" strokeLinecap="round" />
      <path d={`M${crankMount.x - 1} ${crankMount.y - 1} L${crankEnd.x - 1} ${crankEnd.y - 1}`} stroke="url(#day11-brass)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
