// Layered boughs and fine needles share the game's coordinate system.
export default function Day13Tree({ x, y, width, height }) {
  return <g transform={`translate(${x} ${y}) scale(${width / 120} ${height / 220})`}>
    <defs>
      <linearGradient id="day13-bough" x1="0" x2="1"><stop stopColor="#102f29"/><stop offset=".45" stopColor="#43816a"/><stop offset=".7" stopColor="#235a45"/><stop offset="1" stopColor="#0c3029"/></linearGradient>
      <linearGradient id="day13-trunk"><stop stopColor="#38271f"/><stop offset=".4" stopColor="#a37b47"/><stop offset="1" stopColor="#46301e"/></linearGradient>
      <radialGradient id="day13-gold" cx=".3" cy=".25"><stop stopColor="#fff6cb"/><stop offset=".2" stopColor="#eccc76"/><stop offset=".65" stopColor="#b88630"/><stop offset="1" stopColor="#66421c"/></radialGradient>
      <radialGradient id="day13-red" cx=".3" cy=".25"><stop stopColor="#ffe1cd"/><stop offset=".22" stopColor="#ef6961"/><stop offset=".6" stopColor="#b71f35"/><stop offset="1" stopColor="#510d28"/></radialGradient>
    </defs>
    <ellipse cx="60" cy="214" rx="50" ry="5" fill="#051d24" opacity=".45"/>
    <path d="M55 150h10l4 61H52Z" fill="url(#day13-trunk)"/>
    {Array.from({ length: 12 }, (_, row) => {
      const cy = 22 + row * 15;
      const spread = 8 + row * 4.4;
      return <g key={row}>
        <path d={`M60 ${cy - 18} Q${60-spread*.55} ${cy+5} ${60-spread} ${cy+23} L${60-spread*.78} ${cy+20} ${60-spread*.85} ${cy+27} ${60-spread*.55} ${cy+23} ${60-spread*.6} ${cy+31} ${60-spread*.25} ${cy+26} 60 ${cy+32} ${60+spread*.25} ${cy+26} ${60+spread*.6} ${cy+31} ${60+spread*.55} ${cy+23} ${60+spread*.85} ${cy+27} ${60+spread*.78} ${cy+20} ${60+spread} ${cy+23} Q${60+spread*.55} ${cy+5} 60 ${cy-18}`} fill="url(#day13-bough)"/>
        {[-1, 1].map(side => <g key={side}>
          <path d={`M60 ${cy} Q${60+side*spread*.4} ${cy+14} ${60+side*spread} ${cy+23}`} fill="none" stroke="#6d8c65" strokeWidth=".7"/>
          {Array.from({length: 11}, (_, n) => {
            const t = (n+1)/12; const px = 60+side*spread*t; const py = cy+23*t;
            return <path key={n} d={`M${px} ${py} l${-side*(3+t*4)} ${-7-t*5} M${px} ${py} l${side*4} ${-4-t*3}`} fill="none" stroke={n%3 ? '#68917a' : '#b0c6a0'} strokeOpacity=".35" strokeWidth=".65"/>;
          })}
        </g>)}
      </g>;
    })}
    <path d="m60 0 3.5 9 9.5.5-7.5 6 2.5 9-8-5-8 5 2.5-9-7.5-6 9.5-.5Z" fill="url(#day13-gold)" stroke="#fbe4a0" strokeWidth=".5"/>
  </g>;
}
