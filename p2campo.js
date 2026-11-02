/* Banco ottico stilizzato visto di tre quarti, dal davanti (diverso dal disegno del programma per Mac). Nessun marchio. */
(function (root) {
  'use strict';
  function svg(o) {
    o = o || {};
    const ink = '#e9dcc0', gold = '#c8a96a', dark = '#0f1a24', mid = '#1d2c3a', glass = '#3d5a70';
    let s = `<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Banco ottico stilizzato">`;
    s += `<defs><radialGradient id="lg" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#7fa6c2"/><stop offset="0.55" stop-color="${glass}"/><stop offset="1" stop-color="#101820"/></radialGradient>
      <linearGradient id="bel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a3a48"/><stop offset="1" stop-color="#16222d"/></linearGradient></defs>`;
    // monorotaia in prospettiva
    s += `<polygon points="40,250 360,214 368,226 48,264" fill="${gold}" opacity=".85"/>`;
    for (let i = 0; i < 14; i++) { const x = 62 + i * 22, y = 254 - i * 2.5; s += `<line x1="${x}" y1="${y}" x2="${x + 1}" y2="${y + 5}" stroke="${dark}" stroke-width="1.2"/>`; }
    // treppiede
    s += `<line x1="200" y1="246" x2="150" y2="316" stroke="${gold}" stroke-width="4"/><line x1="200" y1="246" x2="258" y2="316" stroke="${gold}" stroke-width="4"/><line x1="200" y1="246" x2="204" y2="318" stroke="${gold}" stroke-width="4"/>`;
    // standarta posteriore (vetro smerigliato) dietro
    s += `<rect x="262" y="58" width="96" height="150" rx="5" fill="${mid}" stroke="${ink}" stroke-width="2"/>`;
    s += `<rect x="274" y="72" width="72" height="122" fill="#c9c2b0" opacity=".18" stroke="${ink}" stroke-width="1"/>`;
    for (let i = 1; i < 4; i++) { s += `<line x1="${274 + i * 18}" y1="72" x2="${274 + i * 18}" y2="194" stroke="${ink}" stroke-width=".5" opacity=".5"/><line x1="274" y1="${72 + i * 30.5}" x2="346" y2="${72 + i * 30.5}" stroke="${ink}" stroke-width=".5" opacity=".5"/>`; }
    s += `<rect x="300" y="208" width="34" height="22" fill="${mid}" stroke="${ink}" stroke-width="1.5"/>`;
    // soffietto: pieghe che si allargano verso il dorso
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const xa = 150 + a * 112, xb = 150 + b * 112;
      const ta = 92 - a * 30, tb = 92 - b * 30, ba = 196 + a * 10, bb = 196 + b * 10;
      s += `<polygon points="${xa},${ta} ${xb},${tb} ${xb},${bb} ${xa},${ba}" fill="url(#bel)" stroke="#0b141c" stroke-width="1"/>`;
      s += `<line x1="${xa}" y1="${ta}" x2="${xa}" y2="${ba}" stroke="${ink}" stroke-width=".6" opacity=".35"/>`;
    }
    // standarta anteriore con piastra obiettivo
    s += `<rect x="96" y="74" width="62" height="140" rx="5" fill="${mid}" stroke="${ink}" stroke-width="2"/>`;
    s += `<rect x="104" y="104" width="46" height="66" fill="${dark}" stroke="${ink}" stroke-width="1.5"/>`;
    s += `<rect x="112" y="214" width="34" height="22" fill="${mid}" stroke="${ink}" stroke-width="1.5"/>`;
    // obiettivo
    s += `<circle cx="127" cy="137" r="27" fill="${dark}" stroke="${gold}" stroke-width="2.5"/>`;
    s += `<circle cx="127" cy="137" r="18" fill="url(#lg)" stroke="${ink}" stroke-width="1"/>`;
    s += `<path d="M118,129 a10,10 0 0 1 12,-4" stroke="#fff" stroke-width="2" fill="none" opacity=".55"/>`;
    // manopole
    [[103, 225], [153, 225], [291, 219], [343, 219]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="6" fill="${dark}" stroke="${gold}" stroke-width="1.5"/>`; });
    if (o.title !== false) s += `<text x="200" y="30" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="${ink}" letter-spacing="3">BTZS CAMPO</text>`;
    return s + `</svg>`;
  }
  root.P2Campo = { svg };
})(typeof window !== 'undefined' ? window : this);
