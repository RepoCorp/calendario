const ATLAS = '/images/day11-antique-materials.png';

// Photographic material scans share one asset; each plane supplies perspective.
export default function Day11Materials() {
  return (
    <>
      <pattern id="day11-grain" width="280" height="180" patternUnits="userSpaceOnUse">
        <image href={ATLAS} width="560" height="360" preserveAspectRatio="none" />
      </pattern>
      <pattern id="day11-lining" x="14" y="13" width="252" height="152" patternUnits="userSpaceOnUse">
        <image href={ATLAS} x="-252" width="504" height="304" preserveAspectRatio="none" />
      </pattern>
      <pattern id="day11-brass-texture" width="110" height="110" patternUnits="userSpaceOnUse" patternTransform="rotate(16)">
        <image href={ATLAS} y="-110" width="220" height="220" preserveAspectRatio="none" />
      </pattern>
      <pattern id="day11-steel-texture" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(16)">
        <image href={ATLAS} x="-64" y="-64" width="128" height="128" preserveAspectRatio="none" />
      </pattern>
      <linearGradient id="day11-wood-depth" x2="0.1" y2="1">
        <stop stopColor="#ffe0a1" stopOpacity=".22" />
        <stop offset=".15" stopColor="#1c0902" stopOpacity=".05" />
        <stop offset=".8" stopColor="#1c0902" stopOpacity=".18" />
        <stop offset="1" stopColor="#120602" stopOpacity=".55" />
      </linearGradient>
      <radialGradient id="day11-lining-shadow" cx=".52" cy=".42" r=".7">
        <stop offset=".3" stopColor="#140300" stopOpacity="0" />
        <stop offset="1" stopColor="#140300" stopOpacity=".82" />
      </radialGradient>
    </>
  );
}
