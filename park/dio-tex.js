/* HANGAR F. 園 ── ジオラマ用の手続きテクスチャ
   絵は描かない。地面の質感・看板の文字・光のにじみ・接地の影だけを canvas で作る。 */
import * as THREE from 'three';

let SEED = 20251017;
export const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
export const rr = (a, b) => a + (b - a) * rnd();
export const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function tex(c, { srgb = true, rep = null, nearest = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  t.anisotropy = 4;
  return t;
}

/* ざらつき（芝・舗装の下地に重ねる） */
function grain(x, W, H, n, cols, s = [1, 2]) {
  for (let i = 0; i < n; i++) { x.fillStyle = cols[(rnd() * cols.length) | 0]; const z = rr(s[0], s[1]); x.fillRect(rr(0, W), rr(0, H), z, z); }
}

/* 島の地面：芝の色むら＋細かい粒。周辺は台座の縁に向けて少し明るく */
export function lawnTex(base = '#7fae5a', S = 512) {
  const c = cv(S), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const r = rr(.06, .2) * S, cx = rr(0, S), cy = rr(0, S), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const dark = rnd() < .5; g.addColorStop(0, dark ? 'rgba(40,70,30,.16)' : 'rgba(220,240,170,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  grain(x, S, S, S * S / 40, ['rgba(30,60,25,.18)', 'rgba(210,235,160,.14)', 'rgba(60,95,40,.2)']);
  return tex(c, { rep: [3, 3] });
}

/* 舗装（誘導路・広場）：コンクリの色むら */
export function pavingTex(base = '#d9d2c4', S = 256) {
  const c = cv(S), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  grain(x, S, S, S * S / 18, ['rgba(80,70,60,.10)', 'rgba(255,255,255,.12)', 'rgba(120,110,95,.12)']);
  x.strokeStyle = 'rgba(90,80,70,.18)'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2);
  return tex(c, { rep: [1, 1] });
}

/* 台座の断面：地層の帯（模型の土台らしさ） */
export function strataTex(S = 256) {
  const c = cv(64, S), x = c.getContext('2d');
  const bands = [['#5d8a43', .08], ['#7a5a3c', .2], ['#9a7652', .16], ['#6e5038', .22], ['#8b6a4a', .16], ['#4f3a2a', .18]];
  let y = 0;
  for (const [col, h] of bands) { x.fillStyle = col; x.fillRect(0, y, 64, h * S + 1); y += h * S; }
  grain(x, 64, S, 900, ['rgba(0,0,0,.12)', 'rgba(255,240,220,.08)']);
  return tex(c, { rep: [8, 1] });
}

/* 接地の影：中心が濃い楕円の放射グラデ（影マップの代わり） */
export function blobTex() {
  const c = cv(128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(20,24,40,.55)'); g.addColorStop(.55, 'rgba(20,24,40,.22)'); g.addColorStop(1, 'rgba(20,24,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tex(c, { srgb: false });
}

/* 光のにじみ（誘導灯・回転灯・窓の周り） */
export function glowTex(col = '255,214,140') {
  const c = cv(64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(.25, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return tex(c);
}

/* 看板：区画色の地＋白抜き文字。日本語は Zen Kaku Gothic New、英字は Big Shoulders Display */
export function signTex(text, { sub = '', bg = '#1d2333', fg = '#fff8ea', accent = '#ffb547', W = 512, H = 160 } = {}) {
  const c = cv(W, H), x = c.getContext('2d');
  const r = H * .16;
  x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, r); x.fill();
  x.strokeStyle = accent; x.lineWidth = 6; x.beginPath(); x.roundRect(10, 10, W - 20, H - 20, r * .8); x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = sub ? H * .4 : H * .5;
  const font = s => `700 ${s}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  x.font = font(size);
  while (x.measureText(text).width > W * .86 && size > 18) { size -= 2; x.font = font(size); }
  x.fillText(text, W / 2, sub ? H * .42 : H * .52);
  if (sub) {
    x.fillStyle = accent; x.font = `700 ${H * .17}px "Big Shoulders Display", "Zen Kaku Gothic New", sans-serif`;
    x.fillText(sub, W / 2, H * .76);
  }
  return tex(c);
}

/* 窓の列：夜に灯る自発光（emissiveMap に使う）。lit は灯っている割合 */
export function windowsTex(cols, rows, lit = .7, warm = '255,206,140') {
  const W = 128, H = 128, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const cw = W / cols, ch = H / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (rnd() > lit) continue;
    x.fillStyle = `rgba(${warm},${rr(.6, 1)})`;
    x.fillRect(i * cw + cw * .22, j * ch + ch * .25, cw * .56, ch * .5);
  }
  return tex(c);
}

/* 縞のひさし・テント（赤白など2色の帯） */
export function stripeTex(a, b, n = 8) {
  const c = cv(128, 32), x = c.getContext('2d'), w = 128 / n;
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * w, 0, w + 1, 32); }
  return tex(c);
}

/* 工事現場の布：くすんだ帆布＋しわの濃淡 */
export function canvasClothTex() {
  const S = 256, c = cv(S), x = c.getContext('2d');
  x.fillStyle = '#8b8f86'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++) {
    const y = rr(0, S), g = x.createLinearGradient(0, y - 12, 0, y + 12);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, rnd() < .5 ? 'rgba(30,30,25,.18)' : 'rgba(255,255,240,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, y - 12, S, 24);
  }
  grain(x, S, S, 3000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.06)']);
  x.fillStyle = 'rgba(255,181,71,.9)'; x.font = '900 34px "Big Shoulders Stencil Display", sans-serif'; x.textAlign = 'center';
  x.fillText('UNDER CONSTRUCTION', S / 2, S * .55);
  return tex(c);
}

/* 黄黒の工事ストライプ（足場の幕・柵） */
export function hazardTex() {
  const c = cv(64), x = c.getContext('2d');
  x.fillStyle = '#ffcc33'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1b1b1b';
  for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 11, 0); x.lineTo(i + 11 - 64, 64); x.lineTo(i - 64, 64); x.fill(); }
  return tex(c, { rep: [4, 1] });
}

/* クレーンの格子（黄色の枠＋筋交い。背景は透明） */
export function latticeTex(col = '#ffc531') {
  const c = cv(64, 128), x = c.getContext('2d');
  x.strokeStyle = col; x.lineWidth = 7; x.strokeRect(3.5, -4, 57, 136);
  x.lineWidth = 4;
  for (let y = 0; y < 128; y += 32) { x.beginPath(); x.moveTo(4, y); x.lineTo(60, y + 32); x.moveTo(4, y + 32); x.lineTo(60, y + 32); x.stroke(); }
  return tex(c);
}

/* ドット絵の板（キャスト）。くっきり拡大 */
const pxCache = new Map();
export function pixelTex(src) {
  if (pxCache.has(src)) return pxCache.get(src);
  let done; const ready = new Promise(r => { done = r; });
  // 読み込めたら ready が texture で、失敗したら null で解ける（見張りのタイマーを使わない）
  const t = new THREE.TextureLoader().load(src, () => done(t), undefined, () => done(null));
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.userData.ready = ready;
  pxCache.set(src, t); return t;
}

/* お客さん（来園者）のドット絵。キャストと同じちび体型・黒縁で、服と髪の色違いを canvas で描く（画像は増やさない）。
   pal = { hair, skin, shirt, pants, hat?, balloon? }、frame＝歩きの2コマ（0/1）、back＝後ろ向き（奥へ歩くとき） */
export function guestTex(pal, frame, back) {
  const GW = 20, GH = 36, g = Array.from({ length: GH }, () => Array(GW).fill(null));
  const put = (x, y, c) => { if (x >= 0 && x < GW && y >= 0 && y < GH) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };
  const B = 10; // 頭のてっぺんの行（上は風船の場所）
  // 頭（角を1つずつ落とす）
  rect(4, B, 15, B + 10, pal.hair); put(4, B, null); put(15, B, null); put(4, B + 10, null); put(15, B + 10, null);
  if (!back) {
    rect(5, B + 4, 14, B + 10, pal.skin); put(5, B + 10, null); put(14, B + 10, null);
    rect(7, B + 6, 7, B + 7, '#1b1f2e'); rect(12, B + 6, 12, B + 7, '#1b1f2e');
    put(6, B + 9, '#f3a0a0'); put(13, B + 9, '#f3a0a0');
  }
  if (pal.hat) { rect(4, B - 1, 15, B + 2, pal.hat); if (!back) rect(3, B + 3, 16, B + 3, pal.hat); }
  // 胴と腕（腕は1コマごとに片方が1つ上がる）
  rect(5, B + 11, 14, B + 17, pal.shirt);
  const la = frame ? 0 : -1, ra = frame ? -1 : 0;
  rect(3, B + 12 + la, 4, B + 16 + la, pal.shirt); rect(3, B + 17 + la, 4, B + 17 + la, pal.skin);
  rect(15, B + 12 + ra, 16, B + 16 + ra, pal.shirt); rect(15, B + 17 + ra, 16, B + 17 + ra, pal.skin);
  // 脚（片方が1つ浮く＝歩き）
  const ll = frame ? 0 : 1, rl = frame ? 1 : 0;
  rect(6, B + 18, 9, B + 23 - ll, pal.pants); rect(6, B + 24 - ll, 9, B + 24 - ll, '#5a3a2a');
  rect(10, B + 18, 13, B + 23 - rl, pal.pants); rect(10, B + 24 - rl, 13, B + 24 - rl, '#5a3a2a');
  if (pal.balloon) { rect(14, 1, 18, 5, pal.balloon); put(14, 1, null); put(18, 1, null); put(14, 5, null); put(18, 5, null); put(15, 2, '#ffffff'); }
  // 縁取り：塗った所に隣り合う空きマスを黒っぽく
  const O = '#1b1f2e', edge = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== O)) edge.push([x, y]);
  for (const [x, y] of edge) g[y][x] = O;
  if (pal.balloon) rect(17, 7, 17, B + 16 + ra, '#e9e4da'); // 風船のひも（縁取りのあとに描く）
  const c = cv(GW, GH), x = c.getContext('2d');
  for (let y = 0; y < GH; y++) for (let k = 0; k < GW; k++) if (g[y][k]) { x.fillStyle = g[y][k]; x.fillRect(k, y, 1, 1); }
  return tex(c, { nearest: true });
}
