// art.js — every texture in the game, authored as pixel art (procedural or hand-placed).
import { Pix, sprite, silhouette, crop, vnoise, bayer, ditherIndex, drawText, textWidth, mix, rotator, rng } from './pixel.js';

// ---------------- the wall clock ----------------
export const CLOCK_R = 48; // face sprite is 97x97, centre pixel (48,48)

const WOOD = ['#2f170b', '#46230f', '#5e3016', '#7a401d', '#965226', '#b26833', '#cc8445', '#e0a463'];
const LIGHT = [-0.7071, -0.7071]; // light comes from the top-left

export function clockFace() {
  const S = 97, c = 48, p = new Pix(S, S), n = vnoise(11), n2 = vnoise(29);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    if (r > 48.45) continue;
    const ux = r ? dx / r : 0, uy = r ? dy / r : 0;
    const facing = ux * LIGHT[0] + uy * LIGHT[1]; // +1 on the lit (top-left) side
    if (r > 47.45) { p.set(x, y, '#1a0c05'); continue; }
    if (r > 40.45) {
      // turned wood bead: outer slope faces outward, inner slope faces the dial
      const t = (r - 40.45) / 7;
      const light = -Math.cos(Math.PI * t) * facing;
      const a01 = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const warp = n.fbm(a01 * 24, r * 0.25, 24, 0, 3);
      const grain = Math.sin(r * 2.1 + warp * 9 + n2(a01 * 64, 0, 64) * 2);
      let v = 0.45 + 0.42 * light + 0.17 * grain + (n2(a01 * 160, r * 1.3, 160) - 0.5) * 0.12;
      if (t > 0.4 && t < 0.62 && light > 0.2) v += 0.16; // specular ridge along the top of the bead
      if (t < 0.12) v -= 0.18; // dark lip where the frame meets the dial
      p.set(x, y, WOOD[ditherIndex(Math.min(1, Math.max(0, v)), WOOD.length, x, y, 0.85)]);
      continue;
    }
    if (r > 39.45) { p.set(x, y, '#24120a'); continue; }
    // dial: warm white, with the frame's inner wall casting a shadow on the lit side
    let col = '#f4f0e5';
    const sh = facing > 0 ? (r - 33.5) / 6 * (0.4 + facing) : -1;
    if (sh > 0.95) col = '#cfc6b1';
    else if (sh > 0.55) col = '#ddd5c4';
    else if (sh > 0.25 && bayer(x, y) < 0.5) col = '#e8e2d4';
    else if (r > 38.5) col = '#e2dccd';
    p.set(x, y, col);
  }
  // minute + hour ticks
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
    const hour = i % 5 === 0, quarter = i % 15 === 0;
    const from = quarter ? 33.5 : hour ? 35 : 37.2;
    for (let rr = from; rr <= 38.4; rr += 0.35) {
      const X = Math.round(c + s * rr), Y = Math.round(c + co * rr);
      p.set(X, Y, hour ? '#1a1712' : '#57524a');
      if (hour && !quarter) p.set(Math.round(c + s * rr + co * -0.9), Math.round(c + co * rr + s * 0.9), '#1a1712');
      if (quarter) {
        if (i % 30 === 0) { p.set(X - 1, Y, '#1a1712'); p.set(X + 1, Y, '#1a1712'); }
        else { p.set(X, Y - 1, '#1a1712'); p.set(X, Y + 1, '#1a1712'); }
      }
    }
  }
  // numerals
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2, s = '' + h, w = textWidth(s);
    const X = c + Math.sin(a) * 28.6, Y = c - Math.cos(a) * 28.6;
    drawText(p, s, Math.round(X - (w - 1) / 2), Math.round(Y - 2), '#1d1a15');
  }
  const brand = 'CLOCKIE';
  drawText(p, brand, c - (textWidth(brand) - 1) / 2, c + 12, '#9a8f7b');
  return p.done();
}

// glass glare, drawn on top of the hands
export function clockGlare() {
  const S = 97, c = 48, p = new Pix(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (r < 39 && r > 33.5 && a > -158 && a < -112) {
      const edge = Math.min(a + 158, -112 - a) / 10;
      if (edge > 1 || bayer(x, y) < edge * 0.75) p.set(x, y, '#ffffff', r > 36.5 ? 110 : 70);
    }
    if (r < 32.5 && r > 31.3 && a > -150 && a < -128) p.set(x, y, '#ffffff', 60);
  }
  return p.done();
}

// The hands are separate sprites, each drawn pointing straight up, rotated about their pivot.
const HAND_PAL = { k: '#141414', K: '#45464b', r: '#c4161c', R: '#ff5a50', o: '#7a0c10' };
function handRows(spec) { return spec; }
export function clockHands() {
  const hour = handRows([
    '..k..', '.kKk.', '.kKk.', 'kkKkk', 'kK.Kk', 'kK.Kk', '.k.k.', '.kKk.',
    ...Array(13).fill('.kKk.'), '.kkk.', '.kkk.', '.kkk.', '..k..',
  ]); // pivot row 22
  const minute = handRows([
    '.k.', '.k.', '.K.', 'kKk', ...Array(28).fill('kKk'), '.k.', '.k.', '.k.', '.k.', '.k.', '.k.',
  ]); // pivot row 33
  const second = handRows([
    ...Array(37).fill('.r.'), '.r.', '.r.', '.r.', '.r.', '.r.', '.r.', 'rRr', 'rro', '.o.',
  ]); // pivot row 37
  const mk = (rows, pivY) => {
    const spr = sprite(rows, HAND_PAL);
    const piv = (rows[0].length - 1) / 2;
    return { rot: rotator(spr, piv, pivY), shadow: rotator(silhouette(spr, '#000000'), piv, pivY) };
  };
  return { hour: mk(hour, 22), minute: mk(minute, 33), second: mk(second, 37) };
}

export function clockCap() {
  return sprite(['.ooo.', 'oYyyo', 'oyyyo', 'oyy#o', '.ooo.'], {
    o: '#5c3f0c', y: '#c99a2e', Y: '#ffe9a0', '#': '#9a7420',
  });
}

// ---------------- cursor ----------------
const CURSOR_PAL = { k: '#101014', w: '#ffffff', g: '#c3c8d8' };
export const CURSOR_ROWS = [
  'k.......',
  'kk......',
  'kwk.....',
  'kwwk....',
  'kwwwk...',
  'kwwwgk..',
  'kwwwwgk.',
  'kwwwwwgk',
  'kwwwkkkk',
  'kwkkwk..',
  'kk.kwwk.',
  'k..kwgk.',
  '....kwgk',
  '.....kk.',
];
export function cursorSprite() { return sprite(CURSOR_ROWS, CURSOR_PAL); }
export function cursorRotator() { return rotator(cursorSprite(), 0, 0, 180, { vote: true }); }
// direction the arrow naturally points (tail -> tip), used to aim cursors at the clock
export const CURSOR_AIM = Math.atan2(-11, -4);

// ---------------- doctor / nurse ----------------
const DOC_PAL = {
  k: '#2b1a16', w: '#f6f6f2', c: '#c3cad6', r: '#d8343a', h: '#7a4524', H: '#a8683a', d: '#4e2a14',
  s: '#f5c9a3', S: '#d99f7b', e: '#2b1a16', p: '#f19a9a', m: '#b8545a', b: '#5f9ccc', g: '#4d5560', G: '#c9d1d9',
  B: '#8a5a2c', P: '#ffffff', L: '#9aa8c0',
};
const DOC_ROWS = [
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
export function doctorSprites() {
  const blink = DOC_ROWS.slice();
  blink[8] = '.khsssssssssshdk';
  blink[9] = '.khssessssesshdk'.replace(/e/g, 'S');
  return { idle: sprite(DOC_ROWS, DOC_PAL), blink: sprite(blink, DOC_PAL) };
}

// ---------------- store icons (16x16) ----------------
export function storeIcons() {
  const cur = new Pix(16, 16);
  // soft drop shadow, then the arrow
  cur.blit(silhouette(cursorSprite(), '#00000066'), 5, 2);
  cur.blit(cursorSprite(), 4, 1);
  const doc = crop(doctorSprites().idle, 0, 0, 16, 16);
  return { cursor: cur.done(), doctor: doc };
}

// ---------------- small glyphs for achievements / UI ----------------
const G = {
  k: '#2a1a12', w: '#f6f2e6', y: '#ffd84a', Y: '#fff3b0', r: '#e0303a', R: '#ff8a8a', g: '#a8d8f0',
  h: '#7a4524', H: '#a8683a', s: '#f5c9a3', e: '#2b1a16', p: '#f19a9a', m: '#b8545a', b: '#5f9ccc',
};
export const GLYPHS = {
  clock: ['..kkkkk..', '.kwwwwwk.', 'kwwwkwwwk', 'kwwwkwwwk', 'kwwwkkkwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kwwwwwk.', '..kkkkk..'],
  hourglass: ['kkkkkkk', '.kgggk.', '.kyyyk.', '..kyk..', '...k...', '..kgk..', '.kgygk.', '.kyyyk.', 'kkkkkkk'],
  bolt: ['...kkk', '..kyk.', '.kYk..', 'kyyykk', 'kkyyyk', '..kyk.', '.kyk..', '.kk...'],
  cursor: ['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwwwwk', 'kwwkkkk', 'kk.kwk.', 'k...kk.'],
  hand: ['..kk....', '.kwk....', '.kwk....', '.kwkkkk.', 'kkwkwkwk', 'kwwwwwwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
  doctor: ['..kkkkk..', '.kwwrwwk.', '.kkkkkkk.', 'khhhhhhhk', 'khseesehk', 'khsssssHk', 'khpsmspHk', '.kksssskk', '.kwwbwwk.', '.kkkkkkk.'],
  heart: ['.kk.kk.', 'kRrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
  moon: ['..kkkk..', '.kYyyk..', 'kYyyk...', 'kyyk....', 'kyyk....', 'kyyyk...', '.kyyyk..', '..kkkk..'],
  question: ['.kkkk.', 'kwwwwk', 'kkkkwk', '..kwwk', '..kwk.', '..kk..', '..kwk.', '..kk..'],
};
// fix the doctor glyph's eyes (two dark pixels, not a double-wide stare)
GLYPHS.doctor[4] = 'khsesseHk';

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
    const corner = (x === 0 || x === 15) && (y === 0 || y === 15);
    if (corner) continue;
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) { p.set(x, y, '#120a06'); continue; }
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
  return p.done();
}

// ---------------- tiling textures ----------------
// page background: deep night-blue wallpaper with faint clock motifs
export function bgTile() {
  const S = 48, p = new Pix(S, S), n = vnoise(5);
  const pal = ['#141a33', '#18203d', '#1c2546', '#212b50'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = n.fbm((x / S) * 6, (y / S) * 6, 6, 6, 3);
    p.set(x, y, pal[ditherIndex(v * 0.9, pal.length, x, y, 1.2)]);
  }
  const motif = (cx, cy) => {
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      p.set(Math.round(cx + Math.cos(t) * 6), Math.round(cy + Math.sin(t) * 6), '#2a3560');
    }
    for (let i = 1; i <= 3; i++) p.set(cx, cy - i, '#2a3560');
    for (let i = 1; i <= 2; i++) p.set(cx + i, cy, '#2a3560');
  };
  motif(12, 12);
  motif(36, 36);
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
    let val = 0.5 + 0.22 * grain + (n2((u / U) * 16, (v / V) * 24, 16, 24) - 0.5) * 0.25 - dark;
    if (bevel) {
      if (u === 0) val += 0.3;
      if (u === 1) val += 0.12;
      if (u === U - 1) val = -1;
      if (u === U - 2) val -= 0.25;
    }
    p.set(x, y, pal[ditherIndex(Math.min(1, Math.max(0, val)), pal.length, x, y, 0.9)]);
  }
  return p.done();
}

// the plank texture behind each store item
export function plankTex() {
  const pal = ['#5a3a20', '#6b4728', '#7b5431', '#8c623a', '#9c7044'];
  return woodTex(64, 22, { seed: 41, vertical: false, pal });
}

// dark wood used for menu buttons
export function darkWoodTex() {
  const pal = ['#24130a', '#301a0e', '#3c2213', '#4a2b18', '#58341e'];
  return woodTex(48, 16, { seed: 17, vertical: false, pal });
}

// hospital ward backdrop for the doctor row (64 wide, 32 tall, tiles horizontally)
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
  return p.done();
}

// small pixel "X" used on menu close buttons
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
  return p.done();
}

// small clock used as a currency symbol next to prices
export function currencyIcon() { return glyph('clock'); }

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

export { rng };
