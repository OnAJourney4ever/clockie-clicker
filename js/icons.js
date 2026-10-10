// icons.js — illustrated 48x48 icons in the manner of Cookie Clicker's: muted earthy palettes,
// textured materials (masonry, planks, shingles, brushed metal), dark-hue edges instead of black outlines,
// and a gentle top-left light. Everything here is drawn procedurally; nothing is a bitmap but the hand cursor.
import { Pix, canvas, ctx2d, vnoise, mix, ditherIndex, rng } from './pixel.js';

export const IS = 48;
const nz = vnoise(31);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const pick = (ramp, t, x, y, k = 0.8) => ramp[ditherIndex(clamp01(t), ramp.length, x, y, k)];
const hash2 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export const RAMP = {
  wood: ['#24140a', '#3a2212', '#553520', '#744a2c', '#946438', '#b88650'],
  darkwood: ['#1a0e08', '#2a180c', '#3c2412', '#503220'],
  stone: ['#2c2824', '#443e38', '#5e564c', '#7a7064', '#988c7c', '#b8ac98'],
  sand: ['#4a3a24', '#6a5434', '#8c7448', '#ac9462', '#ccb480', '#e4d09c'],
  brick: ['#2e1610', '#4a281c', '#683826', '#8a4e34', '#a8664a'],
  slate: ['#22262c', '#363c46', '#4c5462', '#667080', '#8490a0'],
  gold: ['#50340c', '#7c5418', '#a87a24', '#d0a240', '#f0cc68', '#fce8a0'],
  steel: ['#1e2228', '#363c46', '#525a68', '#747e8c', '#9ca6b2', '#c4ccd4'],
  green: ['#1e2c14', '#2e4420', '#446030', '#5e7e42', '#80a058'],
  soil: ['#1e140c', '#32220f', '#4a321a', '#664624', '#845e32'],
  cream: ['#6a5e48', '#9a8c6e', '#c8b992', '#e4d8b4', '#f6eed2'],
  violet: ['#1c1230', '#33224f', '#4e3874', '#6c5296', '#8e72b4'],
  blue: ['#141e34', '#22334f', '#36507a', '#4f72a0', '#7094c0'],
  teal: ['#12302c', '#1e4a44', '#2e6a62', '#468c80', '#68b0a0'],
  red: ['#3a1210', '#5c1e1a', '#82302a', '#a8483c', '#c8685a'],
  skin: ['#8a5a44', '#b8806a', '#d8a688', '#ecc4a4', '#f8dcc0'],
  hair: ['#2a160a', '#4a2a14', '#6a4020', '#8a5a30'],
};

// ---------------- shapes ----------------
const inRect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inEll = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
function inPoly(pts) {
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
}
const both = (a, b) => (x, y) => a(x, y) && b(x, y);
function paint(p, test, shade) {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (test(x, y)) p.set(x, y, shade(x, y));
}
function line(p, x0, y0, x1, y1, col, t = 1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (dx * i) / n), y = Math.round(y0 + (dy * i) / n);
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) p.set(x + a, y + b, col);
  }
}
const dot = (p, col, pts) => pts.forEach(([x, y]) => p.set(x, y, col));

// light from the top-left: +0.65 .. -0.65 across a box
const light = (x, y, b) => (0.5 - (x - b[0]) / ((b[2] - b[0]) || 1)) * 0.7 + (0.5 - (y - b[1]) / ((b[3] - b[1]) || 1)) * 0.6;
const tex = (x, y, s = 0.4) => nz(x * s, y * s) - 0.5;

// ---------------- material shaders: each returns a function (x, y) -> colour ----------------
function stoneShader(ramp, bw, bh, box, seed = 1) {
  return (x, y) => {
    const row = Math.floor(y / bh), off = (row & 1) * (bw >> 1);
    const col = Math.floor((x + off) / bw), lx = x + off - col * bw, ly = y - row * bh;
    let t = 0.4 + hash2(col + seed, row) * 0.32 + tex(x, y, 0.35) * 0.2;
    if (lx === 0 || ly === bh - 1) t = 0.06;
    else if (ly === 0 || lx === 1) t += 0.16;
    else if (ly >= bh - 2) t -= 0.1;
    return pick(ramp, t + light(x, y, box) * 0.34, x, y, 0.5);
  };
}
function plankShader(ramp, w, box, vertical = true, seed = 2) {
  return (x, y) => {
    const a = vertical ? x : y, b = vertical ? y : x;
    const k = Math.floor(a / w), la = a - k * w;
    let t = 0.4 + hash2(k + seed, 7) * 0.3 + tex(a * 0.5, b, 0.9) * 0.25;
    if (la === 0) t = 0.08;
    else if (la === 1) t += 0.14;
    return pick(ramp, t + light(x, y, box) * 0.3, x, y, 0.55);
  };
}
function shingleShader(ramp, w, h, box) {
  return (x, y) => {
    const row = Math.floor(y / h), off = (row & 1) * (w >> 1);
    const col = Math.floor((x + off) / w), lx = x + off - col * w, ly = y - row * h;
    let t = 0.4 + hash2(col, row + 9) * 0.3 + tex(x, y, 0.5) * 0.15;
    if (ly === h - 1 || (lx === 0 && ly > 1)) t = 0.08;
    else if (ly === 0) t += 0.2;
    return pick(ramp, t + light(x, y, box) * 0.3, x, y, 0.5);
  };
}
const flat = (ramp, base, box, amt = 0.16) => (x, y) => pick(ramp, base + light(x, y, box) * 0.5 + tex(x, y, 0.45) * amt, x, y, 0.8);
const metal = (ramp, box) => (x, y) => pick(ramp, 0.5 + light(x, y, box) * 0.55 + tex(x * 0.2, y, 0.9) * 0.14, x, y, 0.6);

// darken every edge pixel in its own hue (the Cookie Clicker look: no black outline)
function finish(p, edge = [26, 14, 6], amt = 0.62) {
  const todo = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.alpha(x, y) < 220) continue;
    if (p.alpha(x - 1, y) < 220 || p.alpha(x + 1, y) < 220 || p.alpha(x, y - 1) < 220 || p.alpha(x, y + 1) < 220) todo.push([x, y]);
  }
  for (const [x, y] of todo) {
    const o = (y * p.w + x) * 4;
    for (let k = 0; k < 3; k++) p.d[o + k] = Math.round(p.d[o + k] * (1 - amt) + edge[k] * amt);
  }
}
function groundShadow(p, cx, cy, rx, ry, a = 90) {
  const t = inEll(cx, cy, rx, ry);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (t(x, y)) p.set(x, y, '#000000', a);
}

// ---------------- reusable parts ----------------
// a brass-rimmed wall clock: clean dial, slim hands
function clockDisc(p, cx, cy, r, hour = 10.1, minute = 8.2) {
  const box = [cx - r, cy - r, cx + r, cy + r];
  paint(p, inEll(cx, cy, r, r), (x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d > 0.76) return pick(RAMP.gold, 0.52 + light(x, y, box) * 0.95, x, y, 0.45);
    return pick(RAMP.cream, 0.86 + light(x, y, box) * 0.22, x, y, 0.3);
  });
  const dark = '#2e1c10';
  const ox = Math.round(cx - 0.5), oy = Math.round(cy - 0.5);
  if (r >= 5.5) for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    p.set(Math.round(cx - 0.5 + Math.sin(a) * r * 0.6), Math.round(cy - 0.5 - Math.cos(a) * r * 0.6), '#8a7a5a');
  }
  const ha = (hour / 12) * Math.PI * 2, ma = (minute / 60) * Math.PI * 2;
  const hl = Math.max(2, r * 0.42), ml = Math.max(3, r * 0.62);
  line(p, ox, oy, Math.round(ox + Math.sin(ma) * ml), Math.round(oy - Math.cos(ma) * ml), dark, 1);
  line(p, ox, oy, Math.round(ox + Math.sin(ha) * hl), Math.round(oy - Math.cos(ha) * hl), dark, r >= 7 ? 2 : 1);
  dot(p, '#c8962e', [[ox, oy]]);
}
const smoke = (p, cx, cy, r, a = 150) => {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (inEll(cx, cy, r, r * 0.8)(x, y)) p.set(x, y, bayerish(x, y) ? '#b8b0a4' : '#8a8278', a);
  }
};
const bayerish = (x, y) => ((x + y * 2) & 3) < 2;
const flame = (p, cx, cy) => { dot(p, '#e0a030', [[cx, cy], [cx - 1, cy + 1], [cx, cy + 1], [cx + 1, cy + 1]]); dot(p, '#fff0a0', [[cx, cy + 1]]); dot(p, '#c8641e', [[cx, cy - 1]]); };

// ---------------- the buildings ----------------
const BUILD = {
  farm(p) {
    groundShadow(p, 24, 42, 21, 3.6);
    const bed = [[3, 37], [9, 27], [39, 27], [45, 37], [43, 43], [5, 43]];
    paint(p, inPoly(bed), (x, y) => pick(RAMP.soil, 0.42 + Math.sin(x * 0.5 + y * 0.25) * 0.18 + tex(x, y, 0.5) * 0.3 + light(x, y, [3, 27, 45, 43]) * 0.3, x, y, 0.8));
    for (const y of [31, 35, 39]) for (let x = 7; x < 42; x++) if (x % 4 !== 0 && inPoly(bed)(x, y)) p.set(x, y, '#241608');
    paint(p, inRect(5, 41, 43, 44), plankShader(RAMP.wood, 6, [5, 41, 43, 44], false));
    // three clock plants, tallest at the back
    const plants = [[24, 14, 8, 30], [10, 23, 7, 36], [38, 23, 7, 36]];
    for (const [cx, cy, r, base] of plants) {
      paint(p, inRect(cx - 1, cy + r - 2, cx, base), flat(RAMP.green, 0.5, [cx - 1, cy, cx, base]));
      paint(p, inEll(cx - 6, base - 3, 5.5, 2.5), flat(RAMP.green, 0.55, [cx - 12, base - 6, cx, base]));
      paint(p, inEll(cx + 6, base - 5, 5.5, 2.5), flat(RAMP.green, 0.45, [cx, base - 8, cx + 12, base - 2]));
      clockDisc(p, cx, cy, r, 10 + cx / 12, 8 + (cx % 5) * 9);
    }
    finish(p);
  },
  mine(p) {
    groundShadow(p, 24, 43, 23, 3.4);
    const hill = inEll(24, 33, 22.5, 18);
    paint(p, both(hill, (x, y) => y <= 43), stoneShader(RAMP.stone, 10, 7, [2, 15, 46, 43], 3));
    const mouth = (x, y) => x >= 17 && x <= 31 && y >= 24 && y <= 43 && (y >= 28 || inEll(24, 28, 7.5, 4.5)(x, y));
    paint(p, mouth, (x, y) => pick(['#0a0604', '#150d07', '#24160a', '#43290f'], 0.1 + (y - 24) / 70 + Math.max(0, 1 - Math.hypot(x - 24, y - 39) / 11) * 0.5, x, y, 0.6));
    paint(p, inRect(14, 25, 17, 43), plankShader(RAMP.wood, 4, [14, 25, 17, 43], true, 5));
    paint(p, inRect(31, 25, 34, 43), plankShader(RAMP.wood, 4, [31, 25, 34, 43], true, 6));
    paint(p, inRect(13, 22, 35, 26), plankShader(RAMP.wood, 5, [13, 22, 35, 26], false, 7));
    // rails and a cart heaped with clocks
    for (let x = 4; x < 46; x += 6) p.rect(x, 43, 3, 2, '#2a180c');
    p.rect(3, 42, 42, 1, '#8a8a96'); p.rect(3, 45, 42, 1, '#5a5a66');
    paint(p, inPoly([[21, 34], [42, 34], [40, 43], [23, 43]]), plankShader(RAMP.wood, 4, [21, 34, 42, 43], true, 9));
    p.rect(20, 34, 23, 2, '#3a2a24'); p.rect(20, 34, 23, 1, '#6a5a50');
    clockDisc(p, 27, 31, 4.2, 9.5, 20); clockDisc(p, 33, 29.5, 4.6, 3, 40); clockDisc(p, 38, 31.5, 3.8, 6, 12);
    paint(p, inEll(27, 43, 3, 3), metal(RAMP.steel, [24, 40, 30, 46])); paint(p, inEll(37, 43, 3, 3), metal(RAMP.steel, [34, 40, 40, 46]));
    dot(p, '#14100c', [[27, 43], [37, 43]]);
    // a hanging lantern
    p.rect(10, 27, 3, 4, '#c8962e'); p.rect(11, 28, 1, 2, '#fff0a0');
    for (let y = 22; y < 36; y++) for (let x = 5; x < 19; x++) if (Math.hypot(x - 11, y - 29) < 6 && ((x + y) & 1) && !both(hill, () => true)(x, y)) p.set(x, y, '#e0b050', 90);
    finish(p);
  },
  factory(p) {
    groundShadow(p, 24, 44, 22, 3);
    for (const [x0, top] of [[31, 6], [38, 10]]) {
      paint(p, inRect(x0, top, x0 + 4, 24), (x, y) => pick((y >> 2) & 1 ? RAMP.cream : RAMP.brick, 0.62 + light(x, y, [x0, top, x0 + 4, 24]) * 0.5, x, y, 0.4));
      p.rect(x0 - 1, top, 7, 2, '#2e1a12');
    }
    smoke(p, 36, 3, 3.6); smoke(p, 42, 6, 3);
    paint(p, inRect(5, 23, 43, 43), stoneShader(RAMP.brick, 6, 3, [5, 23, 43, 43], 11));
    for (let i = 0; i < 3; i++) {
      const x0 = 5 + i * 12;
      paint(p, inPoly([[x0, 23], [x0, 16], [x0 + 12, 23]]), shingleShader(RAMP.slate, 4, 3, [x0, 16, x0 + 12, 23]));
      for (let y = 17; y < 23; y++) p.set(x0, y, '#a8b8c0');
    }
    p.rect(4, 22, 40, 2, '#c8b898'); p.rect(4, 22, 40, 1, '#e8dcb8'); p.rect(4, 24, 40, 1, '#5a4a38');
    clockDisc(p, 24, 31, 7.5, 3.4, 14);
    paint(p, inPoly([[19, 43], [19, 38], [24, 35], [29, 38], [29, 43]]), plankShader(RAMP.darkwood, 3, [19, 35, 29, 43], true, 4));
    for (const x0 of [9, 35]) {
      paint(p, inRect(x0, 27, x0 + 5, 34), (x, y) => pick(['#3a2810', '#8a6428', '#d0a040', '#f0cc68'], 0.7 - (y - 27) / 14 * 0.4, x, y, 0.6));
      p.rect(x0 + 2, 27, 1, 8, '#2a1a10'); p.rect(x0, 30, 6, 1, '#2a1a10');
    }
    finish(p);
  },
  bank(p) {
    groundShadow(p, 24, 44, 23, 3);
    paint(p, inRect(5, 20, 43, 38), (x, y) => pick(RAMP.teal, 0.25 + (y - 20) / 40, x, y, 0.7));
    for (let i = 0; i < 6; i++) {
      const x0 = 6 + i * 7;
      paint(p, inRect(x0, 19, x0 + 4, 38), (x, y) => {
        const u = (x - x0) / 4;
        let t = 0.88 - Math.abs(u - 0.3) * 1.15 + tex(x, y, 0.8) * 0.12;
        if (x - x0 === 2) t -= 0.12;
        return pick(RAMP.cream, t, x, y, 0.5);
      });
      p.rect(x0 - 1, 19, 7, 2, '#b8a47c'); p.rect(x0 - 1, 37, 7, 2, '#b8a47c');
    }
    paint(p, inRect(3, 15, 45, 19), flat(RAMP.sand, 0.62, [3, 15, 45, 19], 0.1));
    p.rect(3, 15, 43, 1, '#e4d09c'); p.rect(3, 17, 43, 1, '#c8962e'); p.rect(3, 19, 43, 1, '#4a3a24');
    paint(p, inPoly([[2, 15], [24, 3], [46, 15]]), flat(RAMP.cream, 0.7, [2, 3, 46, 15], 0.1));
    paint(p, inPoly([[8, 14], [24, 6], [40, 14]]), flat(RAMP.sand, 0.35, [8, 6, 40, 14], 0.08));
    clockDisc(p, 24, 11.5, 4.6, 10, 10);
    paint(p, inRect(2, 38, 46, 41), stoneShader(RAMP.stone, 12, 3, [2, 38, 46, 41], 2));
    paint(p, inRect(0, 41, 48, 44), stoneShader(RAMP.stone, 14, 3, [0, 41, 48, 44], 4));
    finish(p);
  },
  temple(p) {
    groundShadow(p, 24, 44, 23, 3);
    const tiers = [[3, 36, 45, 43], [8, 29, 40, 36], [13, 22, 35, 29], [18, 15, 30, 22]];
    tiers.forEach(([x0, y0, x1, y1], i) => {
      paint(p, inRect(x0, y0, x1, y1), stoneShader(RAMP.sand, 8, 4, [x0, y0, x1, y1], 20 + i));
      p.rect(x0, y0, x1 - x0 + 1, 1, '#e4d09c'); p.rect(x0, y1, x1 - x0 + 1, 1, '#3a2a18');
    });
    paint(p, inPoly([[19, 43], [29, 43], [26, 15], [22, 15]]), (x, y) => (Math.floor((y - 15) / 2.4) & 1 ? pick(RAMP.sand, 0.5, x, y, 0.4) : pick(RAMP.sand, 0.18, x, y, 0.4)));
    paint(p, inRect(20, 8, 28, 15), stoneShader(RAMP.stone, 6, 4, [20, 8, 28, 15], 31));
    paint(p, inEll(24, 6.5, 4.4, 4.4), (x, y) => pick(RAMP.gold, 0.7 + light(x, y, [19, 2, 29, 11]) * 0.8, x, y, 0.5));
    dot(p, '#fff4c0', [[22, 4], [23, 4], [22, 5]]);
    for (const [x, y] of [[24, 0], [18, 3], [30, 3], [16, 7], [32, 7]]) p.set(x, y, '#e8c860', 160);
    for (const x of [6, 41]) { p.rect(x, 31, 3, 5, '#5a4a38'); p.rect(x - 1, 30, 5, 1, '#8a7860'); flame(p, x + 1, 27); }
    finish(p);
  },
  warlock(p) {
    groundShadow(p, 24, 44, 17, 3);
    paint(p, inPoly([[15, 20], [33, 20], [35, 43], [13, 43]]), stoneShader(['#26202e', '#3e3448', '#5a4c68', '#78688a', '#9886a8'], 7, 5, [13, 20, 35, 43], 40));
    paint(p, inPoly([[8, 21], [24, 1], [40, 21]]), shingleShader(RAMP.violet, 5, 4, [8, 1, 40, 21]));
    p.rect(7, 20, 34, 3, '#33224f'); p.rect(7, 20, 34, 1, '#8e72b4'); p.rect(7, 23, 34, 1, '#1c1230');
    dot(p, '#f0cc68', [[24, 0], [23, 1], [24, 1], [25, 1], [24, 2]]);
    clockDisc(p, 24, 29, 5.4, 9, 30);
    paint(p, inPoly([[19, 43], [19, 37], [24, 34], [29, 37], [29, 43]]), plankShader(RAMP.darkwood, 3, [19, 34, 29, 43], true, 8));
    dot(p, '#c8962e', [[27, 39]]);
    for (const [x, y, c] of [[40, 8, '#f0cc68'], [43, 12, '#e8d8a8'], [6, 11, '#e8d8a8'], [4, 20, '#f0cc68']]) p.set(x, y, c);
    paint(p, inEll(10, 41, 3, 2), flat(RAMP.green, 0.5, [7, 39, 13, 43])); paint(p, inEll(38, 42, 3.5, 2), flat(RAMP.green, 0.45, [34, 40, 42, 44]));
    finish(p);
  },
  satellite(p) {
    const frame = (x0, y0, x1, y1) => {
      paint(p, inRect(x0, y0, x1, y1), (x, y) => {
        const gx = (x - x0) % 5 === 0, gy = (y - y0) % 4 === 0;
        if (gx || gy) return '#1a2236';
        return pick(RAMP.blue, 0.5 + light(x, y, [x0, y0, x1, y1]) * 0.6 + tex(x, y, 0.7) * 0.2, x, y, 0.5);
      });
      p.rect(x0, y0, x1 - x0 + 1, 1, '#c8962e'); p.rect(x0, y1, x1 - x0 + 1, 1, '#7c5418');
      p.rect(x0, y0, 1, y1 - y0 + 1, '#d0a240'); p.rect(x1, y0, 1, y1 - y0 + 1, '#7c5418');
    };
    frame(1, 17, 16, 33); frame(32, 17, 47, 33);
    p.rect(16, 24, 3, 3, '#747e8c'); p.rect(29, 24, 3, 3, '#747e8c');
    paint(p, inRect(18, 14, 30, 36), (x, y) => pick(RAMP.gold, 0.5 + light(x, y, [18, 14, 30, 36]) * 0.7 + tex(x * 1.3, y * 1.3, 0.9) * 0.55, x, y, 0.5));
    p.rect(18, 14, 13, 1, '#fce8a0'); p.rect(18, 36, 13, 1, '#50340c');
    clockDisc(p, 24, 25, 5, 10, 25);
    line(p, 24, 13, 24, 8, '#747e8c', 2);
    paint(p, both(inEll(24, 8, 10, 6), (x, y) => y <= 9), (x, y) => pick(RAMP.steel, 0.55 + light(x, y, [14, 2, 34, 9]) * 0.8 + (y > 7 ? -0.15 : 0.05), x, y, 0.5));
    line(p, 14, 9, 34, 9, '#c4ccd4', 1);
    dot(p, '#c8641e', [[24, 2], [24, 3]]);
    line(p, 30, 16, 38, 6, '#9ca6b2', 1); dot(p, '#c8641e', [[38, 5], [39, 5]]);
    for (const [x, y] of [[4, 6], [43, 40], [8, 40], [41, 10]]) p.set(x, y, '#f0e0a0', 200);
    finish(p);
  },
  observatory(p) {
    groundShadow(p, 24, 44, 19, 3);
    paint(p, inRect(7, 30, 41, 43), stoneShader(RAMP.stone, 9, 5, [7, 30, 41, 43], 50));
    paint(p, both(inEll(24, 30, 17.5, 16), (x, y) => y <= 30), (x, y) => {
      let t = 0.52 + light(x, y, [6, 14, 42, 30]) * 0.8 + tex(x, y, 0.6) * 0.2;
      if ((x + 3) % 7 === 0) t -= 0.18;
      return pick(RAMP.teal, t, x, y, 0.5);
    });
    p.rect(6, 29, 37, 2, '#7a7064'); p.rect(6, 31, 37, 1, '#2c2824');
    paint(p, inPoly([[22, 15], [27, 15], [28, 29], [21, 29]]), (x, y) => pick(['#080c1c', '#101834', '#1c2a50'], 0.2 + (y - 15) / 30, x, y, 0.6));
    dot(p, '#e8e0b0', [[24, 20], [23, 25], [26, 23]]);
    line(p, 24, 27, 37, 12, '#744a2c', 4); line(p, 24, 26, 37, 11, '#b88650', 2);
    paint(p, inEll(38, 11, 3.2, 3.2), (x, y) => pick(RAMP.gold, 0.6 + light(x, y, [35, 8, 41, 14]), x, y, 0.5));
    dot(p, '#68b0a0', [[38, 11], [39, 10]]);
    paint(p, inPoly([[20, 43], [20, 37], [24, 34], [28, 37], [28, 43]]), plankShader(RAMP.darkwood, 3, [20, 34, 28, 43], true, 3));
    dot(p, '#f0e0a0', [[4, 10], [43, 22], [8, 24]]);
    finish(p);
  },
  portal(p) {
    groundShadow(p, 24, 44, 20, 3);
    paint(p, inRect(6, 38, 16, 44), stoneShader(RAMP.stone, 6, 4, [6, 38, 16, 44], 60)); paint(p, inRect(32, 38, 42, 44), stoneShader(RAMP.stone, 6, 4, [32, 38, 42, 44], 61));
    const cx = 24, cy = 23;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r > 19.5) continue;
      if (r > 12.4) {
        let t = 0.46 + light(x, y, [4, 3, 44, 43]) * 0.7 + tex(x, y, 0.45) * 0.3;
        const a = Math.atan2(dy, dx);
        if (Math.abs(((a / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) < 0.06 && r > 14.5 && r < 17.5) { p.set(x, y, '#d0a240'); continue; }
        p.set(x, y, pick(RAMP.stone, t, x, y, 0.5));
        continue;
      }
      const a = Math.atan2(dy, dx) + r * 0.38;
      const k = (((a / (Math.PI * 2)) * 3) % 1 + 1) % 1;
      const glow = 1 - r / 12.4;
      const ramp = k < 0.34 ? RAMP.teal : k < 0.67 ? RAMP.violet : RAMP.blue;
      p.set(x, y, r < 2.4 ? '#f4f0e4' : pick(ramp, 0.25 + glow * 0.7 + (k % 0.34) * 0.4, x, y, 0.7));
    }
    for (const [x, y] of [[8, 6], [40, 8], [4, 24], [44, 28], [12, 40]]) p.set(x, y, '#9adcd0', 190);
    finish(p);
  },
};

export const BUILDING_IDS = Object.keys(BUILD);
const cache = {};
function make(draw) { const p = new Pix(IS, IS); draw(p); return p.done(); }
export function buildingIcon(id) { return (cache['b' + id] ||= make(BUILD[id])); }
export const hasBuildingIcon = (id) => !!BUILD[id];

export { hash2, pick, paint, inRect, inEll, inPoly, both, line, dot, light, tex, finish, groundShadow, clockDisc, flame, flat, metal, plankShader, stoneShader, shingleShader };
