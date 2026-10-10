// art.js — every texture in the game, authored as pixel art (procedural or hand-placed).
// The art grid is K=2 times finer than v0.1: big shapes (clock, hands, wood) are drawn natively at
// the fine grid; small hand-drawn sprites are drawn at 1x and doubled with Scale2x (smooth2x).
import {
  Pix, canvas, ctx2d, sprite, silhouette, crop, vnoise, bayer, ditherIndex, drawText, textWidth,
  mix, rotator, rng, smooth2x,
} from './pixel.js';
import {
  setHand, achievementIcon as newAchievementIcon, upgradeIcon as newUpgradeIcon, storeIcon, BUILDING_IDS,
} from './icons2.js';
import { buildingIcon } from './icons.js';

export const K = 2;
export const CLOCK_R = 48 * K; // face sprite is 193x193, centre pixel (96,96)

const WOOD = ['#2f170b', '#46230f', '#5e3016', '#7a401d', '#965226', '#b26833', '#cc8445', '#e0a463'];
const LIGHT = [-0.7071, -0.7071]; // light comes from the top-left

// ---------------- assets that live as real image files ----------------
export async function loadAssets() {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('could not load assets/hand.png'));
    img.src = new URL('../assets/hand.png', import.meta.url).href;
  });
  const c = canvas(img.naturalWidth, img.naturalHeight);
  ctx2d(c).drawImage(img, 0, 0);
  setHand(c);
  return { hand: c };
}

// ---------------- the wall clock ----------------
export function clockFace() {
  const S = CLOCK_R * 2 + 1, c = CLOCK_R, p = new Pix(S, S), n = vnoise(11), n2 = vnoise(29);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c, rp = Math.hypot(dx, dy), r = rp / K;
    if (r > 48.45) continue;
    const ux = rp ? dx / rp : 0, uy = rp ? dy / rp : 0;
    const facing = ux * LIGHT[0] + uy * LIGHT[1]; // +1 on the lit (top-left) side
    if (r > 47.6) { p.set(x, y, '#1a0c05'); continue; }
    if (r > 40.45) {
      // turned wood bead: outer slope faces outward, inner slope faces the dial
      const t = (r - 40.45) / 7.15;
      const light = -Math.cos(Math.PI * t) * facing;
      const a01 = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const warp = n.fbm(a01 * 48, rp * 0.12, 48, 0, 3);
      const grain = Math.sin(rp * 1.15 + warp * 9 + n2(a01 * 128, 0, 128) * 2);
      let v = 0.45 + 0.42 * light + 0.17 * grain + (n2(a01 * 320, rp * 0.65, 320) - 0.5) * 0.12;
      if (t > 0.4 && t < 0.62 && light > 0.2) v += 0.16; // specular ridge along the top of the bead
      if (t < 0.12) v -= 0.18; // dark lip where the frame meets the dial
      p.set(x, y, WOOD[ditherIndex(Math.min(1, Math.max(0, v)), WOOD.length, x, y, 0.85)]);
      continue;
    }
    if (r > 39.6) { p.set(x, y, '#24120a'); continue; }
    // dial: warm white, with the frame's inner wall casting a shadow on the lit side
    let col = '#f4f0e5';
    const sh = facing > 0 ? (r - 33.5) / 6 * (0.4 + facing) : -1;
    if (sh > 0.95) col = '#cfc6b1';
    else if (sh > 0.55) col = '#ddd5c4';
    else if (sh > 0.25 && bayer(x, y) < 0.5) col = '#e8e2d4';
    else if (r > 38.7) col = '#e2dccd';
    p.set(x, y, col);
  }
  // minute + hour ticks
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
    const hour = i % 5 === 0, quarter = i % 15 === 0;
    const w = quarter ? 3 : hour ? 2 : 1;
    const from = (quarter ? 33.5 : hour ? 35 : 37.2) * K, to = 38.4 * K;
    for (let rr = from; rr <= to; rr += 0.4) {
      const X = Math.round(c + s * rr) - Math.floor(w / 2), Y = Math.round(c + co * rr) - Math.floor(w / 2);
      p.rect(X, Y, w, w, hour ? '#1a1712' : '#57524a');
    }
  }
  // numerals
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2, s = '' + h, w = textWidth(s);
    const X = c + Math.sin(a) * 28.6 * K, Y = c - Math.cos(a) * 28.6 * K;
    drawText(p, s, Math.round(X - (w - 1) / 2), Math.round(Y - 3), '#1d1a15');
  }
  const brand = 'CLOCKIE';
  drawText(p, brand, c - (textWidth(brand) - 1) / 2, c + 24, '#9a8f7b');
  return p.done();
}

// glass glare, drawn on top of the hands
export function clockGlare() {
  const S = CLOCK_R * 2 + 1, c = CLOCK_R, p = new Pix(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy) / K;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (r < 39 && r > 33.5 && a > -158 && a < -112) {
      const edge = Math.min(a + 158, -112 - a) / 10;
      if (edge > 1 || bayer(x, y) < edge * 0.75) p.set(x, y, '#ffffff', r > 36.5 ? 110 : 70);
    }
    if (r < 32.5 && r > 31.3 && a > -150 && a < -128) p.set(x, y, '#ffffff', 60);
  }
  return p.done();
}

// A hand is built from a half-width profile (one entry per row, top to bottom) and is drawn pointing
// straight up. Each hand is its own sprite so it can be rotated independently of the clock.
function handFromProfile(profile, { outline, fill, hi }) {
  const maxHw = Math.max(...profile), p = new Pix(maxHw * 2 + 1, profile.length);
  const last = profile.length - 1;
  profile.forEach((hw, y) => {
    for (let dx = -hw; dx <= hw; dx++) {
      const ad = Math.abs(dx);
      const edge = ad === hw || y === 0 || y === last || ad > profile[y - 1] || ad > profile[y + 1];
      let col = edge ? outline : fill;
      if (!edge && hi && dx === -(hw - 1) && hw >= 2) col = hi;
      p.set(maxHw + dx, y, col);
    }
  });
  return { p, cx: maxHw };
}
const rep = (v, n) => Array(n).fill(v);

export function clockHands() {
  const mk = (spr, pivX, pivY) => ({
    rot: rotator(spr, pivX, pivY, 360),
    shadow: rotator(silhouette(spr, '#000000'), pivX, pivY, 360),
  });
  const dark = { outline: '#141414', fill: '#3a3b42', hi: '#6a6c78' };

  const hourProf = [0, 1, 2, 3, 4, 5, 5, 5, 4, 4, 3, 3, ...rep(3, 32), 3, 4, 4, 4, 4, 3, 2, 0]; // pivot row 44
  const hour = handFromProfile(hourProf, dark);

  const minProf = [0, 1, 1, 2, 2, 2, ...rep(2, 60), 2, ...rep(2, 7), 2, 1, 1, 0]; // pivot row 66
  const minute = handFromProfile(minProf, dark);

  // second hand: slim red needle with a round counterweight at the tail
  const secProf = [0, ...rep(1, 94)];
  const sec = handFromProfile(secProf, { outline: '#9c1218', fill: '#e0242a', hi: null });
  const sp = new Pix(9, secProf.length), cxs = 4;
  sp.blit(sec.p.done(), 3, 0);
  for (let y = 1; y < secProf.length - 1; y++) sp.set(cxs, y, '#ff5a50');
  for (let y = 80; y <= 88; y++) for (let x = 0; x < 9; x++) {
    const d = Math.hypot(x - cxs, y - 84);
    if (d <= 4.2) sp.set(x, y, d > 3.2 ? '#7a0c10' : x < cxs ? '#ff5a50' : '#e0242a');
  }
  return { hour: mk(hour.p.done(), hour.cx, 44), minute: mk(minute.p.done(), minute.cx, 66), second: mk(sp.done(), cxs, 74) };
}

export function clockCap() {
  const p = new Pix(13, 13);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const d = Math.hypot(x - 6, y - 6);
    if (d > 6.2) continue;
    const hd = Math.hypot(x - 4.2, y - 4.2);
    p.set(x, y, d > 5.2 ? '#5c3f0c' : hd < 1.6 ? '#fff3b8' : hd < 3.4 ? '#ffd86a' : d > 4.2 ? '#9a7420' : '#c99a2e');
  }
  return p.done();
}

// ---------------- the arrow (clicking / mouse achievements) ----------------
const CURSOR_PAL = { k: '#101014', w: '#ffffff', g: '#c3c8d8' };
const ARROW_ROWS = [
  'k.......', 'kk......', 'kwk.....', 'kwwk....', 'kwwwk...', 'kwwwgk..', 'kwwwwgk.',
  'kwwwwwgk', 'kwwwkkkk', 'kwkkwk..', 'kk.kwwk.', 'k..kwgk.', '....kwgk', '.....kk.',
];
export function cursorSprite() { return smooth2x(sprite(ARROW_ROWS, CURSOR_PAL)); }

// ---------------- the pointing hand (orbits the clock; the Cursor building) ----------------
// The hand is a real PNG (assets/hand.png). Its fingertip is pixel (6,0).
export const HAND_TIP = { x: 6, y: 0 };
export function handRotator(handCanvas) { return rotator(handCanvas, HAND_TIP.x, HAND_TIP.y, 180, { vote: true }); }

// ---------------- shading helpers (light comes from the top-left) ----------------
// ramp: dark -> light, 3 or 4 tones
function ball(p, cx, cy, rx, ry, ramp, clipY = 99) {
  const n = ramp.length;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (y > clipY) continue;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const t = -dx * 0.6 - dy * 0.8; // +1 facing the light
    // base tone dominates; a highlight on the lit rim and a shadow on the far rim keep it chunky
    const k = n > 3
      ? (t > 0.82 ? 3 : t > 0.45 ? 2 : t > -0.55 ? 1 : 0)
      : (t > 0.55 ? 2 : t > -0.55 ? 1 : 0);
    p.set(x, y, ramp[k]);
  }
}
// ramp: [dark, base, light]. Light top and left edges, shaded bottom and right edges.
function slab(p, x0, y0, x1, y1, ramp) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const wide = x1 - x0 >= 2, tall = y1 - y0 >= 2;
    let k = 1;
    if (tall && y === y0) k = 2; else if (wide && x === x0) k = 2;
    else if (tall && y === y1) k = 0; else if (wide && x === x1) k = 0;
    p.set(x, y, ramp[k]);
  }
}
const GOLD = ['#8a5a14', '#c99a2e', '#ffd24a', '#fff0a0'];
const CREAM = ['#c8c0a4', '#f0eadc', '#fffdf4'];
const GREEN = ['#256a2a', '#3a9a3a', '#5ac05a', '#8ae070'];

// ---------------- nurse ----------------
// A chunky chibi nurse: big head, bob haircut, little cap, white coat with a stethoscope. 16x26, doubled to 32x52.
export function nurseSprite() {
  const p = new Pix(16, 26);
  const HAIR = ['#4a2410', '#7a4524', '#a8683a', '#c98a52'];
  const SKIN = ['#e8a888', '#f8cfa8', '#ffe2c0'];
  const COAT = ['#b4bccc', '#f4f4ee', '#ffffff'];
  // hair behind the head, falling in a bob
  ball(p, 8, 9, 7, 6.2, HAIR);
  slab(p, 1, 9, 3, 16, HAIR); slab(p, 12, 9, 14, 16, HAIR);
  // face
  ball(p, 8, 10.5, 5.3, 4.7, SKIN);
  // fringe over the forehead
  for (let x = 3; x <= 12; x++) { const h = 6 + (x % 3 === 0 ? 1 : 0); for (let y = 5; y <= h; y++) p.set(x, y, y === 5 ? HAIR[2] : HAIR[1]); }
  dots(p, HAIR[3], [[5, 5], [6, 5], [9, 5]]);
  // cap
  slab(p, 4, 2, 11, 4, COAT);
  box(p, 7, 2, 8, 4, '#e03a40'); box(p, 6, 3, 9, 3, '#e03a40'); p.set(7, 3, '#ff7a7a');
  box(p, 3, 5, 12, 5, '#d8dce8');
  // eyes, blush and mouth
  box(p, 5, 9, 5, 11, '#2a1a14'); box(p, 10, 9, 10, 11, '#2a1a14');
  dots(p, '#ffffff', [[5, 9], [10, 9]]);
  dots(p, '#ff9a9a', [[4, 12], [11, 12], [4, 13], [11, 13]]);
  dots(p, '#c05060', [[7, 13], [8, 13]]);
  // neck, coat, collar and stethoscope
  box(p, 7, 15, 8, 15, SKIN[0]);
  slab(p, 4, 16, 11, 22, COAT);
  box(p, 6, 16, 9, 16, '#5a9ad0'); box(p, 7, 17, 8, 17, '#5a9ad0'); box(p, 7, 18, 8, 18, '#3a70a8');
  dots(p, '#6a7280', [[5, 17], [5, 18], [5, 19], [6, 20], [7, 20]]);
  dots(p, '#c9d1d9', [[6, 21], [7, 21]]);
  // arms with hands
  slab(p, 2, 16, 3, 21, COAT); slab(p, 12, 16, 13, 21, COAT);
  box(p, 2, 22, 3, 22, SKIN[1]); box(p, 12, 22, 13, 22, SKIN[1]);
  // legs and shoes
  slab(p, 5, 23, 6, 24, ['#98a0b4', '#e8e8f0', '#ffffff']); slab(p, 9, 23, 10, 24, ['#98a0b4', '#e8e8f0', '#ffffff']);
  box(p, 4, 25, 6, 25, '#3a3040'); box(p, 9, 25, 11, 25, '#3a3040');
  outline(p);
  return smooth2x(p.done()); // 32x52
}

// ---------------- store icons (32x32) ----------------
function storeIconsOld(handCanvas) {
  const cur = new Pix(32, 32);
  cur.blit(silhouette(handCanvas, '#00000066'), 7, 6);
  cur.blit(handCanvas, 6, 5);
  const nurse = crop(nurseSprite(), 0, 0, 32, 32);
  const icons = { cursor: cur.done(), nurse };
  for (const id of NEW_BUILDINGS) icons[id] = unitSprite(id);
  return icons;
}

// ---------------- small glyphs for achievements / UI (drawn at 1x, doubled when baked) ----------------
const G = {
  k: '#2a1a12', w: '#f6f2e6', y: '#ffd84a', Y: '#fff3b0', r: '#e0303a', R: '#ff8a8a', g: '#a8d8f0',
  h: '#7a4524', H: '#a8683a', s: '#f5c9a3', e: '#2b1a16', p: '#f19a9a', m: '#b8545a', b: '#5f9ccc',
};
export const GLYPHS = {
  clock: ['..kkkkk..', '.kwwwwwk.', 'kwwwkwwwk', 'kwwwkwwwk', 'kwwwkkkwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kwwwwwk.', '..kkkkk..'],
  hourglass: ['kkkkkkk', '.kgggk.', '.kyyyk.', '..kyk..', '...k...', '..kgk..', '.kgygk.', '.kyyyk.', 'kkkkkkk'],
  bolt: ['...kkk', '..kyk.', '.kYk..', 'kyyykk', 'kkyyyk', '..kyk.', '.kyk..', '.kk...'],
  cursor: ['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwwwwk', 'kwwkkkk', 'kk.kwk.', 'k...kk.'],
  hand: ['..kk......', '.kwwk.....', '.kwwk.....', '.kwwkkk...', '.kwwkwwkk.', 'kkwwkwwkwk', 'kwwwwwwwwk', '.kwwwwwwwk', '..kwwwwwk.', '..kkkkkkk.'],
  nurse: ['..kkkkk..', '.kwwrwwk.', '.kkkkkkk.', 'khhhhhhhk', 'khsesseHk', 'khsssssHk', 'khpsmspHk', '.kksssskk', '.kwwbwwk.', '.kkkkkkk.'],
  heart: ['.kk.kk.', 'kRrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
  moon: ['..kkkk..', '.kYyyk..', 'kYyyk...', 'kyyk....', 'kyyk....', 'kyyyk...', '.kyyyk..', '..kkkk..'],
  question: ['.kkkk.', 'kwwwwk', 'kkkkwk', '..kwwk', '..kwk.', '..kk..', '..kwk.', '..kk..'],
};
export function glyph(name) { return sprite(GLYPHS[name], G); }

export const TIERS = [
  ['#9a5a26', '#cf8a4c', '#5e3414'], // bronze
  ['#8c96a4', '#d2dae4', '#56606c'], // silver
  ['#c99a1e', '#ffe07a', '#7c5a08'], // gold
  ['#2f9a6a', '#7fe0b0', '#145a3a'], // jade
  ['#b02838', '#ff7a8a', '#681420'], // ruby
  ['#2c56c0', '#8ab0ff', '#142c70'], // sapphire
  ['#8040b8', '#d4a0ff', '#4a1c70'], // amethyst
  ['#3a3a4c', '#8a8aa8', '#1a1a24'], // obsidian
  ['#e0e0e8', '#ffffff', '#9a9aac'], // platinum
];

function achievementIconOld(glyphName, tier, locked = false) {
  const p = new Pix(16, 16);
  const [base, hi, lo] = locked ? ['#2a2a30', '#3e3e48', '#18181c'] : TIERS[Math.min(tier, TIERS.length - 1)];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;
    if (x === 0 || y === 0 || x === 15 || y === 15) { p.set(x, y, '#120a06'); continue; }
    let col = base;
    if (x === 1 || y === 1) col = hi;
    else if (x === 14 || y === 14) col = lo;
    else if (!locked && (x + y) % 7 === 0 && x + y < 14) col = mix(base, hi, 0.5); // little sheen streak
    p.set(x, y, col);
  }
  const g = glyphCanvas(locked ? 'question' : glyphName);
  const gx = Math.floor((16 - g.width) / 2), gy = Math.floor((16 - g.height) / 2);
  p.blit(silhouette(g, '#00000088'), gx + 1, gy + 1);
  if (locked) p.blit(silhouette(g, '#55556a'), gx, gy);
  else p.blit(g, gx, gy);
  return smooth2x(p.done()); // 32x32
}

// ---------------- tiling textures ----------------
// page background: deep night-blue wallpaper with faint clock motifs
export function bgTile() {
  const S = 96, p = new Pix(S, S), n = vnoise(5);
  const pal = ['#141a33', '#18203d', '#1c2546', '#212b50'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = n.fbm((x / S) * 6, (y / S) * 6, 6, 6, 3);
    p.set(x, y, pal[ditherIndex(v * 0.9, pal.length, x, y, 1.2)]);
  }
  const motif = (cx, cy) => {
    for (let a = 0; a < 140; a++) {
      const t = (a / 140) * Math.PI * 2;
      p.set(Math.round(cx + Math.cos(t) * 12), Math.round(cy + Math.sin(t) * 12), '#2a3560');
    }
    for (let i = 1; i <= 7; i++) p.set(cx, cy - i, '#2a3560');
    for (let i = 1; i <= 5; i++) p.set(cx + i, cy, '#2a3560');
  };
  motif(24, 24);
  motif(72, 72);
  return p.done();
}

// generic tileable wood. vertical = grain runs top-to-bottom
export function woodTex(w, h, { seed = 1, vertical = true, pal = WOOD.slice(1, 7), bevel = false, dark = 0 } = {}) {
  const p = new Pix(w, h), n = vnoise(seed), n2 = vnoise(seed + 7);
  const U = vertical ? w : h, V = vertical ? h : w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = vertical ? x : y, v = vertical ? y : x;
    const warp = n.fbm((u / U) * 4, (v / V) * 3, 4, 3, 3);
    const grain = Math.sin((u / U) * Math.PI * 2 * 3 + warp * 8);
    let val = 0.5 + 0.22 * grain + (n2((u / U) * 32, (v / V) * 48, 32, 48) - 0.5) * 0.25 - dark;
    if (bevel) {
      if (u < K) val += 0.3;
      else if (u < K * 2) val += 0.12;
      if (u >= U - K) val = -1;
      else if (u >= U - K * 2) val -= 0.25;
    }
    p.set(x, y, pal[ditherIndex(Math.min(1, Math.max(0, val)), pal.length, x, y, 0.9)]);
  }
  return p.done();
}

// the plank texture behind each store item
export function plankTex() {
  const pal = ['#5a3a20', '#6b4728', '#7b5431', '#8c623a', '#9c7044'];
  return woodTex(128, 44, { seed: 41, vertical: false, pal });
}

// dark wood used for menu buttons
export function darkWoodTex() {
  const pal = ['#24130a', '#301a0e', '#3c2213', '#4a2b18', '#58341e'];
  return woodTex(96, 32, { seed: 17, vertical: false, pal });
}

// hospital ward backdrop for the nurse row (drawn at 1x, doubled: 128 wide, 64 tall, tiles horizontally)
export function hospitalTex() {
  const W = 64, H = 32, p = new Pix(W, H), n = vnoise(3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col;
    if (y < 18) {
      const tile = x % 8 === 0 || y % 6 === 5;
      const v = n.fbm(x / 6, y / 6, W / 6, 0, 2);
      col = tile ? '#86b0a8' : v > 0.6 && bayer(x, y) > 0.6 ? '#a8d0c8' : '#9cc6be';
    } else if (y === 18) col = '#d8f0ea';
    else if (y === 19) col = '#5e8f88';
    else if (y === 20) col = '#3d6863';
    else if (y === 21) col = '#2b4a46';
    else {
      const checker = ((x >> 3) + ((y - 22) >> 2)) & 1;
      col = checker ? '#d9d4c6' : '#c3bdac';
      if (y === 22) col = mix(col, '#2b4a46', 0.45);
      else if (y === 23 && bayer(x, y) < 0.5) col = mix(col, '#2b4a46', 0.25);
    }
    p.set(x, y, col);
  }
  // little red-cross sign on the wall
  const sx = 42, sy = 4;
  p.rect(sx - 1, sy - 1, 9, 9, '#5e8f88');
  p.rect(sx, sy, 7, 7, '#f6f6f2');
  p.rect(sx + 3, sy + 1, 1, 5, '#d8343a');
  p.rect(sx + 1, sy + 3, 5, 1, '#d8343a');
  p.rect(sx, sy + 6, 7, 1, '#d3d8d4');
  // a framed window on the other side
  p.rect(9, 3, 14, 11, '#3d6863');
  p.rect(10, 4, 12, 9, '#cfe9ff');
  p.rect(10, 4, 12, 3, '#e7f4ff');
  p.rect(15, 4, 2, 9, '#3d6863');
  p.rect(10, 8, 12, 1, '#3d6863');
  for (let i = 0; i < 4; i++) p.set(11 + i, 11 - i, '#ffffff');
  return mute(smooth2x(p.done()), 0.55, 0.78);
}

// small pixel "X" used on menu close buttons (22x22)
export function closeIcon() {
  const p = new Pix(11, 11);
  for (let i = 0; i < 7; i++) {
    for (const [x, y] of [[2 + i, 2 + i], [8 - i, 2 + i]]) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (!p.alpha(x + ox, y + oy)) p.set(x + ox, y + oy, '#1a0806');
    }
  }
  for (let i = 0; i < 7; i++) {
    p.set(2 + i, 2 + i, '#e8423a');
    p.set(8 - i, 2 + i, '#e8423a');
  }
  p.set(2, 2, '#ff9a8a'); p.set(8, 2, '#ff9a8a');
  return smooth2x(p.done());
}

// small clock used as a currency symbol next to prices
export function currencyIcon() { return smooth2x(glyph('clock')); }

// favicon: a tiny version of the wall clock
export function favicon() {
  const p = new Pix(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 7.9) continue;
    p.set(x, y, r > 7 ? '#2f170b' : r > 5.6 ? (x + y < 15 ? '#cc8445' : '#7a401d') : '#f4f0e5');
  }
  for (let i = 0; i < 4; i++) p.set(7, 4 + i, '#141414');
  for (let i = 0; i < 3; i++) p.set(8 + i, 7, '#141414');
  p.set(8, 3, '#c4161c'); p.set(8, 4, '#c4161c'); p.set(8, 5, '#c4161c');
  return p.done();
}

// ---------------- the syrup jar (stats screen) ----------------
// A well-used jar: rusty lid, smeared and scratched glass, dried syrup streaks, a stained label,
// and sticky drips running down the outside. 48x64.
export function syrupJar(color, pct) {
  const W = 48, H = 64, cx = 24, p = new Pix(W, H), n = vnoise(77), rnd = rng(1234);
  const hw = (y) => (y < 1 || y > 60 ? -1
    : y <= 9 ? 13
    : y <= 14 ? 12
    : y <= 19 ? 12 + (y - 14)
    : y <= 52 ? 17
    : 17 - Math.round(7 - Math.sqrt(49 - (y - 53) ** 2)));
  const inside = (x, y) => { const h = hw(y); return h >= 0 && Math.abs(x - cx) <= h; };
  const level = 60 - Math.round(6 + (pct / 100) * 38);
  const surf = (x) => level + Math.round(Math.sin(x * 0.5) * 0.8 + (n(x * 0.3, 7) - 0.5) * 1.6);
  const syr = [mix(color, '#ffffff', 0.32), color, mix(color, '#000000', 0.25), mix(color, '#000000', 0.5)];
  const crust = mix(color, '#000000', 0.5);
  const glass = ['#2c3b3a', '#384e4c', '#486360', '#5b7d78'];
  const metal = ['#3a3430', '#524a42', '#6d6358', '#8a7e70', '#a99d8c'];
  const rust = ['#5a2e14', '#7a4220', '#96592a'];
  const paper = ['#a8966a', '#bfac7c', '#d6c694'];

  // streaks of dried syrup crusted onto the glass above the level
  const streaks = [-13, -9, -4, 3, 8, 13].map((o) => ({ x: cx + o, len: 8 + Math.floor(rnd() * 20) }));
  const bubbles = Array.from({ length: 7 }, () => ({ x: cx - 12 + Math.floor(rnd() * 25), y: level + 4 + Math.floor(rnd() * 28), r: rnd() < 0.4 ? 2 : 1 }));
  const scratches = Array.from({ length: 5 }, () => ({ x: cx - 12 + Math.floor(rnd() * 22), y: 20 + Math.floor(rnd() * 30), l: 3 + Math.floor(rnd() * 5) }));

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const d = Math.abs(x - cx), h = hw(y);
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { p.set(x, y, '#120d08'); continue; }
    if (y <= 9) {
      // rusty screw lid
      let v = 0.62 - 0.36 * ((x - (cx - 13)) / 26) + (y === 2 ? 0.2 : 0) - (y >= 9 ? 0.25 : 0);
      if (x % 3 === 0) v -= 0.12;
      let col = metal[ditherIndex(Math.min(1, Math.max(0, v)), metal.length, x, y, 0.8)];
      const rs = n.fbm(x * 0.3, y * 0.5, 0, 0, 3);
      if (rs > 0.55) col = rust[ditherIndex((rs - 0.55) * 3.5, rust.length, x, y, 1)];
      p.set(x, y, col);
      continue;
    }
    // glass, with grime thickening toward the bottom and the edges
    const v = 0.3 + 0.36 * (1 - d / h);
    let col = glass[ditherIndex(Math.min(1, v), glass.length, x, y, 0.9)];
    const g = n.fbm(x * 0.14, y * 0.14, 0, 0, 3) + Math.max(0, (y - 46) / 60) + (d >= h - 2 ? 0.12 : 0);
    if (g > 0.62 && bayer(x, y) < (g - 0.62) * 2.4) col = mix(col, '#1e1c10', 0.7);
    if (y >= 16 && y > surf(x) - 1) {
      // syrup
      const depth = y - surf(x);
      if (depth <= 0) col = mix(color, '#ffffff', 0.62);
      else if (depth === 1) col = syr[0];
      else {
        let t = depth / Math.max(8, 60 - level) - 0.18 * (1 - d / h);
        if (d >= h - 2 && depth < 5) t -= 0.4; // meniscus catches the light
        col = syr[ditherIndex(Math.min(1, Math.max(0, t)), 4, x, y, 1)];
      }
    } else if (y >= 16) {
      for (const s of streaks) if (x === s.x && y <= 16 + s.len && d <= h - 2) col = y > 16 + s.len - 2 ? mix(color, '#000000', 0.15) : crust;
    }
    p.set(x, y, col);
  }
  // bubbles
  for (const b of bubbles) {
    if (b.y > 56) continue;
    p.set(b.x, b.y, syr[0]); p.set(b.x + 1, b.y, syr[0]); p.set(b.x, b.y + 1, syr[0]);
    if (b.r === 2) { p.set(b.x - 1, b.y, syr[2]); p.set(b.x, b.y - 1, syr[2]); p.set(b.x + 2, b.y + 1, syr[2]); p.set(b.x + 1, b.y + 2, syr[2]); }
  }
  // smudged fingerprint and scratches on the glass
  for (let y = 20; y <= 26; y++) for (let x = cx + 4; x <= cx + 13; x++) {
    if (((x - (cx + 9)) / 5) ** 2 + ((y - 23) / 3.4) ** 2 < 1 && bayer(x, y) < 0.34 && inside(x, y)) p.set(x, y, '#8aa49e');
  }
  for (const s of scratches) for (let i = 0; i < s.l; i++) p.set(s.x + i, s.y + i, '#9db5ae');
  // label: yellowed paper, ink dashes, a coffee ring, a tiny clock
  for (let y = 28; y <= 48; y++) for (let x = cx - 12; x <= cx + 12; x++) {
    if (!inside(x, y) || Math.abs(x - cx) > hw(y) - 1) continue;
    const edge = x === cx - 12 || x === cx + 12 || y === 28 || y === 48;
    const v = 0.55 + (n(x * 0.3, y * 0.3) - 0.5) * 0.8 + (x > cx + 5 ? -0.1 : 0.05);
    let col = edge ? '#4a3418' : paper[ditherIndex(Math.min(1, Math.max(0, v)), paper.length, x, y, 0.8)];
    const st = n.fbm(x * 0.2 + 9, y * 0.2 + 3, 0, 0, 3);
    if (!edge && st > 0.6) col = mix(col, '#7a5528', Math.min(0.8, (st - 0.6) * 4));
    const ring = Math.hypot(x - (cx + 6), y - 42);
    if (ring > 4.4 && ring < 5.6 && bayer(x, y) < 0.85) col = mix(col, '#5a3a18', 0.5);
    p.set(x, y, col);
  }
  const ink = '#3a2812';
  for (const [ly, a, b] of [[32, cx - 9, cx + 8], [35, cx - 9, cx + 4], [38, cx - 9, cx - 2]]) {
    for (let x = a; x <= b; x++) if (((x * 7 + ly) % 5) !== 0) p.set(x, ly, ink);
  }
  for (let t = 0; t < 14; t++) p.set(Math.round(cx - 5 + Math.cos((t / 14) * 6.283) * 3), Math.round(43 + Math.sin((t / 14) * 6.283) * 3), ink);
  p.set(cx - 5, 41, ink); p.set(cx - 5, 42, ink); p.set(cx - 4, 43, ink);
  // sticky syrup oozing from under the lid and running down the outside
  for (let x = cx - 11; x <= cx + 11; x++) if (bayer(x, 10) < 0.7) p.set(x, 10, crust);
  const drip = (side, y0, y1, blob) => {
    for (let y = y0; y <= y1; y++) {
      const x = cx + side * (hw(y) + 1);
      p.set(x, y, crust);
      p.set(x + side, y, mix(color, '#000000', 0.2));
    }
    const xe = cx + side * (hw(y1) + 2);
    for (let dy = 0; dy < blob; dy++) for (let dx = -1; dx <= 1; dx++) p.set(xe + dx, y1 + 1 + dy, dy === blob - 1 && dx !== 0 ? crust : syr[dx === 1 ? 2 : 1]);
  };
  drip(-1, 11, 32, 3);
  drip(1, 14, 24, 2);
  // dust
  for (let i = 0; i < 28; i++) {
    const x = cx - 16 + Math.floor(rnd() * 33), y = 12 + Math.floor(rnd() * 46);
    if (inside(x, y) && Math.abs(x - cx) < hw(y) - 1 && y < level) p.set(x, y, '#7e7a68');
  }
  // dirty highlight down the left side (broken up by grime)
  for (let y = 18; y <= 52; y++) {
    const x = cx - hw(y) + 3;
    if (inside(x, y) && n(y * 0.35, 5) > 0.36 && bayer(x, y) < 0.7) p.set(x, y, y > level ? mix(color, '#ffffff', 0.45) : '#b8cfc8');
  }
  return p.done();
}

// ---------------- the eight new buildings: 16x16 sprites (doubled with Scale2x when used) ----------------
const OUT = '#1a1020';
function outline(p) {
  const todo = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.alpha(x, y)) continue;
    if (p.alpha(x - 1, y) || p.alpha(x + 1, y) || p.alpha(x, y - 1) || p.alpha(x, y + 1)) todo.push([x, y]);
  }
  for (const [x, y] of todo) p.set(x, y, OUT);
}
const box = (p, x0, y0, x1, y1, c) => p.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, c);
const disc = (p, cx, cy, r, c) => {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (Math.hypot(x - cx, y - cy) <= r) p.set(x, y, c);
};
const dots = (p, c, pts) => pts.forEach(([x, y]) => p.set(x, y, c));
const INK = '#2a1a12';
// a little clock face (rim + dial + two hands), reused by several buildings
function miniClock(p, cx, cy, r) {
  disc(p, cx, cy, r, '#c99a2e');
  disc(p, cx, cy, r - 0.9, '#f6f2e6');
  p.set(Math.floor(cx), Math.floor(cy), INK);
  p.set(Math.floor(cx), Math.floor(cy) - 1, INK);
  p.set(Math.ceil(cx), Math.floor(cy), INK);
}

const STONE = ['#a8986a', '#e0d4a0', '#f4ecc8'];
const SLATE = ['#3a3e50', '#6a7088', '#9aa0b8'];
const BRICK = ['#703a24', '#a85a3a', '#cf7a50'];
const PURPLE = ['#4a3a6a', '#7a68a8', '#a898d0'];
const BLUESTONE = ['#585a72', '#8a8ca8', '#b8bad0'];
const BRASS = ['#8a6a20', '#c99a2e', '#ffe07a'];
const LIGHTS = ['#c08a20', '#ffd24a', '#fff0a0'];
// a little clock face: gold rim, cream dial, two hands
function clockFace16(p, cx, cy, r) {
  ball(p, cx, cy, r, r, GOLD);
  ball(p, cx, cy, r - 1.3, r - 1.3, CREAM);
  const x = Math.round(cx - 0.5), y = Math.round(cy - 0.5);
  dots(p, INK, [[x, y], [x, y - 1], [x + 1, y]]);
}

const SPRITES = {
  // a clock in bloom
  farm(p) {
    slab(p, 7, 10, 8, 13, GREEN);
    ball(p, 4.5, 12, 2.3, 1.4, GREEN); ball(p, 11.5, 11.5, 2.3, 1.4, GREEN);
    slab(p, 3, 14, 13, 14, ['#4a2e18', '#7a5230', '#9a6a40']);
    ball(p, 7.5, 5.5, 6, 5.6, GOLD);
    ball(p, 7.5, 5.5, 4.5, 4.2, CREAM);
    dots(p, '#8a7a5a', [[7, 2], [11, 5], [7, 9], [3, 5]]);
    dots(p, INK, [[7, 5], [8, 5], [9, 5], [10, 5], [7, 4], [7, 3]]);
  },
  // a cart heaped with dug-up clocks
  mine(p) {
    for (const [cx, cy, r] of [[4.5, 6.5, 2.7], [11.5, 6.5, 2.7], [8, 5, 3.2]]) {
      clockFace16(p, cx, cy, r);
    }
    slab(p, 2, 8, 13, 12, ['#4a2a12', '#7a4a24', '#a8683a']);
    slab(p, 1, 8, 14, 9, ['#2a1a0a', '#5a3a1c', '#8a5a30']);
    dots(p, '#2a1a0a', [[5, 11], [10, 10], [7, 12], [12, 11]]);
    box(p, 1, 14, 14, 14, '#9a9aa8'); box(p, 1, 14, 14, 14, '#9a9aa8');
    ball(p, 4.5, 12.5, 2.1, 2.1, ['#3a3a48', '#6a6a7a', '#9a9aaa']);
    ball(p, 11.5, 12.5, 2.1, 2.1, ['#3a3a48', '#6a6a7a', '#9a9aaa']);
    p.set(4, 12, '#1a1a24'); p.set(11, 12, '#1a1a24');
  },
  // brick works, smoke and a big clock on the front
  factory(p) {
    slab(p, 10, 2, 12, 7, ['#3a3e50', '#7a8098', '#a8aec4']);
    box(p, 10, 3, 12, 3, '#2a2e40');
    ball(p, 12, 1.5, 1.8, 1.2, ['#a8a8b4', '#d8d8e0', '#ffffff']);
    slab(p, 2, 5, 5, 7, SLATE); slab(p, 6, 5, 9, 7, SLATE);
    slab(p, 1, 8, 14, 14, BRICK);
    for (const y of [10, 12]) box(p, 2, y, 13, y, '#703a24');
    dots(p, '#703a24', [[5, 9], [9, 9], [4, 11], [8, 11], [12, 11], [5, 13], [9, 13]]);
    clockFace16(p, 6, 11, 3.3);
    slab(p, 10, 9, 12, 10, LIGHTS); slab(p, 10, 12, 12, 13, LIGHTS);
  },
  // classical front with a clock in the pediment
  bank(p) {
    for (let y = 2; y <= 5; y++) {
      const w = [1, 3, 5, 6][y - 2], x0 = 8 - w, x1 = 7 + w;
      box(p, x0, y, x1, y, STONE[1]); p.set(x0, y, STONE[2]); p.set(x1, y, STONE[0]);
    }
    box(p, 4, 5, 11, 5, STONE[0]);
    clockFace16(p, 7.5, 4.6, 1.9);
    slab(p, 1, 6, 14, 7, BRASS);
    box(p, 4, 8, 5, 12, '#3a2a1a'); box(p, 10, 8, 11, 12, '#3a2a1a');
    dots(p, '#ffd24a', [[4, 10], [11, 10]]);
    for (const x0 of [2, 7, 12]) slab(p, x0, 8, x0 + 1, 12, STONE);
    slab(p, 1, 13, 14, 13, STONE); slab(p, 0, 14, 15, 14, ['#887848', '#c8b880', '#e0d4a0']);
  },
  // a stepped shrine with a glowing sun-dial
  temple(p) {
    slab(p, 1, 12, 14, 14, BLUESTONE); slab(p, 3, 9, 12, 11, BLUESTONE);
    slab(p, 5, 6, 10, 8, BLUESTONE); slab(p, 6, 4, 9, 5, BLUESTONE);
    box(p, 7, 12, 8, 14, '#1a1030'); dots(p, '#ffd84a', [[7, 14], [8, 13]]);
    dots(p, '#ffd84a', [[4, 10], [11, 10], [6, 7], [9, 7]]);
    ball(p, 7.5, 2.4, 2.6, 2.4, GOLD);
    dots(p, '#fff0a0', [[7, 2], [4, 2], [11, 2], [5, 0], [10, 0], [7, 0]]);
  },
  // a crooked wizard tower
  warlock(p) {
    slab(p, 4, 7, 11, 14, PURPLE);
    dots(p, '#4a3a6a', [[6, 9], [9, 9], [5, 11], [8, 11], [10, 11], [6, 13], [9, 13]]);
    for (let y = 1; y <= 6; y++) {
      const w = y, x0 = 8 - Math.min(w, 6) - (y === 6 ? 0 : 0), x1 = 7 + Math.min(w, 6);
      box(p, x0, y, x1, y, '#6a38b0'); p.set(x0, y, '#8a58d0'); p.set(x1, y, '#3a1a78');
    }
    box(p, 2, 6, 13, 6, '#4a2090'); p.set(2, 6, '#8a58d0');
    dots(p, '#ffe070', [[7, 3], [6, 3], [8, 3], [7, 2], [7, 4]]);
    slab(p, 7, 8, 8, 10, LIGHTS);
    slab(p, 6, 12, 9, 14, ['#1a0a1a', '#3a2438', '#5a3a58']);
    ball(p, 13, 3, 1.9, 1.9, GOLD);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 13.9, y - 2.5) <= 1.7) p.set(x, y, '#000000', 0);
  },
  // atomic clocks in orbit: gold-foil body, solar wings and a dish
  satellite(p) {
    const PANEL = ['#1a3a78', '#3a68c8', '#7aa8f0'];
    slab(p, 1, 6, 5, 10, PANEL); slab(p, 10, 6, 14, 10, PANEL);
    box(p, 3, 6, 3, 10, '#1a3a78'); box(p, 12, 6, 12, 10, '#1a3a78'); box(p, 1, 8, 5, 8, '#1a3a78'); box(p, 10, 8, 14, 8, '#1a3a78');
    box(p, 6, 8, 9, 8, '#8a8a98');
    slab(p, 5, 5, 10, 11, ['#8a5a14', '#c99a2e', '#ffe07a']);
    clockFace16(p, 7.5, 8, 2.6);
    ball(p, 7.5, 3.4, 2.6, 1.8, ['#6a6a7a', '#b8b8c8', '#f0f0fa'], 4);
    dots(p, '#b8b8c8', [[7, 4], [8, 4]]); dots(p, '#ff6a50', [[7, 1]]);
    box(p, 7, 12, 8, 13, '#8a8a98');
    dots(p, '#fff0a0', [[1, 2], [14, 3], [3, 13], [13, 12]]);
  },
  // a domed observatory with a brass telescope
  observatory(p) {
    slab(p, 2, 10, 13, 14, ['#6a6a88', '#9a9ab8', '#c8c8e0']);
    ball(p, 8, 10.5, 5.8, 5.6, ['#4a5a88', '#7a90c8', '#a8c0f0', '#e8f4ff'], 10);
    box(p, 7, 6, 8, 10, '#101840');
    for (let i = 0; i < 6; i++) slab(p, 8 + i, 7 - i, 9 + i, 8 - i, BRASS);
    ball(p, 14, 1.8, 1.5, 1.5, ['#2090c0', '#50d8f0', '#a8f0ff']);
    box(p, 7, 12, 8, 14, '#2a2a40');
    dots(p, '#fff0a0', [[1, 3], [3, 1], [13, 9]]);
  },
  // a runed stone ring with a swirling gate
  portal(p) {
    slab(p, 3, 13, 12, 14, BLUESTONE);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy);
      if (r > 6.8) continue;
      if (r > 4.5) {
        const t = -(dx * 0.6 + dy * 0.8) / Math.max(r, 1);
        p.set(x, y, t > 0.4 ? BLUESTONE[2] : t > -0.4 ? BLUESTONE[1] : BLUESTONE[0]);
        continue;
      }
      const a = Math.atan2(dy, dx) + r * 1.3;
      const k = (((a / (Math.PI * 2)) * 3) % 1 + 1) % 1;
      p.set(x, y, r < 1.3 ? '#ffffff' : k < 0.34 ? '#6ae8ff' : k < 0.67 ? '#b070ff' : '#3a2a98');
    }
    dots(p, '#ffd84a', [[8, 1], [8, 13], [1, 7], [14, 7]]);
    dots(p, '#ffffff', [[1, 2], [14, 3], [0, 12]]);
  },
};

export const NEW_BUILDINGS = Object.keys(SPRITES);
const unitCache = {};
export function unit16(id) {
  if (!unitCache[id]) {
    const p = new Pix(16, 16);
    SPRITES[id](p);
    outline(p);
    unitCache[id] = p.done();
  }
  return unitCache[id];
}
const unitSpriteOld = (id) => smooth2x(unit16(id));

// 16x16 glyph for achievements and upgrades: 'b:<building id>' for the new buildings
export function glyphCanvas(name) {
  if (name.startsWith('b:')) return unit16(name.slice(2));
  return glyph(name);
}

// upgrade icon: the building on a tier-coloured tile with one pip per tier
function upgradeIconOld(bid, tier) {
  const p = new Pix(16, 16);
  const [base, hi, lo] = TIERS[Math.min(tier, TIERS.length - 1)];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;
    if (x === 0 || y === 0 || x === 15 || y === 15) { p.set(x, y, '#120a06'); continue; }
    p.set(x, y, x === 1 || y === 1 ? hi : x === 14 || y === 14 ? lo : base);
  }
  const g = SPRITES[bid] ? unit16(bid) : glyph(bid === 'nurse' ? 'nurse' : 'hand');
  const gx = Math.floor((16 - g.width) / 2), gy = Math.floor((16 - g.height) / 2) - 1;
  p.blit(silhouette(g, '#00000088'), gx + 1, gy + 1);
  p.blit(g, gx, gy);
  for (let i = 0; i <= tier; i++) { p.set(2 + i, 13, '#000000'); p.set(2 + i, 12, '#ffffff'); }
  return smooth2x(p.done());
}

// ---------------- row backdrops: one themed scene per building (64x32 doubled to 128x64, tiles sideways) ----------------
export function rowTex(id) {
  const W = 64, H = 32, p = new Pix(W, H), n = vnoise(id.length * 13 + id.charCodeAt(0));
  const fb = (x, y, s = 6) => n.fbm((x / W) * s, (y / H) * (s / 2), s, s / 2, 2);
  const stars = (count, seed, ymax) => {
    const r = rng(seed);
    for (let i = 0; i < count; i++) p.set(Math.floor(r() * W), Math.floor(r() * ymax), r() < 0.3 ? '#fff6c8' : '#9aa8d8');
  };
  const scenes = {
    farm() {
      const sky = ['#7ec8f0', '#95d4f4', '#aee0f8'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y < 18) p.set(x, y, sky[ditherIndex(y / 18, 3, x, y, 1)]);
        else if (y < 22) p.set(x, y, (Math.sin(x * 0.18 + 1) * 2 + 19 > y) ? '#5a9a4a' : '#3a7a30');
        else p.set(x, y, (y % 4 === 0 ? '#4a8a3a' : '#3a7a30'));
      }
      for (const [cx, cy] of [[14, 5], [44, 8]]) for (let i = -4; i <= 4; i++) for (let j = -1; j <= 1; j++) if (Math.abs(i) + Math.abs(j) * 3 < 6) p.set(cx + i, cy + j, '#ffffff');
      for (let x = 2; x < W; x += 8) { box(p, x, 17, x, 22, '#7a5230'); }
      box(p, 0, 18, W - 1, 18, '#9a7040'); box(p, 0, 20, W - 1, 20, '#9a7040');
    },
    mine() {
      const pal = ['#2a2228', '#38303a', '#443a42', '#524650'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, y >= 22 ? '#2a2028' : pal[ditherIndex(fb(x, y), 4, x, y, 1.1)]);
      for (const x0 of [6, 38]) { box(p, x0, 3, x0 + 2, 22, '#6a4a2a'); box(p, x0, 3, x0, 22, '#8a6a40'); }
      box(p, 0, 3, W - 1, 5, '#7a5a30'); box(p, 0, 3, W - 1, 3, '#9a7a48');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 24, y - 11); if (d < 8 && bayer(x, y) < (8 - d) / 8 * 0.7 && y < 22) p.set(x, y, '#e8c050'); }
      p.set(24, 11, '#fff0a0'); box(p, 23, 8, 25, 8, '#585866');
      box(p, 0, 24, W - 1, 24, '#9a9aa8'); box(p, 0, 28, W - 1, 28, '#9a9aa8');
      for (let x = 2; x < W; x += 6) box(p, x, 23, x + 1, 29, '#5a3a20');
    },
    factory() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, y >= 22 ? '#3a3f48' : (x % 16 === 0 || y === 1) ? '#38465a' : '#4a5a6a');
      for (const x0 of [4, 20, 36, 52]) { box(p, x0, 4, x0 + 9, 12, '#2a3446'); box(p, x0 + 1, 5, x0 + 8, 11, ((x0 / 16) | 0) % 2 ? '#ffd070' : '#7a8aa0'); box(p, x0 + 4, 5, x0 + 5, 11, '#2a3446'); }
      box(p, 0, 15, W - 1, 15, '#a8824a'); box(p, 0, 16, W - 1, 17, '#8a6a3a'); box(p, 0, 18, W - 1, 18, '#6a4a28');
      for (let x = 0; x < W; x++) { p.set(x, 22, (x >> 2) % 2 ? '#e8c020' : '#222'); p.set(x, 23, ((x + 2) >> 2) % 2 ? '#e8c020' : '#222'); }
      for (let x = 0; x < W; x += 16) box(p, x, 24, x, 31, '#2a2f38');
    },
    bank() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y >= 22) { p.set(x, y, ((x >> 3) + ((y - 22) >> 2)) & 1 ? '#d8c898' : '#a89868'); continue; }
        const v = fb(x, y, 8);
        p.set(x, y, v > 0.62 && bayer(x, y) > 0.5 ? '#c8c0a8' : '#e0d8c0');
      }
      box(p, 0, 17, W - 1, 18, '#c99a2e'); box(p, 0, 17, W - 1, 17, '#ffe07a');
      for (const x0 of [0, 21, 42]) { box(p, x0, 2, x0 + 3, 21, '#efe4c0'); box(p, x0 + 3, 2, x0 + 3, 21, '#b8a878'); }
      disc(p, 53, 11, 7.2, '#8a8a98'); disc(p, 53, 11, 5.6, '#a8a8b8'); disc(p, 53, 11, 1.8, '#c99a2e');
      for (let a = 0; a < 4; a++) { const t = a * Math.PI / 2 + 0.4; for (let r = 2; r < 5.5; r++) p.set(Math.round(53 + Math.cos(t) * r), Math.round(11 + Math.sin(t) * r), '#585866'); }
    },
    temple() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y >= 22) { p.set(x, y, ((x + (y >> 2) * 5) % 12 === 0 || y % 4 === 2) ? '#454762' : '#585a72'); continue; }
        p.set(x, y, ['#10163a', '#18204a', '#1c2a5a'][ditherIndex(y / 22, 3, x, y, 1)]);
      }
      stars(30, 5, 16);
      disc(p, 52, 7, 4.2, '#f0eac8'); disc(p, 54, 6, 3.4, '#10163a');
      for (const x0 of [14, 36]) { box(p, x0, 8, x0 + 3, 21, '#2a2e52'); box(p, x0 - 1, 7, x0 + 4, 7, '#3a3e62'); }
      for (const x0 of [6, 44]) {
        box(p, x0, 18, x0 + 2, 21, '#585a72'); box(p, x0 - 1, 17, x0 + 3, 17, '#8a8aa0');
        dots(p, '#ff9a30', [[x0 + 1, 15], [x0, 16], [x0 + 2, 16], [x0 + 1, 16]]); p.set(x0 + 1, 14, '#ffe070');
      }
    },
    warlock() {
      const sky = ['#2a1a5a', '#4a2a7a', '#6a3a8a', '#8a4a98'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y >= 24) { p.set(x, y, '#2a3a2a'); continue; }
        const hill = 20 + Math.sin(x * 0.22) * 2 + Math.sin(x * 0.07) * 2;
        p.set(x, y, y > hill ? '#1a1030' : sky[ditherIndex(y / 22, 4, x, y, 1)]);
      }
      stars(26, 7, 12);
      for (let y = 22; y < H; y++) for (let x = 0; x < W; x++) if (bayer(x, y) < 0.3 + (y - 22) * 0.02 && (x + y) % 2) p.set(x, y, '#8a6ab8');
      for (let x = 2; x < W; x += 9) p.set(x, 20 - (x % 3), '#ffe070');
    },
    observatory() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y >= 24) { p.set(x, y, '#1a1a2a'); continue; }
        const mw = Math.abs((x - W / 2) * 0.5 + (y - 10)) < 3 ? 0.35 : 0;
        p.set(x, y, ['#080c24', '#0e1438', '#142048'][ditherIndex(y / 24 + mw - 0.15, 3, x, y, 1)]);
      }
      stars(45, 11, 20);
      disc(p, 12, 8, 4, '#f0eac8'); disc(p, 14, 7, 3.3, '#0e1438');
      for (let x = 0; x < W; x++) p.set(x, 24 + Math.round(Math.sin(x * 0.2) * 1.2), '#2a2a44');
    },
    satellite() {
      // deep space above, the Earth's bright edge rising below
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - 30, y - 62);
        if (d < 40) {
          const shade = (30 - x) * 0.018 + (62 - y) * 0.01;
          const land = fb(x + 3, y, 7) > 0.55;
          const cloud = fb(x * 1.3, y + 9, 9) > 0.62 && bayer(x, y) > 0.35;
          const base = land ? ['#2a6a30', '#3a8a40', '#5ab05a'] : ['#10357a', '#1a58b0', '#2a7ad8'];
          p.set(x, y, cloud ? '#e8f2ff' : base[ditherIndex(0.5 + shade, 3, x, y, 0.9)]);
          if (d > 38) p.set(x, y, '#7ac8ff');
          else if (d > 37) p.set(x, y, '#4a98e8');
        } else {
          p.set(x, y, ['#04061a', '#0a1034', '#101a48'][ditherIndex(0.6 - y / 70, 3, x, y, 1)]);
        }
      }
      stars(45, 23, 18);
      for (const [cx, cy] of [[10, 6], [46, 10]]) { disc(p, cx, cy, 1.8, '#c99a2e'); disc(p, cx, cy, 1.1, '#f6f2e6'); }
    },
    portal() {
      const pal = ['#0a0618', '#1a0a3a', '#2a1a6a', '#3a2a98', '#2090c0'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y >= 24) { p.set(x, y, y === 24 ? '#50d8f0' : bayer(x, y) < 0.35 ? '#2a1a6a' : '#201840'); continue; }
        const v = fb(x, y, 8);
        p.set(x, y, pal[ditherIndex(Math.pow(v, 1.6) * 1.1, 5, x, y, 1.3)]);
      }
      stars(24, 17, 22);
      for (const [cx, cy] of [[12, 8], [34, 14], [56, 6]]) { disc(p, cx, cy, 2.2, '#c99a2e'); disc(p, cx, cy, 1.5, '#f6f2e6'); p.set(cx, cy, INK); p.set(cx, cy - 1, INK); }
    },
  };
  (scenes[id] || scenes.farm)();
  return mute(smooth2x(p.done()));
}

// ---------------- v0.4: Cookie Clicker-style icons (see icons.js / icons2.js) ----------------
export const achievementIcon = newAchievementIcon;
export const upgradeIcon = newUpgradeIcon;
export const unitSprite = (id) => buildingIcon(id); // 48x48, used in the store and for the building rows
export function storeIcons(handCanvas) {
  setHand(handCanvas);
  const map = {};
  for (const id of ['cursor', 'nurse', ...BUILDING_IDS]) map[id] = storeIcon(id);
  return map;
}

// pull colours toward muted, earthy browns (the row scenes sit behind detailed icons)
function mute(c, sat = 0.55, dark = 0.84) {
  const x = ctx2d(c), img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = Math.min(255, (l + (d[i] - l) * sat) * dark * 1.05);
    d[i + 1] = (l + (d[i + 1] - l) * sat) * dark;
    d[i + 2] = (l + (d[i + 2] - l) * sat) * dark * 0.9;
  }
  x.putImageData(img, 0, 0);
  return c;
}

export { rng, crop };
