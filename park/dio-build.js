/* HANGAR F. 園 ── 建物の手続き造形
   作品の種類（kind）ごとに形を変える。色は区画色、看板と画面は works.json から。
   どの建物も「中心が原点・正面が +z」で作り、置く側で回す。 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { signTex, windowsTex, stripeTex, canvasClothTex, hazardTex, blobTex, glowTex, pixelTex, latticeTex, rr, rnd } from './dio-tex.js';

const TAU = Math.PI * 2;
const C = c => new THREE.Color(c);
export const mats = {}; // 夜の切替で emissiveIntensity をまとめて動かすため、窓の素材をここに集める
mats.windows = [];
mats.glows = [];

const std = (color, rough = .75, metal = 0, ext = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(color), roughness: rough, metalness: metal }, ext));
const basic = (map, ext = {}) => new THREE.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, ext));

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
function box(w, h, d, mat, x, y, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent); }
function rbox(w, h, d, r, mat, x, y, z, parent) { return mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, parent); }
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 20) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent); }

/* 接地の影（影マップの代わり） */
let BLOB = null;
export function blob(w, d, parent) {
  BLOB ??= new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, toneMapped: false });
  const m = mesh(new THREE.PlaneGeometry(w, d), BLOB, 0, .02, 0, parent); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; return m;
}

/* 光のにじみ（加算の板）。夜だけ強くなる */
export function glow(col, size, parent, x = 0, y = 0, z = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .0 }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); mats.glows.push(s.material); return s;
}

/* 看板（両面に見える板） */
function sign(text, sub, accent, w, parent, x, y, z) {
  const t = signTex(text, { sub, accent });
  const m = mesh(new THREE.PlaneGeometry(w, w * 160 / 512), basic(t, { transparent: true }), x, y, z, parent);
  return m;
}

/* 作品の実画面（shot）を貼った板。読み込みに失敗しても区画色の画面のまま */
const loader = new THREE.TextureLoader();
function screen(src, w, h, accent, parent, x, y, z) {
  const mat = new THREE.MeshBasicMaterial({ color: C(accent).multiplyScalar(.35), toneMapped: false });
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
  if (src) loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
  // 縁取り
  const f = box(w + .14, h + .14, .06, std('#20242e', .5, .3), x, y, z - .05, parent);
  return m;
}

function windowsOn(mat) { mats.windows.push(mat); return mat; }

/* ---------- 種類ごとの建物 ---------- */
const builders = {
  /* ゲーム：丸屋根のアーケード＋旗 */
  game(w, g) {
    const body = std('#f4efe4', .8);
    box(3.2, 1.8, 2.6, body, 0, .9, 0, g);
    const stripe = std('#ffffff', .6, 0, { map: stripeTex(w.color, '#fff6e6', 10) });
    const band = cyl(1.62, 1.62, .35, stripe, 0, 1.9, 0, g, 28); band.scale.z = .82;
    const dome = mesh(new THREE.SphereGeometry(1.6, 28, 14, 0, TAU, 0, Math.PI / 2), std(w.color, .45, .1), 0, 2.05, 0, g); dome.scale.z = .82;
    cyl(.05, .05, 1.1, std('#d9d2c4', .4, .6), 0, 3.9, 0, g);
    const flag = box(.5, .3, .02, std(w.color, .6), .26, 4.3, 0, g);
    sign(w.name, 'PLAY', w.color, 2.6, g, 0, 1.45, 1.32);
    screen(w.shot, 1.5, .94, w.color, g, 0, .62, 1.33);
    return { h: 4.5, foot: [3.4, 2.8], flag };
  },
  /* アプリ：スマホの画面がそのまま光る塔（縦の画面に -m の実画面） */
  app(w, g) {
    const wall = std('#eef1f6', .55, .05);
    rbox(2.2, 4.2, 1.6, .16, wall, 0, 2.1, 0, g);
    const win = windowsOn(std('#cfd6e2', .3, .2, { emissive: C('#ffcf8c'), emissiveMap: windowsTex(3, 6, .6), emissiveIntensity: 0 }));
    box(.02, 3.6, 1.2, win, 1.11, 2.1, 0, g); box(.02, 3.6, 1.2, win, -1.11, 2.1, 0, g);
    const rim = rbox(1.5, 3.05, .12, .1, std('#1d2230', .4, .2), 0, 2.15, .82, g);
    screen(w.shotM || w.shot, 1.3, 2.82, w.color, g, 0, 2.15, .9);
    box(2.3, .14, 1.7, std(w.color, .5), 0, 4.25, 0, g);
    sign(w.name, 'APP', w.color, 2.2, g, 0, .5, .82);
    return { h: 4.4, foot: [2.4, 1.8] };
  },
  /* 学ぶ：柱のある図書館（破風屋根） */
  learn(w, g) {
    const stone = std('#efe6d4', .85);
    box(3.4, .3, 2.6, std('#d8ccb4', .9), 0, .15, 0, g);
    box(3.0, 1.9, 2.0, stone, 0, 1.25, -.2, g);
    for (let i = 0; i < 4; i++) cyl(.12, .14, 1.9, stone, -1.2 + i * .8, 1.25, 1.0, g, 12);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.4, 3, 1), std(w.color, .6));
    roof.rotation.z = Math.PI / 2; roof.rotation.y = 0; roof.scale.set(1, 1, .62); roof.position.set(0, 2.52, -.05);
    roof.rotation.x = Math.PI; g.add(roof);
    const win = windowsOn(std('#d7cbb0', .5, 0, { emissive: C('#ffd59a'), emissiveMap: windowsTex(4, 2, .8), emissiveIntensity: 0 }));
    box(2.6, 1.2, .02, win, 0, 1.3, .81, g);
    sign(w.name, w.en || 'LEARN', w.color, 2.6, g, 0, 2.5, 1.12);
    if (w.shot) screen(w.shot, 1.2, .75, w.color, g, 0, 1.18, .84);
    return { h: 3.4, foot: [3.6, 2.8] };
  },
  /* 頼む：縞のひさしのお店＋ショーウィンドウ */
  ask(w, g) {
    box(3.2, 2.3, 2.4, std('#f6efe3', .85), 0, 1.15, 0, g);
    box(3.3, .25, 2.5, std(w.color, .6), 0, 2.42, 0, g);
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.1, .9), std('#fff', .7, 0, { map: stripeTex(w.color, '#fffaf0', 12), side: THREE.DoubleSide }));
    aw.position.set(0, 1.85, 1.55); aw.rotation.x = -Math.PI / 3.2; g.add(aw);
    const win = windowsOn(std('#e7dcc6', .4, 0, { emissive: C('#ffe0a8'), emissiveMap: windowsTex(2, 1, 1), emissiveIntensity: 0 }));
    box(2.8, 1.1, .02, win, 0, .85, 1.21, g);
    if (w.shot) screen(w.shot, 1.5, .94, w.color, g, -.45, .9, 1.25);
    sign(w.name, 'ASK', w.color, 2.6, g, 0, 2.95, .9);
    return { h: 3.3, foot: [3.4, 2.6] };
  },
  /* 発信：note＝書斎、YouTube＝映写館（電球の縁取り） */
  media(w, g) {
    if (w.id === 'youtube') {
      box(3.4, 2.4, 2.4, std('#2a2f3c', .6), 0, 1.2, 0, g);
      screen(w.thumb || w.shot, 2.6, 1.46, w.color, g, 0, 1.35, 1.24);
      const bulb = std('#fff2cc', .3, 0, { emissive: C('#ffd27a'), emissiveIntensity: .4 }); windowsOn(bulb);
      for (let i = 0; i < 12; i++) cyl(.06, .06, .06, bulb, -1.55 + i * .282, 2.3, 1.22, g, 6).rotation.x = Math.PI / 2;
      sign('映写館', 'YOUTUBE', w.color, 2.6, g, 0, 2.85, 1.0);
      return { h: 3.3, foot: [3.6, 2.6] };
    }
    return builders.learn(Object.assign({}, w, { en: 'NOTE' }), g);
  },
};

/* 建物1棟（足場・NEW旗つき）。返り値は group と当たり判定 */
export function building(w, scaffold) {
  const g = new THREE.Group(); g.name = w.id;
  const kind = builders[w.kind] ? w.kind : 'ask';
  const info = builders[kind](w, g);
  blob(info.foot[0] * 1.5, info.foot[1] * 1.6, g);
  if (scaffold) addScaffold(g, info);
  if (w.flagship) addFlagship(g, info, w.color);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(info.foot[0] + .8, info.h + .6, info.foot[1] + .8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = (info.h + .6) / 2; hit.userData.id = w.id; g.add(hit);
  g.userData = { id: w.id, h: info.h, hit, flag: info.flag };
  return g;
}

/* 足場：公開7日以内の建物を囲む細い管＋黄黒の幕＋NEW旗 */
function addScaffold(g, info) {
  const pipe = std('#c9ced6', .35, .7), [fw, fd] = info.foot, H = info.h * .9;
  const W = fw + .4, D = fd + .4, s = new THREE.Group();
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) cyl(.035, .035, H, pipe, x, H / 2, z, s, 6);
  for (let y = .9; y < H; y += .9) {
    box(W, .05, .05, pipe, 0, y, D / 2, s); box(W, .05, .05, pipe, 0, y, -D / 2, s);
    box(.05, .05, D, pipe, W / 2, y, 0, s); box(.05, .05, D, pipe, -W / 2, y, 0, s);
  }
  const hz = new THREE.Mesh(new THREE.PlaneGeometry(W, .35), std('#fff', .7, 0, { map: hazardTex() })); hz.position.set(0, .45, D / 2 + .01); s.add(hz);
  cyl(.03, .03, 1.2, pipe, W / 2, H + .6, D / 2, s, 6);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.9, .5), basic(signTex('NEW', { accent: '#ff4f7e', bg: '#ff4f7e', W: 256, H: 140 }), { side: THREE.DoubleSide, transparent: true }));
  flag.position.set(W / 2 + .45, H + .95, D / 2); s.add(flag);
  g.add(s); g.userData.scaffold = s;
}

/* 主力のしるし：建物の脇に高い旗竿と「主力」の幟（夜は根元が光る） */
function addFlagship(g, info, col) {
  const [fw, fd] = info.foot, x = -fw / 2 - .35, z = fd / 2 + .2, H = info.h + 1.6;
  cyl(.05, .06, H, std('#e8e2d6', .4, .6), x, H / 2, z, g, 8);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .72), basic(signTex('主力', { sub: 'FLAGSHIP', bg: col, accent: '#fff8ea', W: 420, H: 200 }), { side: THREE.DoubleSide, transparent: true }));
  ban.position.set(x + .78, H - .42, z); g.add(ban);
  glow('255,200,120', 2.4, g, x, .3, z);
}

/* 中央の工事現場：布をかぶった次期機体・足場・クレーン・回転灯1つ・日付札 */
export function construction(cn, nextNo) {
  const g = new THREE.Group(); g.name = 'construction';
  box(7.2, .12, 7.2, std('#b9ad98', .95), 0, .06, 0, g);
  // 柵
  const hz = std('#fff', .6, 0, { map: hazardTex() });
  for (const [x, z, ry] of [[0, 3.55, 0], [0, -3.55, 0], [3.55, 0, Math.PI / 2], [-3.55, 0, Math.PI / 2]]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(6.6, .45), hz); f.position.set(x, .3, z); f.rotation.y = ry; f.material.side = THREE.DoubleSide; g.add(f);
  }
  // 布をかぶった機体（ふくらみのある楕円体の重ね）
  const cloth = std('#fff', .95, 0, { map: canvasClothTex() });
  const body = mesh(new THREE.SphereGeometry(1, 32, 18), cloth, 0, 1.2, 0, g); body.scale.set(2.8, 1.25, 1.6);
  const wingL = mesh(new THREE.SphereGeometry(1, 20, 10), cloth, 0, 1.0, 0, g); wingL.scale.set(1.1, .32, 3.1);
  const tail = mesh(new THREE.SphereGeometry(1, 16, 10), cloth, -2.5, 1.9, 0, g); tail.scale.set(.7, 1.0, .24);
  blob(6, 4, g);
  // 足場（片側だけ）
  const pipe = std('#c9ced6', .35, .7);
  for (let i = 0; i < 4; i++) for (const z of [-1.9, 1.9]) cyl(.04, .04, 3, pipe, -1.5 + i, 1.5, z, g, 6);
  for (const y of [1, 2, 2.95]) for (const z of [-1.9, 1.9]) box(3.1, .05, .05, pipe, 0, y, z, g);
  // クレーン（格子の柱＋旋回する腕＋吊り荷）。遠くから見える高さと太さにする＝園の目印
  const crane = new THREE.Group(); crane.position.set(2.9, 0, -2.4); g.add(crane);
  const yel = std('#ffc531', .45, .2), dark = std('#2b2f38', .5, .4);
  const lat = new THREE.MeshStandardMaterial({ map: latticeTex(), transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .5, metalness: .2 });
  lat.map.wrapT = THREE.RepeatWrapping; lat.map.repeat.set(1, 6);
  box(1.2, .35, 1.2, dark, 0, .18, 0, crane);
  box(.8, 12, .8, lat, 0, 6.2, 0, crane);
  const jib = new THREE.Group(); jib.position.y = 12.2; crane.add(jib);
  box(1.1, .9, 1.1, dark, 0, .3, 0, jib);
  box(9.5, .55, .55, yel, -3.4, 1.0, 0, jib);
  box(3, .7, .7, dark, 2.5, .8, 0, jib);
  box(.9, .4, .9, std('#ffc531', .5), 0, 1.6, 0, jib);
  const cable = box(.03, 6.4, .03, dark, -6.6, -2.2, 0, jib);
  const load = box(1.2, .7, .8, std('#c2793a', .7), -6.6, -5.6, 0, jib);
  // 回転灯（光源は増やさず、自発光の頭＋回るにじみ）
  const beaconMat = std('#ff3b30', .3, 0, { emissive: C('#ff2a1f'), emissiveIntensity: 1.6 });
  const beacon = cyl(.2, .26, .32, beaconMat, 0, 1.95, 0, jib, 12);
  const beam = glow('255,70,50', 3.4, jib, 0, 2.0, 0);
  // 日付札
  const label = `${cn.label}  ${nextNo}`;
  const s = sign(label, 'UNDER CONSTRUCTION', '#ffc531', 3.6, g, 0, 2.7, 2.2);
  return { g, jib, beam, beaconMat, load };
}

/* 玄関棟：かまぼこ屋根の格納庫「HANGAR F.」 */
export function gateHangar() {
  const g = new THREE.Group(); g.name = 'gate';
  // 円柱の上半分を前後方向（z）に寝かせる。θ=π/2〜3π/2 が回転後の上側になる
  const shellGeo = new THREE.CylinderGeometry(2.4, 2.4, 4.6, 28, 1, true, Math.PI / 2, Math.PI); shellGeo.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(shellGeo, std('#a8b0ba', .4, .55, { side: THREE.DoubleSide })));
  const capMat = std('#3a3f4a', .6);
  const front = new THREE.Mesh(new THREE.CircleGeometry(2.4, 28, 0, Math.PI), capMat); front.position.set(0, 0, 2.3); g.add(front);
  const back = front.clone(); back.position.z = -2.3; back.rotation.y = Math.PI; g.add(back);
  const shutter = box(2.2, 1.9, .05, std('#d7d9dd', .5, .5), 0, .95, 2.33, g);
  const sh = sign('HANGAR F.', '第F格納庫 ─ 入口', '#ffb547', 3.0, g, 0, 2.55, 2.35);
  blob(6.5, 6.5, g);
  glow('255,190,110', 3.2, g, 0, 2.2, 2.6);
  return g;
}

/* 無線塔（X）：管制塔の形。頭がゆっくり光る */
export function radioTower(w) {
  const g = new THREE.Group(); g.name = w.id;
  const wall = std('#eef0f3', .6);
  cyl(.7, .9, 5.6, wall, 0, 2.8, 0, g, 16);
  const cab = cyl(1.25, 1.0, 1.0, std('#9fd4ff', .1, .2, { emissive: C('#7fc3ff'), emissiveIntensity: .25, transparent: true, opacity: .92 }), 0, 6.1, 0, g, 16); windowsOn(cab.material);
  cyl(1.35, 1.35, .14, std('#2b2f38', .5), 0, 6.65, 0, g, 16);
  cyl(.03, .03, 1.4, std('#2b2f38', .5), 0, 7.4, 0, g, 6);
  const bm = std('#5fe3a1', .3, 0, { emissive: C('#5fe3a1'), emissiveIntensity: 1.2 }); cyl(.1, .1, .14, bm, 0, 8.1, 0, g, 10);
  glow('120,255,190', 1.8, g, 0, 8.1, 0);
  sign(w.name, 'RADIO', w.color, 2.2, g, 0, 1.4, .95);
  blob(3, 3, g);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(2.8, 8.5, 2.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 4.2; hit.userData.id = w.id; g.add(hit);
  g.userData = { id: w.id, h: 8, hit };
  return g;
}

/* 木（低い多角形の造形） */
// 木の形と色は全部の木で使い回す（1本ごとに作らない）
let TREE = null;
function treeParts() {
  if (TREE) return TREE;
  const crowns = [];
  for (let i = 0; i < 6; i++) crowns.push(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.25 + i * .018, .35 + (i % 3) * .07, .32 + (i % 2) * .08), roughness: .9, flatShading: true }));
  const flat = c => new THREE.MeshStandardMaterial({ color: C(c), roughness: .9, flatShading: true });
  return (TREE = { trunkGeo: new THREE.CylinderGeometry(.08, .11, .7, 6), trunkMat: std('#7a5638', .9), crownGeo: new THREE.IcosahedronGeometry(.55, 0), crowns,
    autumn: ['#e8b23a', '#e07a2e', '#c8432f'].map(flat), sakura: flat('#f5b9ca'), snow: flat('#eef4f7') });
}
export const treeTops = []; // 季節替えのために、全部の木の冠を覚えておく

/* 季節：木の冠の色を替える。p は進み具合（0〜1）。木ごとの th と比べて、少しずつ色づく＝毎日ちがう園になる */
export function applySeason(kind, p = 0) {
  const P = treeParts();
  for (const top of treeTops) {
    const th = top.userData.th;
    top.material = kind === 'autumn' && th < p ? P.autumn[Math.floor(th * 997) % 3]
      : kind === 'sakura' && th < p * .4 ? P.sakura
      : kind === 'winter' && th < .7 ? P.snow
      : top.userData.base;
  }
}

/* 節目の旗：玄関の前に、色とりどりの三角旗の綱と祝いの札 */
export function celebration(text, colors) {
  const g = new THREE.Group(); g.name = 'celebration';
  const pole = std('#e8e2d6', .4, .6), W = 6.4, H = 3.9; // 玄関の屋根（高さ2.4）に札が隠れない高さ
  for (const x of [-W / 2, W / 2]) cyl(.05, .06, H, pole, x, H / 2, 0, g, 8);
  const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.22, 0, 0), new THREE.Vector3(.22, 0, 0), new THREE.Vector3(0, -.42, 0)]);
  for (let i = 0; i < 13; i++) {
    const u = i / 12, x = -W / 2 + .25 + u * (W - .5), y = H - .15 - Math.sin(u * Math.PI) * .3;
    mesh(tri, new THREE.MeshBasicMaterial({ color: C(colors[i % colors.length]), side: THREE.DoubleSide, toneMapped: false }), x, y, 0, g);
  }
  const s = sign(text, 'CELEBRATION', '#ff6b4a', 3.8, g, 0, H - 1.3, .02);
  return g;
}
export function tree(x, z, s = 1, parent) {
  const P = treeParts();
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  mesh(P.trunkGeo, P.trunkMat, 0, .35, 0, g);
  const top = mesh(P.crownGeo, P.crowns[(rnd() * P.crowns.length) | 0], 0, 1.05, 0, g);
  top.userData = { base: top.material, th: rnd() }; treeTops.push(top);
  top.scale.y = rr(1.1, 1.5);
  return g;
}

/* ドット絵のキャスト（板）。a/b の2コマを持てる */
export function pixelSprite(srcA, srcB, unit = .03) {
  const mat = new THREE.SpriteMaterial({ map: pixelTex(srcA), transparent: true, alphaTest: .4, toneMapped: false });
  const s = new THREE.Sprite(mat);
  const tA = mat.map, tB = srcB ? pixelTex(srcB) : null;
  s.center.set(.5, 0); s.visible = false; // 読み込むまで（失敗したら）出さない
  tA.userData.ready.then(t => { if (!t) return; s.scale.set(t.image.width * unit, t.image.height * unit, 1); s.visible = true; });
  s.userData = { tA, tB, f: 0 };
  return s;
}
