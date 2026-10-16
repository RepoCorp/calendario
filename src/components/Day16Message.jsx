const SNOW_FRAMES = [
  '/images/day16-snow-melt-stage2-preview.png',
  '/images/day16-snow-melt-early.png',
  '/images/day16-snow-melt-middle.png',
  '/images/day16-snow-melt-last.png',
];
// Generated keyframes at steps 0, 2, 4, and 5; intermediate taps blend them.
const FRAME_WEIGHTS = [
  [1, 0, 0, 0], [.5, .5, 0, 0], [0, 1, 0, 0],
  [0, .5, .5, 0], [0, 0, 1, 0], [0, 0, 0, 1],
];

export default function Day16Message({ rounds, revealed }) {
  const weights = FRAME_WEIGHTS[Math.min(Math.max(rounds, 0), 5)];
  return (
    <article className={`day01-note day16-note${revealed ? ' is-revealed' : ''}`}>
      <div className="day16-message-content" aria-hidden={!revealed}>
        <p className="day16-message-title">Que nunca les falten motivos para reír. Sus risas llenan de alegría esta Navidad. Los quiero muchísimo.</p>
      </div>
      <div className="day16-snow-cover" aria-hidden="true">
        {SNOW_FRAMES.map((src, index) => (
          <img key={src} className="day16-snow-frame" src={src} alt="" draggable={false} style={{ opacity: revealed ? 0 : weights[index] }} />
        ))}
      </div>
    </article>
  );
}
