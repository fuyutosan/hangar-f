/* HANGAR F. 園 ── ジオラマ（three.js）
   works.json の鏡写し。正本はHTMLのガイドで、ここは「見て触れる模型」。
   黒くしない：空はCSSのグラデ（canvasは透過）、霧＝地平線の色、光は半球光＋平行光1灯、灯りは自発光。 */
import * as THREE from 'three';
import { lawnTex, pavingTex, strataTex, signTex, glowTex, cv, tex, rr } from './dio-tex.js';
import { building, construction, gateHangar, radioTower, tree, pixelSprite, mats, blob, applySeason, celebration, treeTops } from './dio-build.js';

const D2R = Math.PI / 180;
const QUAD = { play: [-1, 1], ask: [1, 1], learn: [-1, -1], rest: [1, -1] }; // 手前左・手前右・奥左・奥右
const STEP = 4.8, FIRST = 4.7;   // 区画の間隔と、広場からいちばん近い区画までの距離
/* 島は作品数に合わせて育つ：1区画に R×R 棟。いちばん多い区画が埋まったら R を1つ増やし、島を一回り広げる */
function layout(works) {
  const n = {}; for (const w of works) if (w.land in QUAD && w.kind !== 'tower') n[w.land] = (n[w.land] || 0) + 1;
  const R = Math.max(3, Math.ceil(Math.sqrt(Math.max(0, ...Object.values(n)))));
  const plots = [];
  for (let i = 0; i < R; i++) for (let j = 0; j < R; j++) plots.push([i, j]);
  plots.sort((a, b) => Math.max(...a) - Math.max(...b) || (a[0] + a[1]) - (b[0] + b[1]) || a[1] - b[1]); // 中心に近い順＝園は外へ増築される
  return { R, plots, HALF: FIRST + (R - 1) * STEP + 3.7 };
}

/* 時間帯ごとの色。sky は CSS のグラデ（上→地平線）、fog＝地平線 */
const PALETTES = {
  day:   { sky: ['#8fc4ee', '#dcecf6'], fog: '#d6e8f3', hs: '#eaf6ff', hg: '#7d9a5c', hi: 1.55, sun: '#fff1d6', si: 2.1, sp: [12, 22, 16], win: 0, glow: .18, exp: 1.05 },
  dusk:  { sky: ['#5b5a8f', '#f0a979'], fog: '#e6a07c', hs: '#ffd2b0', hg: '#5d4a66', hi: 1.25, sun: '#ffa060', si: 1.7, sp: [-16, 9, 10], win: .75, glow: .7, exp: 1.12 },
  // 夜も紺どまりで明るく（暗い画面は見にくい＝シロタ）。窓と誘導灯の光で夜らしさを出す
  night: { sky: ['#34488a', '#8ea3d6'], fog: '#7f94c8', hs: '#c4d2f4', hg: '#4a5e6c', hi: 1.6, sun: '#d2dcff', si: 1.15, sp: [-10, 18, 6], win: 1, glow: .9, exp: 1.22 },
};
export function phaseOf(d = new Date()) { const h = d.getHours() + d.getMinutes() / 60; return h >= 6.5 && h < 16.5 ? 'day' : (h >= 16.5 && h < 18.8) || (h >= 5 && h < 6.5) ? 'dusk' : 'night'; }

export async function createDiorama(canvas, opt) {
  const { data, onSelect = () => {}, onSlow = () => {}, reduced = false, pinsEl = null } = opt;
  const { plots: PLOTS, HALF } = layout(data.works);
  treeTops.length = 0; // 作り直したときに、前の模型の木を季節替えの対象に残さない
  const plotPos = (land, k) => { const [sx, sz] = QUAD[land], [i, j] = PLOTS[k]; return [sx * (FIRST + i * STEP), sz * (FIRST + j * STEP)]; };
  const dprCap = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dprCap);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 10, 1000);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.Fog(0xd6e8f3, 200, 600);

  /* ---------- 島（台座つきの模型） ---------- */
  const strata = new THREE.MeshStandardMaterial({ map: strataTex(), roughness: .95 });
  const lawn = new THREE.MeshStandardMaterial({ map: lawnTex(), roughness: .95 });
  const under = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 1 });
  const island = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 3, HALF * 2), [strata, strata, lawn, under, strata, strata]);
  island.position.y = -1.5; scene.add(island);
  const paveMat = new THREE.MeshStandardMaterial({ map: pavingTex(), roughness: .9 });
  const flat = (w, d, mat, x, z, y = .015) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m; };
  flat(2.8, HALF * 2, paveMat, 0, 0);                       // 南北の誘導路
  flat(HALF * 2, 2.8, paveMat, 0, 0, .016);                 // 東西の誘導路
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.3, 40), paveMat); plaza.rotation.x = -Math.PI / 2; plaza.position.y = .02; scene.add(plaza);
  // 誘導路の中心線（黄色の破線）
  const dash = new THREE.MeshBasicMaterial({ color: 0xf2c230, toneMapped: false });
  for (let t = -HALF + 1; t < HALF - 1; t += 1.6) { if (Math.abs(t) < 4.6) continue; flat(.12, .7, dash, 0, t, .03); flat(.7, .12, dash, t, 0, .031); }

  /* 区画：地面の色むら＋地面に描いた区画名（遠くからでも読める） */
  for (const land of data.lands) {
    const [sx, sz] = QUAD[land.id];
    const tint = new THREE.MeshBasicMaterial({ color: new THREE.Color(land.color), transparent: true, opacity: .1, depthWrite: false });
    flat(HALF - 1.8, HALF - 1.8, tint, sx * (HALF / 2 + .7), sz * (HALF / 2 + .7), .012);
    const c = cv(512, 128), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.92)'; x.textBaseline = 'middle';
    x.font = '900 86px "Zen Kaku Gothic New", sans-serif'; x.fillText(land.name, 8, 66);
    const w = x.measureText(land.name).width; x.fillStyle = land.color; x.font = '900 54px "Big Shoulders Display", sans-serif'; x.fillText(land.en, w + 28, 72);
    const lab = flat(7, 1.75, new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, toneMapped: false }), sx * 9.6, sz * (HALF - 1.4), .04);
  }

  /* 誘導灯（点の集まり＝描画1回）。夜に強く光る */
  const lightPts = [];
  for (let t = -HALF + .8; t <= HALF - .8; t += 1.2) { if (Math.abs(t) < 4.8) continue; lightPts.push(-1.55, .08, t, 1.55, .08, t, t, .08, -1.55, t, .08, 1.55); }
  for (let a = 0; a < 36; a++) lightPts.push(Math.cos(a / 36 * Math.PI * 2) * 4.45, .08, Math.sin(a / 36 * Math.PI * 2) * 4.45);
  const ptsGeo = new THREE.BufferGeometry(); ptsGeo.setAttribute('position', new THREE.Float32BufferAttribute(lightPts, 3));
  const ptsMat = new THREE.PointsMaterial({ map: glowTex('120,190,255'), size: .9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
  scene.add(new THREE.Points(ptsGeo, ptsMat));

  /* ---------- 建物 ---------- */
  const now = opt.now || new Date();
  const byLand = {}; const items = [];
  // 主力は区画のいちばん広場寄りに大きく建てる。それ以外は公開日順（新作ほど外側へ）
  const sorted = [...data.works].filter(w => w.land in QUAD && w.kind !== 'tower').sort((a, b) => (!!b.flagship - !!a.flagship) || a.date.localeCompare(b.date));
  for (const w of sorted) {
    const k = (byLand[w.land] = (byLand[w.land] ?? -1) + 1);
    const [x, z] = plotPos(w.land, k);
    const fresh = w.fresh ?? (now - new Date(w.date + 'T00:00:00+09:00')) / 864e5 < 7;
    // 主力は1.15倍。大きくした分だけ区画の外側へずらし、中央の工事現場・広場・隣の区画に当てない
    const S = w.flagship ? 1.15 : 1, push = w.flagship ? 1.05 : 0, [qx, qz] = QUAD[w.land];
    const g = building(w, fresh); g.position.set(x + qx * push, 0, z + qz * push * .7); g.scale.setScalar(S); g.userData.s = S; g.userData.h *= S; scene.add(g);
    items.push({ w, g, base: g.position.clone() });
  }
  const towerW = data.works.find(w => w.kind === 'tower');
  if (towerW) { const t = radioTower(towerW); t.position.set(0, 0, -(HALF - 1.9)); scene.add(t); items.push({ w: towerW, g: t, base: t.position.clone() }); }
  const gate = gateHangar(); gate.position.set(0, 0, HALF - 2.4); scene.add(gate);
  const nextNo = data.nextNo || 'F-' + String(data.works.filter(w => !w.facility).length + 1).padStart(2, '0');
  const site = construction(data.construction, nextNo); scene.add(site.g);

  /* 空いている区画と島の縁に木 */
  for (const land of Object.keys(QUAD)) for (let k = (byLand[land] ?? -1) + 1; k < PLOTS.length; k++) {
    const [x, z] = plotPos(land, k);
    for (let i = 0; i < 3; i++) tree(x + rr(-1.4, 1.4), z + rr(-1.2, 1.2), rr(.8, 1.25), scene);
  }
  for (let t = -HALF + 1; t < HALF; t += rr(1.6, 2.6)) {
    if (Math.abs(t) > 2.5) { tree(t, -HALF + .8, rr(.7, 1.1), scene); tree(-HALF + .8, t, rr(.7, 1.1), scene); tree(HALF - .8, t, rr(.7, 1.1), scene); }
  }

  /* 季節と節目（日付から app.js が決めて渡す。定期作業なしで、毎日すこしずつ変わる） */
  const season = opt.season || { kind: 'green', p: 0 };
  applySeason(season.kind, season.p);
  let snow = null;
  if (season.kind === 'winter') {
    const pos = []; for (let i = 0; i < 320; i++) pos.push(rr(-HALF, HALF), rr(0, 14), rr(-HALF, HALF));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: glowTex('255,255,255'), size: .35, transparent: true, depthWrite: false, toneMapped: false }));
    scene.add(snow);
  }
  if (opt.celebrate) { const c = celebration(opt.celebrate, data.lands.map(l => l.color).concat('#ffc531')); c.position.set(0, 0, HALF - 5.6); scene.add(c); }

  /* ドット絵のキャスト（その場の2コマだけ。画面を横切らない） */
  const PX = (opt.base || '') + 'assets/px/';
  const cast = [];
  const put = (a, b, x, z, unit) => { const s = pixelSprite(PX + a, b && PX + b, unit); s.position.set(x, 0, z); scene.add(s); cast.push(s); return s; };
  put('marshaller_green_A.png', 'marshaller_green_B.png', 1.9, HALF - 5.4);
  put('marshaller_blue_A.png', 'marshaller_blue_B.png', -2.0, 5.2);
  put('marshaller_red_A.png', 'marshaller_red_B.png', 5.2, -2.0);
  put('welder_a.png', 'welder_b.png', -2.2, 2.6);
  put('mech_a.png', 'mech_b.png', 2.4, 2.9);
  put('forklift_a.png', 'forklift_b.png', 3.6, .3, .034);
  put('crate_a.png', null, -3.0, -2.6, .034); put('barrel.png', null, -2.4, -3.0, .034);
  put('plane_long.png', null, HALF - 3.2, 0, .05);  // 東の誘導路の端に駐機

  /* ---------- カメラ ---------- */
  // 縦長の画面（スマホ）は少し真上寄りから見て、島を縦にも大きく見せる
  let tall = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight) < .8;
  const home = { tx: 0, ty: 0, tz: tall ? 1.5 : .5, az: 0, el: tall ? 52 : 40, zoom: 1, sx: 0 };
  const cur = { ...home }, goal = { ...home };
  let fitDist = 200, W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.fov = W / H < .8 ? 26 : 22; camera.updateProjectionMatrix();
    const hf = 2 * Math.atan(Math.tan(camera.fov * D2R / 2) * camera.aspect);
    const needW = (HALF + 1.5) / Math.tan(hf / 2);                 // 横が収まる距離
    const needH = (HALF * 1.25) / Math.tan(camera.fov * D2R / 2);  // 縦（奥行き＋高さ）が収まる距離
    fitDist = Math.max(needW, needH) * (W / H < .8 ? .92 : 1);
    camera.near = fitDist * .2; camera.far = fitDist * 3; camera.updateProjectionMatrix();
    scene.fog.near = fitDist * 1.05; scene.fog.far = fitDist * 1.9;
    // 回転・窓の大きさ変更：縦長かどうかが変わったら見下ろし方を付け替え、入口のずらしも合わせる
    const nt = W / H < .8;
    if (nt !== tall) { tall = nt; home.el = tall ? 52 : 40; home.tz = tall ? 1.5 : .5; if (!selId && goal.zoom === 1) Object.assign(goal, { el: home.el, tz: home.tz }); }
    heroShift();
  }
  function placeCamera() {
    const d = fitDist * cur.zoom, el = cur.el * D2R, az = cur.az * D2R;
    camera.position.set(cur.tx + d * Math.cos(el) * Math.sin(az), cur.ty + d * Math.sin(el), cur.tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(cur.tx, cur.ty, cur.tz);
    // 横長の入口では案内カードが左下に乗るので、模型を右へずらして見せる
    if (Math.abs(cur.sx) > .002) camera.setViewOffset(W, H, -cur.sx * W, 0, W, H); else if (camera.view?.enabled) camera.clearViewOffset();
  }

  /* ---------- 時間帯 ---------- */
  let phase = '';
  function setPhase(p) {
    phase = p; const P = PALETTES[p];
    canvas.parentElement?.style.setProperty('--sky-top', P.sky[0]); canvas.parentElement?.style.setProperty('--sky-bot', P.sky[1]);
    scene.fog.color.set(P.fog); hemi.color.set(P.hs); hemi.groundColor.set(P.hg); hemi.intensity = P.hi;
    sun.color.set(P.sun); sun.intensity = P.si; sun.position.set(...P.sp);
    renderer.toneMappingExposure = P.exp;
    for (const m of mats.windows) m.emissiveIntensity = P.win * (m.userData.k ?? 1);
    for (const m of mats.glows) m.opacity = P.glow;
    ptsMat.opacity = .35 + P.glow * .65; ptsMat.size = .6 + P.glow * .5;
    site.beam.material.opacity = Math.max(.45, P.glow);
  }
  setPhase(opt.phase || phaseOf(now));

  /* ---------- 操作（タップ＝選ぶ／ドラッグ＝少し回す／2本指・ホイール＝寄る引く） ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hits = () => items.filter(it => it.g.visible).map(it => it.g.userData.hit);
  const ptrs = new Map(); let downAt = null, dragged = false, pinch0 = 0, zoom0 = 1;
  const clampZ = z => Math.min(1.15, Math.max(.28, z));
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now(), az: goal.az, el: goal.el }; dragged = false; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = goal.zoom; dragged = true; }
  });
  canvas.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) goal.zoom = clampZ(zoom0 * pinch0 / d); return; }
    if (!downAt) return;
    const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
    if (!dragged && Math.hypot(dx, dy) > 9) dragged = true;
    if (dragged) { goal.az = Math.max(-35, Math.min(35, downAt.az - dx * .18)); goal.el = Math.max(24, Math.min(62, downAt.el + dy * .12)); }
  });
  const up = e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0 && downAt && !dragged && performance.now() - downAt.t < 600) {
      const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(hits(), false)[0];
      onSelect(h ? h.object.userData.id : null, 'tap');
    }
    if (ptrs.size === 0) downAt = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); goal.zoom = clampZ(goal.zoom * (e.deltaY > 0 ? 1.1 : .9)); }, { passive: false });

  /* 入口では模型をゆっくり左右に揺らす（動きを減らす設定では止めたまま） */
  let idle = false, heroOn = false;
  function heroShift() { goal.sx = heroOn && W / H > 1.2 ? .2 : 0; if (reduced) cur.sx = goal.sx; }
  function setIdle(on) { idle = on && !reduced; heroOn = on; if (!on) goal.az = 0; heroShift(); }
  /* 区画を選んだら、その区画の真ん中へ寄る */
  function focusLand(land) {
    if (!land || !QUAD[land]) { Object.assign(goal, { tx: home.tx, ty: home.ty, tz: home.tz, zoom: 1, el: home.el }); return; }
    const [sx, sz] = QUAD[land];
    Object.assign(goal, { tx: sx * HALF * .48, ty: 0, tz: sz * HALF * .48 + 1, zoom: .55, el: 42 });
    if (reduced) Object.assign(cur, goal);
  }
  function select(id) {
    selId = id; for (const { b } of pins) b.classList.toggle('on', b.dataset.id === id);
    const it = items.find(i => i.w.id === id);
    if (!it) { Object.assign(goal, { tx: home.tx, ty: home.ty, tz: home.tz, zoom: 1, el: home.el }); return; }
    const p = it.g.position;
    Object.assign(goal, { tx: p.x, ty: it.g.userData.h * .35, tz: p.z + .6, zoom: .3, el: 30 });
    if (reduced) Object.assign(cur, goal);
  }

  /* ---------- 歴史：その日までに建っていた建物だけを見せる ---------- */
  const pops = new Map();
  function setDate(t) {
    for (const it of items) {
      const was = it.g.visible, on = new Date(it.w.date + 'T00:00:00+09:00') <= t;
      it.g.visible = on;
      if (on && !was && !reduced) { const S = it.g.userData.s || 1; it.g.scale.set(S, .01, S); pops.set(it.g, 0); }
    }
  }

  /* ---------- 名札（DOMのピン。aria-hidden。読み上げはガイドが受ける） ---------- */
  const pins = [];
  if (pinsEl) for (const it of items) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pin'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
    b.dataset.id = it.w.id; if (it.w.flagship) b.classList.add('star'); b.style.setProperty('--c', it.w.color);
    b.innerHTML = `<i>${it.w.icon || '●'}</i><span>${it.w.name}</span>`;
    b.addEventListener('click', () => onSelect(it.w.id, 'pin'));
    pinsEl.appendChild(b); pins.push({ b, it });
  }
  const v = new THREE.Vector3();
  let selId = null;
  function placePins() {
    pinsEl?.classList.toggle('near', cur.zoom < .62);
    for (const { b, it } of pins) {
      if (!it.g.visible) { b.style.display = 'none'; continue; }
      v.set(it.g.position.x, it.g.userData.h + .5, it.g.position.z).project(camera);
      if (v.z > 1) { b.style.display = 'none'; continue; }
      b.style.display = ''; b.style.transform = `translate(${(v.x * .5 + .5) * W}px,${(-v.y * .5 + .5) * H}px)`;
    }
  }

  /* ---------- 描画ループ（持ち主＝この関数。dispose で止める） ---------- */
  let raf = 0, last = performance.now(), running = true, frames = 0, acc = 0, stage = 0, t0 = last, castT = 0;
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function frame(nowT) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.1, (nowT - last) / 1000); last = nowT;
    if (!running) return;
    if (idle) goal.az = Math.sin(nowT / 9000) * 14;
    for (const k of ['tx', 'ty', 'tz', 'az', 'el', 'zoom', 'sx']) cur[k] = damp(cur[k], goal[k], idle ? 1.2 : 4.2, dt);
    placeCamera();
    if (!reduced) {
      site.jib.rotation.y += dt * .12;
      site.beam.material.rotation += dt * 3;
      site.beaconMat.emissiveIntensity = 1.2 + Math.sin(nowT / 160) * .6;
    }
    if (snow && !reduced) { const a = snow.geometry.attributes.position; for (let i = 1; i < a.array.length; i += 3) { a.array[i] -= dt * 1.1; if (a.array[i] < 0) a.array[i] = 14; } a.needsUpdate = true; }
    castT += dt; if (castT > .45) { castT = 0; for (const s of cast) { const u = s.userData; if (u.tB) { u.f ^= 1; s.material.map = u.f ? u.tB : u.tA; } } }
    for (const [g, p] of pops) { const q = Math.min(1, p + dt * 2.2); pops.set(g, q); g.scale.y = (.01 + (1 - Math.pow(1 - q, 3)) * .99) * (g.userData.s || 1); if (q >= 1) pops.delete(g); }
    renderer.render(scene, camera);
    placePins();
    // 性能の見張り：最初の2秒の平均が33msを超えたら倍率を下げ、それでも重ければガイドへ
    if (stage < 2) {
      frames++; acc += dt;
      if (nowT - t0 > 2000) {
        const avg = acc / frames * 1000;
        if (avg > 33 && stage === 0) { renderer.setPixelRatio(1); stage = 1; } else if (avg > 40 && stage === 1) { stage = 2; slowFired = true; onSlow(avg); } else stage = 2;
        frames = 0; acc = 0; t0 = nowT; lastAvg = avg;
      }
    }
  }
  let lastAvg = 0, paused = false, slowFired = false;
  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas);
  resize(); placeCamera();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
  const vis = () => { running = !paused && !document.hidden; last = t0 = performance.now(); frames = 0; acc = 0; };
  document.addEventListener('visibilitychange', vis);

  return {
    select, setDate, setPhase, resize, setIdle, focusLand, get slow() { return slowFired; },
    pause() { paused = true; running = false; },
    resume() { paused = false; running = !document.hidden; last = t0 = performance.now(); frames = 0; acc = 0; },
    // 園に入るたびに見張り直す（入口で一度測っただけで終わらせない）
    watch() { if (stage === 2 && !slowFired) stage = renderer.getPixelRatio() < dprCap ? 1 : 0; frames = 0; acc = 0; t0 = performance.now(); },
    stats: () => ({ avgMs: lastAvg, dpr: renderer.getPixelRatio(), calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
    sync() { Object.assign(cur, goal); placeCamera(); renderer.render(scene, camera); placePins(); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); renderer.dispose(); },
  };
}
