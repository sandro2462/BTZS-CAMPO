/* BTZS Campo: i conti (stessi di ExpoDev, collaudati il 1 novembre 2026) piu' lo split.
   Nessun dato simulato: tutto arriva dal profilo esportato dal programma per Mac. */
(function (root) {
  'use strict';
  const LOG2 = 0.30103;
  const lin = (a, b, t) => a + (b - a) * t;

  // f/ esatti: la serie incisa e' arrotondata (f/45 = 45,25)
  function exactF(N, steps) {
    const s = 2 * Math.log2(N);                       // stop da f/1
    const q = steps === 'thirds' ? 3 : 10;            // terzi o decimi di stop
    return Math.pow(2, Math.round(s * q) / q / 2);
  }
  const F_THIRDS = [4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45, 51, 57, 64, 72, 80, 90];
  function nearestMarkedF(N) { return F_THIRDS.reduce((b, x) => Math.abs(Math.log2(x / N)) < Math.abs(Math.log2(b / N)) ? x : b, F_THIRDS[0]); }

  // ---------- famiglia della pellicola: righe {time, G, efs} ----------
  function byG(rows) { return rows.slice().sort((a, b) => a.G - b.G); }
  function lookupByG(rows, G) {
    const r = byG(rows); if (r.length < 2) return null;
    if (G <= r[0].G) return { efs: r[0].efs, time: r[0].time, clamp: G < r[0].G - 1e-9 ? 'basso' : null, G: r[0].G };
    const L = r[r.length - 1];
    if (G >= L.G) return { efs: L.efs, time: L.time, clamp: G > L.G + 1e-9 ? 'alto' : null, G: L.G };
    for (let i = 0; i < r.length - 1; i++) if (G >= r[i].G && G <= r[i + 1].G) {
      const t = (G - r[i].G) / (r[i + 1].G - r[i].G);
      return { efs: lin(r[i].efs, r[i + 1].efs, t), time: lin(r[i].time, r[i + 1].time, t), clamp: null, G };
    }
    return null;
  }
  function gAtTime(rows, time) {
    const r = rows.slice().sort((a, b) => a.time - b.time); if (r.length < 2) return null;
    if (time <= r[0].time) return { G: r[0].G, efs: r[0].efs, clamp: time < r[0].time ? 'basso' : null };
    const L = r[r.length - 1]; if (time >= L.time) return { G: L.G, efs: L.efs, clamp: time > L.time ? 'alto' : null };
    for (let i = 0; i < r.length - 1; i++) if (time >= r[i].time && time <= r[i + 1].time) {
      const t = (time - r[i].time) / (r[i + 1].time - r[i].time); return { G: lin(r[i].G, r[i + 1].G, t), efs: lin(r[i].efs, r[i + 1].efs, t), clamp: null };
    }
  }

  // ---------- misura ----------
  /* m: {method:'zone'|'high'|'low', lo, lz, hi, hz, sbrAss, flare}
     Zone: due letture. High: solo la luce (hi in zona hz). Low: solo l'ombra (lo in zona lz).
     Con una lettura sola si usa uno SBR presunto (stop): k = SBR/7 stop per zona.
     Flare: luce parassita = F x luminanza media della scena (media aritmetica fra zona II e VIII). */
  function meter(m) {
    let lo = +m.lo, lz = +m.lz, hi = +m.hi, hz = +m.hz, k;
    if (m.method === 'high') { k = (+m.sbrAss || 7) / 7; lz = 3; lo = hi - (hz - lz) * k; }
    else if (m.method === 'low') { k = (+m.sbrAss || 7) / 7; hz = 7; hi = lo + (hz - lz) * k; }
    else { if (!(hz > lz)) return { error: 'La zona della luce deve essere sopra quella dell\'ombra' }; k = (hi - lo) / (hz - lz); }
    if (!isFinite(k) || k <= 0) return { error: 'La luce deve avere un EV piu\' alto dell\'ombra' };
    const sbr = 7 * k;                                  // stop, II-VIII
    const L5 = lo + (5 - lz) * k;                       // EV della zona V
    const F = +m.flare || 0;
    let sbrEff = sbr;
    if (F > 0) {
      const lo7 = L5 - 3.5 * k, hi7 = L5 + 3.5 * k;
      const mean = (Math.pow(2, hi7) - Math.pow(2, lo7)) / (Math.LN2 * (hi7 - lo7));
      sbrEff = Math.log2(Math.pow(2, hi7) + F * mean) - Math.log2(Math.pow(2, lo7) + F * mean);
    }
    return { lo, lz, hi, hz, k, sbr, sbrEff, L5, virtual: m.method !== 'zone' };
  }

  // ---------- fattori ----------
  /* f: {filter (fattore), bellows:{mode:'none'|'distance'|'ext'|'mag', value}, adj (stop)}, focal (mm) */
  function factorOf(f, focal) {
    let filt = +f.filter || 1, bel = 1, note = '';
    const b = f.bellows || {}; const v = +b.value || 0;
    if (b.mode === 'distance' && v > 0 && focal) { const d = v * 1000; if (d > focal * 1.0001) { const img = focal * d / (d - focal); bel = Math.pow(img / focal, 2); } }
    else if (b.mode === 'ext' && v > 0 && focal) { bel = Math.pow((focal + v) / focal, 2); }
    else if (b.mode === 'mag' && v > 0) { bel = Math.pow(1 + v, 2); }
    if (bel < 1.12) note = 'nessun fattore di soffietto necessario (meno di 1/6 di stop)';
    const adj = Math.pow(2, +f.adj || 0);
    return { filter: filt, bellows: bel, adj, total: filt * bel * adj, bellowsStops: Math.log2(bel), note };
  }

  // ---------- reciprocita' (C esatto, non la classe) ----------
  const recipTime = (T, C) => (4 * T > 1 ? T * Math.pow(4 * T, C - 1) : T);
  function invRecip(t, C) { if (4 * t <= 1 || C === 1) return t; let a = 0.25, b = t; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (recipTime(m, C) > t) b = m; else a = m; } return (a + b) / 2; }
  const gMult = (T, Cc) => (4 * T > 1 ? 1 + Cc * Math.log2(4 * T) / 20 : 1);

  // ---------- split: m dall'ES ----------
  function mFromES(tab, es) {
    const t = tab.slice().sort((a, b) => a.m - b.m); if (t.length < 2) return null;
    let run = Infinity; t.forEach(r => { run = Math.min(run, r.es); r.esMono = run; });
    if (es >= t[0].esMono) return { m: t[0].m, out: es > t[0].esMono + 0.005 ? 'morbido' : null };
    const L = t[t.length - 1]; if (es <= L.esMono) return { m: L.m, out: es < L.esMono - 0.005 ? 'duro' : null };
    for (let i = 0; i < t.length - 1; i++) { const a = t[i], b = t[i + 1]; if (es <= a.esMono && es >= b.esMono) { const u = a.esMono === b.esMono ? 0 : (a.esMono - es) / (a.esMono - b.esMono); return { m: lin(a.m, b.m, u), out: null }; } }
    return null;
  }

  // ---------- il conto completo ----------
  /* p: profilo; x: {meter, focal, flare, factors, mode:'aperture'|'speed', N, t, steps, dev:{mode:'auto'|'fixed', time}} */
  function solve(p, x) {
    if (!p || !p.film || !p.film.rows || p.film.rows.length < 2) return { error: 'Manca il profilo della pellicola (importalo dal programma per Mac).' };
    const ES = p.film.paperES;
    const me = meter(Object.assign({}, x.meter, { flare: x.flare || 0 })); if (me.error) return me;
    const G = ES / (me.sbrEff * LOG2);
    const look = lookupByG(p.film.rows, G); if (!look) return { error: 'Famiglia della pellicola incompleta.' };
    // con lo sviluppo a tempo fisso la sensibilita' e' quella di quel tempo, non quella consigliata
    const fixed = x.dev && x.dev.mode === 'fixed' && +x.dev.time > 0 ? gAtTime(p.film.rows, +x.dev.time) : null;
    const efs = fixed ? fixed.efs : look.efs;
    const ev = me.lo + (5 - me.lz) + Math.log2(efs / 100);
    const fac = factorOf(x.factors || {}, x.focal);
    const C = p.recip && p.recip.C ? p.recip.C : 1, Cc = p.recip && p.recip.Ccat != null ? p.recip.Ccat : 0;
    let N, tMeas, tFinal;
    if (x.mode === 'speed') {
      tFinal = +x.t; tMeas = invRecip(tFinal, C);
      N = Math.sqrt(tMeas / fac.total * Math.pow(2, ev));
    } else {
      N = exactF(+x.N || 22, x.steps); const tBase = N * N / Math.pow(2, ev);
      tMeas = tBase * fac.total; tFinal = recipTime(tMeas, C);
    }
    const M = gMult(tMeas, Cc), Gadj = G * M;
    // sviluppo
    let dev, DR, split = null;
    if (fixed) {
      const g = fixed;
      dev = { mode: 'fixed', time: +x.dev.time, G: g.G, clamp: g.clamp };
      DR = g.G / M * me.sbrEff * LOG2;                    // il G effettivo della lastra cambia con la categoria
    } else {
      const ld = lookupByG(p.film.rows, Gadj);
      dev = { mode: 'auto', time: ld.time, G: Gadj, clamp: ld.clamp };
      DR = (ld.G / M) * me.sbrEff * LOG2;                 // se lo sviluppo e' al limite della famiglia, il DR non arriva all'ES
    }
    if (p.paper && p.paper.tab && p.paper.tab.length >= 2) {
      const mm = mFromES(p.paper.tab, DR - (x.enlFlare || 0));
      const t = p.paper.tab.slice().sort((a, b) => a.m - b.m);
      split = mm ? { m: mm.m, out: mm.out, mMin: t[0].m, mMax: t[t.length - 1].m, ref: p.paper.ref, DR } : null;
    }
    return { me, G, Gadj, Gneg: fixed ? fixed.G : Gadj, M, efs, efsClamp: look.clamp, ev, N, Nmarked: nearestMarkedF(N), tMeas, tFinal, fac, C, Cc, dev, DR, split, ES };
  }

  // ---------- profondita' di campo (4x5, c = 0,10 mm) ----------
  const COC = 0.10;
  function dofCheck(f, N, s) { // s in m
    const H = f * f / (N * COC) / 1000 + f / 1000;
    const near = s * (H - f / 1000) / (H + s - 2 * f / 1000);
    const far = s >= H ? Infinity : s * (H - f / 1000) / (H - s);
    return { near, far, H };
  }
  function dofDistance(f, near, far) { // m -> N e messa a fuoco
    const s = far === Infinity ? 2 * near : 2 * near * far / (near + far);
    const H = far === Infinity ? 2 * near : 2 * near * far / (far - near);
    const N = f * f / ((H * 1000 - f) * COC);
    return { s, N, H };
  }
  function dofFocus(spreadMm) { return { N: spreadMm / (2 * COC) }; } // spostamento del dorso fra i due fuochi

  function fmtTime(s) {
    if (!isFinite(s)) return '–';
    if (s < 1) { const d = Math.round(1 / s); return '1/' + d + ' s'; }
    if (s < 60) return (Math.round(s * 10) / 10).toString().replace('.', ',') + ' s';
    const m = Math.floor(s / 60), r = Math.round(s - m * 60); return m + ' min ' + (r < 10 ? '0' : '') + r + ' s';
  }
  function fmtMin(min) { if (!isFinite(min)) return '–'; const m = Math.floor(min), s = Math.round((min - m) * 60); return (s === 60 ? (m + 1) + ':00' : m + ':' + (s < 10 ? '0' : '') + s); }

  const api = { LOG2, exactF, nearestMarkedF, F_THIRDS, lookupByG, gAtTime, meter, factorOf, recipTime, invRecip, gMult, mFromES, solve, dofCheck, dofDistance, dofFocus, COC, fmtTime, fmtMin };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Campo = api;
})(typeof window !== 'undefined' ? window : this);
