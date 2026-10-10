// icons2.js — the cursor and nurse portraits, achievement/upgrade motifs, tiles and finished icons.
// Same style as icons.js: muted earthy palettes, textured materials, dark-hue edges.
import { Pix, canvas, ctx2d } from './pixel.js';
import {
  IS, RAMP, hash2, pick, paint, inRect, inEll, inPoly, line, dot, light, tex, finish, groundShadow,
  clockDisc, flat, metal, plankShader, stoneShader, shingleShader, buildingIcon, BUILDING_IDS,
} from './icons.js';

const make = (draw) => { const p = new Pix(IS, IS); draw(p); return p.done(); };

// ---------------- cursor (the pointing hand image) and the nurse's portrait ----------------
let HAND = null;
export function setHand(c) { HAND = c; }
function handIcon() {
  const p = new Pix(IS, IS);
  if (!HAND) return p.done();
  const h = canvas(40, 42);
  ctx2d(h).drawImage(HAND, 0, 0, 40, 42);
  const d = ctx2d(h).getImageData(0, 0, 40, 42).data;
  const sh = canvas(40, 42), sx = ctx2d(sh), img = sx.createImageData(40, 42);
  for (let i = 0; i < 40 * 42; i++) if (d[i * 4 + 3] > 127) img.data[i * 4 + 3] = 90;
  sx.putImageData(img, 0, 0);
  p.blit(sh, 8, 6);
  p.blit(h, 5, 3);
  return p.done();
}
function nurseIcon() {
  const p = new Pix(IS, IS);
  paint(p, inEll(24, 23, 17.5, 19), flat(RAMP.hair, 0.55, [6, 4, 42, 42], 0.2));
  paint(p, inRect(6, 22, 13, 41), flat(RAMP.hair, 0.5, [6, 22, 13, 41], 0.2));
  paint(p, inRect(35, 22, 42, 41), flat(RAMP.hair, 0.42, [35, 22, 42, 41], 0.2));
  paint(p, inPoly([[2, 48], [4, 40], [14, 35], [34, 35], [44, 40], [46, 48]]), flat(RAMP.cream, 0.8, [2, 35, 46, 48], 0.08));
  paint(p, inPoly([[19, 35], [29, 35], [24, 44]]), flat(RAMP.blue, 0.5, [19, 35, 29, 44], 0.08));
  line(p, 15, 36, 18, 44, '#4a505c', 1); line(p, 18, 44, 24, 47, '#4a505c', 1); dot(p, '#9ca6b2', [[24, 47], [25, 47]]);
  paint(p, inRect(20, 30, 28, 37), flat(RAMP.skin, 0.28, [20, 30, 28, 37], 0.04));
  paint(p, inEll(24, 23, 12, 13.5), (x, y) => pick(RAMP.skin, 0.74 + light(x, y, [12, 9, 36, 37]) * 0.5, x, y, 0.45));
  paint(p, inPoly([[12, 17], [13, 9], [24, 6], [35, 9], [36, 17], [32, 13], [28, 17], [22, 12], [17, 15]]), flat(RAMP.hair, 0.62, [12, 6, 36, 17], 0.2));
  paint(p, inPoly([[14, 5], [34, 5], [36, 12], [12, 12]]), flat(RAMP.cream, 0.88, [12, 5, 36, 12], 0.05));
  p.rect(23, 4, 3, 8, '#a8483c'); p.rect(20, 6, 9, 3, '#a8483c'); p.rect(23, 6, 3, 3, '#c8685a');
  p.rect(12, 12, 24, 1, '#9a8c6e');
  p.rect(17, 22, 2, 4, '#2a1a14'); p.rect(29, 22, 2, 4, '#2a1a14'); dot(p, '#f8f0e0', [[17, 22], [29, 22]]);
  for (let y = 27; y < 31; y++) for (const cx of [14, 34]) for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, (y - 29) * 1.6) < 3.2 && ((x + y) & 1) === 0) p.set(x, y, '#d08470');
  p.rect(22, 31, 5, 1, '#8a4640'); dot(p, '#8a4640', [[21, 30], [27, 30]]);
  finish(p);
  return p.done();
}

// ---------------- motifs for achievements and upgrades ----------------
const MOTIF = {
  cursor(p) { // the arrow: clicking
    paint(p, inPoly([[13, 4], [13, 37], [21, 30], [27, 42], [33, 39], [27, 28], [38, 28]]), (x, y) => pick(RAMP.steel, 0.9 + light(x, y, [13, 4, 38, 42]) * 0.3, x, y, 0.4));
    line(p, 15, 8, 15, 32, '#f4f8fa', 1);
    finish(p);
  },
  rapid(p) {
    MOTIF.cursor(p);
    for (const [y, l] of [[12, 9], [20, 7], [28, 9]]) line(p, 2, y, 2 + l, y, '#d8c8a0', 1);
  },
  hand(p) { p.blit(handIcon(), 0, 0); },
  nurse(p) { p.blit(nurseIcon(), 0, 0); },
  hourglass(p) {
    paint(p, inRect(9, 4, 38, 8), plankShader(RAMP.wood, 4, [9, 4, 38, 8], false, 2));
    paint(p, inRect(9, 40, 38, 44), plankShader(RAMP.wood, 4, [9, 40, 38, 44], false, 4));
    paint(p, inRect(11, 8, 13, 40), plankShader(RAMP.wood, 3, [11, 8, 13, 40], true, 6));
    paint(p, inRect(34, 8, 36, 40), plankShader(RAMP.wood, 3, [34, 8, 36, 40], true, 8));
    const glass = (b) => (x, y) => pick(['#3a4a5c', '#5a6e82', '#8aa0b4'], 0.4 + light(x, y, b) * 0.8, x, y, 0.5);
    paint(p, inPoly([[15, 9], [33, 9], [25, 24], [23, 24]]), glass([15, 9, 33, 24]));
    paint(p, inPoly([[23, 24], [25, 24], [33, 39], [15, 39]]), glass([15, 24, 33, 39]));
    paint(p, inPoly([[19, 17], [29, 17], [25, 23], [23, 23]]), flat(RAMP.gold, 0.55, [19, 17, 29, 23], 0.1));
    paint(p, inPoly([[17, 38], [31, 38], [25, 30], [23, 30]]), flat(RAMP.gold, 0.6, [17, 30, 31, 38], 0.1));
    line(p, 24, 24, 24, 31, '#d0a240', 1);
    finish(p);
  },
  bolt(p) {
    paint(p, inPoly([[27, 2], [11, 26], [22, 26], [17, 46], [38, 19], [27, 19], [33, 2]]), (x, y) => pick(RAMP.gold, 0.72 + light(x, y, [11, 2, 38, 46]) * 0.6, x, y, 0.5));
    finish(p);
  },
  clock(p) {
    groundShadow(p, 24, 44, 14, 2.5);
    paint(p, inRect(9, 40, 14, 45), flat(RAMP.wood, 0.5, [9, 40, 14, 45])); paint(p, inRect(34, 40, 39, 45), flat(RAMP.wood, 0.4, [34, 40, 39, 45]));
    clockDisc(p, 24, 24, 18, 10.1, 8.3);
    paint(p, inEll(11, 8, 4, 3), metal(RAMP.steel, [7, 5, 15, 11])); paint(p, inEll(37, 8, 4, 3), metal(RAMP.steel, [33, 5, 41, 11]));
    finish(p);
  },
  heart(p) {
    const t = (x, y) => inEll(17, 17, 9.5, 9.5)(x, y) || inEll(31, 17, 9.5, 9.5)(x, y) || inPoly([[7.5, 20], [40.5, 20], [24, 43]])(x, y);
    paint(p, t, (x, y) => pick(RAMP.red, 0.58 + light(x, y, [7, 8, 41, 43]) * 0.8 + tex(x, y, 0.5) * 0.1, x, y, 0.5));
    dot(p, '#e8a090', [[13, 12], [14, 11], [15, 11], [13, 13]]);
    finish(p);
  },
  moon(p) {
    paint(p, (x, y) => inEll(24, 24, 18, 18)(x, y) && !inEll(32, 19, 15, 15)(x, y), (x, y) => pick(RAMP.cream, 0.85 + light(x, y, [6, 6, 42, 42]) * 0.3, x, y, 0.4));
    for (const [x, y] of [[35, 8], [40, 20], [36, 33], [28, 5]]) dot(p, '#f0e0a0', [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]);
    finish(p);
  },
  sun(p) {
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(p, Math.round(24 + Math.cos(a) * 13), Math.round(24 + Math.sin(a) * 13), Math.round(24 + Math.cos(a) * 20), Math.round(24 + Math.sin(a) * 20), '#d0a240', 3); }
    paint(p, inEll(24, 24, 11, 11), (x, y) => pick(RAMP.gold, 0.85 + light(x, y, [13, 13, 35, 35]) * 0.5, x, y, 0.45));
    finish(p);
  },
  news(p) {
    paint(p, inRect(11, 7, 43, 40), flat(RAMP.cream, 0.55, [11, 7, 43, 40], 0.1));
    paint(p, inRect(5, 10, 38, 42), flat(RAMP.cream, 0.82, [5, 10, 38, 42], 0.06));
    p.rect(8, 13, 27, 4, '#3a2a1c'); p.rect(8, 20, 11, 10, '#8a7a5e');
    p.rect(21, 20, 14, 1, '#5a4a38'); p.rect(21, 23, 14, 1, '#5a4a38'); p.rect(21, 26, 10, 1, '#5a4a38');
    for (const y of [33, 36, 39]) p.rect(8, y, 27, 1, '#8a7a5e');
    finish(p);
  },
  disk(p) {
    paint(p, inRect(7, 7, 41, 41), flat(['#1e2a44', '#2e4268', '#4a6490', '#6c88b4'], 0.5, [7, 7, 41, 41], 0.1));
    paint(p, inRect(14, 7, 34, 18), metal(RAMP.steel, [14, 7, 34, 18])); p.rect(27, 9, 4, 7, '#1e2228');
    paint(p, inRect(12, 24, 36, 41), flat(RAMP.cream, 0.8, [12, 24, 36, 41], 0.06));
    for (const y of [28, 32, 36]) p.rect(15, y, 18, 1, '#8a7a5e');
    finish(p);
  },
  tag(p) {
    paint(p, inPoly([[6, 24], [22, 8], [42, 8], [42, 28], [26, 44]]), (x, y) => pick(RAMP.red, 0.6 + light(x, y, [6, 8, 42, 44]) * 0.7, x, y, 0.5));
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (Math.hypot(x - 33, y - 16) < 2.8) p.set(x, y, '#000000', 0);
    p.rect(20, 22, 14, 2, '#e4d8b4'); p.rect(16, 28, 12, 2, '#e4d8b4');
    finish(p);
    line(p, 33, 16, 41, 5, '#c8b898', 1); dot(p, '#c8b898', [[42, 4], [43, 3]]);
  },
  gear(p) {
    const t = (x, y) => {
      const dx = x + 0.5 - 24, dy = y + 0.5 - 24, r = Math.hypot(dx, dy);
      if (r < 6) return false;
      if (r <= 14) return true;
      const k = ((Math.atan2(dy, dx) / (Math.PI / 4)) % 1 + 1) % 1;
      return r <= 19.5 && k > 0.2 && k < 0.8;
    };
    paint(p, t, (x, y) => pick(RAMP.gold, 0.66 + light(x, y, [4, 4, 44, 44]) * 0.7 + tex(x, y, 0.6) * 0.1, x, y, 0.5));
    finish(p);
  },
  trophy(p) {
    paint(p, (x, y) => inEll(8.5, 16, 5.5, 7)(x, y) && !inEll(8.5, 16, 3, 5)(x, y), flat(RAMP.gold, 0.55, [3, 9, 14, 23]));
    paint(p, (x, y) => inEll(39.5, 16, 5.5, 7)(x, y) && !inEll(39.5, 16, 3, 5)(x, y), flat(RAMP.gold, 0.4, [34, 9, 45, 23]));
    paint(p, inPoly([[11, 6], [37, 6], [34, 24], [27, 31], [21, 31], [14, 24]]), (x, y) => pick(RAMP.gold, 0.7 + light(x, y, [11, 6, 37, 31]) * 0.8, x, y, 0.5));
    paint(p, inRect(21, 31, 27, 37), flat(RAMP.gold, 0.5, [21, 31, 27, 37]));
    paint(p, inRect(13, 37, 35, 43), flat(RAMP.wood, 0.55, [13, 37, 35, 43], 0.1)); p.rect(13, 37, 23, 1, '#b88650');
    finish(p);
  },
  book(p) {
    paint(p, inPoly([[4, 10], [24, 15], [24, 42], [4, 37]]), flat(RAMP.cream, 0.74, [4, 10, 24, 42], 0.08));
    paint(p, inPoly([[44, 10], [24, 15], [24, 42], [44, 37]]), flat(RAMP.cream, 0.6, [24, 10, 44, 42], 0.08));
    for (let i = 0; i < 5; i++) { line(p, 8, 17 + i * 4, 21, 19 + i * 4, '#8a7a5e', 1); line(p, 27, 19 + i * 4, 40, 17 + i * 4, '#8a7a5e', 1); }
    line(p, 24, 15, 24, 42, '#5a4a38', 1);
    finish(p);
  },
  chart(p) {
    paint(p, inRect(5, 6, 43, 42), plankShader(RAMP.darkwood, 6, [5, 6, 43, 42], false, 9));
    for (const [x, h] of [[10, 12], [18, 20], [26, 15], [34, 26]]) paint(p, inRect(x, 38 - h, x + 5, 38), flat(RAMP.gold, 0.6, [x, 38 - h, x + 5, 38], 0.1));
    p.rect(8, 38, 33, 1, '#c8b892'); p.rect(8, 10, 1, 29, '#c8b892');
    finish(p);
  },
  scroll(p) {
    paint(p, inRect(10, 9, 38, 39), flat(RAMP.cream, 0.78, [10, 9, 38, 39], 0.08));
    for (const y of [14, 18, 22, 26, 30]) p.rect(14, y, 21, 1, '#8a7a5e');
    paint(p, inEll(24, 9, 15, 4), flat(RAMP.sand, 0.65, [9, 5, 39, 13], 0.06)); paint(p, inEll(24, 39, 15, 4), flat(RAMP.sand, 0.4, [9, 35, 39, 43], 0.06));
    finish(p);
  },
  eye(p) {
    paint(p, inEll(24, 24, 20, 11), (x, y) => pick(RAMP.cream, 0.88 + light(x, y, [4, 13, 44, 35]) * 0.2, x, y, 0.4));
    paint(p, inEll(24, 24, 8, 8), (x, y) => pick(RAMP.violet, 0.65 + light(x, y, [16, 16, 32, 32]) * 0.8, x, y, 0.5));
    paint(p, inEll(24, 24, 3.4, 5.4), () => '#120a1c');
    dot(p, '#f4ecd8', [[20, 20], [21, 20], [20, 21]]);
    p.rect(4, 22, 3, 1, '#2a1a10'); p.rect(41, 22, 3, 1, '#2a1a10');
    finish(p);
  },
  coin(p) {
    groundShadow(p, 24, 43, 18, 2.5);
    for (let i = 0; i < 3; i++) {
      const cy = 36 - i * 8;
      paint(p, inRect(10, cy, 38, cy + 6), flat(RAMP.gold, 0.35, [10, cy, 38, cy + 6], 0.1));
      paint(p, inEll(24, cy, 14, 5), (x, y) => pick(RAMP.gold, 0.8 + light(x, y, [10, cy - 5, 38, cy + 5]) * 0.5, x, y, 0.45));
      p.rect(19, cy - 1, 10, 1, '#a87a24');
    }
    finish(p);
  },
  house(p) {
    groundShadow(p, 24, 43, 20, 2.8);
    paint(p, inRect(9, 24, 39, 42), stoneShader(RAMP.stone, 8, 5, [9, 24, 39, 42], 70));
    paint(p, inPoly([[4, 26], [24, 7], [44, 26]]), shingleShader(RAMP.brick, 5, 4, [4, 7, 44, 26]));
    paint(p, inPoly([[20, 42], [20, 35], [24, 32], [28, 35], [28, 42]]), plankShader(RAMP.darkwood, 3, [20, 32, 28, 42], true, 3));
    paint(p, inRect(12, 29, 17, 34), (x, y) => pick(['#3a2810', '#d0a040', '#f0cc68'], 0.7, x, y, 0.5)); p.rect(14, 29, 1, 6, '#2a1a10');
    finish(p);
  },
  wrench(p) {
    line(p, 11, 37, 33, 15, '#525a68', 6); line(p, 11, 36, 33, 14, '#9ca6b2', 2);
    paint(p, inEll(36, 12, 8, 8), (x, y) => pick(RAMP.steel, 0.65 + light(x, y, [28, 4, 44, 20]) * 0.7, x, y, 0.5));
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (x > 36 && y < 11 && inEll(41, 7, 4, 4)(x, y)) p.set(x, y, '#000000', 0);
    finish(p);
  },
  zzz(p) {
    clockDisc(p, 20, 30, 14, 3, 20);
    finish(p);
    for (const [x, y, s] of [[34, 4, 8], [28, 11, 6]]) { line(p, x, y, x + s, y, '#e4d8b4', 2); line(p, x + s, y, x, y + s, '#e4d8b4', 2); line(p, x, y + s, x + s, y + s, '#e4d8b4', 2); }
  },
  star(p) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9 : 20; pts.push([24 + Math.cos(a) * r, 25 + Math.sin(a) * r]); }
    paint(p, inPoly(pts), (x, y) => pick(RAMP.gold, 0.78 + light(x, y, [4, 5, 44, 45]) * 0.7, x, y, 0.5));
    finish(p);
  },
};
const motifCache = {};
export function motifIcon(name) {
  if (name.startsWith('b:')) return buildingIcon(name.slice(2));
  return (motifCache[name] ||= make(MOTIF[name] || MOTIF.clock));
}

// ---------------- tiles, studs, and the finished achievement / upgrade icons ----------------
const TILES = {
  wood: ['#1e120a', '#2e1c10', '#402a18', '#523822', '#664a2e'],
  blue: ['#0e1420', '#162030', '#202e44', '#2c4058', '#3a526c'],
  red: ['#1e0e0c', '#2e1612', '#421e18', '#58281f', '#703428'],
  steel: ['#14181c', '#1e262e', '#2c3640', '#3a4652', '#4a5866'],
};
const TILE_OF = { moon: 'blue', sun: 'blue', zzz: 'blue', heart: 'red', tag: 'red', hourglass: 'steel', clock: 'steel', bolt: 'steel', gear: 'steel', wrench: 'steel', disk: 'steel' };
function drawTile(p, kind, seed) {
  const ramp = TILES[kind] || TILES.wood;
  for (let y = 0; y < IS; y++) for (let x = 0; x < IS; x++) {
    if ((x === 0 || x === IS - 1) && (y === 0 || y === IS - 1)) continue;
    let t = 0.42 + tex(x + seed * 17, y, 0.33) * 0.55 + (hash2(x >> 2, (y >> 2) + seed) - 0.5) * 0.18;
    if (x < 2 || y < 2) t += 0.22;
    if (x >= IS - 2 || y >= IS - 2) t -= 0.22;
    p.set(x, y, pick(ramp, t, x, y, 0.55));
  }
  for (let i = 0; i < IS; i++) for (const [x, y] of [[i, 0], [i, IS - 1], [0, i], [IS - 1, i]]) p.set(x, y, '#120a04');
}
function studs(p, n) {
  const w = n * 4 + 2;
  for (let y = 39; y < 46; y++) for (let x = 2; x < 2 + w; x++) p.set(x, y, '#120a04', 150);
  for (let i = 0; i < n; i++) {
    const x = 4 + i * 4, y = 41;
    p.rect(x, y, 3, 3, '#7c5418'); p.set(x, y, '#fce8a0'); p.set(x + 1, y, '#f0cc68'); p.set(x, y + 1, '#f0cc68'); p.set(x + 2, y + 2, '#3a2410');
  }
}
function questionMark(p) {
  const rows = ['..######..', '.########.', '##......##', '##......##', '.......###', '......###.', '.....###..', '....###...', '....##....', '....##....', '..........', '....##....', '....##....'];
  const x0 = 19, y0 = 12;
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    if (c !== '#') return;
    p.set(x0 + i + 1, y0 + j * 2 + 1, '#0a0604', 160); p.set(x0 + i + 1, y0 + j * 2 + 2, '#0a0604', 160);
    p.set(x0 + i, y0 + j * 2, '#4a3a2c'); p.set(x0 + i, y0 + j * 2 + 1, '#3a2c20');
  }));
}
export function achievementIcon(glyph, tier, locked = false) {
  const p = new Pix(IS, IS);
  drawTile(p, locked ? 'steel' : (TILE_OF[glyph] || 'wood'), tier + glyph.length);
  if (locked) { questionMark(p); return p.done(); }
  p.blit(motifIcon(glyph), 0, 0);
  studs(p, tier + 1);
  return p.done();
}
export function upgradeIcon(bid, tier) {
  const p = new Pix(IS, IS);
  drawTile(p, 'wood', tier + 3);
  p.blit(bid === 'cursor' ? motifIcon('hand') : bid === 'nurse' ? motifIcon('nurse') : buildingIcon(bid), 0, 0);
  studs(p, tier + 1);
  return p.done();
}
export function storeIcon(id) {
  if (id === 'cursor') return motifIcon('hand');
  if (id === 'nurse') return motifIcon('nurse');
  return buildingIcon(id);
}
export { BUILDING_IDS };
