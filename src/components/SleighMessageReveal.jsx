export function messageTravel(progress) {
  return Math.max(0, Math.min(1, progress));
}

export default function SleighMessageReveal({ progress, complete, children }) {
  const travel = complete ? 1 : messageTravel(progress);
  return (
    <div className="day08-message-reveal">
      <div className={`day08-message-convoy${progress === 0 && !complete ? ' is-reset' : ''}`}
        style={{ '--pull-offset': `${(travel - 1) * 100}%` }}>
        <article className="day01-note day08-note" aria-hidden={!complete}>
          {children}
        </article>
        <svg className="day08-message-sleigh" viewBox="0 0 120 80" role="img"
          aria-label="Un trineo trae el mensaje" aria-hidden={complete}>
          <path d="M0 40Q17 44 34 46" fill="none" stroke="#c8a36a" strokeWidth="2" />
          <path d="M0 40Q17 42 34 46" fill="none" stroke="#f4d596" strokeWidth=".6" />
          <ellipse cx="72" cy="66" rx="37" ry="5" fill="#000" opacity=".2" />
          <defs>
            <linearGradient id="message-sleigh-red" x2="0" y2="1">
              <stop stopColor="#c44945" /><stop offset="1" stopColor="#661426" />
            </linearGradient>
          </defs>
          <path d="M36 39Q63 46 98 34L94 54Q65 62 40 51Z" fill="url(#message-sleigh-red)" stroke="#d8b267" strokeWidth="1.5" />
          <path d="m43 53-3 10h58q13 0 13-12 M53 54v9 M88 55v8" fill="none" stroke="#daba75" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 36v-7q0-5-5-5 M98 34l3-10q2-7 7-6" fill="none" stroke="#daba75" strokeWidth="3" strokeLinecap="round" />
          <rect x="46" y="21" width="24" height="22" rx="2" fill="#cbaa69" stroke="#e8d094" />
          <path d="M58 21v22 M46 29h24" stroke="#315a3f" strokeWidth="4" />
          <rect x="71" y="26" width="21" height="15" rx="2" fill="#315a3f" stroke="#72926a" />
          <path d="M81 26v15 M71 31h21" stroke="#d4b777" strokeWidth="3" />
          <path d="M58 21q-14-9-9-12t9 12q10-15 13-9t-13 9" fill="none" stroke="#719469" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
