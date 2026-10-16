const SPRITE = '/images/day19-glass-lantern.png';

export default function Day19Lantern({ position, captureRef }) {
  // The sprite's opening is at (50%, 39%), above its rounded glass body.
  const placement = { left: `${position.x}%`, top: `${position.y}%` };
  return (
    <>
      <div className="day19-lantern" ref={captureRef} style={placement} aria-hidden="true">
        <span className="day19-lantern-halo" />
        <img src={SPRITE} alt="" draggable="false" decoding="async" />
        <span className="day19-lantern-light" />
        <span className="day19-lantern-progress" />
      </div>
      <div className="day19-lantern-front" style={placement} aria-hidden="true">
        <img src={SPRITE} alt="" draggable="false" decoding="async" />
        <span className="day19-lantern-light" />
      </div>
    </>
  );
}
