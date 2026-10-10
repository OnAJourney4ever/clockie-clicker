// art.js — every texture in the game, authored as pixel art (procedural or hand-placed).
// The art grid is K=2 times finer than v0.1: big shapes (clock, hands, wood) are drawn natively at
// the fine grid; small hand-drawn sprites are drawn at 1x and doubled with Scale2x (smooth2x).
import {
  Pix, canvas, ctx2d, sprite, silhouette, crop, vnoise, bayer, ditherIndex, drawText, textWidth,
  mix, rotator, rng, smooth2x,
} from './pixel.js';

export const K = 2;
export const CLOCK_R = 48 * K; // face sprite is 193x193, centre pixel (96,96)

const WOOD = ['#2f170b', '#46230f', '#5e3016', '#7a401d', '#965226', '#b26833', '#cc8445', '#e0a463'];
const LIGHT = [-0.7071, -0.7071]; // light comes from the top-left

// ---------------- assets that live as real image files ----------------
export async function loadAssets() {
  const img = new Image();
  img.src = new URL('../assets/hand.png', import.meta.url).href;
  await img.decode();
  const c = canvas(img.naturalWidth, img.naturalHeight);
  ctx2d(c).drawImage(img, 0, 0);
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
// The hand is a real PNG (assets/hand.png). Its fingertip is pixel (9,0).
export const HAND_TIP = { x: 9, y: 0 };
export function handRotator(handCanvas) { return rotator(handCanvas, HAND_TIP.x, HAND_TIP.y, 180, { vote: true }); }

// ---------------- nurse ----------------
const NURSE_PAL = {
  k: '#2b1a16', w: '#f6f6f2', c: '#c3cad6', r: '#d8343a', h: '#7a4524', H: '#a8683a', d: '#4e2a14',
  s: '#f5c9a3', S: '#d99f7b', e: '#2b1a16', p: '#f19a9a', m: '#b8545a', b: '#5f9ccc', g: '#4d5560', G: '#c9d1d9',
  B: '#8a5a2c', P: '#ffffff', L: '#9aa8c0',
};
const NURSE_ROWS = [
  '......kkkkk.....',
  '.....kwwrwwk....',
  '....kwwrrrwwk...',
  '...kwwwwrwwwwk..',
  '..khkkkkkkkkhhk.',
  '.khHHhhhhhhhhhdk',
  '.khHhhhhhhhhhhdk',
  '.khhsssssssshhdk',
  '.khssessssesshdk',
  '.khssessssesshdk',
  '.khspsssssspshdk',
  '.khssssmmsssshdk',
  '.khhSssssssShhdk',
  '.khhhkkSSkkhhhdk',
  '..kwwwbbbbwwwk..',
  '..kwwgwbbwgwwk..',
  '.kwwwgwwwBGGBwk.',
  '.kwcwgwwwBPPBwk.',
  '.kwcwwwwwBLLBwk.',
  '.kscwwwwwBPPBsk.',
  '.kkcwwwwwBBBBkk.',
  '..kwwwwwwwwwwk..',
  '..kkkkkkkkkkkk..',
  '....kbbkkbbk....',
  '....kbbkkbbk....',
  '...kwwwkkwwwk...',
  '...kkkkkkkkkk...',
];
export function nurseSprite() { return smooth2x(sprite(NURSE_ROWS, NURSE_PAL)); } // 32x54

// ---------------- store icons (32x32) ----------------
export function storeIcons(handCanvas) {
  const cur = new Pix(32, 32);
  cur.blit(silhouette(handCanvas, '#00000066'), 7, 6);
  cur.blit(handCanvas, 6, 4);
  const nurse = crop(nurseSprite(), 0, 0, 32, 32);
  return { cursor: cur.done(), nurse };
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
  hand: ['..kk....', '.kwwk...', '.kwwk...', '.kwwkkk.', '.kwwkwwk', 'kkwwkwwk', 'kwwwwwwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
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

export function achievementIcon(glyphName, tier, locked = false) {
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
  const g = glyph(locked ? 'question' : glyphName);
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
  return smooth2x(p.done());
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

export { rng, crop };
