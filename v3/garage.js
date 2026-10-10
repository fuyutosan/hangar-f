/* HANGAR F. v3 ── 大人の秘密基地（ガレージ）3Dシーン
   画像素材はひとつも使わず、床・壁・ネオン・布をかぶった次期機体まで、すべてコードで描いています。 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const TAU = Math.PI * 2;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
let SEED = 20260724;
const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = a => a[(rnd() * a.length) | 0];
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------- 手続き的テクスチャ ---------- */
function noiseTile(n) {
  const c = cv(n + 1), x = c.getContext('2d'), d = x.createImageData(n + 1, n + 1), v = [];
  for (let i = 0; i < n * n; i++) v.push(rnd() * 255);
  for (let y = 0; y <= n; y++) for (let X = 0; X <= n; X++) {
    const k = v[(y % n) * n + (X % n)], o = (y * (n + 1) + X) * 4;
    d.data[o] = d.data[o + 1] = d.data[o + 2] = k; d.data[o + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c;
}
function fbm(ctx, W, H, octs, mode = 'overlay') {
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const [n, a] of octs) {
    const t = noiseTile(n), kx = W / n, ky = H / n; ctx.globalAlpha = a;
    ctx.drawImage(t, 0, 0, n + 1, n + 1, -kx / 2, -ky / 2, (n + 1) * kx, (n + 1) * ky);
  }
  ctx.restore();
}
function speckle(ctx, W, H, count, cols, s = [1, 2.4]) {
  for (let i = 0; i < count; i++) { ctx.fillStyle = pick(cols); const z = rr(s[0], s[1]); ctx.fillRect(rr(0, W), rr(0, H), z, z); }
}
function stain(ctx, cx, cy, R, rgb, a) {
  for (let i = 0; i < 7; i++) {
    const x = cx + rr(-R, R) * .5, y = cy + rr(-R, R) * .4, r = R * rr(.35, .8);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.6, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * rr(.55, 1), rr(0, 3), 0, TAU); ctx.fill();
  }
}

function floorMaps(S) {
  const c = cv(S), x = c.getContext('2d'), r = cv(S), y = r.getContext('2d');
  x.fillStyle = '#56534e'; x.fillRect(0, 0, S, S);
  fbm(x, S, S, [[3, .5], [7, .35], [18, .25], [60, .18], [200, .12]]);
  speckle(x, S, S, S * S / 90, ['rgba(20,18,16,.22)', 'rgba(210,205,195,.12)', 'rgba(40,36,30,.3)']);
  y.fillStyle = 'rgb(140,140,140)'; y.fillRect(0, 0, S, S);
  fbm(y, S, S, [[3, .9], [9, .55], [40, .25]]);
  for (let i = 0; i < 7; i++) {
    const R = rr(.05, .14) * S, cx = rr(R, S - R), cy = rr(R, S - R), a = rr(.08, .22);
    stain(x, cx, cy, R, '18,14,10', a); stain(y, cx, cy, R * 1.15, '75,75,75', .55);
  }
  for (let i = 0; i < 6; i++) { const R = rr(.12, .26) * S, cx = rr(R, S - R), cy = rr(R, S - R); stain(y, cx, cy, R, '80,80,80', .45); }
  // タイヤ痕
  x.save(); x.globalAlpha = .07; x.strokeStyle = '#000'; x.lineWidth = S * .035;
  for (let i = 0; i < 3; i++) { x.beginPath(); const sx = rr(.2, .8) * S; x.moveTo(sx, 0); x.bezierCurveTo(sx + rr(-.2, .2) * S, S * .3, sx + rr(-.2, .2) * S, S * .7, sx + rr(-.1, .1) * S, S); x.stroke(); }
  x.restore();
  // 目地（2.5m 間隔）
  for (const [ctx, col] of [[x, 'rgba(12,11,10,.75)'], [y, 'rgba(250,250,250,.9)']]) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, S / 400);
    ctx.beginPath(); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, 1); ctx.lineTo(S, 1); ctx.moveTo(1, 0); ctx.lineTo(1, S); ctx.stroke();
  }
  return [c, r];
}

function brickMaps(W, H) {
  const c = cv(W, H), x = c.getContext('2d'), b = cv(W, H), y = b.getContext('2d');
  x.fillStyle = '#5a534c'; x.fillRect(0, 0, W, H); y.fillStyle = '#1a1a1a'; y.fillRect(0, 0, W, H);
  const rows = 15, cols = 9, ch = H / rows, cw = W / cols, m = Math.max(3, W / 240);
  const pal = ['#6b2f22', '#7a3826', '#5c271d', '#874431', '#4d2219', '#6e3a2b', '#7d4a36', '#93533a', '#3f1d16'];
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * cw / 2;
    for (let i = -1; i <= cols; i++) {
      const bx = i * cw + off + m / 2, by = r * ch + m / 2, w = cw - m, h = ch - m;
      x.fillStyle = pick(pal); x.fillRect(bx, by, w, h);
      const g = x.createLinearGradient(bx, by, bx, by + h); g.addColorStop(0, 'rgba(255,220,190,.06)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
      x.fillStyle = g; x.fillRect(bx, by, w, h);
      if (rnd() < .25) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bx + rr(0, w * .6), by, w * rr(.2, .5), h); }
      x.strokeStyle = 'rgba(20,8,4,.35)'; x.lineWidth = 2; x.strokeRect(bx + 1, by + 1, w - 2, h - 2);
      const v = (200 + rr(-25, 25)) | 0; y.fillStyle = `rgb(${v},${v},${v})`; y.fillRect(bx, by, w, h);
      y.fillStyle = 'rgba(90,90,90,.5)'; for (let k = 0; k < 6; k++) y.fillRect(bx + rr(0, w), by + rr(0, h), rr(2, 6), rr(2, 5));
    }
  }
  fbm(x, W, H, [[4, .35], [16, .22], [90, .18]]);
  speckle(x, W, H, W * H / 70, ['rgba(0,0,0,.25)', 'rgba(255,230,210,.08)']);
  // すす・汚れの縦筋
  x.save(); x.globalAlpha = .12; for (let i = 0; i < 14; i++) { const sx = rr(0, W), g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(sx, 0, rr(6, 30), H * rr(.3, 1)); } x.restore();
  return [c, b];
}

function blockMaps(W, H) {
  const c = cv(W, H), x = c.getContext('2d'), b = cv(W, H), y = b.getContext('2d');
  x.fillStyle = '#2b2e31'; x.fillRect(0, 0, W, H); y.fillStyle = '#303030'; y.fillRect(0, 0, W, H);
  const rows = 5, cols = 5, ch = H / rows, cw = W / cols, m = Math.max(3, W / 300);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * cw / 2;
    for (let i = -1; i <= cols; i++) {
      const bx = i * cw + off + m / 2, by = r * ch + m / 2, v = rr(-6, 6) | 0;
      x.fillStyle = `rgb(${50 + v},${54 + v},${58 + v})`; x.fillRect(bx, by, cw - m, ch - m);
      y.fillStyle = `rgb(${205 + v},${205 + v},${205 + v})`; y.fillRect(bx, by, cw - m, ch - m);
    }
  }
  fbm(x, W, H, [[5, .3], [24, .2], [120, .16]]);
  speckle(y, W, H, W * H / 60, ['rgba(60,60,60,.5)', 'rgba(255,255,255,.3)']);
  speckle(x, W, H, W * H / 80, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.05)']);
  return [c, b];
}

function woodMap(W, H, base = '#6a4a2e', dark = 'rgba(40,22,10,') {
  const c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const y0 = rr(0, H), a = rr(.04, .18), f = rr(1, 4), ph = rr(0, 6);
    x.strokeStyle = rnd() < .7 ? dark + a + ')' : `rgba(255,220,170,${a * .5})`; x.lineWidth = rr(.6, 2.6);
    x.beginPath(); for (let X = 0; X <= W; X += 8) x.lineTo(X, y0 + Math.sin(X / W * TAU * f + ph) * H * .015 + Math.sin(X * .05 + ph) * 1.2); x.stroke();
  }
  fbm(x, W, H, [[6, .2], [30, .12]]);
  return c;
}

function stencilText(x, txt, X, Y, size, col, font = 'Big Shoulders Stencil Display', w = 900, align = 'left') {
  x.font = `${w} ${size}px "${font}", "Big Shoulders Display", Impact, sans-serif`; x.fillStyle = col; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(txt, X, Y);
}

function cardboardMap(label, sub) {
  const c = cv(256, 192), x = c.getContext('2d');
  x.fillStyle = '#9c774a'; x.fillRect(0, 0, 256, 192); fbm(x, 256, 192, [[6, .25], [40, .2]]);
  x.fillStyle = 'rgba(205,170,110,.55)'; x.fillRect(0, 84, 256, 22);
  x.strokeStyle = 'rgba(60,40,20,.3)'; x.lineWidth = 1; x.strokeRect(4, 4, 248, 184);
  stencilText(x, label, 128, 50, 44, 'rgba(25,20,15,.85)', undefined, 900, 'center');
  x.font = '600 15px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(25,20,15,.75)'; x.textAlign = 'center'; x.fillText(sub, 128, 140);
  x.fillText('↑↑  THIS SIDE UP', 128, 166);
  return c;
}

function neonCanvas(text, font, color, W, H, { stroke = true, size = H * .62, core = 'rgba(255,245,230,.95)', lw = 7 } = {}) {
  const c = cv(W, H), x = c.getContext('2d');
  x.font = font.replace('{s}', size); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineCap = 'round';
  const draw = (blur, col, w, alpha) => {
    x.save(); x.globalAlpha = alpha; x.shadowColor = color; x.shadowBlur = blur; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = w;
    if (stroke) x.strokeText(text, W / 2, H / 2 + size * .04); else x.fillText(text, W / 2, H / 2 + size * .04); x.restore();
  };
  draw(H * .22, color, lw * 2.2, .55); draw(H * .1, color, lw * 1.4, .9); draw(H * .03, color, lw, 1); draw(0, core, lw * .38, .9);
  return c;
}

function glowSprite(col, size = 128) {
  const c = cv(size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, col); g.addColorStop(.25, col.replace(/[\d.]+\)$/, '.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
}

/* ---------- 本体 ---------- */
export async function createGarage(canvas, opt = {}) {
  const Q = Object.assign({ tier: 'high', dpr: 1.25, shadows: true, bloom: true, onEvent: () => {}, onProgress: () => {} }, opt);
  const LOW = Q.tier === 'low';
  const step = async (p, label) => { Q.onProgress(p, label); await new Promise(r => setTimeout(r, 0)); };
  try { await Promise.race([Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('900 100px "Big Shoulders Stencil Display"'),
    document.fonts.load('700 60px "Zen Kaku Gothic New"', 'つくる思いついたら'), document.fonts.load('500 20px "JetBrains Mono"')]),
    new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  await step(.08, '電源');

  const R = new THREE.WebGLRenderer({ canvas, antialias: !Q.bloom, powerPreference: 'high-performance', alpha: false, stencil: false });
  R.setPixelRatio(Q.dpr); R.setSize(innerWidth, innerHeight, false);
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = Q.shadows; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const ANI = Math.min(8, R.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040306);
  scene.fog = new THREE.FogExp2(0x060508, .042);
  const pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .16;
  const cam = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .05, 80);

  const T = (c, rep = [1, 1], srgb = true) => {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
    t.anisotropy = ANI; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const std = (color, rough = .7, metal = 0, ext = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, ext));
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x, y, z, r = 0, parent = scene) => {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg = 24, parent = scene, open = false) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z); parent.add(m); return m;
  };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0, parent = scene) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); parent.add(m); return m;
  };
  const group = (x = 0, y = 0, z = 0, ry = 0, parent = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };
  const anchors = {}, pickables = {};
  const animated = [];
  const flick = []; // 点灯演出の対象

  /* ===== 部屋 ===== */
  const TS = LOW ? 512 : 1024;
  const [fc, fr] = floorMaps(TS);
  const floorMat = std(0xffffff, 1, 0, { map: T(fc, [2, 2.6]), roughnessMap: T(fr, [2, 2.6], false), envMapIntensity: .05 });
  const floor = plane(10, 13, floorMat, 0, 0, -6.5, 0, -Math.PI / 2); floor.receiveShadow = true;
  await step(.22, '床');
  const [bc, bb] = brickMaps(TS, TS / 2);
  const brickMat = std(0xffffff, .92, 0, { map: T(bc, [10 / 2.4, 3.8 / 1.2]), bumpMap: T(bb, [10 / 2.4, 3.8 / 1.2], false), bumpScale: 2.2 });
  const back = plane(10, 3.8, brickMat, 0, 1.9, -12.5); back.receiveShadow = true;
  const [kc, kb] = blockMaps(TS, TS / 2);
  const blockMat = () => std(0xffffff, .88, 0, { map: T(kc, [13 / 2, 3.8 / 1]), bumpMap: T(kb, [13 / 2, 3.8 / 1], false), bumpScale: 1.6 });
  const wl = plane(13, 3.8, blockMat(), -5, 1.9, -6.5, Math.PI / 2); wl.receiveShadow = true;
  const wr = plane(13, 3.8, blockMat(), 5, 1.9, -6.5, -Math.PI / 2); wr.receiveShadow = true;
  const ceil = plane(10, 13, std(0x0f1013, 1), 0, 3.8, -6.5, 0, Math.PI / 2);
  // 前面の壁（シャッター開口部 x:-3..3, h:2.9）
  const frontMat = blockMat(); frontMat.side = THREE.DoubleSide;
  plane(2, 3.8, frontMat, -4, 1.9, 0, Math.PI); plane(2, 3.8, frontMat, 4, 1.9, 0, Math.PI); plane(6, .9, frontMat, 0, 3.35, 0, Math.PI);
  await step(.34, '壁');
  // 巾木（車止めストライプ）
  const stripeC = cv(512, 32), sx = stripeC.getContext('2d'); sx.fillStyle = '#d9a521'; sx.fillRect(0, 0, 512, 32);
  sx.fillStyle = '#121212'; for (let i = -2; i < 20; i++) { sx.beginPath(); sx.moveTo(i * 32, 32); sx.lineTo(i * 32 + 16, 32); sx.lineTo(i * 32 + 32, 0); sx.lineTo(i * 32 + 16, 0); sx.fill(); }
  fbm(sx, 512, 32, [[20, .35]], 'multiply');
  const stripeMat = std(0xffffff, .6, 0, { map: T(stripeC, [6, 1]) });
  box(.08, .12, 13, stripeMat, -4.96, .06, -6.5); box(.08, .12, 13, stripeMat, 4.96, .06, -6.5);
  box(10, .12, .08, stripeMat, 0, .06, -12.46);
  // 柱（開口部の両側）
  const postMat = std(0x3b3f45, .45, .7);
  for (const s of [-1, 1]) { box(.22, 2.95, .22, postMat, s * 3.05, 1.47, -.05); box(.24, .9, .24, stripeMat, s * 3.05, .45, -.05); }
  box(6.3, .24, .26, postMat, 0, 2.97, -.05);
  // 巻き上げたシャッター
  const roll = cyl(.2, .2, 6.1, std(0x7b8088, .45, .8), 0, 3.25, -.25, 28); roll.rotation.z = Math.PI / 2;
  box(6.3, .5, .5, std(0x2c2f34, .5, .6), 0, 3.3, -.3, .03);

  // 天井の梁
  const beamMat = std(0x2a2d33, .55, .6);
  for (const z of [-1.4, -4.6, -7.8, -11]) { box(10, .3, .04, beamMat, 0, 3.62, z); box(10, .03, .2, beamMat, 0, 3.47, z); box(10, .03, .2, beamMat, 0, 3.77, z); }
  // 配管
  const pipeMat = std(0x5d4a3a, .5, .7);
  { const p = cyl(.05, .05, 13, pipeMat, -4.75, 3.45, -6.5, 12); p.rotation.x = Math.PI / 2; const q = cyl(.035, .035, 13, std(0x8a2a22, .5, .4), -4.6, 3.5, -6.5, 12); q.rotation.x = Math.PI / 2; }

  /* ===== 照明 ===== */
  scene.add(new THREE.HemisphereLight(0x39435a, 0x120d09, .32));
  const tubeEmis = [], tubeLights = [];
  const tubeZ = [-2.7, -6.3, -9.9];
  tubeZ.forEach((z, i) => {
    const g = group(0, 3.22, z);
    box(.2, .06, 1.42, std(0xc9ccd2, .4, .6), 0, .04, 0, 0, g);
    const tm = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xe9f1ff, emissiveIntensity: 0, roughness: .3 });
    for (const dx of [-.045, .045]) { const t = cyl(.016, .016, 1.3, tm, dx, -.02, 0, 10, g); t.rotation.x = Math.PI / 2; }
    for (const dz of [-.6, .6]) cyl(.004, .004, .4, std(0x777777, .5, .8), 0, .25, dz, 4, g);
    tubeEmis.push(tm);
  });
  for (const z of [-3.4, -8.4]) { const l = new THREE.SpotLight(0xe6eeff, 0, 0, 1.15, 1, 2); l.position.set(0, 3.12, z); l.target.position.set(0, 0, z); scene.add(l, l.target); tubeLights.push(l); }
  // ペンダントライト（作業台の上）
  const PEN = new THREE.Vector3(-3.95, 2.5, -4.15);
  const penG = group(PEN.x, PEN.y, PEN.z);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.28, .26, 32, 1, true), std(0x1d3a33, .45, .5, { side: THREE.DoubleSide }));
  shade.position.y = .02; penG.add(shade);
  cyl(.004, .004, 1.2, std(0x111111, .8), 0, .75, 0, 4, penG);
  const bulbM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 12), bulbM); bulb.position.y = -.08; penG.add(bulb);
  const pend = new THREE.SpotLight(0xffae5c, 0, 0, .7, .65, 2); pend.position.copy(PEN).add(new THREE.Vector3(0, -.08, 0));
  pend.target.position.set(PEN.x - .2, .9, PEN.z); scene.add(pend, pend.target);
  if (Q.shadows) { pend.castShadow = true; pend.shadow.mapSize.set(1024, 1024); pend.shadow.bias = -.0004; pend.shadow.radius = 4; pend.shadow.camera.near = .2; pend.shadow.camera.far = 6; }
  // 光の円錐（ボリューム光のふり）
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: new THREE.Color(0xffa860) }, uI: { value: 0 }, uH: { value: 1.6 } },
    vertexShader: `varying float vY;varying vec3 vN;varying vec3 vV;uniform float uH;void main(){vY=(position.y/uH)+.5;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vY;varying vec3 vN;varying vec3 vV;uniform vec3 uCol;uniform float uI;void main(){float e=pow(abs(dot(vN,vV)),1.6);float a=pow(vY,1.7)*e*uI;gl_FragColor=vec4(uCol*a,a);}`
  });
  const mkCone = (rad, h, col, pos) => { const m = coneMat.clone(); m.uniforms.uCol.value = new THREE.Color(col); m.uniforms.uH.value = h; const c = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 40, 1, true), m); c.position.copy(pos); scene.add(c); return c; };
  const penCone = mkCone(1.05, 1.62, 0xffa860, new THREE.Vector3(PEN.x - .1, PEN.y - .1 - .81, PEN.z));
  // 懐中電灯（マウスで照らす）
  const flash = new THREE.SpotLight(0xfff0d8, 0, 14, .32, .7, 1.3);
  scene.add(flash, flash.target);
  await step(.45, '照明');

  /* ===== 作業台 + 有孔ボード ===== */
  const benchG = group(-4.6, 0, -4.15);
  const woodC = woodMap(512, 256);
  const woodMat = std(0xffffff, .62, 0, { map: T(woodC, [1, 1]) });
  const steel = std(0x30343a, .5, .75), chrome = std(0xdfe3e8, .18, 1), black = std(0x141414, .6, .2);
  shadowy(box(.78, .07, 2.7, woodMat, .3, .92, 0, 0, benchG));
  for (const z of [-1.28, 1.28]) for (const x of [-.03, .63]) shadowy(box(.05, .9, .05, steel, x, .45, z, 0, benchG));
  shadowy(box(.7, .03, 2.6, steel, .3, .22, 0, 0, benchG));
  shadowy(box(.62, .3, .9, std(0x3c4148, .45, .7), .32, .7, .75, .01, benchG));
  for (let i = 0; i < 2; i++) box(.02, .015, .3, chrome, .64, .78 - i * .14, .75, 0, benchG);
  // 万力
  const vise = group(.52, .955, -1.05, 0, benchG);
  shadowy(box(.16, .1, .2, std(0x2d4a5c, .4, .6), 0, .05, 0, .01, vise)); shadowy(box(.16, .1, .04, std(0x2d4a5c, .4, .6), .14, .05, 0, .01, vise));
  { const s = cyl(.012, .012, .32, chrome, .24, .06, 0, 8, vise); s.rotation.z = Math.PI / 2; }
  // ノートPC（画面にドット絵のパンダさん）
  const lap = group(.42, .957, .15, -Math.PI / 2 - .25, benchG); pickables.laptop = lap;
  shadowy(box(.34, .016, .24, std(0x9ea3aa, .3, .85), 0, 0, 0, .004, lap));
  const scr = group(0, .008, -.12, 0, lap); scr.rotation.x = -.32;
  shadowy(box(.34, .23, .012, std(0x9ea3aa, .3, .85), 0, .115, 0, .004, scr));
  const lapC = cv(256, 168), lapX = lapC.getContext('2d'), lapT = T(lapC); lapT.wrapS = lapT.wrapT = THREE.ClampToEdgeWrapping;
  const lapScreen = plane(.31, .2, new THREE.MeshBasicMaterial({ map: lapT, toneMapped: false }), 0, .118, .0065, 0, 0, scr);
  const meiImg = new Image(); meiImg.src = 'assets/px/mei_desk_a.png'; const meiImg2 = new Image(); meiImg2.src = 'assets/px/mei_desk_b.png';
  const codeLines = Array.from({ length: 14 }, () => [rr(8, 30), rr(30, 150), pick(['#ffb547', '#7ad3ff', '#e8e2d4', '#c792ea', '#9ee493'])]);
  const drawLap = t => {
    const x = lapX; x.fillStyle = '#0e1116'; x.fillRect(0, 0, 256, 168); x.fillStyle = '#1a1f27'; x.fillRect(0, 0, 256, 14);
    x.fillStyle = '#ff5f57'; x.fillRect(6, 4, 6, 6); x.fillStyle = '#febc2e'; x.fillRect(15, 4, 6, 6); x.fillStyle = '#28c840'; x.fillRect(24, 4, 6, 6);
    const shown = Math.floor(t * 3) % 18;
    codeLines.forEach(([i, w, c], k) => { if (k > shown) return; x.fillStyle = c; x.globalAlpha = .85; x.fillRect(10 + i, 22 + k * 10, w, 4); x.globalAlpha = 1; });
    if (Math.floor(t * 2) % 2) { x.fillStyle = '#ffb547'; x.fillRect(10 + codeLines[Math.min(shown, 13)][0] + codeLines[Math.min(shown, 13)][1] + 4, 21 + Math.min(shown, 13) * 10, 4, 7); }
    const im = Math.floor(t * 3) % 2 ? meiImg : meiImg2; if (im.complete && im.naturalWidth) { x.imageSmoothingEnabled = false; x.drawImage(im, 186, 98, 64, 64); }
    lapT.needsUpdate = true;
  };
  // マグカップ・本
  const mug = cyl(.04, .036, .095, std(0xe9e4da, .35, 0), .2, 1.003, .62, 20, benchG); shadowy(mug);
  cyl(.034, .034, .002, std(0x2a160b, .2, 0), .2, 1.046, .62, 20, benchG);
  for (let i = 0; i < 3; i++) shadowy(box(.2, .035, .27, std(pick([0x7a2b22, 0x22334a, 0x3a4a2c, 0xd8cdb5]), .8), .22, .972 + i * .036, -.55 + rr(-.02, .02), 0, benchG)).rotation.y = rr(-.12, .12);
  // 有孔ボード
  const pegC = cv(1024, 512), px = pegC.getContext('2d');
  px.fillStyle = '#26292b'; px.fillRect(0, 0, 1024, 512); fbm(px, 1024, 512, [[6, .18], [40, .1]]);
  px.fillStyle = '#0b0c0d'; for (let y = 8; y < 512; y += 12.8) for (let x = 8; x < 1024; x += 12.8) { px.beginPath(); px.arc(x, y, 2.1, 0, TAU); px.fill(); }
  const pegMat = std(0xffffff, .75, .1, { map: T(pegC) });
  shadowy(box(2.6, 1.3, .02, pegMat, -.33, 1.75, 0, 0, benchG)).rotation.y = Math.PI / 2;
  // 吊られた工具（影絵ボード）
  const toolsG = group(-.3, 1.75, 0, Math.PI / 2, benchG);
  const outline = (cx, cy, w, h) => { px.strokeStyle = 'rgba(255,181,71,.55)'; px.lineWidth = 3; px.setLineDash([]); const X = (cx / 2.6 + .5) * 1024, Y = (.5 - cy / 1.3) * 512; px.strokeRect(X - w / 2 / 2.6 * 1024, Y - h / 2 / 1.3 * 512, w / 2.6 * 1024, h / 1.3 * 512); };
  const wrench = (x, y, L, rot = 0) => { const g = group(x, y, .03, 0, toolsG); g.rotation.z = rot; shadowy(box(.022, L, .008, chrome, 0, 0, 0, 0, g)); for (const s of [-1, 1]) { const h = cyl(L * .09, L * .09, .009, chrome, 0, s * L / 2, 0, 18, g); h.rotation.x = Math.PI / 2; shadowy(h); } outline(x, y, .07, L + .08); };
  [[-1.05, .2, .32], [-.95, .2, .27], [-.86, .2, .23], [-.78, .2, .19]].forEach(a => wrench(...a));
  { const g = group(-.45, .12, .04, 0, toolsG); shadowy(cyl(.016, .018, .34, woodMat, 0, 0, 0, 12, g)); shadowy(box(.15, .045, .045, steel, 0, .18, 0, .005, g)); outline(-.45, .14, .18, .42); }
  [[-.15, 0xd94a2a], [-.07, 0xffb547], [.01, 0x2a6fd9]].forEach(([x, c]) => { const g = group(x, .14, .04, 0, toolsG); shadowy(cyl(.018, .02, .11, std(c, .35), 0, -.05, 0, 12, g)); shadowy(cyl(.004, .004, .16, chrome, 0, .08, 0, 6, g)); outline(x, .14, .05, .3); });
  { const g = group(.4, .1, .03, 0, toolsG); const s = new THREE.Shape(); s.moveTo(-.25, .07); s.lineTo(.25, .02); s.lineTo(.25, -.04); s.lineTo(-.25, -.07); s.closePath(); const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .003, bevelEnabled: false }), std(0xbfc5cc, .25, 1)); g.add(bl); shadowy(bl); shadowy(box(.12, .1, .025, std(0x7a2b22, .5), -.3, 0, 0, .01, g)); outline(.37, .1, .7, .2); }
  { const t = new THREE.Mesh(new THREE.TorusGeometry(.12, .018, 10, 32), std(0xffb547, .5)); t.position.set(.95, .15, .03); toolsG.add(t); shadowy(t); outline(.95, .15, .3, .3); }
  { const g = group(.68, -.3, .03, 0, toolsG); shadowy(box(.09, .09, .04, std(0xf2c230, .4), 0, 0, 0, .01, g)); outline(.68, -.3, .12, .12); }
  // 棚板（ボード上部）
  shadowy(box(.25, .02, 2.6, woodMat, -.2, 2.48, 0, 0, benchG));
  for (let i = 0; i < 5; i++) { const c = cyl(.06, .06, .14, std(pick([0x9b1c1c, 0x2b4a6b, 0xc9a46a, 0x3a5a3a]), .4, .5), -.2, 2.56, -1 + i * .45, 18, benchG); shadowy(c); }
  pegMat.map.needsUpdate = true;
  anchors.bench = new THREE.Vector3(-4.3, 1.3, -4.1);
  await step(.56, '作業台');

  /* ===== 工具箱（赤） ===== */
  const chestG = group(-4.55, 0, -6.35, Math.PI / 2);
  const red = std(0x8f1a17, .32, .55);
  shadowy(box(.92, .82, .5, red, 0, .5, 0, .02, chestG)); shadowy(box(.92, .4, .46, red, 0, 1.13, -.01, .02, chestG));
  for (let i = 0; i < 6; i++) { const y = .22 + i * .13; box(.86, .004, .002, black, 0, y + .06, .251, 0, chestG); box(.5, .016, .02, chrome, 0, y + .02, .26, .004, chestG); }
  for (const x of [-.4, .4]) for (const z of [-.2, .2]) { const w = cyl(.045, .045, .04, black, x, .045, z, 16, chestG); w.rotation.x = Math.PI / 2; }
  const stickerTex = (src, w, h) => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANI; return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .5, alphaTest: .05 }); };
  plane(.2, .2, stickerTex('assets/suzuri/panda.webp'), -.28, 1.15, .232, 0, 0, chestG).rotation.z = .12;
  plane(.15, .15, stickerTex('assets/suzuri/emblem.webp'), .3, .5, .252, 0, 0, chestG).rotation.z = -.2;

  /* ===== 布をかぶった次期機体 ===== */
  const carG = group(.15, 0, -6.4, .08);
  {
    const NL = 90, NC = 64, K = 10, L = 4.5, W = .96, P = [], I = [], UV = [];
    const section = (v, u) => { // 断面上の1点（布の折り目込み）
      const plan = .42 + .58 * Math.pow(1 - Math.pow(Math.abs(2 * v - 1), 4), 1 / 3);
      const hb = .74 + .05 * Math.sin(v * Math.PI) - .1 * (1 - sm(0, .28, v)) - .05 * sm(.86, 1, v);
      const cab = .46 * sm(.3, .46, v) * (1 - sm(.7, .9, v));
      const th = u * Math.PI, c = Math.cos(th), s = Math.sin(th), p = 3.4;
      let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p) * W * plan, y = Math.pow(s, 2 / p) * hb;
      y += cab * (1 - sm(.3, .78, Math.abs(c))) * Math.pow(s, 3);
      y += .05 * Math.exp(-Math.pow((v - .37) / .035, 2)) * Math.exp(-Math.pow((Math.abs(c) - .8) / .08, 2));
      const low = 1 - Math.min(1, y / (hb * .55));
      x *= 1 + .085 * low * low;
      for (const vw of [.18, .8]) { const k = Math.exp(-Math.pow((v - vw) / .07, 2)) * sm(.05, .2, y) * (1 - sm(.45, .62, y)); x += Math.sign(c) * .05 * k * plan; }
      const fold = (.012 * Math.sin(v * 37 + Math.sin(u * 7 + v * 3) * 1.4) + .034 * Math.sin(v * 29 + Math.sin(u * 11) * 2.2) * low * low + .01 * Math.sin(u * 19 - v * 9) * (1 - low)) * (.3 + .9 * low);
      const nx = x / W, ny = y / Math.max(.3, hb), nl = Math.hypot(nx, ny) || 1;
      x += nx / nl * fold; y = Math.max(0, y + ny / nl * fold * .6);
      return [x, y, hb];
    };
    for (let i = -K; i <= NL + K; i++) {
      const over = i < 0 ? -i / K : i > NL ? (i - NL) / K : 0, v = Math.min(1, Math.max(0, i / NL)), end = i < 0 ? -1 : 1;
      for (let j = 0; j <= NC; j++) {
        let [x, y, hb] = section(v, j / NC), zz = (v - .5) * L;
        if (over > 0) { // 前後はドーム状に閉じる（布が垂れて丸く包む）
          const a = over * Math.PI / 2, sh = Math.cos(a), cy = hb * .42;
          x *= sh; y = cy + (y - cy) * sh; zz += end * Math.sin(a) * .32;
        }
        P.push(x, y, zz); UV.push(j / NC * 3, (i + K) / (NL + 2 * K) * 5);
      }
    }
    const NR = NL + 2 * K;
    for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    const clothC = cv(256), cx = clothC.getContext('2d'); cx.fillStyle = '#45464b'; cx.fillRect(0, 0, 256, 256);
    fbm(cx, 256, 256, [[4, .22], [16, .14], [64, .1], [128, .08]]);
    const cloth = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .9, map: T(clothC, [1, 1]), side: THREE.DoubleSide, sheen: .7, sheenRoughness: .55, sheenColor: new THREE.Color(0x7d828c) }));
    shadowy(cloth); carG.add(cloth); pickables.car = carG;
    // ボンネットのステンシル「F」
    const fC = cv(256), fx = fC.getContext('2d'); stencilText(fx, 'F', 128, 140, 230, 'rgba(255,181,71,.6)', undefined, 900, 'center');
    const fP = plane(.7, .7, new THREE.MeshStandardMaterial({ map: T(fC), transparent: true, roughness: .95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 0, .78, -1.45, 0, -Math.PI / 2 + .12, carG);
    fP.rotation.z = Math.PI;
    // 接地影
    const shC = cv(128), shx = shC.getContext('2d'), sg = shx.createRadialGradient(64, 64, 0, 64, 64, 64); sg.addColorStop(0, 'rgba(0,0,0,.85)'); sg.addColorStop(.6, 'rgba(0,0,0,.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); shx.fillStyle = sg; shx.fillRect(0, 0, 128, 128);
    plane(2.9, 5.6, new THREE.MeshBasicMaterial({ map: T(shC), transparent: true, depthWrite: false }), 0, .004, 0, 0, -Math.PI / 2, carG);
    // 荷札
    const tagC = cv(256, 128), tx = tagC.getContext('2d'); tx.fillStyle = '#d9ccb0'; tx.fillRect(0, 0, 256, 128); fbm(tx, 256, 128, [[6, .2]]);
    tx.fillStyle = '#2a2118'; tx.font = '700 30px "Zen Kaku Gothic New", sans-serif'; tx.textAlign = 'center'; tx.fillText('次期機体', 128, 52); tx.font = '500 20px "JetBrains Mono", monospace'; tx.fillText('F-19 ／ 構想中', 128, 92);
    tx.fillStyle = '#0d0d0d'; tx.beginPath(); tx.arc(22, 64, 8, 0, TAU); tx.fill();
    const tag = plane(.24, .12, std(0xffffff, .9, 0, { map: T(tagC), side: THREE.DoubleSide }), -.98, .62, -1.1, -Math.PI / 2 + .3, 0, carG); tag.rotation.z = .2;
  }
  // 床のライン（駐車枠）
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xc9a032, roughness: .8, transparent: true, opacity: .55, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const x of [-1.55, 1.85]) plane(.08, 6.2, lineMat, x, .003, -6.4, 0, -Math.PI / 2);
  plane(3.48, .08, lineMat, .15, .003, -9.5, 0, -Math.PI / 2);
  // 床の大きなステンシル
  const flC = cv(1024, 256), flx = flC.getContext('2d'); stencilText(flx, 'HANGAR  F.', 512, 135, 220, 'rgba(230,224,210,.22)', undefined, 900, 'center');
  plane(3.6, .9, new THREE.MeshStandardMaterial({ map: T(flC), transparent: true, roughness: .9, depthWrite: false }), .1, .004, -1.9, 0, -Math.PI / 2);
  anchors.car = new THREE.Vector3(.15, 1.15, -6.4);
  await step(.66, '次期機体');

  /* ===== ロッカー（ガレージの主） ===== */
  const lockG = group(-4.7, 0, -9.35, Math.PI / 2);
  const lockerTex = (name, sub) => {
    const c = cv(256, 1024), x = c.getContext('2d'); x.fillStyle = '#3b4944'; x.fillRect(0, 0, 256, 1024); fbm(x, 256, 1024, [[4, .2], [30, .15]]);
    x.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 6; i++) { x.fillRect(70, 90 + i * 16, 116, 6); x.fillRect(70, 860 + i * 16, 116, 6); }
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 4; x.strokeRect(10, 10, 236, 1004);
    x.fillStyle = '#d8cfb6'; x.fillRect(58, 230, 140, 64); x.fillStyle = '#1d1a16'; x.textAlign = 'center';
    x.font = '900 34px "Big Shoulders Display", sans-serif'; x.fillText(name, 128, 266); x.font = '500 13px "JetBrains Mono", monospace'; x.fillText(sub, 128, 285);
    x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(14, 14, 10, 996); return c;
  };
  const lockSide = std(0x2f3a36, .5, .5);
  [['SHIROTA', 'OWNER'], ['VACANT', 'LOCKER-02 / ???'], ['VACANT', 'LOCKER-03 / ???']].forEach(([n, s], i) => {
    const m = std(0xffffff, .42, .45, { map: T(lockerTex(n, s)) });
    const lk = shadowy(box(.48, 1.9, .5, lockSide, (i - 1) * .5, .95, 0, 0, lockG)); lk.material = [lockSide, lockSide, lockSide, lockSide, m, lockSide];
    box(.03, .16, .03, chrome, (i - 1) * .5 + .17, 1.0, .26, .008, lockG);
  });
  // ロッカー前のベンチ
  shadowy(box(1.2, .05, .32, woodMat, 0, .45, .7, .01, lockG)); for (const x of [-.5, .5]) shadowy(box(.04, .44, .26, steel, x, .22, .7, 0, lockG));
  // ヘルメット
  { const h = new THREE.Mesh(new THREE.SphereGeometry(.15, 24, 16, 0, TAU, 0, Math.PI * .58), std(0xe9e4da, .25, .1)); h.position.set(-.3, .5, .72); lockG.add(h); shadowy(h); const v = new THREE.Mesh(new THREE.SphereGeometry(.152, 24, 8, -.9, 1.8, .9, .5), std(0x111111, .05, .9)); v.position.copy(h.position); v.rotation.y = 0; lockG.add(v); }
  anchors.lockers = new THREE.Vector3(-4.55, 1.3, -9.35);

  /* ===== 奥の壁：ネオン・時計・ハッチ ===== */
  const neonMat = (c, add = true) => new THREE.MeshBasicMaterial({ map: T(c), transparent: true, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const neonMain = neonCanvas('HANGAR F.', '900 {s}px "Big Shoulders Display", Impact, sans-serif', '#ff9a3c', 2048, 512, { lw: 9 });
  const nm = neonMat(neonMain);
  const neon = plane(5.6, 1.4, nm, 0, 2.5, -12.44); pickables.neon = neon; neon.userData.pickAlways = true;
  const haloC = glowSprite('rgba(255,140,60,1)'); const haloM = new THREE.MeshBasicMaterial({ map: T(haloC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const halo = plane(9, 3.4, haloM, 0, 2.45, -12.43);
  const neonSub = neonCanvas('第F格納庫  ──  SECRET GARAGE', '700 {s}px "Zen Kaku Gothic New", sans-serif', '#ff4f7e', 2048, 160, { stroke: false, size: 92, lw: 3 });
  const nsm = neonMat(neonSub);
  plane(3.4, .27, nsm, 0, 1.62, -12.44);
  const reflC = cv(64, 256), rfx = reflC.getContext('2d'), rg = rfx.createLinearGradient(0, 0, 0, 256); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); rfx.fillStyle = rg; rfx.fillRect(0, 0, 64, 256);
  const hz = rfx.createLinearGradient(0, 0, 64, 0); hz.addColorStop(0, 'rgba(0,0,0,1)'); hz.addColorStop(.5, 'rgba(0,0,0,0)'); hz.addColorStop(1, 'rgba(0,0,0,1)'); rfx.globalCompositeOperation = 'destination-out'; rfx.fillStyle = hz; rfx.fillRect(0, 0, 64, 256);
  const reflM = new THREE.MeshBasicMaterial({ map: T(reflC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const refl = plane(4.6, 3.2, reflM, 0, .008, -10.85, 0, -Math.PI / 2);
  const neonL = new THREE.PointLight(0xff8a3c, 0, 9, 1.6); neonL.position.set(0, 2.4, -11.6); scene.add(neonL);
  // 側壁のネオン（ソファの上）
  const neonJP = neonCanvas('思いついたら、すぐつくる。', '700 {s}px "Zen Kaku Gothic New", sans-serif', '#ff3f6e', 2048, 256, { stroke: false, size: 150, lw: 4 });
  const njm = neonMat(neonJP);
  plane(3.1, .39, njm, 4.94, 2.42, -3.7, -Math.PI / 2);
  const njHalo = plane(4.4, 1.4, haloM.clone(), 4.93, 2.42, -3.7, -Math.PI / 2); njHalo.material.map = T(glowSprite('rgba(255,60,110,1)'));
  // 時計（日本時間）
  const clockG = group(-3.1, 2.55, -12.42); pickables.clock = clockG;
  { const f = cyl(.3, .3, .05, std(0x1a1a1a, .4, .6), 0, 0, 0, 40, clockG); f.rotation.x = Math.PI / 2;
    const dc = cv(256), dx = dc.getContext('2d'); dx.fillStyle = '#e8e1d0'; dx.beginPath(); dx.arc(128, 128, 128, 0, TAU); dx.fill(); dx.fillStyle = '#1a1714';
    for (let i = 0; i < 60; i++) { dx.save(); dx.translate(128, 128); dx.rotate(i / 60 * TAU); dx.fillRect(-1.5, -118, i % 5 ? 3 : 6, i % 5 ? 10 : 22); dx.restore(); }
    dx.font = '900 22px "Big Shoulders Display", sans-serif'; dx.textAlign = 'center'; dx.fillText('TOKYO', 128, 92); dx.font = '500 12px "JetBrains Mono", monospace'; dx.fillText('JST  UTC+9', 128, 178);
    const d = new THREE.Mesh(new THREE.CircleGeometry(.27, 40), std(0xffffff, .6, 0, { map: T(dc) })); d.position.z = .027; clockG.add(d); }
  const hand = (w, l, c, z) => { const g = group(0, 0, z, 0, clockG); box(w, l, .006, std(c, .5, .3), 0, l / 2 - .03, 0, 0, g); return g; };
  anchors.clock = new THREE.Vector3(-3.1, 2.55, -12.4);
  const hH = hand(.018, .15, 0x111111, .034), hM = hand(.012, .22, 0x111111, .04), hS = hand(.005, .23, 0xc8301e, .046);
  // B1F ハッチ（地下工場への入口）
  const hatchC = cv(256, 192), hx = hatchC.getContext('2d'); hx.fillStyle = '#000'; hx.fillRect(0, 0, 256, 192);
  for (let y = 8; y < 192; y += 18) for (let x = 8; x < 256; x += 18) { const g = hx.createRadialGradient(x + 7, y + 7, 0, x + 7, y + 7, 14); g.addColorStop(0, 'rgba(150,255,190,1)'); g.addColorStop(1, 'rgba(40,120,80,.0)'); hx.fillStyle = g; hx.fillRect(x, y, 13, 13); }
  hx.strokeStyle = '#333'; hx.lineWidth = 8; hx.strokeRect(0, 0, 256, 192);
  const hatchM = new THREE.MeshBasicMaterial({ map: T(hatchC), toneMapped: false, color: new THREE.Color(.2, .2, .2) });
  pickables.hatch = plane(1.2, .9, hatchM, -2.6, .006, -10.9, 0, -Math.PI / 2);
  box(1.36, .03, 1.06, std(0x2f3237, .5, .7), -2.6, .002, -10.9);
  const hatchGlow = plane(2.6, 2.2, new THREE.MeshBasicMaterial({ map: T(glowSprite('rgba(90,255,160,1)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(.25, .25, .25) }), -2.6, .02, -10.9, 0, -Math.PI / 2);
  const b1C = cv(512, 128), bx = b1C.getContext('2d'); bx.fillStyle = '#d9a521'; bx.fillRect(0, 0, 512, 128); bx.fillStyle = '#111'; bx.font = '900 70px "Big Shoulders Display", sans-serif'; bx.textAlign = 'center'; bx.fillText('B1F  ↓', 150, 88); bx.font = '700 34px "Zen Kaku Gothic New", sans-serif'; bx.fillText('地下工場', 380, 80);
  plane(.8, .2, std(0xffffff, .6, 0, { map: T(b1C) }), -2.6, 1.6, -12.44);
  anchors.hatch = new THREE.Vector3(-2.6, .2, -10.9);
  anchors.neon = new THREE.Vector3(0, 2.4, -12.3);
  await step(.74, 'ネオン');

  /* ===== 右壁：ラウンジ（ソファ・ラグ・酒・レコード・ラジオ） ===== */
  const leather = std(0x6b3518, .48, 0, { envMapIntensity: .6 });
  const sofaG = group(4.45, 0, -3.7, -Math.PI / 2);
  shadowy(box(2.2, .32, .92, leather, 0, .26, 0, .06, sofaG));
  for (const x of [-.52, .52]) shadowy(box(1.02, .16, .78, leather, x, .49, .06, .07, sofaG));
  shadowy(box(2.2, .5, .22, leather, 0, .72, -.36, .08, sofaG));
  for (const x of [-1.04, 1.04]) { shadowy(box(.2, .42, .9, leather, x, .48, 0, .07, sofaG)); const a = cyl(.13, .13, .92, leather, x * 1.02, .68, 0, 20, sofaG); a.rotation.x = Math.PI / 2; shadowy(a); }
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), std(0x2a140a, .4)); b.position.set(-.9 + i * .225, .82, -.245); sofaG.add(b); }
  for (const x of [-1, 1]) for (const z of [-.38, .38]) shadowy(cyl(.025, .02, .1, std(0x1c1209, .4), x, .05, z, 8, sofaG));
  // ラグ
  const rugC = cv(512, 768), ux = rugC.getContext('2d');
  ux.fillStyle = '#5a1c1a'; ux.fillRect(0, 0, 512, 768);
  const band = (i, c) => { ux.strokeStyle = c; ux.lineWidth = 10; ux.strokeRect(i, i, 512 - i * 2, 768 - i * 2); };
  band(10, '#1d2238'); band(26, '#c9a46a'); band(40, '#1d2238'); band(54, '#7a2a24');
  for (let y = 70; y < 700; y += 26) for (let x = 70; x < 440; x += 26) { ux.fillStyle = pick(['#7a2a24', '#3a1210', '#1d2238', '#8a5a3a']); ux.save(); ux.translate(x + 13, y + 13); ux.rotate(Math.PI / 4); ux.fillRect(-6, -6, 12, 12); ux.restore(); }
  ux.save(); ux.translate(256, 384); for (let r = 150; r > 10; r -= 22) { ux.fillStyle = pick(['#c9a46a', '#1d2238', '#7a2a24', '#d8cfb6']); ux.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ux.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.4); } ux.fill(); } ux.restore();
  fbm(ux, 512, 768, [[8, .3], [60, .25]], 'multiply'); fbm(ux, 512, 768, [[200, .3]]);
  const rug = plane(2.2, 3.2, std(0xffffff, .95, 0, { map: T(rugC) }), 3.0, .006, -3.7, 0, -Math.PI / 2); rug.receiveShadow = true; rug.rotation.z = Math.PI / 2;
  // サイドテーブル + ウイスキー
  const tblG = group(4.4, 0, -2.25);
  shadowy(cyl(.26, .26, .03, woodMat, 0, .55, 0, 32, tblG)); shadowy(cyl(.025, .025, .54, chrome, 0, .27, 0, 10, tblG)); shadowy(cyl(.18, .2, .02, chrome, 0, .01, 0, 24, tblG));
  const prof = [[0, 0], [.045, 0], [.047, .01], [.047, .16], [.04, .19], [.016, .22], [.015, .27], [.018, .275], [.018, .3], [0, .3]].map(p => new THREE.Vector2(p[0], p[1]));
  const bottle = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), std(0x6a2d08, .08, .1, { transparent: true, opacity: .82, envMapIntensity: 1.6 }));
  bottle.position.set(-.06, .565, .02); tblG.add(bottle);
  const lblC = cv(128, 64), lx = lblC.getContext('2d'); lx.fillStyle = '#e8dcc0'; lx.fillRect(0, 0, 128, 64); lx.fillStyle = '#1a1410'; lx.font = '900 26px "Big Shoulders Display", sans-serif'; lx.textAlign = 'center'; lx.fillText('NO.F', 64, 30); lx.font = '500 10px "JetBrains Mono", monospace'; lx.fillText('AGED 12 YEARS', 64, 50);
  { const l = new THREE.Mesh(new THREE.CylinderGeometry(.048, .048, .07, 24, 1, true, -1, 2), std(0xffffff, .7, 0, { map: T(lblC) })); l.position.set(-.06, .64, .02); tblG.add(l); }
  cyl(.0185, .0185, .03, std(0x1a1008, .4), -.06, .875, .02, 12, tblG);
  const glass = cyl(.04, .036, .085, std(0xffffff, .02, 0, { transparent: true, opacity: .18, envMapIntensity: 2 }), .1, .61, -.04, 24, tblG);
  cyl(.034, .032, .03, std(0x8a4510, .1, 0, { transparent: true, opacity: .85, emissive: 0x2a0e00 }), .1, .585, -.04, 24, tblG);
  box(.035, .035, .035, std(0xffffff, .05, 0, { transparent: true, opacity: .35 }), .105, .605, -.04, 0, tblG);
  // アームランプ
  const lampG = group(4.62, 0, -1.55);
  shadowy(cyl(.16, .18, .03, std(0x111111, .3, .7), 0, .015, 0, 24, lampG));
  { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.3, 0), new THREE.Vector3(-.9, 1.95, -1.5)); const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .012, 8), chrome); lampG.add(t); shadowy(t); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 12, 0, TAU, 0, Math.PI / 2), std(0xb08d57, .3, .9, { side: THREE.DoubleSide })); dome.position.set(-.9, 1.95, -1.5); lampG.add(dome);
  const lampBulbM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }); const lb = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), lampBulbM); lb.position.set(-.9, 1.88, -1.5); lampG.add(lb);
  const lampL = new THREE.PointLight(0xffa456, 0, 7, 1.7); lampL.position.set(3.72, 1.8, -3.05); scene.add(lampL);
  // AVキャビネット（レコード・ラジオ）
  const cabG = group(4.7, 0, -5.55, -Math.PI / 2);
  const walnut = std(0xffffff, .5, 0, { map: T(woodMap(512, 256, '#4a2e1a', 'rgba(20,10,4,')) });
  shadowy(box(1.3, .62, .48, walnut, 0, .33, 0, .015, cabG));
  for (const x of [-.6, .6]) shadowy(cyl(.02, .015, .1, black, x, .02, .15, 8, cabG));
  box(1.22, .52, .004, std(0x1a120b, .7), 0, .33, .242, 0, cabG);
  // ターンテーブル
  shadowy(box(.46, .08, .36, std(0x2a1c12, .35), -.32, .68, 0, .01, cabG));
  const vinyl = cyl(.15, .15, .006, std(0x0b0b0b, .25, .1), -.36, .725, 0, 48, cabG);
  { const lc = cv(64), lxx = lc.getContext('2d'); lxx.fillStyle = '#b22d22'; lxx.beginPath(); lxx.arc(32, 32, 32, 0, TAU); lxx.fill(); lxx.fillStyle = '#e8dcc0'; lxx.font = '700 10px sans-serif'; lxx.textAlign = 'center'; lxx.fillText('HANGAR F.', 32, 28); lxx.fillRect(30, 30, 4, 4);
    const lbm = new THREE.Mesh(new THREE.CircleGeometry(.05, 32), std(0xffffff, .5, 0, { map: T(lc) })); lbm.rotation.x = -Math.PI / 2; lbm.position.y = .0035; vinyl.add(lbm); }
  { const arm = box(.012, .012, .24, chrome, -.18, .75, .02, 0, cabG); arm.rotation.y = .35; cyl(.025, .025, .04, chrome, -.14, .74, -.1, 12, cabG); }
  // 真空管ラジオ
  const radioG = group(.3, .64, 0, 0, cabG); pickables.radio = radioG;
  shadowy(box(.48, .3, .24, walnut, 0, .15, 0, .05, radioG));
  const grC = cv(256, 128), gx = grC.getContext('2d'); gx.fillStyle = '#8a7a5c'; gx.fillRect(0, 0, 256, 128); for (let i = 0; i < 256; i += 3) { gx.fillStyle = 'rgba(40,30,20,.35)'; gx.fillRect(i, 0, 1, 128); } for (let i = 0; i < 128; i += 3) { gx.fillStyle = 'rgba(40,30,20,.25)'; gx.fillRect(0, i, 256, 1); }
  plane(.22, .2, std(0xffffff, .9, 0, { map: T(grC) }), -.1, .15, .121, 0, 0, radioG);
  const dialC = cv(256, 128), dx2 = dialC.getContext('2d'); dx2.fillStyle = '#f2c46a'; dx2.fillRect(0, 0, 256, 128); dx2.fillStyle = '#3a2410'; dx2.font = '600 16px "JetBrains Mono", monospace'; dx2.textAlign = 'center';
  [55, 70, 90, 110, 140, 160].forEach((f, i) => dx2.fillText(f, 24 + i * 42, 40)); for (let i = 0; i < 50; i++) dx2.fillRect(10 + i * 4.8, 60, 1.5, i % 5 ? 10 : 20); dx2.fillStyle = '#b22d22'; dx2.fillRect(150, 50, 4, 60);
  const dialM = new THREE.MeshBasicMaterial({ map: T(dialC), toneMapped: false, color: new THREE.Color(.1, .1, .1) });
  const dialP = new THREE.Mesh(new THREE.CircleGeometry(.075, 32), dialM); dialP.position.set(.12, .17, .122); radioG.add(dialP);
  for (const x of [.06, .18]) { const k = cyl(.022, .022, .03, std(0x2a1a0e, .4), x, .05, .13, 16, radioG); k.rotation.x = Math.PI / 2; }
  // レコードの束
  for (let i = 0; i < 9; i++) { const r = box(.31, .31, .008, std(pick([0xc9a46a, 0x22334a, 0xb22d22, 0xe8dcc0, 0x1a1a1a, 0x3a5a3a]), .7), .78 + i * .012, .16, .02, 0, cabG); r.rotation.z = -.08 - i * .01; }
  anchors.radio = new THREE.Vector3(4.6, .85, -5.25);
  anchors.lounge = new THREE.Vector3(4.2, .8, -3.6);

  /* ===== ブラウン管テレビ（映写室） ===== */
  const tvG = group(4.55, 0, -7.1, -Math.PI / 2); pickables.tv = tvG;
  shadowy(box(.9, .45, .45, walnut, 0, .225, 0, .015, tvG));
  shadowy(box(.72, .58, .52, std(0x2b2a28, .35, .2), 0, .74, -.02, .06, tvG));
  shadowy(box(.62, .5, .02, std(0x161514, .4, .2), 0, .74, .245, .03, tvG));
  const tvC = cv(320, 240), tvx = tvC.getContext('2d'), tvT = T(tvC); tvT.wrapS = tvT.wrapT = THREE.ClampToEdgeWrapping;
  const tvM = new THREE.MeshBasicMaterial({ map: tvT, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const tvS = new THREE.Mesh(new THREE.PlaneGeometry(.5, .38), tvM); tvS.position.set(-.04, .75, .257); tvG.add(tvS);
  for (const y of [.86, .74]) { const k = cyl(.025, .025, .02, std(0x9a9590, .3, .7), .26, y, .26, 16, tvG); k.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 4; i++) shadowy(box(.19, .025, .105, std(pick([0x111111, 0x222222]), .6), .28 - (i % 2) * .02, .462 + i * .026, .08, 0, tvG));
  const ant = group(0, 1.03, -.05, 0, tvG); for (const s of [-1, 1]) { const a = cyl(.003, .003, .5, chrome, s * .12, .2, 0, 4, ant); a.rotation.z = -s * .55; }
  const tvL = new THREE.PointLight(0x8fb6ff, 0, 5, 1.6); tvL.position.set(4.0, .85, -7.1); scene.add(tvL);
  let tvCh = 0, tvStatic = 0;
  const drawTV = (t, on) => {
    const x = tvx, W = 320, H = 240; const ph = tvStatic > t ? 2 : (Math.floor(t / 5) + tvCh) % 3;
    if (!on) { x.fillStyle = '#050505'; x.fillRect(0, 0, W, H); tvT.needsUpdate = true; return; }
    if (ph === 0) { const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']; cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(i * W / 7, 0, W / 7 + 1, H * .7); }); x.fillStyle = '#111'; x.fillRect(0, H * .7, W, H * .3); x.fillStyle = '#eee'; x.font = '900 34px "Big Shoulders Display", sans-serif'; x.textAlign = 'center'; x.fillText('HANGAR F. THEATER', W / 2, H * .86); }
    else if (ph === 1) { x.fillStyle = '#0c1424'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffb547'; x.font = '900 46px "Big Shoulders Display", sans-serif'; x.textAlign = 'center'; x.fillText('NOW SHOWING', W / 2, H * .45); x.fillStyle = '#e8e2d4'; x.font = '700 22px "Zen Kaku Gothic New", sans-serif'; x.fillText('記録映像 ── 第F格納庫', W / 2, H * .64); }
    else { const id = x.createImageData(W, H); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 200; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }
    x.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    tvT.needsUpdate = true;
  };
  anchors.tv = new THREE.Vector3(4.4, .8, -7.1);

  /* ===== 部品棚 ===== */
  const shelfG = group(4.62, 0, -9.35, -Math.PI / 2);
  const rack = std(0x3c3f44, .45, .7);
  for (const x of [-.95, .95]) for (const z of [-.25, .25]) shadowy(box(.04, 2.3, .04, rack, x, 1.15, z, 0, shelfG));
  [.12, .7, 1.28, 1.86].forEach((y, si) => {
    shadowy(box(1.95, .03, .52, rack, 0, y, 0, 0, shelfG));
    let x = -.85;
    while (x < .82) {
      const k = rnd(), w = k < .45 ? rr(.3, .45) : k < .75 ? .16 : .2;
      if (x + w > .92) break;
      if (k < .45) { const h = rr(.25, .42), b = box(w, h, .4, std(0xffffff, .85, 0, { map: T(cardboardMap(pick(['PARTS', 'F-SPARE', 'STICKER', 'CABLE', 'MISC', 'PANDA']), pick(['NO.' + ((rnd() * 90 + 10) | 0), 'F-0' + ((rnd() * 9 + 1) | 0), 'HANGAR F.']))) }), x + w / 2, y + .015 + h / 2, 0, .006, shelfG); shadowy(b); }
      else if (k < .75) { const c = cyl(.075, .075, .2, std(pick([0x9b1c1c, 0x2b4a6b, 0xc9a46a, 0x2f4a3a, 0xd9d4c8]), .35, .6), x + w / 2, y + .115, rr(-.1, .1), 20, shelfG); shadowy(c); }
      else { const c = box(.18, .26, .12, std(0xa8241c, .35, .3), x + w / 2, y + .145, 0, .02, shelfG); shadowy(c); }
      x += w + rr(.02, .06);
    }
  });
  anchors.shelves = new THREE.Vector3(4.5, 1.25, -9.35);

  /* ===== 金庫 ===== */
  const safeG = group(4.35, 0, -11.55, -Math.PI / 2 - .35); pickables.safe = safeG;
  const safeMat = std(0x1c3a2e, .32, .6);
  shadowy(box(.78, 1.02, .7, safeMat, 0, .58, 0, .03, safeG));
  shadowy(box(.66, .88, .03, safeMat, 0, .58, .355, .02, safeG));
  shadowy(box(.84, .07, .74, std(0x111111, .5, .5), 0, .035, 0, .01, safeG));
  const brass = std(0xc9a14a, .28, 1);
  const safeDial = group(-.08, .72, .375, 0, safeG);
  { const d = cyl(.085, .085, .03, brass, 0, 0, 0, 40, safeDial); d.rotation.x = Math.PI / 2;
    const tc = cv(128), tx2 = tc.getContext('2d'); tx2.fillStyle = '#d8b25a'; tx2.beginPath(); tx2.arc(64, 64, 64, 0, TAU); tx2.fill(); tx2.fillStyle = '#2a1e08'; for (let i = 0; i < 40; i++) { tx2.save(); tx2.translate(64, 64); tx2.rotate(i / 40 * TAU); tx2.fillRect(-1, -60, 2, i % 5 ? 8 : 16); tx2.restore(); }
    const f = new THREE.Mesh(new THREE.CircleGeometry(.084, 40), std(0xffffff, .3, .8, { map: T(tc) })); f.position.z = .016; safeDial.add(f); }
  const handle = group(.17, .58, .38, 0, safeG);
  for (let i = 0; i < 3; i++) { const s = cyl(.012, .012, .2, brass, 0, 0, 0, 8, handle); s.rotation.z = i * TAU / 3; }
  const plateC = cv(256, 64), pc = plateC.getContext('2d'); pc.fillStyle = '#c9a14a'; pc.fillRect(0, 0, 256, 64); pc.fillStyle = '#1c1408'; pc.font = '900 34px "Big Shoulders Display", sans-serif'; pc.textAlign = 'center'; pc.fillText('CLASSIFIED', 128, 44);
  plane(.32, .08, std(0xffffff, .3, .8, { map: T(plateC) }), 0, .95, .372, 0, 0, safeG);
  anchors.safe = new THREE.Vector3(4.3, .75, -11.5);


  /* ===== 壁のブラケット灯・ポスター ===== */
  const wallGlowM = new THREE.MeshBasicMaterial({ map: T(glowSprite('rgba(255,170,90,1)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const cageM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  const bracket = (x, z, side) => {
    const g = group(x, 2.62, z, side > 0 ? Math.PI / 2 : -Math.PI / 2);
    box(.16, .2, .04, std(0x1b1c1e, .5, .6), 0, 0, 0, .01, g);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .14, 16, 1, false, 0, Math.PI), cageM); gl.position.set(0, 0, .02); gl.rotation.y = -Math.PI / 2; g.add(gl);
    for (let i = -1; i <= 1; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.066, .004, 4, 16, Math.PI), std(0x111111, .5, .6)); r.position.set(0, i * .05, .02); r.rotation.x = Math.PI / 2; g.add(r); }
    const gw = plane(1.5, 1.5, wallGlowM, 0, -.05, .025, 0, 0, g);
  };
  [[-4.97, -1.6, 1], [-4.97, -7.4, 1], [-4.97, -11.2, 1], [4.97, -1.2, -1], [4.97, -6.35, -1], [4.97, -10.5, -1]].forEach(a => bracket(...a));
  const poster = (draw, w, h, x, y, z, ry, rz = 0) => {
    const c = cv(360, 504), px2 = c.getContext('2d'); draw(px2, 360, 504); fbm(px2, 360, 504, [[5, .18], [40, .12]]);
    px2.fillStyle = 'rgba(255,240,210,.06)'; px2.fillRect(0, 0, 360, 504);
    const g = group(x, y, z, ry); g.rotation.z = rz;
    box(w + .05, h + .05, .025, std(0x141210, .5, .3), 0, 0, 0, 0, g);
    plane(w, h, std(0xffffff, .7, 0, { map: T(c) }), 0, 0, .014, 0, 0, g);
  };
  const ttl = (x, t, X, Y, s, col, f = 'Big Shoulders Display', wt = 900, al = 'center') => { x.font = `${wt} ${s}px "${f}", sans-serif`; x.fillStyle = col; x.textAlign = al; x.textBaseline = 'alphabetic'; x.fillText(t, X, Y); };
  poster((x, W, H) => { x.fillStyle = '#e0a332'; x.fillRect(0, 0, W, H); x.fillStyle = '#141210'; x.fillRect(18, 18, W - 36, H - 36); x.fillStyle = '#e0a332';
    ttl(x, 'HANGAR', W / 2, 160, 108, '#e0a332'); ttl(x, 'F.', W / 2, 300, 170, '#e0a332'); x.fillRect(48, 330, W - 96, 4);
    ttl(x, '思いついたら、すぐつくる。', W / 2, 380, 24, '#e8e2d4', 'Zen Kaku Gothic New', 700); ttl(x, 'EST. 2025  ──  SECRET GARAGE', W / 2, 430, 16, '#9a927f', 'JetBrains Mono', 500); }, .62, .87, 2.9, 2.35, -12.45, 0, -.02);
  poster((x, W, H) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H); x.fillStyle = '#b22d22'; x.beginPath(); x.arc(W / 2, 200, 120, 0, TAU); x.fill(); x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(W / 2 - 40, 180, 26, 0, TAU); x.arc(W / 2 + 40, 180, 26, 0, TAU); x.fill(); x.fillStyle = '#141210'; x.beginPath(); x.arc(W / 2 - 40, 184, 12, 0, TAU); x.arc(W / 2 + 40, 184, 12, 0, TAU); x.fill();
    ttl(x, 'PANDA', W / 2, 390, 84, '#141210'); ttl(x, 'POWER!!', W / 2, 452, 58, '#b22d22'); ttl(x, '初号機  2025.04.17', W / 2, 486, 15, '#141210', 'JetBrains Mono', 500); }, .5, .7, -4.96, 2.45, -9.35, Math.PI / 2, .03);
  poster((x, W, H) => { x.fillStyle = '#f0e9da'; x.fillRect(0, 0, W, H); x.strokeStyle = '#141210'; x.lineWidth = 26; x.lineCap = 'round'; x.beginPath(); x.arc(W / 2, 200, 110, .4, TAU - .2); x.stroke();
    ttl(x, '墨詠み', W / 2, 400, 64, '#141210', 'Zen Kaku Gothic New', 700); ttl(x, 'SUMIYOMI', W / 2, 444, 22, '#b22d22', 'JetBrains Mono', 500); x.fillStyle = '#c8301e'; x.fillRect(W - 70, H - 80, 40, 40); }, .48, .67, 4.96, 2.3, -8.35, -Math.PI / 2, -.02);
  poster((x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d3a4a'); g.addColorStop(1, '#e0a332'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = '#0f2430'; x.beginPath(); x.moveTo(0, 330); x.lineTo(110, 210); x.lineTo(190, 290); x.lineTo(280, 180); x.lineTo(W, 300); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.fillStyle = '#f0e9da'; x.beginPath(); x.arc(270, 110, 34, 0, TAU); x.fill(); ttl(x, '笹友キャラバン', W / 2, 410, 40, '#f0e9da', 'Zen Kaku Gothic New', 700); ttl(x, 'SASATOMO CARAVAN', W / 2, 450, 20, '#e0a332', 'JetBrains Mono', 500); }, .48, .67, 4.96, 2.3, -11.3, -Math.PI / 2, .02);

  /* ===== 出口サイン ===== */
  const exC = cv(256, 96), ex = exC.getContext('2d'); ex.fillStyle = '#17a45a'; ex.fillRect(0, 0, 256, 96); ex.fillStyle = '#f4fff6'; ex.font = '900 52px "Big Shoulders Display", sans-serif'; ex.textAlign = 'center'; ex.fillText('EXIT  ⇢', 128, 66);
  const exitM = new THREE.MeshBasicMaterial({ map: T(exC), toneMapped: false, color: new THREE.Color(.55, .55, .55) });
  plane(.5, .19, exitM, -3.9, 3.1, -.13, 0);

  /* ===== 外：路地・自販機・街灯・雨 ===== */
  const asphC = cv(512), ax = asphC.getContext('2d'); ax.fillStyle = '#26272a'; ax.fillRect(0, 0, 512, 512); fbm(ax, 512, 512, [[6, .4], [30, .3], [120, .3]]); speckle(ax, 512, 512, 9000, ['rgba(0,0,0,.4)', 'rgba(200,200,200,.12)']);
  const asphR = cv(256), ar = asphR.getContext('2d'); ar.fillStyle = 'rgb(70,70,70)'; ar.fillRect(0, 0, 256, 256); fbm(ar, 256, 256, [[4, .9], [12, .5]]);
  const asph = plane(44, 10, std(0xffffff, 1, 0, { map: T(asphC, [11, 2.5]), roughnessMap: T(asphR, [4, 1], false) }), 0, -.01, 5, 0, -Math.PI / 2); asph.receiveShadow = true;
  const opp = plane(44, 8, std(0xffffff, .9, 0, { map: T(kc, [22, 8]), bumpMap: T(kb, [22, 8], false), bumpScale: 1.5 }), 0, 4, 8.2, Math.PI);
  // 路地の続き（ガレージ側の建物の外壁と、向かいのスナック）
  const facade = std(0xffffff, .9, 0, { map: T(kc, [7.5, 4]), bumpMap: T(kb, [7.5, 4], false), bumpScale: 1.5 });
  plane(15, 8, facade, 12.5, 4, -.02); plane(15, 8, facade, -12.5, 4, -.02); plane(10, 4.2, facade, 0, 5.9, -.02);
  const barC = neonCanvas('スナック 夜更け', '700 {s}px "Zen Kaku Gothic New", sans-serif', '#5ad1ff', 1024, 200, { stroke: false, size: 120, lw: 3 });
  const barM = new THREE.MeshBasicMaterial({ map: T(barC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
  plane(2.6, .5, barM, 9.2, 2.9, 8.15, Math.PI);
  plane(4.5, 2.2, new THREE.MeshBasicMaterial({ map: T(glowSprite('rgba(90,200,255,1)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(.22, .22, .22) }), 9.2, 2.9, 8.14, Math.PI);
  box(1.0, 2.1, .1, std(0x3a2a20, .6), 9.2, 1.05, 8.15); plane(.9, .03, new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, .7), toneMapped: false }), 9.2, 2.14, 8.09, Math.PI);
  const barL = new THREE.PointLight(0x5ad1ff, 3, 8, 1.6); barL.position.set(9.2, 2.6, 7.4); scene.add(barL);
  // 窓
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.9, .55, .25), toneMapped: false });
  plane(1.1, .8, winM, -2.4, 2.7, 8.18, Math.PI); box(1.2, .06, .1, std(0x222222, .5, .5), -2.4, 2.27, 8.15);
  // 自販機
  const vend = group(2.2, 0, 7.75, Math.PI); pickables.vend = vend;
  shadowy(box(1.0, 1.85, .7, std(0xe9ecef, .35, .3), 0, .925, 0, .03, vend));
  const vC = cv(256, 512), vx = vC.getContext('2d');
  vx.fillStyle = '#f2f6ff'; vx.fillRect(0, 0, 256, 512); vx.fillStyle = '#1d3f8a'; vx.fillRect(0, 0, 256, 70); vx.fillStyle = '#fff'; vx.font = '900 34px "Big Shoulders Display", sans-serif'; vx.textAlign = 'center'; vx.fillText('PANDA COFFEE', 128, 46);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const X = 16 + c * 46, Y = 90 + r * 96; vx.fillStyle = pick(['#c8301e', '#1d3f8a', '#e0a020', '#2a7a4a', '#5a2a1a', '#e8e2d4', '#111']); vx.fillRect(X, Y, 36, 62); vx.fillStyle = 'rgba(255,255,255,.35)'; vx.fillRect(X + 4, Y + 4, 6, 54); vx.fillStyle = '#222'; vx.font = '600 11px "JetBrains Mono", monospace'; vx.fillText('¥130', X + 18, Y + 78); vx.fillStyle = c % 2 ? '#30d060' : '#ff4040'; vx.fillRect(X + 13, Y + 82, 10, 5); }
  vx.fillStyle = '#20232a'; vx.fillRect(0, 392, 256, 120); vx.fillStyle = '#0a0b0e'; vx.fillRect(30, 430, 196, 60);
  plane(.86, 1.7, new THREE.MeshBasicMaterial({ map: T(vC), toneMapped: false, color: new THREE.Color(1.2, 1.25, 1.4) }), 0, 1.0, .352, 0, 0, vend);
  const vendL = new THREE.PointLight(0xdce9ff, 0, 14, 1.4); vendL.position.set(2.2, 1.2, 6.9); scene.add(vendL);
  const vendGlow = plane(4, 4, new THREE.MeshBasicMaterial({ map: T(glowSprite('rgba(200,225,255,1)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(.5, .5, .5) }), 2.2, 1.1, 7.35, Math.PI);
  // 街灯
  const lampPost = group(-3.8, 0, 7.6);
  shadowy(cyl(.06, .08, 4.4, std(0x3a3d42, .5, .6), 0, 2.2, 0, 12, lampPost));
  box(.9, .06, .06, std(0x3a3d42, .5, .6), .4, 4.35, 0, 0, lampPost);
  const slHead = box(.36, .1, .22, std(0x222428, .4, .6), .82, 4.3, 0, .02, lampPost);
  const slBulb = plane(.3, .16, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8), toneMapped: false }), .82, 4.245, 0, 0, Math.PI / 2, lampPost);
  const street = new THREE.SpotLight(0xc9dcff, 0, 12, .75, .6, 1.4); street.position.set(-2.98, 4.2, 7.6); street.target.position.set(-2.6, 0, 6.6); scene.add(street, street.target);
  const stCone = mkCone(2.0, 4.1, 0x9fbfff, new THREE.Vector3(-2.98, 4.2 - 2.05, 7.6)); stCone.material.uniforms.uI.value = .22;
  // 雨
  const RN = LOW ? 300 : 700, rainPos = new Float32Array(RN * 6), rainV = [];
  for (let i = 0; i < RN; i++) { const x = rr(-6, 6), y = rr(0, 6), z = i < RN * .3 ? rr(1.3, 3) : rr(1.3, 9); rainV.push([x, y, z, rr(7, 10)]); }
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xc9b8a2, transparent: true, opacity: .22, depthWrite: false })); scene.add(rain);
  await step(.86, '路地');

  /* ===== ほこり ===== */
  const DN = LOW ? 260 : 700, dP = new Float32Array(DN * 3), dS = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dP[i * 3] = rr(-4.8, 4.8); dP[i * 3 + 1] = rr(.1, 3.5); dP[i * 3 + 2] = rr(-12, 1); dS[i] = rnd(); }
  const dG = new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dP, 3)); dG.setAttribute('seed', new THREE.BufferAttribute(dS, 1));
  const dustM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uI: { value: 0 }, uPx: { value: Q.dpr }, uPen: { value: PEN } },
    vertexShader: `attribute float seed;uniform float uT,uPx;uniform vec3 uPen;varying float vA;void main(){vec3 p=position;p.x+=sin(uT*.13+seed*40.)*.25;p.y+=sin(uT*.09+seed*20.)*.2+mod(uT*.02*(seed+.2),1.)*.1;p.z+=cos(uT*.11+seed*30.)*.25;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float d=length(p.xz-uPen.xz);vA=(.25+1.8*smoothstep(1.2,.2,d)*step(p.y,uPen.y))*(.5+.5*sin(uT*1.3+seed*60.));gl_PointSize=uPx*(14.*(.4+seed))/-mv.z;}`,
    fragmentShader: `uniform float uI;varying float vA;void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,r)*vA*uI*.55;gl_FragColor=vec4(vec3(1.,.86,.66)*a,a);}`
  });
  scene.add(new THREE.Points(dG, dustM));

  /* ===== カメラ・ステーション ===== */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ST = {
    hero:      { p: V(0, 1.6, 1.0), t: V(0, 1.38, -9), o: 0, f: 48 },
    concept:   { p: V(1.65, 1.95, -1.15), t: V(.05, .65, -6.4), o: .38, f: 46 },
    pit:       { p: V(-1.35, 1.7, -2.35), t: V(-4.45, 1.25, -4.3), o: .42, f: 46 },
    screening: { p: V(1.55, 1.38, -4.6), t: V(4.45, .82, -7.1), o: -.4, f: 44 },
    crew:      { p: V(-1.5, 1.55, -7.15), t: V(-4.6, 1.25, -9.35), o: .4, f: 44 },
    log:       { p: V(-.3, 1.75, -7.6), t: V(0, 2.25, -12.4), o: -.05, f: 50 },
    cctv:      { p: V(-.85, 2.3, -8.2), t: V(-2.6, 0, -10.9), o: .38, f: 46 },
    parts:     { p: V(1.7, 1.65, -6.7), t: V(4.55, 1.2, -9.35), o: -.4, f: 46 },
    safe:      { p: V(1.25, 1.5, -9.3), t: V(4.3, .72, -11.55), o: -.36, f: 44 },
    radio:     { p: V(1.3, 1.35, -2.4), t: V(4.55, .9, -4.6), o: -.38, f: 46 },
    exit:      { p: V(-2.3, 1.7, -10.2), t: V(.4, 1.25, 4.5), o: 0, f: 46 },
  };
  const camP = ST.hero.p.clone(), camT = ST.hero.t.clone(); let camO = 0, camF = 48;
  const goalP = camP.clone(), goalT = camT.clone(); let goalO = 0, goalF = 48;
  const mouse = new THREE.Vector2(0, 0), mouseS = new THREE.Vector2(0, 0);
  let portrait = false;

  /* ===== 点灯演出 ===== */
  let lightsT0 = -1, lit = 0; const tubeOn = [0, 0, 0], tubeFired = [0, 0, 0]; let neonOn = 0, neonFired = 0, penOn = 0;
  const flickerAt = (k) => { // k: 点灯開始からの秒数 → 0..1
    if (k < 0) return 0; if (k > .9) return 1;
    const pat = [[0, .05, 1], [.05, .16, 0], [.16, .2, .8], [.2, .34, 0], [.34, .37, 1], [.37, .42, .15], [.42, .52, 1], [.52, .55, .3], [.55, .9, 1]];
    for (const [a, b, v] of pat) if (k >= a && k < b) return v; return 1;
  };
  let over = 0, flickT = 0, peekT = 0, sortieT = -1; const sortieFrom = new THREE.Vector3(), V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ===== ブルーム（高画質時） ===== */
  let composer = null, bloomPass = null, gradePass = null;
  if (Q.bloom) {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/addons/EffectComposer.js'), import('three/addons/RenderPass.js'), import('three/addons/UnrealBloomPass.js'), import('three/addons/OutputPass.js')]);
      composer = new EffectComposer(R, new THREE.WebGLRenderTarget(innerWidth * Q.dpr, innerHeight * Q.dpr, { type: THREE.HalfFloatType, samples: Q.tier === 'high' ? 4 : 2 })); composer.setPixelRatio(Q.dpr); composer.setSize(innerWidth, innerHeight);
      composer.addPass(new RenderPass(scene, cam));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .42, .95); composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      const { ShaderPass } = await import('three/addons/ShaderPass.js');
      gradePass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform sampler2D tDiffuse;uniform float uT;uniform vec2 uRes;varying vec2 vUv;
          void main(){vec2 uv=vUv,d=uv-.5;float r=dot(d,d);float ca=.006*r;vec3 c;
          c.r=texture2D(tDiffuse,uv+d*ca).r;c.g=texture2D(tDiffuse,uv).g;c.b=texture2D(tDiffuse,uv-d*ca).b;
          float l=dot(c,vec3(.299,.587,.114));c=mix(c,c*vec3(.9,1.,1.08),(1.-l)*.4);c=mix(c,c*vec3(1.07,1.,.9),l*.3);
          c*=1.-r*1.05;float n=fract(sin(dot(floor(uv*uRes)+fract(uT)*91.,vec2(12.9898,78.233)))*43758.5453);c+=(n-.5)*.04;
          gl_FragColor=vec4(c,1.);}` });
      composer.addPass(gradePass);
    } catch (e) { composer = null; }
  }
  await step(.96, '最終点検');

  function resize() {
    const w = innerWidth, h = innerHeight; R.setSize(w, h, false); if (composer) composer.setSize(w, h);
    cam.aspect = w / h; portrait = cam.aspect < .9; cam.updateProjectionMatrix();
  }
  resize();

  const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3(), ray = new THREE.Raycaster();
  let lastLap = 0, lastTV = 0, time = 0;

  const api = {
    renderer: R, scene, camera: cam, anchors, stations: Object.keys(ST),
    setBlend(a, b, t) {
      const A = ST[a] || ST.hero, B = ST[b] || A; const e = t;
      goalP.lerpVectors(A.p, B.p, e); goalT.lerpVectors(A.t, B.t, e); goalO = lerp(A.o, B.o, e); goalF = lerp(A.f, B.f, e);
      if (A !== B) goalP.y += Math.sin(Math.PI * e) * Math.min(.6, A.p.distanceTo(B.p) * .09); // クレーン撮影のように弧を描いて移動
    },
    setMouse(x, y) { mouse.set(x, y); },
    snap() { camP.copy(goalP); camT.copy(goalT); camO = goalO; camF = goalF; },
    pick(nx, ny) {
      ray.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        const o = h.object, m = o.material;
        if (o.isPoints || o.isLine || o.userData.noPick) continue;
        if (m && !Array.isArray(m) && (m.blending === THREE.AdditiveBlending || m.isShaderMaterial) && !o.userData.pickAlways) continue;
        if (h.distance > 16) return null;
        for (let p = o; p; p = p.parent) for (const k in pickables) if (pickables[k] === p) return k;
        return null;
      }
      return null;
    },
    tvNext() { tvCh++; tvStatic = time + .35; lastTV = 0; },
    neonFlick() { flickT = time + 1.1; },
    carPeek() { peekT = .9; },
    sortie() { sortieT = time; sortieFrom.copy(camP); },
    lightsOn(instant) { if (lightsT0 >= 0) return; lightsT0 = instant ? -100 : time; },
    lightsOff() { lightsT0 = -1; tubeFired.fill(0); neonFired = 0; },
    overdrive(v) { over = v ? 1 : 0; },
    project(name) {
      const a = anchors[name]; if (!a) return null; tmpV.copy(a).project(cam);
      tmpD.copy(a).sub(cam.position); const front = tmpD.dot(cam.getWorldDirection(new THREE.Vector3())) > 0;
      return { x: (tmpV.x * .5 + .5) * innerWidth, y: (-tmpV.y * .5 + .5) * innerHeight, visible: front && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1 };
    },
    setQuality(dpr, bloom) { R.setPixelRatio(dpr); if (composer) { composer.setPixelRatio(dpr); } if (bloom === false) composer = null; dustM.uniforms.uPx.value = dpr; resize(); },
    resize,
    update(dt, playing) {
      time += dt; const t = time;
      // カメラ
      if (sortieT >= 0) { // 出撃：シャッターをくぐって路地へ出て、右へ駆け抜ける
        const e = Math.min(1, (t - sortieT) / 1.5), e1 = sm(0, .55, e), e2 = sm(.45, 1, e) ** 1.6;
        const A = V3(0, 1.25, 5.0), B = V3(10, 1.15, 5.3);
        const p1 = V3().lerpVectors(sortieFrom, A, e1); p1.y += Math.exp(-Math.pow((p1.z + 6.4) / 2.6, 2)) * Math.max(0, 1 - Math.abs(p1.x) / 2.2) * .95;
        goalP.lerpVectors(p1, B, e2);
        const dir = V3(0, 0, 1).lerp(V3(1, -.02, .15), e2).normalize();
        goalT.copy(goalP).addScaledVector(dir, 8); goalO = 0; goalF = lerp(48, 72, e);
        if (bloomPass) bloomPass.strength = .5 + e * e * 2.2;
      }
      const k = sortieT >= 0 ? 1 - Math.pow(.00002, dt) : 1 - Math.pow(.0025, dt);
      mouseS.lerp(mouse, 1 - Math.pow(.02, dt));
      camP.lerp(goalP, k); camT.lerp(goalT, k); camO = lerp(camO, goalO, k); camF = lerp(camF, goalF, k);
      const fwd = tmpD.copy(camT).sub(camP).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, cam.up).normalize();
      cam.position.copy(camP).addScaledVector(right, mouseS.x * .12).add(new THREE.Vector3(0, mouseS.y * .06 + Math.sin(t * .6) * .008, 0));
      if (portrait) cam.position.addScaledVector(fwd, -1.1);
      cam.lookAt(camT.x + mouseS.x * .25, camT.y + mouseS.y * .15, camT.z);
      cam.fov = portrait ? camF + 14 : camF;
      const off = portrait ? 0 : camO; cam.filmOffset = -off * cam.getFilmWidth() * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect;
      cam.updateProjectionMatrix();
      // 懐中電灯
      ray.setFromCamera(mouseS, cam); flash.position.copy(cam.position).addScaledVector(right, .15).add(new THREE.Vector3(0, -.1, 0));
      flash.target.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 6);
      // 点灯
      const L = lightsT0 === -1 ? -1 : (lightsT0 < -50 ? 99 : t - lightsT0);
      tubeZ.forEach((z, i) => { const v = flickerAt(L - .15 - i * .55); if (v > .5 && !tubeFired[i] && L < 50) { tubeFired[i] = 1; Q.onEvent('tube', i); } tubeOn[i] = v; });
      neonOn = L < 0 ? 0 : (L > 50 ? 1 : flickerAt((L - 2.0) * 1.3)); if (neonOn > .5 && !neonFired && L < 50) { neonFired = 1; Q.onEvent('neon'); }
      penOn = L < 0 ? 0 : sm(1.6, 2.3, L);
      lit = L < 0 ? 0 : sm(0, 2.6, L);
      const od = over ? (.6 + .4 * Math.sin(t * 40)) : 1;
      tubeEmis.forEach((m, i) => { m.emissiveIntensity = tubeOn[i] * 1.0 * od; });
      tubeLights[0].intensity = (tubeOn[0] + tubeOn[1]) * 6.5 * od; tubeLights[1].intensity = (tubeOn[1] + tubeOn[2]) * 6.5 * od;
      const nf = neonOn * (.94 + .06 * Math.sin(t * 50) * Math.sin(t * 3.1)) * (over || flickT > t ? (Math.random() > .35 ? 1.3 : .12) : 1);
      nm.color.setScalar(nf * 2.6); haloM.color.setScalar(nf * .45); reflM.color.setRGB(nf * .5, nf * .26, nf * .1); nsm.color.setScalar(nf * 1.8); njm.color.setScalar(nf * 1.9); njHalo.material.color.setScalar(nf * .22);
      neonL.intensity = nf * 3.2;
      pend.intensity = penOn * 9; bulbM.color.setRGB(penOn * 4, penOn * 2.8, penOn * 1.5); penCone.material.uniforms.uI.value = penOn * .26;
      lampL.intensity = penOn * 2.2; lampBulbM.color.setRGB(penOn * 3, penOn * 2, penOn * 1.1);
      const tvOn = lit > .5; tvL.intensity = tvOn ? 1.1 + Math.sin(t * 9) * .25 + (Math.random() - .5) * .3 : 0; tvM.color.setScalar(tvOn ? 1.15 : 0);
      if (t - lastTV > .09) { lastTV = t; drawTV(t, tvOn); }
      if (t - lastLap > .12) { lastLap = t; drawLap(t); }
      dialM.color.setScalar(.15 + penOn * 1.3);
      exitM.color.setScalar(.6 + .1 * Math.sin(t * 2));
      wallGlowM.color.setScalar(penOn * .32); cageM.color.setRGB(penOn * 3, penOn * 1.9, penOn * .9);
      hatchM.color.setScalar(.25 + lit * .9 * (.85 + .15 * Math.sin(t * 2.2))); hatchGlow.material.color.setScalar(.06 + lit * .22);
      dustM.uniforms.uT.value = t; dustM.uniforms.uI.value = .35 + lit * .65;
      flash.intensity = (1 - lit * .55) * 7;
      vendL.intensity = 4.2; street.intensity = 26;
      // 小物
      const now = new Date(Date.now() + 9 * 3600e3); const s = now.getUTCSeconds() + now.getUTCMilliseconds() / 1000, m = now.getUTCMinutes() + s / 60, h = (now.getUTCHours() % 12) + m / 60;
      hS.rotation.z = -s / 60 * TAU; hM.rotation.z = -m / 60 * TAU; hH.rotation.z = -h / 12 * TAU;
      if (playing) vinyl.rotation.y -= dt * 3.5;
      if (over) carG.position.x = .15 + Math.sin(t * 60) * .006; else carG.position.x = .15;
      if (peekT > 0) { peekT = Math.max(0, peekT - dt); const k = peekT / .9; carG.rotation.z = Math.sin(peekT * 26) * .012 * k; carG.scale.y = 1 + Math.sin(peekT * 18) * .025 * k; } else { carG.rotation.z = 0; carG.scale.y = 1; }
      // 雨（外が見えるときだけ動かす）
      const outward = fwd.z > -.2 || cam.position.z > .3;
      rain.visible = outward;
      if (outward) { for (let i = 0; i < RN; i++) { const r = rainV[i]; r[1] -= r[3] * dt; if (r[1] < 0) { r[1] += 6; } const o = i * 6; rainPos[o] = r[0]; rainPos[o + 1] = r[1]; rainPos[o + 2] = r[2]; rainPos[o + 3] = r[0] + .01; rainPos[o + 4] = r[1] + .22; rainPos[o + 5] = r[2] + .02; } rainG.attributes.position.needsUpdate = true; }
      if (bloomPass && sortieT < 0) bloomPass.strength = .5 + over * .5;
      if (gradePass) { gradePass.uniforms.uT.value = t; gradePass.uniforms.uRes.value.set(innerWidth, innerHeight); }
      if (composer) composer.render(); else R.render(scene, cam);
    },
    lightsLevel: () => lit,
  };
  api.setBlend('hero', 'hero', 0);
  camP.copy(goalP); camT.copy(goalT);
  Q.onProgress(1, '完了');
  return api;
}
