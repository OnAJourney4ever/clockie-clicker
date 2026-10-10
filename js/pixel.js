// pixel.js — a tiny pixel-art toolkit: pixel buffers, string sprites,
// tileable noise, ordered dithering, a 3x5 bitmap font and RotSprite-style rotation.

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function ctx2d(c) {
  const x = c.getContext('2d', { willReadFrequently: false });
  x.imageSmoothingEnabled = false;
  return x;
}

const colorCache = new Map();
export function rgba(hex) {
  let v = colorCache.get(hex);
  if (v) return v;
  const h = hex.replace('#', '');
  v = [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
  ];
  colorCache.set(hex, v);
  return v;
}

export function mix(a, b, t) {
  const A = rgba(a), B = rgba(b);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}

// 4x4 Bayer matrix, normalised to [0,1)
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// Pick a palette index for value v in [0,1] using ordered dithering.
export function ditherIndex(v, n, x, y, strength = 1) {
  const f = v * (n - 1) + (bayer(x, y) - 0.5) * strength;
  return Math.max(0, Math.min(n - 1, Math.round(f)));
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.c = canvas(w, h);
    this.x = ctx2d(this.c);
    this.img = this.x.createImageData(w, h);
    this.d = this.img.data;
  }
  set(x, y, col, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, aa] = rgba(col);
    const o = (y * this.w + x) * 4;
    this.d[o] = r; this.d[o + 1] = g; this.d[o + 2] = b; this.d[o + 3] = a ?? aa;
  }
  rect(x, y, w, h, col) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, col);
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  blit(spr, dx, dy) {
    const sx = ctx2d(spr).getImageData(0, 0, spr.width, spr.height).data;
    for (let y = 0; y < spr.height; y++) for (let x = 0; x < spr.width; x++) {
      const o = (y * spr.width + x) * 4;
      const a = sx[o + 3] / 255;
      if (!a) continue;
      const X = dx + x, Y = dy + y;
      if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      const p = (Y * this.w + X) * 4, da = this.d[p + 3] / 255, oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) this.d[p + k] = Math.round((sx[o + k] * a + this.d[p + k] * da * (1 - a)) / oa);
      this.d[p + 3] = Math.round(oa * 255);
    }
  }
  done() {
    this.x.putImageData(this.img, 0, 0);
    return this.c;
  }
}

// Build a sprite from rows of characters and a palette {char: '#rrggbb'}. '.' / ' ' are transparent.
export function sprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const p = new Pix(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = pal[rows[y][x]];
    if (col) p.set(x, y, col);
  }
  return p.done();
}

// Recolour every opaque pixel of a sprite (for silhouettes / shadows).
export function silhouette(spr, col) {
  const c = canvas(spr.width, spr.height), x = ctx2d(c);
  x.drawImage(spr, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Crop a region of a sprite.
export function crop(spr, sx, sy, w, h) {
  const c = canvas(w, h);
  ctx2d(c).drawImage(spr, sx, sy, w, h, 0, 0, w, h);
  return c;
}

// Upscale with nearest-neighbour (used to bake textures for CSS backgrounds / <img>).
export function upscale(src, k) {
  const c = canvas(src.width * k, src.height * k), x = ctx2d(c);
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// ---------- seeded randomness & tileable value noise ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function vnoise(seed) {
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const sm = (t) => t * t * (3 - 2 * t);
  // px/py: lattice periods for seamless tiling (0 = no wrap)
  const noise = (x, y, px = 0, py = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const w = (v, p) => (p ? ((v % p) + p) % p : v);
    const a = hash(w(xi, px), w(yi, py)), b = hash(w(xi + 1, px), w(yi, py));
    const c = hash(w(xi, px), w(yi + 1, py)), d = hash(w(xi + 1, px), w(yi + 1, py));
    const u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  noise.fbm = (x, y, px = 0, py = 0, oct = 3) => {
    let s = 0, amp = 0.5, tot = 0, f = 1;
    for (let i = 0; i < oct; i++) {
      s += noise(x * f, y * f, px * f, py * f) * amp;
      tot += amp; amp *= 0.5; f *= 2;
    }
    return s / tot;
  };
  return noise;
}

// ---------- 3x5 bitmap font ----------
const FONT = {
  0: ['010', '101', '101', '101', '010'],
  1: ['010', '110', '010', '010', '111'],
  2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '110', '001', '110'],
  6: ['011', '100', '110', '101', '010'],
  7: ['111', '001', '010', '010', '010'],
  8: ['010', '101', '010', '101', '010'],
  9: ['010', '101', '011', '001', '110'],
  C: ['011', '100', '100', '100', '011'],
  L: ['100', '100', '100', '100', '111'],
  O: ['010', '101', '101', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  E: ['111', '100', '110', '100', '111'],
  '?': ['110', '001', '010', '000', '010'],
  '!': ['010', '010', '010', '000', '010'],
};
export const textWidth = (s) => s.length * 4 - 1;
export function drawText(p, s, x, y, col) {
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]];
    if (!g) continue;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') p.set(x + i * 4 + c, y + r, col);
  }
}

// ---------- RotSprite-style rotation ----------
// Pixel art rotated with plain nearest-neighbour turns to mush. RotSprite upscales 8x
// with Scale2x (which keeps edges crisp), rotates, then samples back down.
function scale2x(src, w, h) {
  const W = w * 2, out = new Uint32Array(W * h * 2);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    const o = y * 2 * W + x * 2;
    out[o] = C === A && C !== D && A !== B ? A : P;
    out[o + 1] = A === B && A !== C && B !== D ? B : P;
    out[o + W] = D === C && D !== B && C !== A ? C : P;
    out[o + W + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return { d: out, w: W, h: h * 2 };
}

// Returns angle -> {c: canvas, r}. Draw the result at (pivotX - r, pivotY - r).
// pivX/pivY are the pixel indices of the pivot pixel in the source sprite.
// vote: instead of sampling each output pixel's centre, take 4x4 sub-samples and keep the
// most common colour (if it covers enough of the pixel). Keeps small chunky sprites solid.
export function rotator(src, pivX, pivY, steps = 360, { vote = false } = {}) {
  const W = src.width, H = src.height;
  let d = new Uint32Array(ctx2d(src).getImageData(0, 0, W, H).data.buffer.slice(0));
  let w = W, h = H;
  for (let k = 0; k < 3; k++) ({ d, w, h } = scale2x(d, w, h));
  const R = Math.ceil(Math.hypot(Math.max(pivX + 1, W - pivX), Math.max(pivY + 1, H - pivY))) + 1;
  const S = R * 2 + 1;
  const cache = new Map();
  const px = pivX + 0.5, py = pivY + 0.5;
  return (angle) => {
    let k = Math.round((angle / (Math.PI * 2)) * steps) % steps;
    if (k < 0) k += steps;
    let hit = cache.get(k);
    if (hit) return hit;
    const a = (k / steps) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    const out = canvas(S, S), ox = ctx2d(out), img = ox.createImageData(S, S);
    const o32 = new Uint32Array(img.data.buffer);
    const sample = (dx, dy) => {
      const sx = cs * dx + sn * dy + px, sy = -sn * dx + cs * dy + py;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) return 0;
      return d[Math.floor(sy * 8) * w + Math.floor(sx * 8)];
    };
    const counts = new Map();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!vote) { o32[y * S + x] = sample(x - R, y - R); continue; }
      counts.clear();
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const v = sample(x - R - 0.375 + i * 0.25, y - R - 0.375 + j * 0.25);
        counts.set(v, (counts.get(v) || 0) + 1);
      }
      let best = 0, bestN = 0, opaque = 0;
      for (const [v, n] of counts) {
        if (!(v >>> 24)) continue;
        opaque += n;
        if (n > bestN) { best = v; bestN = n; }
      }
      if (opaque >= 7) o32[y * S + x] = best;
    }
    ox.putImageData(img, 0, 0);
    hit = { c: out, r: R };
    cache.set(k, hit);
    return hit;
  };
}
