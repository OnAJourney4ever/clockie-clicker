// game.js — Clockie Clicker: state, simulation, rendering and UI.
import * as ART from './art.js';
import { upscale, ctx2d, canvas, bayer, mix, rgba, rng, silhouette } from './pixel.js';
import {
  VERSION, START_BANK, PRICE_GROWTH, SELL_RATE, RING_SIZE, BUILDINGS, ACHIEVEMENTS,
  FLAVORS, ACH_PER_FLAVOR, SYRUP_PER_ACH, syrupState, newsPool, CHANGELOG, randomName,
} from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const root = document.documentElement.style;
const SAVE_KEY = 'clockieClicker.save.v1';
const YEAR = 31536000, DAY = 86400;

// ====================================================================
// state
// ====================================================================
const freshRun = () => ({
  bank: START_BANK, earned: 0, clicks: 0, time: 0, lowest: START_BANK,
  owned: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
  made: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
  dip3: false, dip1: false, saved3: false, saved1: false,
  names: [],
});
const freshState = () => ({
  version: VERSION,
  started: false,
  run: freshRun(),
  all: { earned: 0, clicks: 0, clickEarned: 0, deaths: 0, playTime: 0, firstPlayed: Date.now() },
  ach: {},
  opts: { sound: true, particles: true, short: false, fancy: true },
});
let S = freshState();
let mode = 'paused'; // 'play' | 'paused' | 'dead'
let wiping = false;

const sps = () => BUILDINGS.reduce((s, b) => s + S.run.owned[b.id] * b.sps, 0);
const achCount = () => ACHIEVEMENTS.reduce((n, a) => n + (S.ach[a.id] ? 1 : 0), 0);

// Cookie Clicker pricing: each building costs base * 1.15^owned, rounded up.
// Buying several sums the series before rounding; selling refunds 25%.
function bulkCost(b, amt) {
  let p = 0;
  for (let i = S.run.owned[b.id]; i < S.run.owned[b.id] + amt; i++) p += b.base * PRICE_GROWTH ** i;
  return Math.ceil(p);
}
function sellValue(b, amt) {
  const own = S.run.owned[b.id];
  let p = 0;
  for (let i = Math.max(0, own - amt); i < own; i++) p += b.base * PRICE_GROWTH ** i;
  return Math.ceil(p * SELL_RATE);
}

// ====================================================================
// formatting
// ====================================================================
const BIG = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion'];
const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc'];
function fmt(n, dec = 0) {
  if (!isFinite(n)) return 'Infinity';
  const a = Math.abs(n);
  if (a < 1e6) return n.toLocaleString('en-US', { maximumFractionDigits: dec });
  const e = Math.floor(Math.log10(a) / 3);
  if (e >= BIG.length) return n.toExponential(3);
  const v = (n / 10 ** (e * 3)).toFixed(3);
  return S.opts.short ? `${v} ${SHORT[e]}` : `${v} ${BIG[e]}`;
}
const secs = (n) => `${fmt(n)} ${n === 1 ? 'second' : 'seconds'}`;
function dur(s, parts = 2) {
  s = Math.max(0, Math.floor(s));
  if (s >= YEAR * 1e6) return `${fmt(s / YEAR)} years`;
  const U = [['year', YEAR], ['day', DAY], ['hour', 3600], ['minute', 60], ['second', 1]];
  const out = [];
  for (const [name, v] of U) {
    if (s >= v) {
      const k = Math.floor(s / v);
      s -= k * v;
      out.push(`${k.toLocaleString('en-US')} ${name}${k === 1 ? '' : 's'}`);
      if (out.length >= parts) break;
    } else if (out.length) break;
  }
  return out.length ? out.join(', ') : '0 seconds';
}
const shownBank = () => Math.max(0, Math.ceil(S.run.bank - 1e-9));

// ====================================================================
// pixel scale & textures
// ====================================================================
// The art grid is twice as fine as v0.1: one art pixel is 1.5 CSS px (1 on small screens).
let DEV_PX = 2, PX = 1.5;
function computeScale() {
  const dpr = window.devicePixelRatio || 1;
  PX = innerWidth < 1150 ? 1 : 1.5;
  DEV_PX = Math.max(1, Math.round(PX * dpr)); // integer factor used when baking textures
  root.setProperty('--px', PX * 2 + 'px'); // CSS borders and icon sizes are measured in 2-pixel units
}
const urlCache = new Map();
function texURL(key, make) {
  const k = key + '@' + DEV_PX;
  if (!urlCache.has(k)) urlCache.set(k, upscale(make(), DEV_PX).toDataURL());
  return urlCache.get(k);
}
function bakeTextures() {
  const set = (name, make) => {
    const c = make();
    root.setProperty(`--tex-${name}`, `url(${upscale(c, DEV_PX).toDataURL()})`);
    root.setProperty(`--tex-${name}-size`, `${c.width * PX}px ${c.height * PX}px`);
  };
  set('bg', ART.bgTile);
  set('wood-v', () => ART.woodTex(12, 96, { seed: 3, vertical: true, bevel: true }));
  set('wood-h', () => ART.woodTex(96, 8, { seed: 9, vertical: false, bevel: true }));
  set('plank', ART.plankTex);
  set('darkwood', ART.darkWoodTex);
  root.setProperty('--tex-close', `url(${texURL('close', ART.closeIcon)})`);
  $('#favicon').href = upscale(ART.favicon(), 2).toDataURL();
}

const ART_CACHE = {};
function loadArt(assets) {
  ART_CACHE.face = ART.clockFace();
  ART_CACHE.glare = ART.clockGlare();
  ART_CACHE.hands = ART.clockHands();
  ART_CACHE.cap = ART.clockCap();
  ART_CACHE.hand = ART.handRotator(assets.hand); // the pointing hand: a real image, rotated by RotSprite
  ART_CACHE.nurse = ART.nurseSprite();
  const nd = ctx2d(ART_CACHE.nurse).getImageData(0, 0, ART_CACHE.nurse.width, ART_CACHE.nurse.height).data;
  ART_CACHE.nurseMask = Uint8Array.from({ length: nd.length / 4 }, (_, i) => (nd[i * 4 + 3] > 127 ? 1 : 0));
  ART_CACHE.hospital = ART.hospitalTex();
  ART_CACHE.icons = ART.storeIcons(assets.hand);
}
const iconURL = (id) => texURL('icon-' + id, () => ART_CACHE.icons[id]);
const coinURL = () => texURL('coin', ART.currencyIcon);
const achURL = (a, locked) => texURL(`ach-${a.glyph}-${a.tier}-${locked}`, () => ART.achievementIcon(a.glyph, a.tier, locked));

// ====================================================================
// audio (tiny synthesised blips; no files)
// ====================================================================
let AC = null;
function sfx(type) {
  if (!S.opts.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    const tone = (freq, start, len, vol, wave = 'square', endFreq) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(freq, t + start);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + start + len);
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + len);
      o.connect(g).connect(AC.destination);
      o.start(t + start);
      o.stop(t + start + len + 0.02);
    };
    if (type === 'click') { tone(1700, 0, 0.045, 0.05, 'square', 700); tone(3200, 0, 0.02, 0.025, 'triangle'); }
    if (type === 'tick') tone(2600, 0, 0.03, 0.035, 'triangle');
    if (type === 'buy') { tone(523, 0, 0.08, 0.06, 'square'); tone(784, 0.07, 0.12, 0.06, 'square'); }
    if (type === 'sell') { tone(784, 0, 0.08, 0.05, 'square'); tone(523, 0.07, 0.12, 0.05, 'square'); }
    if (type === 'nope') tone(140, 0, 0.12, 0.06, 'square');
    if (type === 'ach') [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.07, 0.18, 0.05, 'square'));
    if (type === 'bong') for (let i = 0; i < 3; i++) {
      tone(98, i * 1.1, 2.6, 0.22, 'sine'); tone(196, i * 1.1, 1.8, 0.1, 'sine'); tone(293, i * 1.1, 1.2, 0.05, 'triangle');
    }
  } catch { /* audio is optional */ }
}

// ====================================================================
// left panel: clock, cursors, rays, syrup
// ====================================================================
const left = $('#left'), cv = $('#clockCanvas'), cx = ctx2d(cv);
const L = { W: 0, H: 0, ccx: 0, ccy: 0 };
const K = ART.K;
const RR = 86 * K;
const rayCv = canvas(RR * 2 + 1, RR * 2 + 1), rayX = ctx2d(rayCv), rayImg = rayX.createImageData(RR * 2 + 1, RR * 2 + 1);
let syrupCv = canvas(1, 1), syrupX = ctx2d(syrupCv), syrupImg = null;
let press = 0, hoverClock = false;
const particles = [];

function sizeLeft() {
  const r = left.getBoundingClientRect();
  L.W = Math.max(1, Math.ceil(r.width / PX));
  L.H = Math.max(1, Math.ceil(r.height / PX));
  cv.width = L.W; cv.height = L.H;
  cv.style.width = L.W * PX + 'px';
  cv.style.height = L.H * PX + 'px';
  const counterBottom = ($('#counter').offsetTop + $('#counter').offsetHeight) / PX;
  L.ccx = Math.floor(L.W / 2);
  L.ccy = Math.max(Math.round(counterBottom + 70 * K), Math.floor(L.H * 0.5));
  syrupCv = canvas(L.W, Math.ceil(L.H * 0.4));
  syrupX = ctx2d(syrupCv);
  syrupImg = syrupX.createImageData(syrupCv.width, syrupCv.height);
}

function drawRays(t) {
  const d = rayImg.data, S2 = RR * 2 + 1;
  d.fill(0);
  for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) {
    const dx = x - RR, dy = y - RR, dist = Math.hypot(dx, dy);
    if (dist > RR || dist < 30 * K) continue;
    const a = Math.atan2(dy, dx) + t * 0.12;
    const band = (((a / (Math.PI * 2)) * 14) % 1 + 1) % 1 < 0.5;
    const fall = 1 - dist / RR;
    if (bayer(x, y) < fall * fall * (band ? 0.85 : 0.25)) {
      const o = (y * S2 + x) * 4;
      d[o] = 210; d[o + 1] = 225; d[o + 2] = 255; d[o + 3] = 34;
    }
  }
  rayX.putImageData(rayImg, 0, 0);
}

function syrupLevel() { return Math.round(L.H * Math.min(0.3, 0.06 + achCount() * 0.0045)); }

function drawSyrup(t) {
  const w = syrupCv.width, h = syrupCv.height, d = syrupImg.data;
  d.fill(0);
  const { flavor, idx } = syrupState(achCount());
  const base = flavor.color;
  const shades = [mix(base, '#ffffff', 0.5), mix(base, '#ffffff', 0.18), base, mix(base, '#000000', 0.3), mix(base, '#000000', 0.5)].map(rgba);
  const streak = rgba(mix(base, '#ffffff', 0.3));
  const level = Math.min(h - 2, syrupLevel());
  const put = (x, y, c, a = 235) => { const o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; };
  for (let x = 0; x < w; x++) {
    // slow, heavy swell: syrup is thick
    const s = Math.round(h - level + Math.sin(x * 0.04 + t * 1.2) * 1.4 + Math.sin(x * 0.0135 - t * 0.6) * 1.8);
    for (let y = Math.max(0, s); y < h; y++) {
      const dd = y - s;
      let c;
      if (dd === 0) c = shades[0];
      else if (dd === 1) c = shades[1];
      else {
        const f = dd / Math.max(1, level);
        const band = f < 0.45 ? 0 : f < 0.6 ? (bayer(x, y) < (f - 0.45) / 0.15 ? 1 : 0) : f < 0.85 ? 1 : (bayer(x, y) < (f - 0.85) / 0.15 ? 2 : 1);
        c = shades[2 + band];
        // long lazy streaks drifting to the right
        if (dd % 13 === 6 && (((x - Math.floor(t * 12) + dd * 11) % 82) + 82) % 82 < 14) c = streak;
        if (idx === FLAVORS.length - 1 && ((x * 7919 + y * 104729 + Math.floor(t * 2)) % 211) === 0) c = [255, 255, 255];
      }
      put(x, y, c, dd === 0 ? 255 : 240);
    }
  }
  syrupX.putImageData(syrupImg, 0, 0);
}

function handAngles() {
  const T = (((DAY - shownBank()) % DAY) + DAY) % DAY;
  const sec = T % 60, min = Math.floor(T / 60) % 60, hr = Math.floor(T / 3600) % 12;
  const tau = Math.PI * 2;
  return { s: (sec / 60) * tau, m: ((min + sec / 60) / 60) * tau, h: ((hr + min / 60) / 12) * tau };
}

let rayTimer = 0;
function renderLeft(t, dt) {
  cx.clearRect(0, 0, L.W, L.H);
  const { ccx, ccy } = L;
  if (S.opts.fancy) {
    rayTimer -= dt;
    if (rayTimer <= 0) { drawRays(t); rayTimer = 1 / 30; }
    cx.drawImage(rayCv, ccx - RR, ccy - RR);
  }
  // pointing hands orbit in rings of 50, each poking the clock once every 10 seconds.
  // Outer rings are drawn first so the inner ring overlaps them.
  const n = Math.min(S.run.owned.cursor, RING_SIZE * 4);
  for (let i = n - 1; i >= 0; i--) {
    const ring = Math.floor(i / RING_SIZE), j = i % RING_SIZE;
    const ang = (j / RING_SIZE) * Math.PI * 2 + t * 0.05 * (ring % 2 ? -1 : 1) + ring * 0.031;
    const local = (((t + (j / RING_SIZE) * 10) % 10) + 10) % 10;
    const poke = local < 0.3 ? Math.sin((local / 0.3) * Math.PI) * 3 * K : 0;
    const rTip = ART.CLOCK_R + 8 + ring * 22 - poke;
    const px = ccx + Math.sin(ang) * rTip, py = ccy - Math.cos(ang) * rTip;
    const spr = ART_CACHE.hand(Math.atan2(ccx - px, py - ccy)); // the sprite points up; aim the fingertip at the clock
    cx.drawImage(spr.c, Math.round(px) - spr.r, Math.round(py) - spr.r);
  }
  // the clock itself
  const pY = press > 0 ? 2 : 0;
  const R = ART.CLOCK_R;
  cx.drawImage(ART_CACHE.face, ccx - R, ccy - R + pY);
  const ang = handAngles(), H = ART_CACHE.hands;
  cx.globalAlpha = 0.22;
  for (const [hand, a] of [[H.hour, ang.h], [H.minute, ang.m], [H.second, ang.s]]) {
    const sh = hand.shadow(a);
    cx.drawImage(sh.c, ccx - sh.r + 2, ccy - sh.r + 2 + pY);
  }
  cx.globalAlpha = 1;
  for (const [hand, a] of [[H.hour, ang.h], [H.minute, ang.m], [H.second, ang.s]]) {
    const sp = hand.rot(a);
    cx.drawImage(sp.c, ccx - sp.r, ccy - sp.r + pY);
  }
  cx.drawImage(ART_CACHE.cap, ccx - 6, ccy - 6 + pY);
  cx.drawImage(ART_CACHE.glare, ccx - R, ccy - R + pY);
  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; p.vy += 160 * K * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    cx.fillStyle = p.col;
    cx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  // syrup flowing beneath the clock
  drawSyrup(t);
  cx.drawImage(syrupCv, 0, L.H - syrupCv.height);
  press = Math.max(0, press - dt);
}

function artPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / PX, y: (e.clientY - r.top) / PX, cssX: e.clientX - r.left, cssY: e.clientY - r.top };
}
const onClock = (p) => Math.hypot(p.x - (L.ccx + 0.5), p.y - (L.ccy + 0.5)) <= ART.CLOCK_R + 0.5;

// the arrow is the clicking cursor: it replaces the mouse pointer while hovering the clock
let arrowCursorURL = null;
function arrowCursor() {
  if (!arrowCursorURL) {
    const c = canvas(24, 42);
    ctx2d(c).drawImage(ART.cursorSprite(), 0, 0, 24, 42);
    arrowCursorURL = c.toDataURL();
  }
  return `url(${arrowCursorURL}) 0 0, pointer`;
}
cv.addEventListener('pointermove', (e) => {
  hoverClock = onClock(artPos(e));
  cv.style.cursor = hoverClock ? arrowCursor() : 'default';
});
cv.addEventListener('pointerdown', (e) => {
  const p = artPos(e);
  if (!onClock(p) || mode !== 'play') return;
  clickClock(p);
});

function clickClock(p) {
  const gain = 1;
  S.run.bank += gain; S.run.earned += gain; S.run.clicks++;
  S.all.earned += gain; S.all.clicks++; S.all.clickEarned += gain;
  press = 0.07;
  sfx('click');
  const f = document.createElement('div');
  f.className = 'floater';
  f.textContent = '+1';
  f.style.left = p.cssX + (Math.random() * 16 - 8) + 'px';
  f.style.top = p.cssY - 20 + 'px';
  $('#floaters').appendChild(f);
  setTimeout(() => f.remove(), 1000);
  if (S.opts.particles) {
    const cols = ['#ffe9a0', '#c99a2e', '#ffffff', '#cc8445'];
    for (let i = 0; i < 6; i++) particles.push({
      x: p.x, y: p.y, vx: (Math.random() - 0.5) * 70 * K, vy: (-30 - Math.random() * 50) * K,
      life: 0.5 + Math.random() * 0.4, col: cols[i % cols.length],
    });
  }
  checkAch();
}

// ====================================================================
// middle: building rows
// ====================================================================
const rowsEl = $('#rows');
let rowCanvases = [];
const ROW_H = 64;
const NURSE_STEP = 22;
let nurseHover = null; // { b: 'nurse', i: index }

// every nurse gets a perfectly ordinary name, remembered in the save
function syncNames() {
  const r = S.run, want = Math.min(r.owned.nurse || 0, 200);
  r.names = Array.isArray(r.names) ? r.names : [];
  while (r.names.length < want) r.names.push(randomName(r.names));
  r.names.length = want;
}

function buildRows() {
  syncNames();
  rowsEl.querySelectorAll('.bRow, .rowWood').forEach((n) => n.remove());
  rowCanvases = [];
  const W = Math.ceil(rowsEl.clientWidth / PX);
  for (const b of BUILDINGS) {
    if (b.id === 'cursor' || !S.run.owned[b.id]) continue;
    const row = document.createElement('div');
    row.className = 'bRow';
    const c = canvas(W, ROW_H);
    c.style.width = W * PX + 'px';
    c.style.height = ROW_H * PX + 'px';
    row.appendChild(c);
    const wood = document.createElement('div');
    wood.className = 'rowWood';
    rowsEl.append(row, wood);
    const entry = { b, c, x: ctx2d(c), items: [] };
    rowCanvases.push(entry);
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const hit = nurseAt(entry, (e.clientX - r.left) / PX, (e.clientY - r.top) / PX);
      const next = hit ? { b: b.id, i: hit.i } : null;
      c.style.cursor = hit ? 'pointer' : 'default';
      if (hit) {
        const name = S.run.names[hit.i] || 'Nurse';
        tipFor = { kind: 'html', ev: e, html: `<div class="tHead"><img src="${iconURL('nurse')}" alt=""><div><div class="tName">${name}</div><div class="tSub">Nurse</div></div></div>
          <div class="line"></div><div>Winds back <b>1 second</b> per second.</div>` };
        showTip(e);
      } else hideTip();
      if (next?.i !== nurseHover?.i) { nurseHover = next; drawRows(); }
    });
    c.addEventListener('pointerleave', () => { nurseHover = null; hideTip(); drawRows(); });
  }
  $('#rowsEmpty').hidden = rowCanvases.length > 0;
}

const hash = (i) => { const r = rng(i * 9973 + 17); return r(); };

// topmost nurse under an art-pixel position (transparent pixels don't count)
function nurseAt(row, ax, ay) {
  const spr = ART_CACHE.nurse;
  for (let k = row.items.length - 1; k >= 0; k--) {
    const it = row.items[k], lx = Math.floor(ax - it.x), ly = Math.floor(ay - it.y);
    if (lx < 0 || ly < 0 || lx >= spr.width || ly >= spr.height) continue;
    if (ART_CACHE.nurseMask[ly * spr.width + lx]) return it;
  }
  return null;
}

function drawRows() {
  for (const row of rowCanvases) {
    const { b, c, x } = row;
    const tex = ART_CACHE.hospital;
    for (let ox = 0; ox < c.width; ox += tex.width) x.drawImage(tex, ox, 0);
    if (b.id !== 'nurse') continue;
    const spr = ART_CACHE.nurse;
    const cap = Math.max(1, Math.floor((c.width - 16) / NURSE_STEP));
    const n = Math.min(S.run.owned.nurse, cap);
    // back row (odd) first, then the front row overlaps it. Nurses never move on their own.
    const order = [...Array(n).keys()].sort((a, bb) => (bb % 2) - (a % 2) || a - bb);
    row.items = [];
    for (const i of order) {
      const back = i % 2 === 1;
      const feet = back ? 54 : 60;
      const dx = 8 + i * NURSE_STEP + Math.floor(hash(i) * 5);
      const hot = nurseHover && nurseHover.b === b.id && nurseHover.i === i;
      const y = feet - spr.height - (hot ? 4 : 0);
      row.items.push({ i, x: dx, y });
      x.globalAlpha = hot ? 0.18 : 0.3;
      x.fillStyle = '#000';
      x.fillRect(dx + 6, feet - 2, 20, 2);
      x.globalAlpha = 1;
      if (hot) {
        // soft pale outline behind the sprite
        const out = silhouette(spr, '#fff6c8');
        for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) x.drawImage(out, dx + ox, y + oy);
      }
      x.drawImage(spr, dx, y);
      if (hot) {
        // brightening pass
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 0.22;
        x.drawImage(spr, dx, y);
        x.globalAlpha = 1;
        x.globalCompositeOperation = 'source-over';
      }
    }
  }
}

// ====================================================================
// right: store
// ====================================================================
const store = { mode: 'buy', amt: 1, els: {} };
function buildStore() {
  const box = $('#buildings');
  box.innerHTML = '';
  for (const b of BUILDINGS) {
    const el = document.createElement('div');
    el.className = 'bItem';
    el.innerHTML = `
      <img class="bIcon" src="${iconURL(b.id)}" alt="">
      <div class="bText"><div class="bName">${b.name}</div>
      <div class="bCost"><img src="${coinURL()}" alt=""><span></span></div></div>
      <div class="bOwned"></div>`;
    el.addEventListener('click', () => storeAction(b));
    el.addEventListener('mouseenter', () => { tipFor = { kind: 'building', b, el }; showTip(); });
    el.addEventListener('mouseleave', hideTip);
    box.appendChild(el);
    store.els[b.id] = el;
  }
  refreshStore();
}

function storeAction(b) {
  if (mode !== 'play') return;
  const r = S.run;
  if (store.mode === 'buy') {
    const cost = bulkCost(b, store.amt);
    if (r.bank - cost <= 0) { sfx('nope'); return; }
    r.bank -= cost;
    r.owned[b.id] += store.amt;
    sfx('buy');
    if (r.bank < r.lowest) r.lowest = r.bank;
  } else {
    const n = Math.min(store.amt, r.owned[b.id]);
    if (!n) return;
    r.bank += sellValue(b, n);
    r.owned[b.id] -= n;
    sfx('sell');
  }
  buildRows();
  refreshStore();
  checkAch();
  if (tipFor) showTip();
}

function refreshStore() {
  const r = S.run;
  for (const b of BUILDINGS) {
    const el = store.els[b.id];
    if (!el) continue;
    const cost = el.querySelector('.bCost'), span = cost.querySelector('span');
    let ok;
    if (store.mode === 'buy') {
      const price = bulkCost(b, store.amt);
      ok = r.bank - price > 0;
      span.textContent = fmt(price);
      cost.className = 'bCost' + (ok ? '' : ' no');
    } else {
      const n = Math.min(store.amt, r.owned[b.id]);
      ok = n > 0;
      span.textContent = '+' + fmt(sellValue(b, n));
      cost.className = 'bCost sell';
    }
    el.classList.toggle('disabled', !ok);
    el.querySelector('.bOwned').textContent = r.owned[b.id] || '';
  }
}

$('#buyBar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.mode) store.mode = btn.dataset.mode;
  if (btn.dataset.amt) store.amt = +btn.dataset.amt;
  $('#buyBar').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === store.mode || +b.dataset.amt === store.amt));
  refreshStore();
});

// ====================================================================
// tooltip
// ====================================================================
const tip = $('#tooltip');
let tipFor = null;
function showTip(e) {
  if (!tipFor) return;
  if (tipFor.kind === 'building') {
    const { b, el } = tipFor, r = S.run, own = r.owned[b.id], total = sps();
    const price = store.mode === 'buy' ? bulkCost(b, store.amt) : sellValue(b, Math.min(store.amt, own));
    const deadly = store.mode === 'buy' && r.bank - price <= 0 && r.bank > 0;
    tip.innerHTML = `
      <div class="tHead"><img src="${iconURL(b.id)}" alt="">
        <div><div class="tName">${b.name}</div><div class="tSub">owned: ${own}</div></div>
        <div class="tPrice ${store.mode === 'buy' && deadly ? 'no' : ''}">${store.mode === 'sell' ? '+' : ''}${fmt(price)} s</div></div>
      <div class="line"></div>
      <div>${b.desc}</div>
      <div>&bull; each ${b.name.toLowerCase()} winds back <b>${fmt(b.sps, 1)} ${b.sps === 1 ? 'second' : 'seconds'}</b> per second</div>
      ${own ? `<div>&bull; ${own} ${b.name.toLowerCase()}${own === 1 ? '' : 's'} winding back <b>${fmt(own * b.sps, 1)} seconds</b> per second (<b>${fmt(total ? (own * b.sps / total) * 100 : 0, 1)}%</b> of total)</div>
      <div>&bull; <b>${secs(Math.floor(r.made[b.id]))}</b> wound back so far</div>` : ''}
      ${deadly ? `<div class="warn">Buying ${store.amt > 1 ? 'these' : 'this'} would let the clock strike midnight!</div>` : ''}
      <div class="quote">${b.quote}</div>`;
    tip.hidden = false;
    const er = el.getBoundingClientRect(), rr = $('#right').getBoundingClientRect();
    const th = tip.offsetHeight, tw = tip.offsetWidth;
    tip.style.left = Math.max(8, rr.left - tw - 14) + 'px';
    tip.style.top = Math.min(innerHeight - th - 8, Math.max(8, er.top)) + 'px';
  } else if (tipFor.kind === 'html') {
    tip.innerHTML = tipFor.html;
    tip.hidden = false;
    const m = e || tipFor.ev;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - tw - 8, m.clientX + 14) + 'px';
    tip.style.top = Math.min(innerHeight - th - 8, m.clientY + 14) + 'px';
  }
}
function hideTip() { tipFor = null; tip.hidden = true; }
function bindHtmlTip(el, html) {
  el.addEventListener('mouseenter', (e) => { tipFor = { kind: 'html', html: typeof html === 'function' ? html() : html, ev: e }; showTip(e); });
  el.addEventListener('mousemove', (e) => { if (tipFor) showTip(e); });
  el.addEventListener('mouseleave', hideTip);
}

// ====================================================================
// achievements & notifications
// ====================================================================
function checkAch() {
  const s = sps();
  let got = false;
  for (const a of ACHIEVEMENTS) {
    if (S.ach[a.id] || !a.check(S, s)) continue;
    S.ach[a.id] = Date.now();
    got = true;
    note(achURL(a, false), 'Achievement unlocked', a.name);
  }
  if (got) {
    sfx('ach');
    if (openMenu === 'stats') renderMenu();
    const n = achCount();
    if (n % ACH_PER_FLAVOR === 0) {
      const { flavor } = syrupState(n);
      note(texURL('flav-' + flavor.name, () => ART.achievementIcon('clock', 2)), 'A new syrup seeps out', flavor.name);
    }
  }
}

function note(icon, title, name, life = 6000) {
  const n = document.createElement('div');
  n.className = 'note';
  n.innerHTML = `${icon ? `<img src="${icon}" alt="">` : ''}<div><div class="t">${title}</div><div class="n">${name}</div></div><button class="x" aria-label="Dismiss"></button>`;
  n.querySelector('.x').onclick = () => n.remove();
  $('#notes').appendChild(n);
  const all = $('#notes').children;
  if (all.length > 4) all[0].remove();
  setTimeout(() => n.remove(), life);
}

// ====================================================================
// menus
// ====================================================================
let openMenu = null;
const menuEl = $('#menu'), menuContent = $('#menuContent');
document.querySelectorAll('.menuBtn').forEach((b) => b.addEventListener('click', () => toggleMenu(b.dataset.menu)));
$('#menuClose').addEventListener('click', () => toggleMenu(null));

function toggleMenu(name) {
  openMenu = openMenu === name ? null : name;
  menuEl.hidden = !openMenu;
  document.querySelectorAll('.menuBtn').forEach((b) => b.classList.toggle('on', b.dataset.menu === openMenu));
  hideTip();
  if (openMenu) renderMenu();
}

function renderMenu() {
  const r = S.run, all = S.all;
  if (openMenu === 'stats') {
    const n = achCount(), syr = syrupState(n);
    const flav = syr.flavor;
    menuContent.innerHTML = `
      <div class="menuTitle">Statistics</div>
      <div class="subTitle">General</div>
      <div id="statsGeneral"></div>
      <div class="subTitle">Syrup</div>
      <div class="syrupBox">
        <img class="syrupJar" src="${texURL(`jar-${flav.color}-${syr.progress}`, () => ART.syrupJar(flav.color, syr.progress))}" width="${48 * PX * 2}" height="${64 * PX * 2}" alt="">
        <div>
          <div class="listing"><b>${flav.name}</b> <small>(flavor ${syr.idx + 1} of ${FLAVORS.length})</small></div>
          <div class="listing menuNote">${flav.desc}</div>
          <div class="bar"><div style="width:${syr.progress}%;background:${flav.color}"></div></div>
          <div class="listing">Syrup progress: <b>${syr.progress}%</b> <small>(each achievement adds ${SYRUP_PER_ACH}%; every ${ACH_PER_FLAVOR} pours a new flavor)</small></div>
          <div class="flavors">${FLAVORS.map((f, i) => `<div class="flavor${i > syr.idx ? ' locked' : ''}" data-i="${i}" style="background:${f.color}"></div>`).join('')}</div>
        </div>
      </div>
      <div class="listing menuNote" style="margin-top:8px">The syrup doesn't do anything yet. It just flows.</div>
      <div class="subTitle">Achievements</div>
      <div class="listing">Unlocked: <b>${n}</b> / ${ACHIEVEMENTS.length} (${Math.floor((n / ACHIEVEMENTS.length) * 100)}%)</div>
      <div class="achGrid">${ACHIEVEMENTS.map((a) => `<img class="ach" data-id="${a.id}" src="${achURL(a, !S.ach[a.id])}" alt="">`).join('')}</div>`;
    menuContent.querySelectorAll('.ach').forEach((img) => {
      const a = ACHIEVEMENTS.find((x) => x.id === img.dataset.id);
      bindHtmlTip(img, () => {
        const have = !!S.ach[a.id];
        return `<div class="tHead"><img src="${achURL(a, !have)}" alt=""><div><div class="tName">${have ? a.name : '???'}</div>
          <div class="tSub">${have ? 'Achievement unlocked' : 'Locked'}</div></div></div><div class="line"></div><div>${a.desc}</div>`;
      });
    });
    menuContent.querySelectorAll('.flavor').forEach((el) => {
      const f = FLAVORS[+el.dataset.i], locked = el.classList.contains('locked');
      bindHtmlTip(el, locked
        ? `<div class="tName">???</div><div>Unlocks at <b>${+el.dataset.i * ACH_PER_FLAVOR}</b> achievements.</div>`
        : `<div class="tName">${f.name}</div><div class="quote">${f.desc}</div>`);
    });
    renderStatsGeneral();
  } else if (openMenu === 'options') {
    const tog = (k, label) => `<button class="optBtn${S.opts[k] ? '' : ' off'}" data-opt="${k}">${label} ${S.opts[k] ? 'ON' : 'OFF'}</button>`;
    menuContent.innerHTML = `
      <div class="menuTitle">Options</div>
      <div class="subTitle">General</div>
      <button class="optBtn" data-act="save">Save</button>
      <button class="optBtn" data-act="export">Export save</button>
      <button class="optBtn" data-act="import">Import save</button>
      <button class="optBtn warn" data-act="wipe">Wipe save</button>
      <div id="saveArea"></div>
      <div class="listing menuNote">The game saves itself every 30 seconds.</div>
      <div class="subTitle">Settings</div>
      ${tog('sound', 'Sound')} ${tog('particles', 'Particles')} ${tog('fancy', 'Fancy graphics')} ${tog('short', 'Short numbers')}`;
    menuContent.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
      S.opts[b.dataset.opt] = !S.opts[b.dataset.opt];
      renderMenu(); refreshStore();
    }));
    menuContent.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => optionAction(b.dataset.act)));
  } else if (openMenu === 'info') {
    menuContent.innerHTML = `
      <div class="menuTitle">Info</div>
      <div class="subTitle">About</div>
      <div class="listing">It is one minute to midnight. Click the clock to wind its second hand back.
        Spend the time you've saved on cursors and nurses, who'll wind it back for you.</div>
      <div class="listing">If the clock ever strikes midnight, you die. Don't let it strike midnight.</div>
      <div class="listing menuNote">The clock only ticks while you're watching it.</div>
      <div class="listing"><small>Clockie Clicker v${VERSION}. Inspired by <i>Cookie Clicker</i> by Orteil.</small></div>
      <div class="subTitle">Version history</div>
      <div class="changelog">${CHANGELOG.map((c) => `<h4>v${c.v} <small style="font-family:Merriweather;font-size:11px;color:#b9b2a4">${c.date}</small></h4><ul>${c.notes.map((x) => `<li>${x}</li>`).join('')}</ul>`).join('')}</div>`;
  } else if (openMenu === 'mythos') {
    menuContent.innerHTML = `
      <div class="menuTitle">Mythos</div>
      <img class="sigil" src="${texURL('sigil', () => upscale(ART.glyph('moon'), 4))}" width="${32 * PX * 2}" height="${32 * PX * 2}" alt="">
      <div class="listing" style="text-align:center">The Mythos is sealed.</div>
      <div class="listing menuNote" style="text-align:center">Some stories are older than the clock. None of them are ready to be told.</div>`;
  }
}

function renderStatsGeneral() {
  const el = $('#statsGeneral');
  if (!el) return;
  const r = S.run, all = S.all, s = sps();
  const owned = BUILDINGS.reduce((n, b) => n + r.owned[b.id], 0);
  const row = (k, v) => `<div class="listing">${k}: <b>${v}</b></div>`;
  el.innerHTML = [
    row('Time on the clock', `${secs(shownBank())} <small>(${dur(shownBank())})</small>`),
    row('Time wound back (this life)', secs(Math.floor(r.earned))),
    row('Time wound back (all time)', `${secs(Math.floor(all.earned))} <small>(${dur(all.earned)})</small>`),
    row('This life has lasted', dur(r.time, 3)),
    row('Buildings owned', fmt(owned)),
    row('Winding back per second', `${fmt(s, 1)} <small>(the clock moves forward 1 per second)</small>`),
    row('Clock clicks', `${fmt(r.clicks)} <small>(${fmt(all.clicks)} all time)</small>`),
    row('Time from clicking (all time)', secs(all.clickEarned)),
    row('Closest call (this life)', `${fmt(Math.max(0, r.lowest), 1)} seconds before midnight`),
    row('Midnights struck', fmt(all.deaths)),
    row('Time played', dur(all.playTime, 3)),
  ].join('');
}

function optionAction(act) {
  const area = $('#saveArea');
  if (act === 'save') save(true);
  if (act === 'export') {
    area.innerHTML = `<textarea class="saveBox" readonly>${btoa(unescape(encodeURIComponent(JSON.stringify(S))))}</textarea>`;
    area.querySelector('textarea').select();
  }
  if (act === 'import') {
    area.innerHTML = `<textarea class="saveBox" placeholder="Paste your save here"></textarea><button class="optBtn" id="doImport">Load</button>`;
    $('#doImport').onclick = () => {
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob(area.querySelector('textarea').value.trim()))));
        applySave(o);
        mode = 'paused';
        startOverlay();
        rebuildAll();
        save();
        note(null, 'Options', 'Save imported');
      } catch { note(null, 'Options', 'That save could not be read'); }
    };
  }
  if (act === 'wipe' && confirm('Wipe your save? Every second, achievement and syrup will be lost.')) {
    wiping = true;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    location.reload();
  }
}

// ====================================================================
// news ticker
// ====================================================================
let lastNews = '';
function rotateNews() {
  const pool = newsPool(S, sps()).filter((x) => x !== lastNews);
  lastNews = pool[Math.floor(Math.random() * pool.length)];
  const el = $('#newsText');
  el.classList.add('out');
  setTimeout(() => { el.innerHTML = `<span class="tag">News:</span>${lastNews}`; el.classList.remove('out'); }, 400);
}

// ====================================================================
// overlays: intro / welcome back / midnight
// ====================================================================
function overlay(html, btnLabel, onGo) {
  $('#overlayBox').innerHTML = `${html}<button class="optBtn" id="overlayGo">${btnLabel}</button>`;
  $('#overlay').hidden = false;
  $('#overlayGo').onclick = () => { $('#overlay').hidden = true; onGo(); };
}
function clockImg() { const w = (ART.CLOCK_R * 2 + 1) * PX; return `<img src="${texURL('faceBig', () => ART_CACHE.face)}" width="${w}" height="${w}" alt="">`; }

function startOverlay() {
  if (!S.started) {
    overlay(`${clockImg()}<h1>Clockie Clicker</h1>
      <p>It is <b>one minute to midnight</b>.</p>
      <p>Click the clock to wind its second hand back. Spend the seconds you save on help.</p>
      <p>If the clock ever strikes twelve&hellip; you die.</p>`, 'Begin', () => { S.started = true; mode = 'play'; save(); });
  } else {
    overlay(`${clockImg()}<h1>Welcome back</h1>
      <p>The clock waited for you. It always does.</p>
      <p>You have <b>${secs(shownBank())}</b> until midnight.</p>`, 'Resume', () => { mode = 'play'; });
  }
}

function die() {
  mode = 'dead';
  S.run.bank = 0;
  S.all.deaths++;
  checkAch();
  sfx('bong');
  document.body.classList.add('dead');
  const r = S.run;
  save();
  overlay(`<h1 class="midnight">MIDNIGHT</h1>
    <p>The clock struck twelve.</p>
    <p>You held midnight off for <b>${dur(r.time, 3)}</b> and wound back <b>${secs(Math.floor(r.earned))}</b>.</p>
    <p class="menuNote">Your achievements and syrup survive. Your time does not.</p>`, 'Wind it back', () => {
    S.run = freshRun();
    document.body.classList.remove('dead');
    mode = 'play';
    rebuildAll();
    save();
  });
}

// ====================================================================
// save / load
// ====================================================================
function applySave(o) {
  const f = freshState();
  S = {
    ...f, ...o,
    run: { ...f.run, ...o.run, owned: { ...f.run.owned, ...(o.run?.owned || {}) }, made: { ...f.run.made, ...(o.run?.made || {}) } },
    all: { ...f.all, ...o.all },
    opts: { ...f.opts, ...o.opts },
    ach: { ...(o.ach || {}) },
  };
}
function save(manual) {
  if (wiping) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    if (manual) note(null, 'Options', 'Game saved');
  } catch { /* storage may be unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) applySave(JSON.parse(raw));
  } catch { /* corrupt or blocked storage: start fresh */ }
}

// ====================================================================
// main loop
// ====================================================================
let last = performance.now(), slow = 0, lastShown = -1;
function logic(dt) {
  const r = S.run, s = sps();
  r.bank += (s - 1) * dt;
  r.earned += s * dt; S.all.earned += s * dt;
  for (const b of BUILDINGS) r.made[b.id] += r.owned[b.id] * b.sps * dt;
  r.time += dt; S.all.playTime += dt;
  if (r.bank < r.lowest) r.lowest = r.bank;
  if (r.bank < 3) r.dip3 = true;
  if (r.bank < 1) r.dip1 = true;
  if (r.bank >= 60) { if (r.dip3) r.saved3 = true; if (r.dip1) r.saved1 = true; }
  if (r.bank <= 0) die();
}

function updateCounter() {
  const b = shownBank(), s = sps(), net = s - 1;
  $('#bankNum').textContent = secs(b);
  $('#bankHuman').textContent = mode === 'dead' ? 'midnight' : `${dur(b)} until midnight`;
  $('#sps').innerHTML = `per second: ${fmt(s, 1)}<span class="net ${net >= 0 ? 'up' : 'down'}">(net ${net >= 0 ? '+' : '&minus;'}${fmt(Math.abs(net), 1)})</span>`;
  left.classList.toggle('dangerous', mode === 'play' && b <= 10);
  if (b !== lastShown) {
    if (mode === 'play' && b <= 15 && b < lastShown) sfx('tick');
    lastShown = b;
    document.title = mode === 'dead' ? 'Midnight - Clockie Clicker' : `${secs(b)} - Clockie Clicker`;
  }
}

function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (mode === 'play' && !document.hidden) logic(dt);
  renderLeft(t, dt);
  updateCounter();
  slow -= dt;
  if (slow <= 0) {
    slow = 0.1;
    drawRows();
    refreshStore();
    if (tipFor?.kind === 'building') showTip();
  }
  requestAnimationFrame(frame);
}

function rebuildAll() {
  sizeLeft();
  buildStore();
  buildRows();
  if (openMenu) renderMenu();
  root.setProperty('--header-h', $('#header').offsetHeight + 'px');
}

// ====================================================================
// boot
// ====================================================================
async function boot() {
  load();
  computeScale();
  bakeTextures();
  loadArt(await ART.loadAssets());
  $('#topVersion').textContent = 'v' + VERSION;
  rebuildAll();
  rotateNews();
  setInterval(rotateNews, 9000);
  setInterval(() => { checkAch(); if (openMenu === 'stats') renderStatsGeneral(); }, 500);
  setInterval(() => save(), 30000);
  addEventListener('beforeunload', () => save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); last = performance.now(); });
  // re-layout whenever the panels change size (window resize, zoom, or a tab that loaded hidden)
  let rt;
  const relayout = () => {
    clearTimeout(rt);
    rt = setTimeout(() => { const old = DEV_PX; computeScale(); if (old !== DEV_PX) bakeTextures(); rebuildAll(); }, 120);
  };
  addEventListener('resize', relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(left);
  ro.observe(rowsEl);
  startOverlay();
  requestAnimationFrame(frame);
}

// console access for tinkering, like Cookie Clicker's global `Game`
window.Clockie = {
  get state() { return S; },
  give(seconds) { S.run.bank += seconds; },
  setOwned(id, n) { S.run.owned[id] = n; buildRows(); refreshStore(); checkAch(); },
};

if (document.fonts?.ready) document.fonts.ready.then(boot); else boot();
