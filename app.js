/* BTZS Campo: l'app di campo (sul modello di ExpoDev), per la stampa split grade. */
(function () {
  'use strict';
  const C = window.Campo;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
  const f2 = (v, n) => (v == null || !isFinite(v)) ? '–' : (+v).toFixed(n == null ? 2 : n).replace('.', ',');
  const uid = () => Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toLocaleDateString('it-IT') + ' ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const KEY = 'btzsCampo';

  // ---------------- stato ----------------
  function blank() {
    return {
      v: 1, profiles: [], list: [], page: 'lastra',
      lenses: [75, 150, 210, 250, 300].map(f => ({ f, flare: 0 })),
      filters: [{ name: 'Nessuno', k: 1 }, { name: 'Giallo', k: 2 }, { name: 'Arancio', k: 4 }, { name: 'Rosso', k: 8 }, { name: 'Verde', k: 4 }, { name: 'Polarizzatore', k: 4 }],
      settings: { steps: 'tenths', lz: 3, hz: 7, sbrAss: 7, enlFlare: 0, N: 22 },
      cur: null
    };
  }
  function newCur() {
    return { title: '', holder: '', profile: S.profiles[0] ? S.profiles[0].id : null, focal: 150,
      meter: { method: 'zone', lo: null, lz: S.settings.lz, hi: null, hz: S.settings.hz, sbrAss: S.settings.sbrAss },
      factors: { filter: 0, bellows: { mode: 'none', value: null }, adj: 0 },
      dof: { mode: 'none', s: null, near: null, far: null, spread: null },
      exp: { mode: 'aperture', N: S.settings.N, t: null }, dev: { mode: 'auto', time: null }, notes: '' };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { S = null; }
  if (!S) S = blank();
  if (!S.cur) S.cur = newCur();
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Spazio pieno: esporta e cancella qualche lastra'); } }, 150); };
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 2800); }

  const prof = () => S.profiles.find(p => p.id === S.cur.profile) || null;
  const lens = () => S.lenses.find(l => l.f === +S.cur.focal) || { f: +S.cur.focal, flare: 0 };
  const evStep = () => S.settings.steps === 'thirds' ? 1 / 3 : 0.1;

  function inputs() {
    const c = S.cur, fl = S.filters[c.factors.filter] || S.filters[0];
    return { meter: c.meter, focal: +c.focal, flare: lens().flare || 0, enlFlare: S.settings.enlFlare || 0,
      factors: { filter: fl.k, bellows: c.factors.bellows, adj: c.factors.adj }, mode: c.exp.mode, N: c.exp.N, t: c.exp.t, steps: S.settings.steps, dev: c.dev };
  }
  function ready() {
    const m = S.cur.meter;
    if (m.method === 'zone') return m.lo != null && m.hi != null;
    if (m.method === 'high') return m.hi != null;
    return m.lo != null;
  }
  function result() { if (!prof() || !ready()) return null; if (S.cur.exp.mode === 'speed' && !(S.cur.exp.t > 0)) return null; return C.solve(prof(), inputs()); }

  // ---------------- componenti ----------------
  const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(o => `<button data-v="${o[0]}" class="${String(cur) === String(o[0]) ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`;
  const stepper = (id, val, dec) => `<div class="stepper"><button data-dec="${id}">−</button><input id="${id}" inputmode="decimal" value="${val == null ? '' : f2(val, dec == null ? 1 : dec)}"><button data-inc="${id}">+</button></div>`;
  const row = (lab, right) => `<div class="row"><label>${lab}</label>${right}</div>`;

  // ---------------- pagine ----------------
  const TITLES = { lastra: 'Lastra', misura: 'Misura', fattori: 'Fattori', pdc: 'Profondità di campo', esposizione: 'Esposizione', elenco: 'Elenco delle lastre', impostazioni: 'Impostazioni', riepilogo: 'Riepilogo' };
  function render() {
    const pg = S.page;
    $('#ttl').textContent = TITLES[pg] || '';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.p === pg));
    const m = $('#main');
    m.innerHTML = ({ lastra: pLastra, misura: pMisura, fattori: pFattori, pdc: pPdc, esposizione: pEsposizione, elenco: pElenco, impostazioni: pImpostazioni, riepilogo: pRiepilogo })[pg]();
    wire(pg);
    window.scrollTo(0, 0);
  }
  function go(p) { S.page = p; save(); render(); }

  function pLastra() {
    const c = S.cur, p = prof(), l = lens();
    if (!S.profiles.length) return `<div class="card"><h2>Benvenuto</h2><p class="note">Per cominciare serve il <b>profilo</b> della tua pellicola, preparato dal programma BTZS Plotter sul Mac (ExpoDev &gt; "Esporta profilo per l'iPhone") e mandato qui con AirDrop.</p>
      <div class="bar"><button class="primary" id="imp_prof">Importa un profilo</button></div></div>`;
    return `<div class="card">
      ${row('Titolo', `<input type="text" id="c_title" value="${esc(c.title)}" placeholder="es. Fiume">`)}
      ${row('Holder', `<input type="text" id="c_holder" inputmode="numeric" value="${esc(c.holder)}" placeholder="numero" style="width:30%">`)}
      ${row('Pellicola', `<select id="c_prof">${S.profiles.map(q => `<option value="${q.id}" ${q.id === c.profile ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}</select>`)}
      ${row('Obiettivo', `<select id="c_focal">${S.lenses.map(q => `<option value="${q.f}" ${+q.f === +c.focal ? 'selected' : ''}>${q.f} mm</option>`).join('')}</select>`)}
      ${row('Flare dell\'obiettivo', `<span class="val">${f2(l.flare, 3)}${l.flare ? '' : ' (non ancora misurato)'}</span>`)}
      ${row('Paper ES', `<span class="val">${p ? f2(p.film.paperES, 2) : '–'}</span>`)}
      ${p && p.paper ? row('Carta split', `<span class="val">${esc(p.paper.name)}, riferimento m ${f2(p.paper.ref.m)}</span>`) : ''}
      ${p && p.recip ? row('Reciprocità', `<span class="val">C ${f2(p.recip.C, 3)} · categoria ${f2(p.recip.Ccat, 3)}</span>`) : (p ? row('Reciprocità', '<span class="val warn">non misurata</span>') : '')}
    </div>
    ${p ? `<p class="note">${esc(p.film.name)} · ${esc(p.film.developer || '')} · ${p.film.rows.length} tempi di sviluppo (${p.film.rows.map(r => C.fmtMin(r.time)).join(', ')}).</p>` : ''}
    <div class="bar"><button id="new_sheet">Nuova lastra</button></div>`;
  }

  function pMisura() {
    const m = S.cur.meter, me = C.meter(Object.assign({}, m, { flare: lens().flare || 0 }));
    const ok = ready() && !me.error;
    let body = '';
    if (m.method !== 'low') body += `<div class="card"><h2>Luce (punto luce)</h2>${row('EV', stepper('m_hi', m.hi))}${row('Zona', stepper('m_hz', m.hz, 1))}</div>`;
    if (m.method !== 'high') body += `<div class="card"><h2>Ombra (punto ombra)</h2>${row('EV', stepper('m_lo', m.lo))}${row('Zona', stepper('m_lz', m.lz, 1))}</div>`;
    if (m.method !== 'zone') body += `<div class="card"><h2>SBR presunto</h2>${row('Stop', stepper('m_sbr', m.sbrAss))}<p class="note">Con una lettura sola il programma non conosce lo SBR: usa questo. 7 stop = sviluppo normale. Lo split in stampa estende poi i grigi intermedi.</p></div>`;
    return `${seg('m_method', [['zone', 'Zone'], ['high', 'High'], ['low', 'Low']], m.method)}
      <p class="note">${m.method === 'zone' ? 'Due letture: l\'ombra e la luce, ognuna nella sua zona.' : m.method === 'high' ? 'Una lettura: solo la luce, nella sua zona (es. VII).' : 'Una lettura: solo l\'ombra, nella sua zona (es. III).'} Passo dell'EV: ${S.settings.steps === 'thirds' ? 'terzi' : 'decimi'}.</p>
      ${body}
      <div class="card"><div class="big-out">
        <div class="cell"><div class="lab">SBR</div><div class="num">${ok ? f2(me.sbr, 1) : '–'}</div></div>
        <div class="cell"><div class="lab">SBR con il flare</div><div class="num">${ok ? f2(me.sbrEff, 1) : '–'}</div></div>
      </div>${me.error && ready() ? `<p class="note bad">${esc(me.error)}</p>` : ''}</div>
      <div class="card"><h2>Note</h2><textarea id="m_notes" placeholder="Si può dettare con il microfono della tastiera">${esc(S.cur.notes)}</textarea></div>`;
  }

  function pFattori() {
    const f = S.cur.factors, fac = C.factorOf({ filter: (S.filters[f.filter] || {}).k, bellows: f.bellows, adj: f.adj }, +S.cur.focal);
    const b = f.bellows;
    const lab = { distance: 'Distanza del soggetto (m)', ext: 'Estensione oltre l\'infinito (mm)', mag: 'Ingrandimento (es. 0,5)' }[b.mode];
    return `<div class="card">${row('Filtro', `<select id="f_filter">${S.filters.map((q, i) => `<option value="${i}" ${i === +f.filter ? 'selected' : ''}>${esc(q.name)}${q.k !== 1 ? ' (×' + f2(q.k, q.k % 1 ? 1 : 0) + ')' : ''}</option>`).join('')}</select>`)}</div>
      <div class="card"><h2>Soffietto</h2>${seg('f_bmode', [['none', 'Nessuno'], ['distance', 'Distanza'], ['ext', 'Estensione'], ['mag', 'Ingrand.']], b.mode)}
        ${b.mode !== 'none' ? row(lab, stepper('f_bval', b.value, b.mode === 'mag' ? 2 : (b.mode === 'ext' ? 0 : 1))) : ''}
        ${b.mode !== 'none' ? `<p class="note">${fac.bellows >= 1.12 ? `Fattore di soffietto <b>×${f2(fac.bellows)}</b> (+${f2(fac.bellowsStops, 1)} stop), obiettivo ${S.cur.focal} mm.` : 'Nessun fattore di soffietto necessario.'}</p>` : ''}</div>
      <div class="card"><h2>Correzione dell'esposizione</h2>${row('Stop', stepper('f_adj', f.adj, 1))}<p class="note">In più (+) o in meno (−), oltre al calcolo. Di solito 0.</p></div>
      <div class="card"><div class="big-out"><div class="cell wide"><div class="lab">Fattore totale</div><div class="num">×${f2(fac.total)} (${f2(Math.log2(fac.total), 1)} stop)</div></div></div></div>`;
  }

  function pPdc() {
    const d = S.cur.dof, f = +S.cur.focal;
    let out = '';
    if (d.mode === 'check' && d.s > 0) { const r = C.dofCheck(f, C.exactF(+S.cur.exp.N || 22), d.s); out = `<div class="big-out"><div class="cell"><div class="lab">Vicino</div><div class="num">${f2(r.near, 2)} m</div></div><div class="cell"><div class="lab">Lontano</div><div class="num">${r.far === Infinity ? '∞' : f2(r.far, 2) + ' m'}</div></div><div class="cell wide"><div class="lab">Iperfocale a f/${S.cur.exp.N}</div><div class="num">${f2(r.H, 2)} m</div></div></div>`; }
    if (d.mode === 'distance' && d.near > 0 && (d.far > d.near || d.far === 0)) { const far = d.far === 0 ? Infinity : d.far; const r = C.dofDistance(f, d.near, far); out = `<div class="big-out"><div class="cell"><div class="lab">Diaframma</div><div class="num">f/${C.nearestMarkedF(r.N)}</div></div><div class="cell"><div class="lab">Metti a fuoco a</div><div class="num">${f2(r.s, 2)} m</div></div></div><p class="note">Esatto f/${f2(r.N, 1)}. Lontano 0 = infinito.</p><div class="bar"><button class="primary" id="d_use" data-n="${C.nearestMarkedF(Math.max(r.N, 1))}">Usa f/${C.nearestMarkedF(r.N)} nell'esposizione</button></div>`; }
    if (d.mode === 'focus' && d.spread > 0) { const r = C.dofFocus(d.spread); out = `<div class="big-out"><div class="cell wide"><div class="lab">Diaframma</div><div class="num">f/${C.nearestMarkedF(r.N)}</div></div></div><p class="note">Esatto f/${f2(r.N, 1)}: N = spostamento / (2 × 0,10 mm). Metti il dorso a metà fra i due fuochi.</p><div class="bar"><button class="primary" id="d_use" data-n="${C.nearestMarkedF(r.N)}">Usa f/${C.nearestMarkedF(r.N)} nell'esposizione</button></div>`; }
    const inputsHtml = d.mode === 'check' ? row('Distanza di messa a fuoco (m)', stepper('d_s', d.s, 1)) + `<p class="note">Con il diaframma della pagina Esposizione (f/${S.cur.exp.N}).</p>`
      : d.mode === 'distance' ? row('Vicino (m)', stepper('d_near', d.near, 1)) + row('Lontano (m, 0 = infinito)', stepper('d_far', d.far, 1))
      : d.mode === 'focus' ? row('Spostamento del dorso (mm)', stepper('d_spread', d.spread, 1)) + '<p class="note">Fuoco sul punto vicino, poi sul lontano: la differenza sulla scala della rotaia.</p>' : '<p class="note">Profondità di campo non calcolata.</p>';
    return `${seg('d_mode', [['none', 'Nessuna'], ['check', 'Controllo'], ['distance', 'Distanze'], ['focus', 'Rotaia']], d.mode)}
      <div class="card">${inputsHtml}</div>${out ? `<div class="card">${out}</div>` : ''}
      <p class="note">Formato 4×5, cerchio di confusione 0,10 mm, obiettivo ${f} mm.</p>`;
  }

  function mBar(sp) {
    const span = sp.mMax - sp.mMin || 1, pos = x => ((x - sp.mMin) / span * 100).toFixed(1) + '%';
    return `<div class="mbar"><div class="track"></div>${sp.ref && sp.ref.m != null ? `<div class="ref" style="left:${pos(sp.ref.m)}"></div>` : ''}<div class="dot" style="left:${pos(sp.m)}"></div><span class="l">m ${f2(sp.mMin)} morbido</span><span class="r">duro m ${f2(sp.mMax)}</span></div>`;
  }
  function pEsposizione() {
    const e = S.cur.exp, dv = S.cur.dev, r = result();
    let res = '';
    if (!prof()) res = '<p class="note warn">Manca il profilo della pellicola: pagina Lastra.</p>';
    else if (!ready()) res = '<p class="note warn">Mancano le misure: pagina Misura.</p>';
    else if (!r) res = '<p class="note">Scegli il tempo.</p>';
    else if (r.error) res = `<p class="note bad">${esc(r.error)}</p>`;
    else {
      const warn = [];
      if (r.dev.clamp === 'alto') warn.push('Scena troppo corta: anche lo sviluppo più lungo della famiglia non basta. Il negativo verrà più morbido: in stampa più fase magenta.');
      if (r.dev.clamp === 'basso') warn.push('Scena troppo lunga: anche lo sviluppo più corto è troppo. Il negativo verrà più duro: in stampa più fase gialla.');
      if (r.split && r.split.out) warn.push(r.split.out === 'duro' ? 'Il negativo esce dalla carta verso il duro: anche con solo fase gialla (m 0) sarà troppo contrastato.' : 'Il negativo esce dalla carta verso il morbido: anche con solo fase magenta (m 1) sarà troppo morbido.');
      if (e.mode === 'speed' && (r.N < 5.6 || r.N > 64)) warn.push('Diaframma fuori dalla scala dell\'obiettivo.');
      res = `<div class="big-out">
        <div class="cell"><div class="lab">Diaframma</div><div class="num">f/${e.mode === 'speed' ? r.Nmarked : e.N}</div></div>
        <div class="cell"><div class="lab">Tempo</div><div class="num">${C.fmtTime(r.tFinal)}</div></div>
        <div class="cell"><div class="lab">Sviluppo</div><div class="num">${C.fmtMin(r.dev.time)}</div></div>
        <div class="cell"><div class="lab">EFS</div><div class="num">${f2(r.efs, 0)}</div></div>
        <div class="cell"><div class="lab">SBR</div><div class="num">${f2(r.me.sbrEff, 1)}</div></div>
        <div class="cell"><div class="lab">${r.dev.mode === 'fixed' ? 'G della lastra' : 'G'}</div><div class="num">${f2(r.Gneg)}</div></div>
      </div>
      <p class="note">Tempo misurato ${C.fmtTime(r.tMeas)}${r.C !== 1 && r.tFinal !== r.tMeas ? `, con la reciprocità (C ${f2(r.C, 3)}) ${C.fmtTime(r.tFinal)}` : ''}${r.fac.total !== 1 ? `; fattori ×${f2(r.fac.total)}` : ''}${e.mode === 'speed' ? `; diaframma esatto f/${f2(r.N, 1)}` : ''}.${r.M !== 1 ? ` G corretto per la posa lunga: ${f2(r.G)} × ${f2(r.M, 3)} = ${f2(r.Gadj)}.` : ''}</p>
      ${r.split ? `<h2 style="margin-top:14px">In stampa (split)</h2>${mBar(r.split)}<p class="note">Stamperai a circa <b>m ${f2(r.split.m)}</b> (riferimento m ${f2(r.split.ref.m)}, la tacca). DR del negativo ${f2(r.DR)}.${dv.mode === 'auto' ? ' Con lo sviluppo consigliato il negativo arriva al riferimento.' : ''}</p>` : ''}
      ${warn.map(w => `<p class="note warn">${w}</p>`).join('')}
      <div class="bar"><button class="primary" id="x_save">Salva la lastra</button></div>`;
    }
    const devTimes = prof() ? prof().film.rows.map(x => x.time).sort((a, b) => a - b) : [];
    return `<div class="card"><h2>Esposizione</h2>${seg('x_mode', [['aperture', 'Diaframma'], ['speed', 'Tempo']], e.mode)}
        ${e.mode === 'aperture' ? row('Diaframma f/', `<select id="x_N">${C.F_THIRDS.filter(x => x >= 5.6).map(x => `<option ${+x === +e.N ? 'selected' : ''}>${x}</option>`).join('')}</select>`) : row('Tempo (s)', stepper('x_t', e.t, 1))}</div>
      <div class="card"><h2>Sviluppo</h2>${seg('v_mode', [['auto', 'Consigliato'], ['fixed', 'Tempo fisso']], dv.mode)}
        ${dv.mode === 'fixed' ? row('Tempo (min)', stepper('v_time', dv.time, 2)) + `<p class="note">Per più lastre sviluppate insieme. Tempi della famiglia: ${devTimes.map(C.fmtMin).join(', ')}.</p>` : '<p class="note">Il tempo che porta questo negativo al riferimento della carta split.</p>'}</div>
      <div class="card">${res}</div>`;
  }

  function summaryRows(x) {
    const r = x.res;
    return `<div class="card"><h2>Lastra</h2>${row('Titolo', `<span class="val">${esc(x.title || '–')}</span>`)}${row('Holder', `<span class="val">${esc(x.holder || '–')}</span>`)}${row('Data', `<span class="val">${esc(x.date)}</span>`)}${row('Pellicola', `<span class="val">${esc(x.profileName)}</span>`)}${row('Obiettivo', `<span class="val">${x.focal} mm, flare ${f2(x.flare, 3)}</span>`)}</div>
      <div class="card"><h2>Misura</h2>${row('Metodo', `<span class="val">${{ zone: 'Zone', high: 'High', low: 'Low' }[x.meter.method]}</span>`)}${x.meter.method !== 'high' ? row('Ombra', `<span class="val">EV ${f2(x.meter.lo, 1)} in zona ${f2(x.meter.lz, 1)}</span>`) : ''}${x.meter.method !== 'low' ? row('Luce', `<span class="val">EV ${f2(x.meter.hi, 1)} in zona ${f2(x.meter.hz, 1)}</span>`) : ''}${x.meter.method !== 'zone' ? row('SBR presunto', `<span class="val">${f2(x.meter.sbrAss, 1)}</span>`) : ''}${row('SBR (con il flare)', `<span class="val">${f2(r.sbr, 1)} (${f2(r.sbrEff, 1)})</span>`)}${row('G', `<span class="val">${f2(r.G)}</span>`)}${row('EFS', `<span class="val">${f2(r.efs, 0)}</span>`)}</div>
      <div class="card"><h2>Esposizione e sviluppo</h2>${row('Diaframma', `<span class="val">f/${x.N}</span>`)}${row('Tempo', `<span class="val">${C.fmtTime(r.tFinal)}</span>`)}${row('Fattori', `<span class="val">${esc(x.factorsText)}</span>`)}${row('Sviluppo', `<span class="val">${C.fmtMin(r.devTime)} (${r.devMode === 'fixed' ? 'tempo fisso' : 'consigliato'})</span>`)}${r.m != null ? row('m previsto in stampa', `<span class="val">${f2(r.m)}</span>`) : ''}</div>
      ${x.notes ? `<div class="card"><h2>Note</h2><p>${esc(x.notes)}</p></div>` : ''}`;
  }
  function pRiepilogo() {
    const x = S.list.find(q => q.id === S.view); if (!x) return '<p class="empty">Lastra non trovata.</p>';
    return summaryRows(x) + `<div class="bar"><button id="r_back">Torna all'elenco</button><button class="danger" id="r_del">Elimina</button></div>`;
  }
  function pElenco() {
    const items = S.list.slice().reverse();
    return `<div class="card list">${items.length ? items.map(x => `<div class="item" data-id="${x.id}"><div class="t">${esc(x.title || 'Senza titolo')}${x.holder ? ' · holder ' + esc(x.holder) : ''}</div><div class="s">${esc(x.date)} · f/${x.N} · ${C.fmtTime(x.res.tFinal)} · sviluppo ${C.fmtMin(x.res.devTime)}${x.res.m != null ? ' · m ' + f2(x.res.m) : ''}</div></div>`).join('') : '<p class="empty">Ancora nessuna lastra salvata.</p>'}</div>
      <div class="bar"><button class="primary" id="l_exp" ${items.length ? '' : 'disabled'}>Esporta per il Mac</button><button id="l_back">Torna alla lastra</button></div>
      <p class="note">"Esporta per il Mac" crea un file con tutte le lastre: mandalo al Mac con AirDrop e aprilo nel programma (Archivio &gt; "Importa le lastre dall'iPhone").</p>`;
  }
  function pImpostazioni() {
    return `<div class="card"><h2>Profili (dal programma per Mac)</h2>${S.profiles.length ? S.profiles.map(p => `<div class="row"><label>${esc(p.name)}<br><span class="note">${esc(p.created || '')}</span></label><button class="small danger" data-pdel="${p.id}">Elimina</button></div>`).join('') : '<p class="note">Nessun profilo.</p>'}
        <div class="bar"><button class="primary" id="imp_prof">Importa un profilo</button></div></div>
      <div class="card"><h2>Obiettivi e flare</h2><table class="tbl"><tr><th>Focale (mm)</th><th>Flare</th><th></th></tr>${S.lenses.map((l, i) => `<tr><td><input data-lf="${i}" inputmode="numeric" value="${l.f}"></td><td><input data-lfl="${i}" inputmode="decimal" value="${f2(l.flare, 3)}"></td><td><button class="small danger" data-ldel="${i}">×</button></td></tr>`).join('')}</table>
        <div class="bar"><button class="small" id="l_add">Aggiungi un obiettivo</button></div><p class="note">Il flare lo misura la prova del flare (una lastra per obiettivo) e arriva con il profilo. 0 = non misurato.</p></div>
      <div class="card"><h2>Filtri</h2><table class="tbl"><tr><th>Nome</th><th>Fattore</th><th></th></tr>${S.filters.map((q, i) => `<tr><td><input data-fn="${i}" value="${esc(q.name)}" style="width:100%;text-align:left"></td><td><input data-fk="${i}" inputmode="decimal" value="${f2(q.k, 2)}"></td><td>${i ? `<button class="small danger" data-fdel="${i}">×</button>` : ''}</td></tr>`).join('')}</table><div class="bar"><button class="small" id="f_add">Aggiungi un filtro</button></div></div>
      <div class="card"><h2>Misura</h2>${row('Passo dell\'EV', `<select id="s_steps"><option value="tenths" ${S.settings.steps === 'tenths' ? 'selected' : ''}>Decimi</option><option value="thirds" ${S.settings.steps === 'thirds' ? 'selected' : ''}>Terzi</option></select>`)}
        ${row('Zona dell\'ombra di partenza', stepper('s_lz', S.settings.lz, 1))}${row('Zona della luce di partenza', stepper('s_hz', S.settings.hz, 1))}${row('SBR presunto di partenza', stepper('s_sbr', S.settings.sbrAss, 1))}
        ${row('Flare dell\'ingranditore', stepper('s_enl', S.settings.enlFlare, 2))}<p class="note">Il flare dell'ingranditore (misurato con la sonda) entra nel calcolo del m previsto.</p></div>
      <div class="card"><h2>Dati</h2><div class="bar"><button id="s_backup">Copia di sicurezza</button><button id="s_restore">Ripristina una copia</button></div><p class="note">I dati restano su questo iPhone. La copia di sicurezza è un file da tenere sul Mac o in iCloud.</p></div>
      <p class="note">BTZS Campo 1.0 · metodo Beyond the Zone System di Phil Davis, per la stampa split grade.</p>`;
  }

  // ---------------- file ----------------
  function pickFile(cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result, f.name); r.readAsText(f); }; i.click(); }
  async function shareFile(name, obj) {
    const txt = JSON.stringify(obj, null, 1), file = new File([txt], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function importProfile(txt) {
    let o; try { o = JSON.parse(txt); } catch (e) { toast('File non leggibile'); return; }
    if (o.type !== 'btzs-profilo' || !o.film || !Array.isArray(o.film.rows)) { toast('Non è un profilo BTZS'); return; }
    const name = o.name || o.film.name;
    const old = S.profiles.find(p => p.name === name);
    const p = Object.assign({ id: old ? old.id : uid(), name }, o);
    if (old) S.profiles[S.profiles.indexOf(old)] = p; else S.profiles.push(p);
    (o.lenses || []).forEach(l => { const x = S.lenses.find(q => +q.f === +l.f); if (x) x.flare = +l.flare || 0; else S.lenses.push({ f: +l.f, flare: +l.flare || 0 }); });
    if (o.enlFlare != null) S.settings.enlFlare = +o.enlFlare;
    S.lenses.sort((a, b) => a.f - b.f);
    if (!S.cur.profile) S.cur.profile = p.id;
    save(); render(); toast((old ? 'Profilo aggiornato: ' : 'Profilo importato: ') + name);
  }

  // ---------------- eventi ----------------
  function bindStep(id, get, set, step, min, max) {
    const inp = $('#' + id); if (!inp) return;
    const apply = v => { if (v == null) { set(null); save(); render(); return; } if (min != null) v = Math.max(min, v); if (max != null) v = Math.min(max, v); set(Math.round(v * 1000) / 1000); save(); render(); };
    inp.onchange = () => apply(num(inp.value));
    const st = typeof step === 'function' ? step() : step;
    document.querySelector(`[data-dec="${id}"]`).onclick = () => apply((get() == null ? 0 : get()) - st);
    document.querySelector(`[data-inc="${id}"]`).onclick = () => apply((get() == null ? 0 : get()) + st);
  }
  function bindSeg(id, set) { const s = $('#' + id); if (s) s.querySelectorAll('button').forEach(b => b.onclick = () => { set(b.dataset.v); save(); render(); }); }
  function wire(pg) {
    const c = S.cur;
    const ip = $('#imp_prof'); if (ip) ip.onclick = () => pickFile(importProfile);
    if (pg === 'lastra' && S.profiles.length) {
      $('#c_title').onchange = e => { c.title = e.target.value; save(); };
      $('#c_holder').onchange = e => { c.holder = e.target.value; save(); };
      $('#c_prof').onchange = e => { c.profile = e.target.value; save(); render(); };
      $('#c_focal').onchange = e => { c.focal = +e.target.value; save(); render(); };
      $('#new_sheet').onclick = () => { if (!confirm('Cominciare una lastra nuova? Quella in corso, se non salvata, si perde.')) return; const keep = { profile: c.profile, focal: c.focal }; S.cur = Object.assign(newCur(), keep); save(); render(); };
    }
    if (pg === 'misura') {
      const m = c.meter;
      bindSeg('m_method', v => { m.method = v; });
      bindStep('m_hi', () => m.hi, v => { m.hi = v; }, evStep);
      bindStep('m_lo', () => m.lo, v => { m.lo = v; }, evStep);
      bindStep('m_hz', () => m.hz, v => { m.hz = v; }, 0.5, 1, 10);
      bindStep('m_lz', () => m.lz, v => { m.lz = v; }, 0.5, 0, 9);
      bindStep('m_sbr', () => m.sbrAss, v => { m.sbrAss = v; }, 0.1, 2, 14);
      $('#m_notes').onchange = e => { c.notes = e.target.value; save(); };
    }
    if (pg === 'fattori') {
      const f = c.factors;
      $('#f_filter').onchange = e => { f.filter = +e.target.value; save(); render(); };
      bindSeg('f_bmode', v => { f.bellows = { mode: v, value: null }; });
      bindStep('f_bval', () => f.bellows.value, v => { f.bellows.value = v; }, f.bellows.mode === 'mag' ? 0.05 : (f.bellows.mode === 'ext' ? 5 : 0.1), 0);
      bindStep('f_adj', () => f.adj, v => { f.adj = v; }, 1 / 3, -3, 3);
    }
    if (pg === 'pdc') {
      const d = c.dof;
      bindSeg('d_mode', v => { d.mode = v; });
      bindStep('d_s', () => d.s, v => { d.s = v; }, 0.1, 0.1);
      bindStep('d_near', () => d.near, v => { d.near = v; }, 0.1, 0.1);
      bindStep('d_far', () => d.far, v => { d.far = v; }, 0.5, 0);
      bindStep('d_spread', () => d.spread, v => { d.spread = v; }, 0.5, 0);
      const u = $('#d_use'); if (u) u.onclick = () => { c.exp.mode = 'aperture'; c.exp.N = +u.dataset.n; save(); go('esposizione'); };
    }
    if (pg === 'esposizione') {
      bindSeg('x_mode', v => { c.exp.mode = v; });
      const xn = $('#x_N'); if (xn) xn.onchange = e => { c.exp.N = +e.target.value; save(); render(); };
      bindStep('x_t', () => c.exp.t, v => { c.exp.t = v; }, 1, 0);
      bindSeg('v_mode', v => { c.dev.mode = v; if (v === 'fixed' && !c.dev.time) { const r = result(); c.dev.time = r && !r.error ? Math.round(r.dev.time * 4) / 4 : 8; } });
      bindStep('v_time', () => c.dev.time, v => { c.dev.time = v; }, 0.25, 1);
      const sv = $('#x_save'); if (sv) sv.onclick = () => {
        const r = result(), p = prof(), fl = S.filters[c.factors.filter] || S.filters[0];
        const N = c.exp.mode === 'speed' ? r.Nmarked : c.exp.N;
        const b = c.factors.bellows, ft = [fl.k !== 1 ? fl.name + ' ×' + f2(fl.k, 1) : null, r.fac.bellows >= 1.12 ? 'soffietto ×' + f2(r.fac.bellows) : null, c.factors.adj ? 'correzione ' + f2(c.factors.adj, 1) + ' stop' : null].filter(Boolean).join(', ') || 'nessuno';
        S.list.push({ id: uid(), date: today(), title: c.title, holder: c.holder, profileName: p.name, film: p.film.name, developer: p.film.developer || '', paper: p.paper ? p.paper.name : null,
          focal: +c.focal, flare: lens().flare || 0, meter: JSON.parse(JSON.stringify(c.meter)), N, factorsText: ft, notes: c.notes,
          res: { sbr: r.me.sbr, sbrEff: r.me.sbrEff, G: r.Gneg, Gneeded: r.Gadj, efs: r.efs, ev: r.ev, tMeas: r.tMeas, tFinal: r.tFinal, devTime: r.dev.time, devMode: r.dev.mode, DR: r.DR, m: r.split ? r.split.m : null, mRef: r.split && r.split.ref ? r.split.ref.m : null } });
        const keep = { profile: c.profile, focal: c.focal };
        S.cur = Object.assign(newCur(), keep, { holder: c.holder && /^\d+$/.test(c.holder) ? String(+c.holder + 1) : '' });
        S.view = S.list[S.list.length - 1].id; save(); go('riepilogo'); toast('Lastra salvata');
      };
    }
    if (pg === 'elenco') {
      document.querySelectorAll('.list .item').forEach(it => it.onclick = () => { S.view = it.dataset.id; go('riepilogo'); });
      $('#l_back').onclick = () => go('lastra');
      const ex = $('#l_exp'); if (ex) ex.onclick = () => shareFile('Lastre_BTZS_' + new Date().toISOString().slice(0, 10) + '.json', { type: 'btzs-esposizioni', version: 1, created: today(), items: S.list });
    }
    if (pg === 'riepilogo') {
      $('#r_back').onclick = () => go('elenco');
      $('#r_del').onclick = () => { if (!confirm('Eliminare questa lastra?')) return; S.list = S.list.filter(q => q.id !== S.view); save(); go('elenco'); };
    }
    if (pg === 'impostazioni') {
      document.querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => { if (!confirm('Eliminare il profilo?')) return; S.profiles = S.profiles.filter(p => p.id !== b.dataset.pdel); if (S.cur.profile === b.dataset.pdel) S.cur.profile = S.profiles[0] ? S.profiles[0].id : null; save(); render(); });
      document.querySelectorAll('[data-lf]').forEach(i => i.onchange = () => { S.lenses[+i.dataset.lf].f = num(i.value) || S.lenses[+i.dataset.lf].f; S.lenses.sort((a, b) => a.f - b.f); save(); render(); });
      document.querySelectorAll('[data-lfl]').forEach(i => i.onchange = () => { S.lenses[+i.dataset.lfl].flare = num(i.value) || 0; save(); render(); });
      document.querySelectorAll('[data-ldel]').forEach(b => b.onclick = () => { S.lenses.splice(+b.dataset.ldel, 1); save(); render(); });
      $('#l_add').onclick = () => { S.lenses.push({ f: 180, flare: 0 }); save(); render(); };
      document.querySelectorAll('[data-fn]').forEach(i => i.onchange = () => { S.filters[+i.dataset.fn].name = i.value; save(); });
      document.querySelectorAll('[data-fk]').forEach(i => i.onchange = () => { S.filters[+i.dataset.fk].k = num(i.value) || 1; save(); render(); });
      document.querySelectorAll('[data-fdel]').forEach(b => b.onclick = () => { S.filters.splice(+b.dataset.fdel, 1); c.factors.filter = 0; save(); render(); });
      $('#f_add').onclick = () => { S.filters.push({ name: 'ND', k: 8 }); save(); render(); };
      $('#s_steps').onchange = e => { S.settings.steps = e.target.value; save(); render(); };
      bindStep('s_lz', () => S.settings.lz, v => { S.settings.lz = v; }, 0.5, 0, 9);
      bindStep('s_hz', () => S.settings.hz, v => { S.settings.hz = v; }, 0.5, 1, 10);
      bindStep('s_sbr', () => S.settings.sbrAss, v => { S.settings.sbrAss = v; }, 0.1, 2, 14);
      bindStep('s_enl', () => S.settings.enlFlare, v => { S.settings.enlFlare = v; }, 0.01, 0, 0.5);
      $('#s_backup').onclick = () => shareFile('BTZS_Campo_copia_' + new Date().toISOString().slice(0, 10) + '.json', Object.assign({ type: 'btzs-campo-copia' }, S));
      $('#s_restore').onclick = () => pickFile(txt => { try { const o = JSON.parse(txt); if (o.type !== 'btzs-campo-copia') throw 0; if (!confirm('Sostituire tutti i dati con la copia?')) return; delete o.type; S = o; save(); render(); toast('Copia ripristinata'); } catch (e) { toast('Non è una copia di BTZS Campo'); } });
    }
  }

  // ---------------- avvio ----------------
  $('#art').innerHTML = window.P2Campo.svg();
  $('#enter').onclick = () => { $('#splash').classList.add('hidden'); ['#top', '#main', '#tabs'].forEach(s => $(s).classList.remove('hidden')); render(); };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => go(b.dataset.p));
  $('#b_list').onclick = () => go('elenco');
  $('#b_set').onclick = () => go('impostazioni');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.BTZSCampo = { get state() { return S; }, importProfile, render };
})();
