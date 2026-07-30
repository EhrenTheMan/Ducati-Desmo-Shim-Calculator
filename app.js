/* =========================================================
   Desmo Shim Calculator
   Opening + closing shim math for Ducati desmodromic heads.
   Pure browser, no build step, no network.
   ========================================================= */
'use strict';

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const R3 = x => Math.round(x * 1000) / 1000;
const f2 = x => (x === null || x === undefined || isNaN(x)) ? '' : Number(x).toFixed(2);
const EPS = 1e-6;

function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function toast(msg) {
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------------- spec presets ----------------
   Each group: tMin/tMax = target window to adjust into,
   nom = nominal, cMin/cMax = check (service limit) range.
   verify:true  -> shown with a "check your manual" warning.
------------------------------------------------ */
const SPECS = {
  ts_oe: {
    label: 'Testastretta \u2013 Ducati OE (original)',
    note: 'Original factory spec. Identical for intake and exhaust.',
    opener: { nom: 0.20, tMin: 0.18, tMax: 0.23, cMin: 0.10, cMax: 0.25 },
    closer: { nom: 0.15, tMin: 0.13, tMax: 0.18, cMin: 0.10, cMax: 0.25 }
  },
  ts_tight: {
    label: 'Testastretta \u2013 recommended tight (later-spec style)',
    note: 'Openers set near the low end, closers very tight: quieter, less lobe wear, ' +
          'and it leaves room for the usual drift (openers tighten, closers loosen) between services.',
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.05, tMin: 0.03, tMax: 0.08, cMin: 0.02, cMax: 0.25 }
  },
  ts11: {
    label: 'Testastretta 11\u00b0 / DVT \u2013 later OE style',
    verify: true,
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.07, tMin: 0.05, tMax: 0.10, cMin: 0.03, cMax: 0.20 }
  },
  sq: {
    label: 'Superquadro (1199/1299/959/Panigale V2)',
    verify: true,
    note: 'Some Superquadro manuals list a looser exhaust opener \u2013 tick "different specs for exhaust" if yours does.',
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.07, tMin: 0.05, tMax: 0.10, cMin: 0.03, cMax: 0.20 },
    ex: {
      opener: { nom: 0.22, tMin: 0.20, tMax: 0.25, cMin: 0.15, cMax: 0.30 },
      closer: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.05, cMax: 0.25 }
    }
  },
  v4: {
    label: 'Desmosedici Stradale V4',
    verify: true,
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.07, tMin: 0.05, tMax: 0.10, cMin: 0.03, cMax: 0.20 },
    ex: {
      opener: { nom: 0.22, tMin: 0.20, tMax: 0.25, cMin: 0.15, cMax: 0.30 },
      closer: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.05, cMax: 0.25 }
    }
  },
  dq: {
    label: 'Desmoquattro (851/888/916/996/998, ST4, S4)',
    verify: true,
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.05, tMin: 0.03, tMax: 0.08, cMin: 0.00, cMax: 0.15 }
  },
  d2v: {
    label: 'Desmodue 2-valve (SS / Monster / Scrambler / Hyper 796)',
    verify: true,
    note: '2-valve heads commonly run a looser exhaust opener than intake.',
    opener: { nom: 0.12, tMin: 0.10, tMax: 0.15, cMin: 0.08, cMax: 0.25 },
    closer: { nom: 0.05, tMin: 0.03, tMax: 0.08, cMin: 0.00, cMax: 0.15 },
    ex: {
      opener: { nom: 0.17, tMin: 0.15, tMax: 0.20, cMin: 0.10, cMax: 0.30 },
      closer: { nom: 0.05, tMin: 0.03, tMax: 0.08, cMin: 0.00, cMax: 0.15 }
    }
  },
  custom: {
    label: 'Custom / manual entry',
    opener: { nom: 0.15, tMin: 0.10, tMax: 0.15, cMin: 0.10, cMax: 0.25 },
    closer: { nom: 0.05, tMin: 0.03, tMax: 0.08, cMin: 0.02, cMax: 0.25 }
  }
};

/* ---------------- head layouts ---------------- */
const V4 = [
  { n: 'Intake - Left', g: 'in' },
  { n: 'Intake - Right', g: 'in' },
  { n: 'Exhaust - Left', g: 'ex' },
  { n: 'Exhaust - Right', g: 'ex' }
];
const V2 = [
  { n: 'Intake', g: 'in' },
  { n: 'Exhaust', g: 'ex' }
];
const LAYOUTS = {
  l2_4v: { label: 'L-twin, 4 valves/cyl', cyls: ['Vertical', 'Horizontal'], valves: V4 },
  l2_2v: { label: 'L-twin, 2 valves/cyl', cyls: ['Vertical', 'Horizontal'], valves: V2 },
  v4_4v: { label: 'V4, 4 valves/cyl', cyls: ['Cylinder 1', 'Cylinder 2', 'Cylinder 3', 'Cylinder 4'], valves: V4 },
  s1_4v: { label: 'Single, 4 valves', cyls: ['Cylinder'], valves: V4 },
  s1_2v: { label: 'Single, 2 valves', cyls: ['Cylinder'], valves: V2 }
};

/* ---------------- engines ---------------- */
const ENGINES = [
  { id: 'ts',      name: 'Testastretta (1098/1198/848/Streetfighter/Multistrada 1100-1200)', layout: 'l2_4v', spec: 'ts_oe' },
  { id: 'ts11',    name: 'Testastretta 11\u00b0 / DVT (Multistrada, Monster 1200, Diavel, Hypermotard 939/950)', layout: 'l2_4v', spec: 'ts11' },
  { id: 'sq',      name: 'Superquadro (1199 / 1299 / 959 / Panigale V2)', layout: 'l2_4v', spec: 'sq' },
  { id: 'dq',      name: 'Desmoquattro (851/888/916/996/998, ST4, Monster S4)', layout: 'l2_4v', spec: 'dq' },
  { id: 'd2v',     name: 'Desmodue 2-valve (SS, Monster, Scrambler, SportClassic, Hypermotard 796)', layout: 'l2_2v', spec: 'd2v' },
  { id: 'v4',      name: 'Desmosedici Stradale V4 (Panigale/Streetfighter/Multistrada V4, Diavel V4)', layout: 'v4_4v', spec: 'v4' },
  { id: 'sgl4',    name: 'Desmo single, 4 valves (Desmo450 MX, Supermono)', layout: 's1_4v', spec: 'ts_tight' },
  { id: 'sgl2',    name: 'Desmo single, 2 valves', layout: 's1_2v', spec: 'd2v' },
  { id: 'other',   name: 'Other / custom', layout: 'l2_4v', spec: 'custom' }
];

/* ---------------- storage (cookies + localStorage) ---------------- */
const CK = 'desmo';
const CK_MAX_DAYS = 3650;
const CHUNK = 3000;
let storageMode = '';

function setCookie(name, value, days) {
  const d = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + value + ';expires=' + d + ';path=/;SameSite=Lax';
}
function delCookie(name) {
  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax';
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : null;
}
function cookieWrite(payload) {
  try {
    const parts = [];
    for (let i = 0; i < payload.length; i += CHUNK) parts.push(payload.slice(i, i + CHUNK));
    const prev = parseInt(getCookie(CK + '_n') || '0', 10) || 0;
    parts.forEach((p, i) => setCookie(CK + '_' + i, p, CK_MAX_DAYS));
    for (let i = parts.length; i < prev; i++) delCookie(CK + '_' + i);
    setCookie(CK + '_n', String(parts.length), CK_MAX_DAYS);
    return getCookie(CK + '_0') !== null;
  } catch (e) { return false; }
}
function cookieRead() {
  try {
    const n = parseInt(getCookie(CK + '_n') || '0', 10);
    if (!n) return null;
    let s = '';
    for (let i = 0; i < n; i++) {
      const p = getCookie(CK + '_' + i);
      if (p === null) return null;
      s += p;
    }
    return decodeURIComponent(s);
  } catch (e) { return null; }
}
function lsWrite(key, str) { try { localStorage.setItem(key, str); return true; } catch (e) { return false; } }
function lsRead(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

function persist() {
  const raw = JSON.stringify(state);
  const okCookie = cookieWrite(encodeURIComponent(raw));
  const okLs = lsWrite(CK + '_state', raw);
  storageMode = okCookie && okLs ? 'Saved \u2192 cookies + local storage'
    : okCookie ? 'Saved \u2192 cookies'
      : okLs ? 'Cookies blocked (file:// ?) \u2013 saved to local storage'
        : 'Nothing could be saved \u2013 use Download .json';
  const box = $('#storageStatus');
  box.textContent = storageMode;
  box.classList.toggle('bad', !okCookie);
}
function restore() {
  let raw = cookieRead();
  if (!raw) raw = lsRead(CK + '_state');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/* ---------------- state ---------------- */
let state;

function cloneSpec(s) { return JSON.parse(JSON.stringify(s)); }

/* fresh, empty valve data for a layout */
function freshCylinders(layoutId) {
  const L = LAYOUTS[layoutId];
  return L.cyls.map(nm => ({
    name: nm,
    valves: L.valves.map(v => ({
      name: v.n, group: v.g,
      opening: { clr: '', shim: '' },
      closing: { clr: '', shim: '' }
    }))
  }));
}

function defaultState() {
  const eng = ENGINES[0];
  const sp = SPECS[eng.spec];
  return {
    v: 1,
    engineId: eng.id,
    layoutId: eng.layout,
    specKey: eng.spec,
    specLabel: sp.label,
    spec: { opener: cloneSpec(sp.opener), closer: cloneSpec(sp.closer) },
    specEx: { opener: cloneSpec((sp.ex || sp).opener), closer: cloneSpec((sp.ex || sp).closer) },
    sepEx: !!sp.ex,
    shim: {
      opener: { min: 1.80, max: 4.50, step: 0.05 },
      closer: { min: 2.00, max: 5.00, step: 0.05 }
    },
    keepPolicy: 'target',
    bike: { name: '', date: new Date().toISOString().slice(0, 10), odo: '', notes: '' },
    cylinders: freshCylinders(eng.layout)
  };
}

/* ---------------- the math ----------------
   new shim       = current + (measured - target)
   resulting clr  = measured - (new - current)
   Thicker shim => tighter clearance, on both openers and closers.
-------------------------------------------- */
function shimGrid(cfg) {
  const min = num(cfg.min), max = num(cfg.max), step = num(cfg.step);
  if (min === null || max === null || !step || step <= 0 || max < min) return null;
  const out = [];
  const n = Math.round((max - min) / step);
  for (let i = 0; i <= n; i++) out.push(R3(min + i * step));
  return out;
}

function calc(kind, measured, current, sp, shimCfg, keepPolicy) {
  const res = {
    status: 'none', keep: false, newShim: null, resulting: null,
    delta: null, ideal: null, inCheck: null, msg: ''
  };
  const tMin = num(sp.tMin), tMax = num(sp.tMax);
  const cMin = num(sp.cMin), cMax = num(sp.cMax);
  const nom = num(sp.nom);
  if (measured === null) return res;

  res.inCheck = (cMin === null || measured >= cMin - EPS) && (cMax === null || measured <= cMax + EPS);
  const inTarget = (tMin === null || measured >= tMin - EPS) && (tMax === null || measured <= tMax + EPS);
  res.status = inTarget ? 'ok' : (tMin !== null && measured < tMin) ? 'tight' : 'loose';

  const keepOk = keepPolicy === 'check' ? res.inCheck : inTarget;
  if (keepOk) { res.keep = true; res.resulting = measured; res.delta = 0; res.newShim = current; return res; }

  if (current === null) { res.msg = 'shim?'; return res; }

  // aim point: nominal if it sits inside the target window, otherwise the middle of it
  let aim;
  if (tMin !== null && tMax !== null) {
    aim = (nom !== null && nom >= tMin - EPS && nom <= tMax + EPS) ? nom : (tMin + tMax) / 2;
  } else aim = nom;
  if (aim === null) { res.msg = 'no target'; return res; }

  res.ideal = R3(current + (measured - aim));

  const grid = shimGrid(shimCfg);
  let best = null;
  if (grid) {
    const scored = grid.map(s => {
      const resulting = R3(measured - (s - current));
      const inRange = (tMin === null || resulting >= tMin - EPS) && (tMax === null || resulting <= tMax + EPS);
      return { s, resulting, inRange, dist: Math.abs(resulting - aim) };
    });
    const inR = scored.filter(x => x.inRange).sort((a, b) => a.dist - b.dist);
    best = inR.length ? inR[0] : scored.slice().sort((a, b) => a.dist - b.dist)[0];
    if (!inR.length && best) res.msg = 'outside shim range';
  } else {
    best = { s: res.ideal, resulting: aim };
  }
  res.newShim = best.s;
  res.resulting = best.resulting;
  res.delta = R3(best.s - current);
  const rtMin = tMin, rtMax = tMax;
  const okAfter = (rtMin === null || best.resulting >= rtMin - EPS) && (rtMax === null || best.resulting <= rtMax + EPS);
  if (!okAfter && !res.msg) res.msg = 'best available';
  return res;
}

function specFor(valve, kind) {
  const src = (state.sepEx && valve.group === 'ex') ? state.specEx : state.spec;
  return kind === 'opening' ? src.opener : src.closer;
}

/* ---------------- setup UI ---------------- */
function fillSelects() {
  const eSel = $('#engineSel');
  eSel.innerHTML = '';
  ENGINES.forEach(e => eSel.appendChild(new Option(e.name, e.id)));

  const lSel = $('#layoutSel');
  lSel.innerHTML = '';
  Object.keys(LAYOUTS).forEach(k => lSel.appendChild(new Option(LAYOUTS[k].label, k)));

  const sSel = $('#specSel');
  sSel.innerHTML = '';
  Object.keys(SPECS).forEach(k => sSel.appendChild(new Option(SPECS[k].label + (SPECS[k].verify ? '  (verify)' : ''), k)));
}

const SPEC_FIELDS = [
  ['tMin', 'Target min'],
  ['tMax', 'Target max'],
  ['nom', 'Nominal'],
  ['cMin', 'Check min'],
  ['cMax', 'Check max']
];

function specGroupEl(title, obj) {
  const wrap = el('div', 'spec-group');
  wrap.appendChild(el('h4', null, title));
  const fields = el('div', 'spec-fields');
  SPEC_FIELDS.forEach(([key, lbl]) => {
    const l = el('label');
    l.appendChild(el('span', null, lbl));
    const i = el('input');
    i.type = 'text'; i.inputMode = 'decimal';
    i.value = obj[key] === null || obj[key] === undefined || obj[key] === '' ? '' : f2(obj[key]);
    i.addEventListener('input', () => {
      obj[key] = num(i.value);
      markSpecEdited();
      recalc();
    });
    i.addEventListener('blur', () => { if (obj[key] !== null) i.value = f2(obj[key]); });
    l.appendChild(i);
    fields.appendChild(l);
  });
  wrap.appendChild(fields);
  return wrap;
}

function renderSpecEditors() {
  const host = $('#specEditors');
  host.innerHTML = '';
  const inLbl = state.sepEx ? 'Openers \u2013 intake' : 'Openers (all valves)';
  const clLbl = state.sepEx ? 'Closers \u2013 intake' : 'Closers (all valves)';
  host.appendChild(specGroupEl(inLbl, state.spec.opener));
  host.appendChild(specGroupEl(clLbl, state.spec.closer));
  if (state.sepEx) {
    host.appendChild(specGroupEl('Openers \u2013 exhaust', state.specEx.opener));
    host.appendChild(specGroupEl('Closers \u2013 exhaust', state.specEx.closer));
  }
}

function markSpecEdited() {
  const base = SPECS[state.specKey];
  if (!base) return;
  if (!/^Custom/.test(state.specLabel)) {
    state.specLabel = 'Custom (from ' + base.label + ')';
    $('#setupHint').textContent = state.specLabel;
  }
}

function applySpecPreset(key) {
  const sp = SPECS[key];
  if (!sp) return;
  state.specKey = key;
  state.specLabel = sp.label;
  state.spec = { opener: cloneSpec(sp.opener), closer: cloneSpec(sp.closer) };
  state.specEx = { opener: cloneSpec((sp.ex || sp).opener), closer: cloneSpec((sp.ex || sp).closer) };
  state.sepEx = !!sp.ex;
  $('#specSel').value = key;
  $('#sepEx').checked = state.sepEx;
  renderSpecEditors();
  updateSpecNotes();
}

function updateSpecNotes() {
  const sp = SPECS[state.specKey] || {};
  const w = $('#specWarn');
  const bits = [];
  if (sp.verify) bits.push('These numbers are an approximation for this family \u2013 confirm them against your workshop manual and edit above. Whatever is in the boxes is what gets used.');
  if (sp.note) bits.push(sp.note);
  w.textContent = bits.join(' ');
  w.hidden = !bits.length;
  $('#setupHint').textContent = state.specLabel;
  const eng = ENGINES.find(e => e.id === state.engineId);
  $('#engineNote').textContent = eng
    ? 'Layout: ' + LAYOUTS[state.layoutId].label + ' \u2014 openers and closers use the same arithmetic; '
      + (state.sepEx ? 'intake and exhaust use separate specs.' : 'intake and exhaust share one spec.')
    : '';
}

function syncSetupInputs() {
  $('#engineSel').value = state.engineId;
  $('#layoutSel').value = state.layoutId;
  $('#specSel').value = state.specKey;
  $('#sepEx').checked = state.sepEx;
  $('#keepPolicy').value = state.keepPolicy;
  $('#shOpMin').value = f2(state.shim.opener.min);
  $('#shOpMax').value = f2(state.shim.opener.max);
  $('#shOpStep').value = f2(state.shim.opener.step);
  $('#shClMin').value = f2(state.shim.closer.min);
  $('#shClMax').value = f2(state.shim.closer.max);
  $('#shClStep').value = f2(state.shim.closer.step);
  $('#bkName').value = state.bike.name;
  $('#bkDate').value = state.bike.date;
  $('#bkOdo').value = state.bike.odo;
  $('#bkNotes').value = state.bike.notes;
  renderSpecEditors();
  updateSpecNotes();
  updateBikeHint();
}

function updateBikeHint() {
  const b = state.bike;
  $('#bikeHint').textContent = [b.name, b.date, b.odo].filter(Boolean).join('  \u00b7  ');
}

/* ---------------- valve table ---------------- */
const rowRefs = []; // {valve, kind, data, out, info}

function renderCylinders() {
  const host = $('#cylinders');
  host.innerHTML = '';
  rowRefs.length = 0;

  state.cylinders.forEach((cyl, ci) => {
    const card = el('div', 'cyl');

    const head = el('div', 'cylHead');
    const nameIn = el('input');
    nameIn.type = 'text'; nameIn.value = cyl.name; nameIn.title = 'Cylinder name';
    nameIn.addEventListener('input', () => { cyl.name = nameIn.value; save(); });
    head.appendChild(nameIn);
    const rm = el('button', 'btn sm danger ghost', 'Remove');
    rm.type = 'button';
    rm.addEventListener('click', () => {
      if (state.cylinders.length <= 1) return;
      state.cylinders.splice(ci, 1);
      renderCylinders(); recalc();
    });
    head.appendChild(rm);
    card.appendChild(head);

    const hdr = el('div', 'hdr');
    ['', 'Measured', 'Shim now', '', 'New shim', ''].forEach(t => hdr.appendChild(el('span', null, t)));
    card.appendChild(hdr);

    cyl.valves.forEach(v => {
      const vb = el('div', 'valve');
      const nm = el('div', 'valveName');
      nm.appendChild(document.createTextNode(v.name));
      if (state.sepEx) nm.appendChild(el('span', 'grp', v.group === 'ex' ? '(exhaust spec)' : '(intake spec)'));
      vb.appendChild(nm);
      vb.appendChild(lineEl(v, 'opening'));
      vb.appendChild(lineEl(v, 'closing'));
      card.appendChild(vb);
    });

    host.appendChild(card);
  });
}

function lineEl(valve, kind) {
  const line = el('div', 'line');
  line.appendChild(el('div', 'kind ' + (kind === 'opening' ? 'open' : 'close'), kind === 'opening' ? 'Opening' : 'Closing'));

  const data = valve[kind];

  const inClr = el('input');
  inClr.type = 'text'; inClr.inputMode = 'decimal'; inClr.placeholder = 'clearance';
  inClr.value = data.clr;
  const inShim = el('input');
  inShim.type = 'text'; inShim.inputMode = 'decimal'; inShim.placeholder = 'shim';
  inShim.value = data.shim;

  inClr.addEventListener('input', () => { data.clr = inClr.value; recalc(); });
  inShim.addEventListener('input', () => { data.shim = inShim.value; recalc(); });

  line.appendChild(inClr);
  line.appendChild(inShim);
  line.appendChild(el('div', 'arrow', '\u203a'));

  const out = el('div', 'out');
  line.appendChild(out);
  const info = el('div', 'info');
  line.appendChild(info);

  rowRefs.push({ valve, kind, data, out, info });
  return line;
}

/* ---------------- recalc / render results ---------------- */
function recalc() {
  let ok = 0, adj = 0, fail = 0, filled = 0;
  const shop = {};

  rowRefs.forEach(r => {
    const sp = specFor(r.valve, r.kind);
    const cfg = r.kind === 'opening' ? state.shim.opener : state.shim.closer;
    const measured = num(r.data.clr);
    const current = num(r.data.shim);
    const res = calc(r.kind, measured, current, sp, cfg, state.keepPolicy);
    r.res = res;

    r.out.className = 'out';
    r.info.innerHTML = '';

    if (measured === null) {
      r.out.textContent = '\u2013';
      showTarget(r, sp);
      return;
    }
    filled++;

    if (res.keep) {
      r.out.textContent = 'Keep';
      r.out.classList.add('keep');
      ok++;
    } else if (res.newShim === null) {
      r.out.textContent = res.msg || 'shim?';
      r.out.classList.add('err');
      adj++;
    } else {
      r.out.textContent = f2(res.newShim);
      r.out.classList.add('chg');
      adj++;
      const key = r.kind + '|' + f2(res.newShim);
      shop[key] = (shop[key] || 0) + 1;
    }

    // badges + detail
    const b = el('span', 'badge ' + (res.status === 'ok' ? 'b-ok' : res.status === 'tight' ? 'b-tight' : 'b-loose'),
      res.status === 'ok' ? 'in target' : res.status === 'tight' ? 'tight' : 'loose');
    r.info.appendChild(b);
    if (res.inCheck === false) {
      r.info.appendChild(el('span', 'badge b-fail', 'out of check range'));
      fail++;
    }
    if (!res.keep && res.newShim !== null) {
      const d = res.delta;
      r.info.appendChild(el('span', null,
        (d > 0 ? '+' : '') + f2(d) + ' mm shim \u2192 ' + f2(res.resulting) + ' mm clearance'));
      if (res.msg) r.info.appendChild(el('span', 'badge b-loose', res.msg));
    } else {
      showTarget(r, sp);
    }
  });

  renderTallies(ok, adj, fail, filled);
  renderShopping(shop);
  $('#reportPre').textContent = buildReport();
  save();
}

function showTarget(r, sp) {
  const t = 'target ' + f2(sp.tMin) + '\u2013' + f2(sp.tMax);
  r.info.appendChild(el('span', null, t));
}

function renderTallies(ok, adj, fail, filled) {
  const host = $('#tallies');
  host.innerHTML = '';
  const total = rowRefs.length;
  const mk = (n, label) => { const d = el('div', 'tally'); d.appendChild(el('b', null, String(n))); d.appendChild(document.createTextNode(label)); return d; };
  host.appendChild(mk(filled + '/' + total, 'measured'));
  host.appendChild(mk(ok, 'in target \u2013 keep'));
  host.appendChild(mk(adj, 'need a new shim'));
  host.appendChild(mk(fail, 'outside check range'));
}

function renderShopping(shop) {
  const host = $('#shopping');
  host.innerHTML = '';
  const keys = Object.keys(shop).sort((a, b) => {
    const [ka, va] = a.split('|'), [kb, vb] = b.split('|');
    return ka === kb ? parseFloat(va) - parseFloat(vb) : (ka === 'opening' ? -1 : 1);
  });
  if (!keys.length) { host.textContent = 'Nothing to buy yet.'; return; }
  keys.forEach(k => {
    const [kind, size] = k.split('|');
    const c = el('div', 'chip ' + (kind === 'opening' ? 'open' : 'close'));
    c.appendChild(document.createTextNode((kind === 'opening' ? 'Opening ' : 'Closing ') + size));
    c.appendChild(el('span', 'q', '  \u00d7' + shop[k]));
    host.appendChild(c);
  });
}

/* ---------------- report / exports ---------------- */
function cylHeading(name) {
  const n = name.trim();
  return /cyl/i.test(n) ? '===' + n + '===' : '===' + n + ' cylinder===';
}

function buildReport() {
  const L = [];
  const b = state.bike;
  L.push('Desmo valve service' + (b.name ? ' \u2013 ' + b.name : ''));
  const meta = [];
  if (b.date) meta.push('Date: ' + b.date);
  if (b.odo) meta.push('Odometer: ' + b.odo);
  const eng = ENGINES.find(e => e.id === state.engineId);
  if (eng) meta.push('Engine: ' + eng.name);
  if (meta.length) L.push(meta.join(' | '));
  L.push('Spec: ' + state.specLabel);
  L.push('  Openers target ' + f2(state.spec.opener.tMin) + '-' + f2(state.spec.opener.tMax) +
    ' mm, check ' + f2(state.spec.opener.cMin) + '-' + f2(state.spec.opener.cMax) + ' mm');
  L.push('  Closers target ' + f2(state.spec.closer.tMin) + '-' + f2(state.spec.closer.tMax) +
    ' mm, check ' + f2(state.spec.closer.cMin) + '-' + f2(state.spec.closer.cMax) + ' mm');
  if (state.sepEx) {
    L.push('  Exhaust openers target ' + f2(state.specEx.opener.tMin) + '-' + f2(state.specEx.opener.tMax) +
      ' mm, closers ' + f2(state.specEx.closer.tMin) + '-' + f2(state.specEx.closer.tMax) + ' mm');
  }
  L.push('');

  const shop = {};
  state.cylinders.forEach(cyl => {
    L.push(cylHeading(cyl.name));
    cyl.valves.forEach(v => {
      L.push(v.name);
      ['opening', 'closing'].forEach(kind => {
        const sp = specFor(v, kind);
        const cfg = kind === 'opening' ? state.shim.opener : state.shim.closer;
        const measured = num(v[kind].clr);
        const current = num(v[kind].shim);
        const res = calc(kind, measured, current, sp, cfg, state.keepPolicy);
        const label = kind === 'opening' ? 'Opening' : 'Closing';
        if (measured === null) { L.push(label + ': -'); return; }
        const shimTxt = current === null ? '?' : f2(current);
        let tail;
        if (res.keep) tail = 'Keep';
        else if (res.newShim === null) tail = '? (' + (res.msg || 'need current shim') + ')';
        else {
          tail = f2(res.newShim);
          shop[kind + '|' + f2(res.newShim)] = (shop[kind + '|' + f2(res.newShim)] || 0) + 1;
        }
        let line = label + ': ' + f2(measured) + ' - Shim ' + shimTxt + ' > ' + tail;
        if (!res.keep && res.newShim !== null) line += '   (\u2192 ' + f2(res.resulting) + ')';
        if (res.inCheck === false) line += '   [outside check range]';
        L.push(line);
      });
    });
    L.push('');
  });

  const keys = Object.keys(shop);
  if (keys.length) {
    L.push('=== Shims needed ===');
    keys.sort((a, b2) => {
      const [ka, va] = a.split('|'), [kb, vb] = b2.split('|');
      return ka === kb ? parseFloat(va) - parseFloat(vb) : (ka === 'opening' ? -1 : 1);
    }).forEach(k => {
      const [kind, size] = k.split('|');
      L.push((kind === 'opening' ? 'Opening ' : 'Closing ') + size + ' mm x' + shop[k]);
    });
    L.push('');
  }
  if (b.notes) { L.push('=== Notes ==='); L.push(b.notes); L.push(''); }
  return L.join('\n');
}

function buildCsv() {
  const rows = [['Cylinder', 'Valve', 'Side', 'Measured (mm)', 'Current shim (mm)', 'New shim (mm)', 'Resulting (mm)', 'Shim change (mm)', 'Status']];
  state.cylinders.forEach(cyl => {
    cyl.valves.forEach(v => {
      ['opening', 'closing'].forEach(kind => {
        const sp = specFor(v, kind);
        const cfg = kind === 'opening' ? state.shim.opener : state.shim.closer;
        const measured = num(v[kind].clr), current = num(v[kind].shim);
        const res = calc(kind, measured, current, sp, cfg, state.keepPolicy);
        rows.push([
          cyl.name, v.name, kind,
          f2(measured), f2(current),
          res.keep ? 'keep' : f2(res.newShim),
          f2(res.resulting),
          res.keep ? '0.00' : f2(res.delta),
          measured === null ? '' : (res.keep ? 'in target' : res.status) + (res.inCheck === false ? ' / outside check range' : '')
        ]);
      });
    });
  });
  return rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\r\n');
}

function fileStamp() {
  const b = state.bike;
  const nm = (b.name || 'desmo').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'desmo';
  return nm + '_' + (b.date || new Date().toISOString().slice(0, 10));
}
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/* ---------------- saved snapshots ---------------- */
function snaps() { try { return JSON.parse(lsRead(CK + '_snaps') || '[]'); } catch (e) { return []; } }
function setSnaps(a) { lsWrite(CK + '_snaps', JSON.stringify(a)); refreshSnapSel(); }
function refreshSnapSel() {
  const sel = $('#snapSel');
  const cur = sel.value;
  const list = snaps();
  sel.innerHTML = '';
  if (!list.length) { sel.appendChild(new Option('\u2014 none saved \u2014', '')); return; }
  list.forEach((s, i) => sel.appendChild(new Option(s.title, String(i))));
  if (cur && Number(cur) < list.length) sel.value = cur;
}

/* ---------------- wiring ---------------- */
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 250);
}

function loadState(obj) {
  state = obj;
  // backfill anything a older/hand-edited file might miss
  const d = defaultState();
  state.shim = Object.assign({}, d.shim, state.shim || {});
  state.bike = Object.assign({}, d.bike, state.bike || {});
  state.keepPolicy = state.keepPolicy || 'target';
  if (!state.spec) state.spec = d.spec;
  if (!state.specEx) state.specEx = cloneSpec(state.spec);
  if (!state.cylinders || !state.cylinders.length) state.cylinders = d.cylinders;
  syncSetupInputs();
  renderCylinders();
  recalc();
}

function bind() {
  $('#engineSel').addEventListener('change', e => {
    const eng = ENGINES.find(x => x.id === e.target.value);
    if (!eng) return;
    state.engineId = eng.id;
    const layoutChanged = state.layoutId !== eng.layout;
    state.layoutId = eng.layout;
    $('#layoutSel').value = eng.layout;
    applySpecPreset(eng.spec);
    if (layoutChanged) state.cylinders = freshCylinders(eng.layout);
    renderCylinders();
    recalc();
  });

  $('#layoutSel').addEventListener('change', e => {
    state.layoutId = e.target.value;
    state.cylinders = freshCylinders(state.layoutId);
    updateSpecNotes();
    renderCylinders();
    recalc();
  });

  $('#specSel').addEventListener('change', e => { applySpecPreset(e.target.value); renderCylinders(); recalc(); });

  $$('[data-quick]').forEach(b => b.addEventListener('click', () => {
    const eng = ENGINES.find(x => x.id === state.engineId);
    if (b.dataset.quick === 'tight') applySpecPreset('ts_tight');
    else applySpecPreset(eng ? eng.spec : 'ts_oe');
    renderCylinders(); recalc();
  }));

  $('#sepEx').addEventListener('change', e => {
    state.sepEx = e.target.checked;
    if (state.sepEx && !state.specEx) state.specEx = cloneSpec(state.spec);
    renderSpecEditors(); updateSpecNotes(); renderCylinders(); recalc();
  });

  $('#keepPolicy').addEventListener('change', e => { state.keepPolicy = e.target.value; recalc(); });

  const shimMap = [
    ['#shOpMin', 'opener', 'min'], ['#shOpMax', 'opener', 'max'], ['#shOpStep', 'opener', 'step'],
    ['#shClMin', 'closer', 'min'], ['#shClMax', 'closer', 'max'], ['#shClStep', 'closer', 'step']
  ];
  shimMap.forEach(([sel, grp, key]) => {
    $(sel).addEventListener('input', e => { state.shim[grp][key] = num(e.target.value); recalc(); });
  });

  const bikeMap = [['#bkName', 'name'], ['#bkDate', 'date'], ['#bkOdo', 'odo'], ['#bkNotes', 'notes']];
  bikeMap.forEach(([sel, key]) => {
    $(sel).addEventListener('input', e => { state.bike[key] = e.target.value; updateBikeHint(); $('#reportPre').textContent = buildReport(); save(); });
  });

  $('#addCyl').addEventListener('click', () => {
    const L = LAYOUTS[state.layoutId];
    state.cylinders.push({
      name: 'Cylinder ' + (state.cylinders.length + 1),
      valves: L.valves.map(v => ({ name: v.n, group: v.g, opening: { clr: '', shim: '' }, closing: { clr: '', shim: '' } }))
    });
    renderCylinders(); recalc();
  });

  $('#clearMeas').addEventListener('click', () => {
    if (!confirm('Clear every measured clearance and shim value?')) return;
    state.cylinders.forEach(c => c.valves.forEach(v => {
      v.opening = { clr: '', shim: '' };
      v.closing = { clr: '', shim: '' };
    }));
    renderCylinders(); recalc();
  });

  $('#dlTxt').addEventListener('click', () => download(fileStamp() + '_valves.txt', buildReport(), 'text/plain'));
  $('#dlCsv').addEventListener('click', () => download(fileStamp() + '_valves.csv', buildCsv(), 'text/csv'));
  $('#dlJson').addEventListener('click', () => download(fileStamp() + '_valves.json', JSON.stringify(state, null, 2), 'application/json'));

  $('#copyTxt').addEventListener('click', async () => {
    const txt = buildReport();
    try { await navigator.clipboard.writeText(txt); toast('Report copied'); }
    catch (e) {
      const ta = el('textarea'); ta.value = txt; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove(); toast('Report copied');
    }
  });

  $('#printBtn').addEventListener('click', () => window.print());

  $('#impJson').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(fr.result);
        if (!obj || !obj.cylinders) throw new Error('not a desmo file');
        loadState(obj);
        toast('Loaded ' + f.name);
      } catch (err) { alert('Could not read that file: ' + err.message); }
      e.target.value = '';
    };
    fr.readAsText(f);
  });

  $('#snapSave').addEventListener('click', () => {
    const dflt = [state.bike.name, state.bike.date, state.bike.odo].filter(Boolean).join(' \u00b7 ') || 'Service ' + new Date().toLocaleString();
    const title = prompt('Name this saved service:', dflt);
    if (title === null) return;
    const list = snaps();
    list.unshift({ title: title || dflt, at: Date.now(), data: JSON.parse(JSON.stringify(state)) });
    setSnaps(list.slice(0, 50));
    toast('Saved');
  });
  $('#snapLoad').addEventListener('click', () => {
    const i = $('#snapSel').value;
    if (i === '') return;
    const s = snaps()[Number(i)];
    if (!s) return;
    loadState(JSON.parse(JSON.stringify(s.data)));
    toast('Loaded "' + s.title + '"');
  });
  $('#snapDel').addEventListener('click', () => {
    const i = $('#snapSel').value;
    if (i === '') return;
    const list = snaps();
    if (!confirm('Delete "' + list[Number(i)].title + '"?')) return;
    list.splice(Number(i), 1);
    setSnaps(list);
  });
}

/* ---------------- boot ---------------- */
fillSelects();
bind();
refreshSnapSel();
const saved = restore();
loadState(saved && saved.cylinders ? saved : defaultState());
