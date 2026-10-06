/* HANGAR F. v3 ── 大人の秘密基地（ガレージ）
   画面の構成：3Dガレージ（garage.js）を背景に、各部屋の説明を重ねて、スクロールで歩いて巡る。 */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
const MOBILE = () => innerWidth <= 900;
const mk = k => ({ get: n => { try { return k.getItem(n); } catch (e) { return null; } }, set: (n, v) => { try { k.setItem(n, v); } catch (e) {} } });
const store = mk(window.sessionStorage), lstore = mk(window.localStorage);
const root = document.documentElement, body = document.body;
const TOUR = /[?&]tour/.test(location.search);
const S = { y: 0, mx: innerWidth / 2, my: innerHeight / 2, t: 0, music: false };
if (FINE) root.classList.add('fine');
const toastEl = $('#toast'); let toastT;
const toast = (msg, ms = 2400) => { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); };
const jst = (d = new Date()) => { const t = new Date(d.getTime() + 9 * 3600e3); const p = n => String(n).padStart(2, '0'); return { Y: t.getUTCFullYear(), M: p(t.getUTCMonth() + 1), D: p(t.getUTCDate()), h: p(t.getUTCHours()), m: p(t.getUTCMinutes()), s: p(t.getUTCSeconds()) }; };

/* =====================================================================
   SOUND ── 雨音・蛍光灯・シャッター・ガレージのラジオ（すべてWebAudioで合成）
   ===================================================================== */
const Snd = {
  on: false, ctx: null, out: null, nbuf: null, amb: null, mus: null, _last: 0,
  init() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const c = this.ctx = new A(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
      this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(comp).connect(c.destination);
      const len = c.sampleRate * 2, b = this.nbuf = c.createBuffer(1, len, c.sampleRate), a = b.getChannelData(0);
      let p = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; p = .97 * p + .03 * w; a[i] = w * .6 + p * 2.2; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  set(v) {
    this.on = v; if (v) this.init(); if (!this.ctx) return;
    const n = this.ctx.currentTime; this.out.gain.cancelScheduledValues(n); this.out.gain.setTargetAtTime(v ? .9 : 0, n, v ? .3 : .15);
    if (v) { this.ambience(); if (G && G.lightsLevel() > .5) this.music(true); }
  },
  src(dur, loop = false) { const s = this.ctx.createBufferSource(); s.buffer = this.nbuf; s.loop = loop; return s; },
  tone(f, d = .06, type = 'square', v = .03, slide = 0, delay = 0) {
    if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), n = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, n); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), n + d);
    g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(v, n + .005); g.gain.exponentialRampToValueAtTime(.0001, n + d); o.connect(g).connect(this.out); o.start(n); o.stop(n + d + .05);
  },
  noise(d = 1, f0 = 400, f1 = 60, v = .2, type = 'lowpass', q = .7, delay = 0) {
    if (!this.on || !this.ctx) return; const c = this.ctx, n = c.currentTime + delay, s = this.src(); const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, n); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), n + d); const g = c.createGain(); g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    s.connect(f).connect(g).connect(this.out); s.start(n, Math.random()); s.stop(n + d + .05);
  },
  tick() { const n = performance.now(); if (n - this._last < 40) return; this._last = n; this.tone(2400, .02, 'sine', .012); },
  blip() { this.tone(660, .07, 'triangle', .04); this.tone(990, .09, 'triangle', .035, 0, .07); },
  ok(i = 0) { this.tone(520 + i * 110, .1, 'triangle', .05); },
  flap() { const n = performance.now(); if (n - this._last < 28) return; this._last = n; this.noise(.025, 3500, 1800, .05, 'highpass', .5); },
  click() { this.noise(.02, 4000, 2000, .1, 'bandpass', 3); this.tone(1800, .015, 'square', .01); },
  clunk() { this.noise(.5, 260, 40, .5); this.tone(70, .5, 'sine', .25, -30); this.noise(.12, 3000, 800, .08, 'bandpass', 2, .04); },
  rumble() { this.noise(1.6, 320, 40, .3); this.tone(55, 1.2, 'sawtooth', .05, -20); },
  whoosh() { this.noise(1.3, 200, 4000, .14, 'bandpass', .8); this.tone(110, 1.3, 'sawtooth', .04, 500); },
  tube(i) { this.noise(.05, 6000, 3000, .08, 'highpass', 1); this.tone(2600 + i * 200, .12, 'sine', .015); this.tone(120, .4, 'sawtooth', .012); },
  neon() { if (!this.on || !this.ctx) return; const c = this.ctx, n = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 120; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; g.gain.setValueAtTime(0, n);
    for (let k = 0; k < 6; k++) g.gain.setValueAtTime(k % 2 ? 0 : .05, n + k * .06); g.gain.setTargetAtTime(.006, n + .4, .4);
    o.connect(f).connect(g).connect(this.out); o.start(n); o.stop(n + 3.5); },
  static() { this.noise(.4, 5000, 900, .12, 'bandpass', .6); },
  motor() { // シャッターの巻き上げ音（返り値で停止）
    if (!this.on || !this.ctx) return null; const c = this.ctx, n = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const og = c.createGain(); og.gain.value = .07; o.connect(lp).connect(og).connect(this.out); o.start();
    const s = this.src(0, true), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 1.2;
    const rg = c.createGain(); rg.gain.value = 0; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 15; const lg = c.createGain(); lg.gain.value = .07;
    lfo.connect(lg).connect(rg.gain); s.connect(bp).connect(rg).connect(this.out); s.start(); lfo.start();
    return { rate: r => { lfo.frequency.setTargetAtTime(9 + r * 14, c.currentTime, .05); o.frequency.setTargetAtTime(44 + r * 22, c.currentTime, .05); },
      stop: () => { const t = c.currentTime; og.gain.setTargetAtTime(0, t, .05); lg.gain.setTargetAtTime(0, t, .05); setTimeout(() => { try { o.stop(); s.stop(); lfo.stop(); } catch (e) {} }, 400); } };
  },
  ambience() { // 雨とガレージの空気
    if (this.amb || !this.ctx) return; const c = this.ctx;
    const s = this.src(0, true), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const g = c.createGain(); g.gain.value = .045; s.connect(hp).connect(lp).connect(g).connect(this.out); s.start();
    const h = c.createOscillator(); h.type = 'sine'; h.frequency.value = 60; const hg = c.createGain(); hg.gain.value = .012; h.connect(hg).connect(this.out); h.start();
    this.amb = { rain: g, hum: hg };
    const drip = () => { if (!this.amb) return; if (this.on) this.tone(900 + Math.random() * 1400, .05, 'sine', .006 + Math.random() * .01); setTimeout(drip, 200 + Math.random() * 900); }; drip();
  },
  setRain(v) { if (this.amb) this.amb.rain.gain.setTargetAtTime(.02 + v * .07, this.ctx.currentTime, .4); },
  music(on) { // ガレージのラジオ：ゆっくりしたジャズ風のコード進行（Dm9 → G13 → Cmaj9 → Am9）
    if (!this.ctx) return; S.music = on;
    if (!on) { if (this.mus) { this.mus.g.gain.setTargetAtTime(0, this.ctx.currentTime, .4); clearInterval(this.mus.iv); const m = this.mus; setTimeout(() => m.g.disconnect(), 2000); this.mus = null; } return; }
    if (this.mus) return; const c = this.ctx, g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.5, c.currentTime, 1.2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; g.connect(lp).connect(this.out);
    const ch = [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 48, 55, 59, 60]];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12); let k = 0;
    const play = () => {
      const n = c.currentTime, notes = ch[k++ % 4];
      notes.forEach((m, i) => { const o = c.createOscillator(), o2 = c.createOscillator(), e = c.createGain(); o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = hz(m + 12); o2.frequency.value = hz(m + 12) * 1.003;
        const v = i === 0 ? .05 : .022; e.gain.setValueAtTime(0, n + i * .03); e.gain.linearRampToValueAtTime(v, n + .06 + i * .03); e.gain.exponentialRampToValueAtTime(v * .35, n + 1.6); e.gain.exponentialRampToValueAtTime(.0001, n + 3.9);
        o.connect(e); o2.connect(e); e.connect(g); o.start(n); o2.start(n); o.stop(n + 4); o2.stop(n + 4); });
      const b = c.createOscillator(), be = c.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12); be.gain.setValueAtTime(.09, n); be.gain.exponentialRampToValueAtTime(.0001, n + 1.8); b.connect(be).connect(g); b.start(n); b.stop(n + 2);
      const b2 = c.createOscillator(), be2 = c.createGain(); b2.type = 'sine'; b2.frequency.value = hz(notes[0] - 5); be2.gain.setValueAtTime(0, n + 2); be2.gain.linearRampToValueAtTime(.07, n + 2.02); be2.gain.exponentialRampToValueAtTime(.0001, n + 3.8); b2.connect(be2).connect(g); b2.start(n + 2); b2.stop(n + 4);
      for (let i = 0; i < 6; i++) { const t = n + Math.random() * 4, s = this.src(), f = c.createBiquadFilter(), e = c.createGain(); f.type = 'highpass'; f.frequency.value = 2500; e.gain.setValueAtTime(.05 * Math.random(), t); e.gain.exponentialRampToValueAtTime(.0001, t + .012); s.connect(f).connect(e).connect(g); s.start(t, Math.random()); s.stop(t + .02); }
    };
    play(); this.mus = { g, iv: setInterval(play, 4000) };
  }
};
const sndBtn = $('#snd');
function setSnd(v) {
  Snd.set(v); sndBtn.setAttribute('aria-pressed', v); $('#gate-snd').setAttribute('aria-pressed', v); lstore.set('hf_snd3', v ? '1' : '0');
  if (v) Snd.blip(); else Snd.music(false);
}
sndBtn.addEventListener('click', () => setSnd(!Snd.on));
$('#gate-snd').addEventListener('click', () => setSnd(!Snd.on));
if (lstore.get('hf_snd3') === '1') $('#gate-snd').setAttribute('aria-pressed', 'true');
addEventListener('keydown', e => { if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea/i.test(e.target.tagName)) setSnd(!Snd.on); });
document.addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('a,button,.chip'); if (t && t !== Snd._lh) { Snd._lh = t; Snd.tick(); } else if (!t) Snd._lh = null; });

/* =====================================================================
   3D ガレージの起動
   ===================================================================== */
let G = null, g3dState = 'loading', g3dP = 0;
const gateMsg = $('#gate-msg'), gatePct = $('#gate-pct'), gateLed = $('#gate-led');
function tierInfo() {
  const coarse = matchMedia('(pointer:coarse)').matches, small = innerWidth < 900, cores = navigator.hardwareConcurrency || 4, dpr = devicePixelRatio || 1;
  if (coarse || small) return { tier: 'low', dpr: Math.min(dpr, 1.5) * .8, shadows: false, bloom: false };
  if (cores <= 4) return { tier: 'mid', dpr: Math.min(dpr, 1.25), shadows: false, bloom: true };
  return { tier: 'high', dpr: Math.min(dpr, 1.3), shadows: true, bloom: true };
}
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
async function boot3D() {
  if (!webglOK()) { g3dState = 'fail'; setGateReady(true); return; }
  const Q = tierInfo(); S.q = Q; if (Q.tier === 'high') root.classList.add('hq'); if (Q.tier === 'low') root.classList.add('lowfx');
  try {
    const { createGarage } = await import('./garage.js');
    G = await createGarage($('#gl'), Object.assign({}, Q, {
      onProgress: (p, label) => { g3dP = p; gatePct.textContent = String(Math.round(p * 99)).padStart(2, '0'); },
      onEvent: (e, i) => { if (e === 'tube') Snd.tube(i); if (e === 'neon') Snd.neon(); }
    }));
    g3dState = 'ready'; window.HF.G = G; setGateReady(false);
    if (gateState === 'open') G.lightsOn(true);
  } catch (err) { console.warn('[HANGAR F.] 3D failed', err); g3dState = 'fail'; setGateReady(true); }
}
function setGateReady(fallback) {
  gatePct.textContent = fallback ? '--' : '99'; gateLed.classList.add('ok');
  gateMsg.textContent = fallback ? '照明なしで入れます（簡易表示）' : '準備完了 ── 長押しで開ける';
}

/* =====================================================================
   シャッター（入口）
   ===================================================================== */
const gate = $('#gate'), gateBtn = $('#gate-btn'), gateHint = $('#gate-hint');
const behind = $$('header.bar,main,footer,.rail,.skip');
const setBehind = on => behind.forEach(el => { el.inert = on; });
setBehind(true);
let gateState = 'closed', lift = 0, holding = false, latched = false, motor = null, litFired = false, closing = false;
function gateDown(e) {
  if (gateState !== 'closed' && gateState !== 'lifting') return;
  if ($('#gate-snd').getAttribute('aria-pressed') === 'true' && !Snd.on) setSnd(true);
  holding = true; gateBtn.classList.add('down'); gateState = 'lifting';
  if (!motor) motor = Snd.motor();
  try { gateBtn.setPointerCapture(e.pointerId); } catch (_) {}
}
function gateUp() { holding = false; gateBtn.classList.remove('down'); if (!latched && lift < .2) gateHint.textContent = 'もう少し、長く押して'; }
gateBtn.addEventListener('pointerdown', gateDown);
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => gateBtn.addEventListener(t, gateUp));
gateBtn.addEventListener('click', e => { if (e.detail === 0) { gateDown({}); latched = true; holding = false; } });
gateBtn.addEventListener('contextmenu', e => e.preventDefault());
function gateTick(dt) {
  if (gateState === 'lifting') {
    if (holding || latched) { const sp = latched ? lerp(.45, 1.1, lift) : .32; lift = Math.min(1, lift + dt * sp); if (lift > .2) latched = true; }
    else { lift = Math.max(0, lift - dt * .45); if (lift === 0) { gateState = 'closed'; if (motor) { motor.stop(); motor = null; } } }
    if (motor) motor.rate(latched ? lift : .3);
    const j = (holding || latched) && lift < 1 ? (Math.random() - .5) * 3 : 0;
    gate.style.setProperty('--lift', (lift + j / innerHeight).toFixed(4));
    gateBtn.style.setProperty('--hold', clamp(lift / .2).toFixed(3));
    if (lift > .55 && !litFired) { litFired = true; if (G) G.lightsOn(); }
    if (lift >= 1) openDone();
  } else if (gateState === 'closing') {
    lift = Math.max(0, lift - dt * .75); gate.style.setProperty('--lift', lift.toFixed(4)); if (motor) motor.rate(.5);
    if (lift === 0) { gateState = 'closed'; if (motor) { motor.stop(); motor = null; } Snd.clunk(); gateBtn.style.setProperty('--hold', 0); gateHint.textContent = '長押しで、もう一度あける'; gateMsg.textContent = 'シャッターを閉めました'; if (G) G.lightsOff(); scrollTo(0, 0); litFired = false; latched = false; gateBtn.focus({ preventScroll: true }); }
  }
}
function openDone() {
  gateState = 'open'; if (motor) { motor.stop(); motor = null; } Snd.clunk();
  gate.hidden = true; setBehind(false); body.classList.remove('locked'); root.classList.add('is-ready'); store.set('hf3_in', '1');
  if (G && !litFired) G.lightsOn(); litFired = true;
  setTimeout(showNfx, 5200);
}
function skipGate() { gateState = 'open'; lift = 1; gate.hidden = true; setBehind(false); body.classList.remove('locked'); root.classList.add('is-ready'); litFired = true; if (G) G.lightsOn(true); }
function closeGate() {
  if (gateState !== 'open') return; gateState = 'closing'; gate.hidden = false; setBehind(true); lift = 1; gate.style.setProperty('--lift', 1); body.classList.add('locked');
  gateHint.textContent = ''; motor = Snd.motor(); latched = false; holding = false;
}
$('#close-hangar').addEventListener('click', closeGate);
addEventListener('keydown', e => { if (gate.hidden || gateState !== 'closed' || (e.key !== 'Enter' && e.key !== ' ')) return; if (document.activeElement !== gateBtn) { e.preventDefault(); gateDown({}); latched = true; holding = false; } });

/* =====================================================================
   HERO ロゴ（1文字ずつ）
   ===================================================================== */
const logo = $('#logo'); logo.textContent = '';
[...'HANGAR F.'].forEach((c, i) => { const a = document.createElement('span'); a.className = 'ch' + (c === ' ' ? ' sp' : '') + (c === '.' ? ' dt' : ''); a.style.setProperty('--i', i); a.setAttribute('aria-hidden', 'true'); const b = document.createElement('span'); b.className = 'chi'; b.textContent = c === ' ' ? ' ' : c; a.appendChild(b); logo.appendChild(a); });
const chs = $$('.ch', logo);
function logoPhysics() {
  if (!FINE || RM || S.y > innerHeight) return;
  chs.forEach(el => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - (el._ox || 0), cy = r.top + r.height / 2 - (el._oy || 0);
    const dx = cx - S.mx, dy = cy - S.my, d = Math.hypot(dx, dy), R = 240; let tx = 0, ty = 0; if (d < R) { const k = (1 - d / R) ** 2; tx = dx / d * k * 30; ty = dy / d * k * 22; }
    el._ox = lerp(el._ox || 0, tx, .12); el._oy = lerp(el._oy || 0, ty, .12); el.firstChild.style.translate = `${el._ox.toFixed(1)}px ${el._oy.toFixed(1)}px`; });
}

/* =====================================================================
   CONCEPT ── 一文字ずつ灯る文章＋メーター
   ===================================================================== */
const mf = $('#mf-text'), mfW = [];
{ const txt = mf.textContent, hl = (mf.dataset.hl || '').split(',').filter(Boolean); mf.textContent = ''; mf.setAttribute('aria-label', txt);
  const mark = new Array(txt.length).fill(false); hl.forEach(h => { let i = -1; while ((i = txt.indexOf(h, i + 1)) >= 0) for (let k = 0; k < h.length; k++) mark[i + k] = true; });
  [...txt].forEach((c, i) => { const s = document.createElement('span'); s.className = 'w' + (mark[i] ? ' hl' : ''); s.textContent = c; s.setAttribute('aria-hidden', 'true'); mf.appendChild(s); mfW.push(s); }); }
const NS = 'http://www.w3.org/2000/svg';
const gauges = $$('.gauge').map(g => {
  const svg = $('svg', g), max = +g.dataset.max, v = +g.dataset.v, red = g.classList.contains('red');
  const pt = (a, r) => [60 + r * Math.cos(a * Math.PI / 180), 60 + r * Math.sin(a * Math.PI / 180)];
  const el = (n, at) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); svg.appendChild(e); return e; };
  el('circle', { cx: 60, cy: 60, r: 57, class: 'rim' });
  const steps = max <= 5 ? max * 2 : max;
  for (let i = 0; i <= steps; i++) { const a = 135 + 270 * i / steps, maj = max <= 5 ? i % 2 === 0 : i % 5 === 0, [x1, y1] = pt(a, maj ? 42 : 46), [x2, y2] = pt(a, 52);
    el('line', { x1, y1, x2, y2, class: 'tk' + (maj ? ' m' : '') + (i / steps > .8 ? ' r' : '') }); }
  const arc = el('path', { class: 'arc', d: (() => { const [x0, y0] = pt(135, 55), [x1, y1] = pt(44.9, 55); return `M${x0} ${y0} A55 55 0 1 1 ${x1} ${y1}`; })() });
  const L = 2 * Math.PI * 55 * .75; arc.style.strokeDasharray = L; arc.style.strokeDashoffset = L;
  const ng = el('g', {}); const nd = document.createElementNS(NS, 'line'); nd.setAttribute('x1', 60); nd.setAttribute('y1', 60); nd.setAttribute('x2', 60 + 44); nd.setAttribute('y2', 60); nd.setAttribute('class', 'ndl'); ng.appendChild(nd);
  el('circle', { cx: 60, cy: 60, r: 6, class: 'hub' });
  return { g, max, v, red, arc, ng, L, cnt: $('[data-count]', g) };
});
function updateConcept(p) {
  const n = Math.floor(clamp(p / .66) * (mfW.length + 1)); mfW.forEach((s, i) => s.classList.toggle('on', i < n));
  const cp = clamp((p - .6) / .3), e = 1 - (1 - cp) ** 3;
  gauges.forEach(({ max, v, red, arc, ng, L, cnt }) => {
    let f = v / max * e; if (red && cp >= 1) f = .97 + Math.sin(S.t * 30) * .03;
    arc.style.strokeDashoffset = L * (1 - f); ng.setAttribute('transform', `rotate(${135 + 270 * f} 60 60)`);
    if (cnt) cnt.textContent = Math.round(+cnt.dataset.count * e);
  });
}

/* =====================================================================
   セクション → カメラ（スクロールで歩く）
   ===================================================================== */
const secs = $$('[data-cam]');
const SHADE = { hero: [.5, 0, 0], concept: [.72, 0, .05], pit: [.55, .1, .18], screening: [0, .78, .05], crew: [.78, 0, .05], log: [.2, .2, .42], cctv: [.25, .25, .4], parts: [0, .78, .05], safe: [0, .78, .05], radio: [0, .8, .05], exit: [0, 0, .12] };
let marks = [], active = secs[0], blend = { i: 0, t: 0 };
const fxShade = $('.fx-shade'), heroSec = $('#top'), footSec = $('footer'), conceptSec = $('#concept');
let L = { max: 1 };
function measure() {
  const vh = innerHeight, max = document.documentElement.scrollHeight - vh, y = scrollY;
  marks = secs.map(el => { const top = el.offsetTop, h = el.offsetHeight, c = clamp(top + h / 2 - vh / 2, 0, max), hold = Math.max(0, (h - vh) / 2) * .9 + vh * .1;
    const boxes = $$('.pa', el).map(b => { const r = b.getBoundingClientRect(); return [r.left, r.top + y, r.right, r.bottom + y]; });
    return { el, c, hold, cam: el.dataset.cam, boxes }; });
  marks[0].c = 0; marks[marks.length - 1].c = max;
  L = { max: Math.max(1, max), heroH: heroSec.offsetHeight, footTop: footSec.offsetTop, cTop: conceptSec.offsetTop, cH: conceptSec.offsetHeight };
}
function trackSections() {
  const y = S.y; let i = 0; while (i < marks.length - 2 && y > marks[i + 1].c) i++;
  const A = marks[i], B = marks[i + 1] || A, a = A.c + A.hold, b = B.c - B.hold;
  const t = b > a ? ss(a, b, y) : (y >= B.c ? 1 : 0);
  blend = { i, t };
  if (G) G.setBlend(A.cam, B.cam, t);
  const cur = t < .5 ? A : B;
  if (cur.el !== active) { active = cur.el; onSection(active); }
  // 影（読みやすさのための暗幕）
  const sa = SHADE[A.cam] || [0, 0, 0], sb = SHADE[B.cam] || sa, m = MOBILE();
  const sh = [0, 1, 2].map(k => lerp(sa[k], sb[k], t));
  if (m) { sh[2] = Math.max(sh[2], (A.cam === 'hero' && t < .5) ? 0 : .45); sh[0] = sh[1] = 0; }
  const shs = sh.map(v => v.toFixed(2)).join(); if (shs !== fxShade._s) { fxShade._s = shs; fxShade.style.setProperty('--sl', sh[0].toFixed(2)); fxShade.style.setProperty('--sr', sh[1].toFixed(2)); fxShade.style.setProperty('--sa', sh[2].toFixed(2)); }
  // 雨音（外が見えるときは大きく）
  const outside = (A.cam === 'hero' ? 1 - t : 0) + (B.cam === 'exit' ? t : 0);
  if (Snd.amb) Snd.setRain(outside);
  // ヒーロー・フッター
  const hp = clamp(y / (L.heroH * .6)).toFixed(3); if (hp !== heroSec._hp) { heroSec._hp = hp; heroSec.style.setProperty('--hp', hp); }
  const fp = clamp(1 - (L.footTop - y) / innerHeight).toFixed(3); if (fp !== footSec._fp) { footSec._fp = fp; footSec.style.setProperty('--fp', fp); }
  // オドメーター（歩いた距離）
  const mm = Math.round(S.y / L.max * 16000);
  const str = String(mm).padStart(6, '0'); if (str !== odoEl._s) { odoEl._s = str; odoEl.innerHTML = [...str].map(c => `<i>${c}</i>`).join(''); }
}
const odoEl = $('#odo');
const rail = $('#rail'), nowEl = $('#now');
secs.forEach(s => { const a = document.createElement('a'); a.href = '#' + s.id; a.innerHTML = `<span>${s.dataset.no} ${s.dataset.nav}</span>`; a.setAttribute('aria-label', s.dataset.nav); a.addEventListener('click', e => { e.preventDefault(); goTo('#' + s.id); }); rail.appendChild(a); s._rail = a; });
$('.brand').addEventListener('click', e => { e.preventDefault(); goTo('#top'); });
function onSection(el) {
  secs.forEach(s => s._rail.classList.toggle('on', s === el));
  $('.now-no', nowEl).textContent = el.dataset.no; $('.now-t', nowEl).textContent = el.dataset.nav; body.classList.toggle('at-hero', el.id === 'top');
  $$('.map-list a').forEach(a => a.classList.toggle('on', a.dataset.id === el.id));
  $$('.plan .zone').forEach(z => z.classList.toggle('on', z.dataset.id === el.id));
}

/* ---------- 3Dの注釈 ---------- */
const spots = $$('.spot');
function updateSpots() {
  const settled = blend.t < .12 || blend.t > .88;
  spots.forEach(sp => {
    let show = false;
    if (G && !MOBILE() && settled && active.dataset.cam === sp.dataset.sec && G.lightsLevel() > .8) {
      const p = G.project(sp.dataset.anchor);
      if (p && p.visible) {
        const m = marks.find(k => k.el === active), py = p.y + S.y;
        show = !(m && m.boxes.some(r => p.x > r[0] - 30 && p.x < r[2] + 260 && py > r[1] - 60 && py < r[3] + 20));
        if (show) sp.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      }
    }
    sp.classList.toggle('on', show);
  });
}

/* ---------- 3Dの小物をクリック ---------- */
const PICK = { car: '布をめくる', radio: 'ラジオ', tv: 'チャンネル', neon: 'ネオン', clock: '時計', safe: '金庫へ', hatch: '地下へ', laptop: 'メイメイ', vend: '自販機' };
let pickName = null;
const glc = $('#gl');
function pickAt(x, y) { if (!G || !G.pick) return null; return G.pick(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); }
addEventListener('pointermove', e => {
  if (!FINE || !G || e.target !== glc && !(e.target.closest && e.target.closest('.sec,footer') && !e.target.closest('.pa,a,button'))) { if (pickName) { pickName = null; cur.classList.remove('pick'); } return; }
  const n = pickAt(e.clientX, e.clientY); if (n !== pickName) { pickName = n; cur.classList.toggle('pick', !!n); cur.classList.toggle('hot', !!n); curLabel.textContent = n ? (PICK[n] || '') : ''; }
}, { passive: true });
addEventListener('click', e => {
  if (!G || e.target.closest('.pa,a,button,.modal,#gate')) return;
  const n = pickAt(e.clientX, e.clientY); if (!n) return; pickAct(n);
});
function pickAct(n) {
  if (n === 'car') { G.carPeek && G.carPeek(); Snd.noise(.6, 2000, 300, .08, 'bandpass', .7); toast('……まだ見せられません。F-19は、布の下で構想中です。'); }
  else if (n === 'radio') { if (!Snd.on) setSnd(true); Snd.music(!S.music); toast(S.music ? '♪ ガレージ・ラジオ、オンエア' : 'ラジオを止めました'); }
  else if (n === 'tv') { G.tvNext && G.tvNext(); Snd.static(); }
  else if (n === 'neon') { G.neonFlick && G.neonFlick(); Snd.neon(); }
  else if (n === 'clock') { const t = jst(); toast(`東京はいま ${t.h}:${t.m}。いい時間ですね。`); Snd.click(); }
  else if (n === 'safe') goTo('#safe');
  else if (n === 'hatch') goTo('#b1f');
  else if (n === 'laptop') { toast('メイメイ「ただいま作業中です！ 思いついたら、すぐつくります」'); Snd.blip(); }
  else if (n === 'vend') { toast('ガコン。…パンダ珈琲（微糖）が出てきました。'); Snd.clunk(); }
}
function goTo(sel) { const el = $(sel); if (!el) return; const m = marks.find(k => k.el === el); const y = m ? Math.max(0, Math.min(el.offsetTop + 10, m.c)) : el.offsetTop; scrollTo({ top: el.id === 'top' ? 0 : y, behavior: RM ? 'auto' : 'smooth' }); }

/* =====================================================================
   カーソル・チルト・出現
   ===================================================================== */
const cur = $('.cur'), curRing = $('.cur-ring'), curDot = $('.cur-dot'), curLabel = $('.cur-label'); let cx = -100, cy = -100;
document.addEventListener('pointerover', e => {
  if (!FINE) return; const t = e.target.closest && e.target.closest('[data-cursor],a,button,.chip');
  if (t) { cur.classList.add('hot'); curLabel.textContent = t.dataset.cursor || (t.matches('a') ? 'OPEN' : ''); } else if (!pickName) cur.classList.remove('hot');
});
document.addEventListener('pointerdown', () => cur.classList.add('down')); document.addEventListener('pointerup', () => cur.classList.remove('down'));
addEventListener('pointermove', e => { S.mx = e.clientX; S.my = e.clientY; }, { passive: true });
function updateCursor() {
  cx = lerp(cx, S.mx, .22); cy = lerp(cy, S.my, .22);
  curRing.style.transform = `translate3d(${cx}px,${cy}px,0)`; curDot.style.transform = `translate3d(${S.mx}px,${S.my}px,0)`;
  if (G) G.setMouse((S.mx / innerWidth - .5) * 2, (.5 - S.my / innerHeight) * 2);
}
$$('[data-tilt]').forEach(el => {
  el.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg'); el.style.setProperty('--gx', (x * 100) + '%'); el.style.setProperty('--gy', (y * 100) + '%'); });
  el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
});
// clip-pathで隠した見出しは交差判定されないので、親要素を見張る
const ioMap = new Map();
const io = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; (ioMap.get(en.target) || [en.target]).forEach(x => { x.classList.add('in'); if (x.id === 'board') flapBoard(); }); io.unobserve(en.target); }), { threshold: .12 });
$$('.rv').forEach(el => { const t = el.classList.contains('h2') ? el.parentElement : el; if (!ioMap.has(t)) ioMap.set(t, []); ioMap.get(t).push(el); io.observe(t); });

/* =====================================================================
   LOGBOOK ── パタパタ式の発着案内板
   ===================================================================== */
const GL_A = '0123456789', GL_K = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン機格納庫出撃整備', GL_L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rows = $$('.brow');
rows.forEach(r => { $$('.d,.s', r).forEach(el => { const t = el.textContent; el.setAttribute('aria-label', t); el.innerHTML = '<span class="fl" aria-hidden="true">' + [...t].map(c => `<i class="${c === ' ' ? 'sp' : ''}" data-c="${c}">${c}</i>`).join('') + '</span><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">' + t + '</span>'; }); });
function flapCell(i, delay) {
  const fin = i.dataset.c; if (fin === ' ') return; const pool = /\d/.test(fin) ? GL_A : /[A-Z]/.test(fin) ? GL_L : GL_K; let n = 3 + (Math.random() * 6 | 0);
  const step = () => { if (n-- <= 0) { i.textContent = fin; i.animate && i.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)', filter: 'brightness(.4)' }, { transform: 'scaleY(1)' }], { duration: 80 }); return; }
    i.textContent = pool[Math.random() * pool.length | 0]; i.animate && i.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)', filter: 'brightness(.4)' }, { transform: 'scaleY(1)' }], { duration: 70 }); Snd.flap(); setTimeout(step, 70); };
  setTimeout(step, delay);
}
function scramble(el, final, delay = 0, dur = 700) {
  const t0 = performance.now() + delay; el.style.visibility = 'hidden';
  const step = () => { const now = performance.now(); if (now < t0) { requestAnimationFrame(step); return; } el.style.visibility = '';
    const k = clamp((now - t0) / dur); let out = ''; for (let i = 0; i < final.length; i++) out += (i < final.length * k || final[i] === ' ') ? final[i] : GL_K[Math.random() * GL_K.length | 0];
    el.textContent = out; if (k < 1) requestAnimationFrame(step); else el.textContent = final; };
  requestAnimationFrame(step);
}
function flapBoard(only) {
  if (RM) return; let k = 0;
  rows.forEach(r => { if (r.classList.contains('hide') || (only && !only.includes(r))) return; const d = k++ * 55;
    $$('.fl i', r).forEach((i, j) => flapCell(i, d + j * 18)); const n = $('.n', r); if (!n._t) n._t = n.textContent; scramble(n, n._t, d + 60, 650); });
}
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $$('.chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); const f = c.dataset.f;
  rows.forEach(r => r.classList.toggle('hide', f !== 'all' && r.dataset.k !== f));
  $('#board-n').textContent = rows.filter(r => !r.classList.contains('hide')).length; flapBoard(); measure();
}));

/* ---------- 整備記録（大図書館から自動転記された kiroku.json） ---------- */
(async () => { try {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const res = await fetch('kiroku.json', { cache: 'no-store' }); if (!res.ok) return;
  const list = ((await res.json()).entries || []).slice(0, 12); if (!list.length) return;
  $('#maint-log').innerHTML = list.map((e, i) => `<li class="${i >= 5 ? 'fold' : ''}"><time datetime="${esc(e.date)}">${esc(e.date)}</time><span>${esc(e.title)}</span></li>`).join('');
  const box = $('#maint-sec'); box.hidden = false; io.observe(box);
  const b = $('#maint-more'), lab = () => box.classList.contains('open') ? '▲ 閉じる' : '▼ すべて表示（あと' + (list.length - 5) + '件）';
  if (list.length > 5) { b.textContent = lab(); b.onclick = () => { box.classList.toggle('open'); b.setAttribute('aria-expanded', box.classList.contains('open')); b.textContent = lab(); measure(); }; } else b.hidden = true;
  measure();
} catch (e) {} })();

/* =====================================================================
   映写室
   ===================================================================== */
$$('.yt-play').forEach(btn => btn.addEventListener('click', () => {
  const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(btn.dataset.yt) + '?autoplay=1&rel=0&playsinline=1';
  f.title = btn.dataset.title || '動画'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; btn.replaceWith(f);
  if (S.music) Snd.music(false);
}));
const tcEls = $$('.js-tc'), tcT0 = performance.now();

/* =====================================================================
   主力機のデモ（墨・星・充電）
   ===================================================================== */
const visible = new Map();
const vio = new IntersectionObserver(es => es.forEach(e => visible.set(e.target, e.isIntersecting)), { rootMargin: '100px' });
const DPR = Math.min(devicePixelRatio || 1, 1.5);
function sized(c) { const w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * DPR) || c.height !== Math.round(h * DPR)) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); } return [c.width, c.height]; }
const demos = [];
(() => { // 墨
  const c = $('#cv-sumi'), x = c.getContext('2d'); vio.observe(c); const blots = []; let last = 0, idle = 0;
  const drop = (px, py, s = 1) => blots.push({ x: px, y: py, r: 3, max: (16 + Math.random() * 30) * s * DPR, a: .5 + Math.random() * .2, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 + .1 });
  const seal = document.createElement('span'); seal.textContent = '詠'; seal.setAttribute('aria-hidden', 'true'); seal.style.cssText = 'position:absolute;right:7%;bottom:9%;width:12%;aspect-ratio:1;display:grid;place-items:center;background:#c8301e;color:#f6e9d0;font:800 clamp(14px,2.4vw,30px) var(--f-min);transform:rotate(4deg);opacity:.92;z-index:2'; c.parentNode.appendChild(seal);
  c.parentNode.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), n = performance.now(); if (n - last < 45) return; last = n; drop((e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height, .8); if (Math.random() < .15) Snd.tone(180 + Math.random() * 80, .12, 'sine', .03); });
  c.parentNode.addEventListener('pointerdown', e => { const r = c.getBoundingClientRect(); drop((e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height, 2.2); Snd.noise(.4, 900, 120, .12); });
  demos.push(() => { if (!visible.get(c)) return; const [W, H] = sized(c);
    idle += 1; if (idle > 110) { idle = 0; drop(W * (.2 + Math.random() * .6), H * (.15 + Math.random() * .6), 1.3); }
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.004)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
    for (let i = blots.length - 1; i >= 0; i--) { const b = blots[i]; b.r += (b.max - b.r) * .07; b.x += b.vx; b.y += b.vy;
      const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, `rgba(14,16,24,${b.a * .22})`); g.addColorStop(.6, `rgba(14,16,24,${b.a * .12})`); g.addColorStop(1, 'rgba(14,16,24,0)');
      x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill(); if (b.max - b.r < .6) blots.splice(i, 1); } });
})();
(() => { // 星
  const c = $('#cv-star'), x = c.getContext('2d'); vio.observe(c); const stars = [], extra = []; let shoot = null, nextShoot = 3;
  for (let i = 0; i < 150; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, ph: Math.random() * 6.28, sp: .6 + Math.random() * 1.6 });
  const add = e => { const r = c.getBoundingClientRect(); extra.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r: 3.5, ph: 0, sp: 1, born: S.t }); Snd.ok(extra.length % 5); };
  c.parentNode.addEventListener('pointerdown', add);
  c.parentNode.addEventListener('pointermove', e => { if (Math.random() < .12) { const r = c.getBoundingClientRect(); extra.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r: 1.6, ph: 0, sp: 2, born: S.t, fade: 1 }); } });
  demos.push(t => { if (!visible.get(c)) return; const [W, H] = sized(c); x.clearRect(0, 0, W, H);
    const breath = .62 + .38 * Math.sin(t * 6.283 / 9);
    stars.forEach(s => { const a = (.3 + .7 * (.5 + .5 * Math.sin(t * s.sp + s.ph))) * breath; x.fillStyle = `rgba(255,244,214,${a})`; x.fillRect(s.x * W, s.y * H, s.r * DPR, s.r * DPR); });
    for (let i = extra.length - 1; i >= 0; i--) { const s = extra[i], age = t - s.born; if (s.fade && age > 1.2) { extra.splice(i, 1); continue; }
      const a = s.fade ? 1 - age / 1.2 : .6 + .4 * Math.sin(t * 2 + i) * breath; x.fillStyle = `rgba(255,236,180,${a})`; const R = s.r * DPR * (1 + Math.max(0, .6 - age) * 3);
      x.shadowColor = 'rgba(255,220,140,.9)'; x.shadowBlur = 14 * DPR; x.beginPath(); x.arc(s.x * W, s.y * H, R, 0, 7); x.fill(); x.shadowBlur = 0;
      if (!s.fade && age < 1) { x.strokeStyle = `rgba(255,236,180,${1 - age})`; x.beginPath(); x.arc(s.x * W, s.y * H, age * 60 * DPR, 0, 7); x.stroke(); } }
    x.fillStyle = '#f4eed3'; x.beginPath(); x.arc(W * .78, H * .2, W * .06, 0, 7); x.fill(); x.fillStyle = '#0d1533'; x.beginPath(); x.arc(W * .8, H * .18, W * .055, 0, 7); x.fill();
    if (!shoot && t > nextShoot) { shoot = { x: Math.random() * .6 + .2, y: Math.random() * .3, t0: t }; nextShoot = t + 5 + Math.random() * 5; }
    if (shoot) { const k = (t - shoot.t0) / .9; if (k > 1) shoot = null; else { const sx = shoot.x * W + k * W * .35, sy = shoot.y * H + k * H * .3, g = x.createLinearGradient(sx, sy, sx - W * .12, sy - H * .09); g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = g; x.lineWidth = 2 * DPR; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx - W * .12, sy - H * .09); x.stroke(); } }
  });
})();
(() => { // 充電
  const el = $('#charger'), bars = $$('.batt i', el), pct = $('#pct'), msg = $('.msg', el); let level = 0, target = 0, leave = 0;
  const set = v => { level = v; bars.forEach((b, i) => b.classList.toggle('on', i < level)); pct.textContent = level * 20 + '%'; el.classList.toggle('full', level === 5); msg.textContent = level === 5 ? 'FULL ⚡ 元気いっぱい！' : level ? 'CHARGING…' : '待機中'; }; set(0);
  const on = () => { clearTimeout(leave); target = 5; }, off = () => { leave = setTimeout(() => target = 0, 500); };
  const par = el.parentNode; par.addEventListener('pointerenter', on); par.addEventListener('pointerleave', off); par.addEventListener('pointerdown', () => { target = target ? 0 : 5; });
  setInterval(() => { if (!visible.get(el) && level === 0) return; if (level < target) { set(level + 1); Snd.ok(level); } else if (level > target) set(level - 1); }, 210);
  vio.observe(el);
})();

/* =====================================================================
   部品棚 ── ステッカーをドラッグ
   ===================================================================== */
const bench = $('#bench'), stks = []; let zTop = 10;
$$('.stk', bench).forEach(a => {
  a.draggable = false; const s = { a, x: 0, y: 0, vx: 0, vy: 0, rot: +a.dataset.rot, base: +a.dataset.rot, drag: false, moved: 0 }; stks.push(s);
  a.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0) window.open(a.href, '_blank', 'noopener'); });
  a.addEventListener('pointerdown', e => { s.drag = true; s.moved = 0; s.px = e.clientX; s.py = e.clientY; try { a.setPointerCapture(e.pointerId); } catch (_) {} a.classList.add('drag'); a.style.zIndex = ++zTop; Snd.tick(); });
  a.addEventListener('pointermove', e => { if (!s.drag) return; const dx = e.clientX - s.px, dy = e.clientY - s.py; s.px = e.clientX; s.py = e.clientY; s.x += dx; s.y += dy; s.vx = dx; s.vy = dy; s.moved += Math.abs(dx) + Math.abs(dy); });
  const up = () => { if (!s.drag) return; s.drag = false; a.classList.remove('drag'); if (s.moved < 6) window.open(a.href, '_blank', 'noopener'); else Snd.blip(); };
  a.addEventListener('pointerup', up); a.addEventListener('pointercancel', up);
});
function updateStk() {
  if (!stks[0]) return;
  if (!stks[0].init) { if (!bench.getBoundingClientRect().width) return; stks.forEach(s => { const cs = getComputedStyle(s.a); s.x = parseFloat(cs.left); s.y = parseFloat(cs.top); s.a.style.left = '0'; s.a.style.top = '0'; s.init = true; }); }
  const bw = bench.clientWidth, bh = bench.clientHeight;
  stks.forEach(s => { const w = s.a.offsetWidth, h = s.a.offsetHeight;
    if (!s.drag) { s.x += s.vx; s.y += s.vy; s.vx *= .92; s.vy *= .92; if (Math.abs(s.vx) < .05) s.vx = 0; if (Math.abs(s.vy) < .05) s.vy = 0; }
    if (s.x < 0) { s.x = 0; s.vx *= -.5; } if (s.y < 0) { s.y = 0; s.vy *= -.5; } if (s.x > bw - w) { s.x = bw - w; s.vx *= -.5; } if (s.y > bh - h) { s.y = bh - h; s.vy *= -.5; }
    s.rot = lerp(s.rot, s.base + clamp(s.vx * 1.6, -18, 18), .15);
    s.a.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) rotate(${s.rot.toFixed(1)}deg)`; });
}

/* =====================================================================
   金庫 ── ダイヤルを長押しで解錠
   ===================================================================== */
const vault = $('#vault'), hold = $('#hold'), dialEl = $('#dial');
let vHold = false, vH = 0, vOpen = false, vRot = 0, vLastTick = 0;
function vaultOpen() {
  if (vOpen) return; vOpen = true; vault.classList.add('unlocking'); Snd.clunk(); hold.setAttribute('aria-expanded', 'true');
  setTimeout(() => { vault.classList.add('open', 'shake'); Snd.rumble(); $('#rs-list').removeAttribute('inert'); setTimeout(() => vault.classList.remove('shake'), 700); }, 420);
}
hold.addEventListener('pointerdown', e => { vHold = true; try { hold.setPointerCapture(e.pointerId); } catch (_) {} });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => hold.addEventListener(t, () => { vHold = false; }));
hold.addEventListener('click', e => { if (e.detail === 0) vaultOpen(); });
hold.addEventListener('contextmenu', e => e.preventDefault());
function vaultTick(dt) {
  if (vOpen) return; vH = vHold ? Math.min(1, vH + dt / 1.2) : Math.max(0, vH - dt * 1.5);
  vRot += (vHold ? 420 : 0) * dt * (vH < .5 ? 1 : -1.4); dialEl.style.setProperty('--rot', vRot.toFixed(1) + 'deg'); hold.style.setProperty('--h', vH.toFixed(3));
  if (vHold && Math.abs(vRot - vLastTick) > 12) { vLastTick = vRot; Snd.click(); }
  if (vH >= 1) vaultOpen();
}

/* =====================================================================
   シェア
   ===================================================================== */
const SITE = { title: 'HANGAR F. ── 大人の秘密基地／第F格納庫', text: '路地裏の秘密基地を見つけた。思いついたら、すぐつくる。── HANGAR F.（第F格納庫）', url: 'https://hangar-f.pages.dev/', tags: 'HANGARF' };
const ICON = {
  native: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  line: '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 5.9-3.5 8.1-6C21.6 14.3 22 12.7 22 11c0-4.4-4.5-8-10-8zM8 13.4H6.1c-.3 0-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5s.5.2.5.5v3.3H8c.3 0 .5.2.5.5s-.2.5-.5.5zm2.1-.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5s.5.2.5.5v3.8zm4.6 0c0 .2-.1.4-.3.5h-.2c-.2 0-.3-.1-.4-.2l-2-2.7v2.4c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.1c0-.2.1-.4.3-.5h.2c.2 0 .3.1.4.2l2 2.7V9.1c0-.3.2-.5.5-.5s.5.2.5.5v3.8zm3.1-2.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9h1.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.9c-.3 0-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5h1.9c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9h1.4z"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H8v3.5h2.5V22H14V12h2.7l.4-3.5H14z"/></svg>',
  threads: '<svg viewBox="0 0 24 24"><path d="M16.7 11.2c-.1 0-.2-.1-.3-.1-.2-3.1-1.9-4.9-4.7-4.9-1.7 0-3.1.7-4 2l1.6 1.1c.6-1 1.6-1.2 2.4-1.2 1 0 1.7.3 2.2.8.3.4.6 1 .7 1.7-.8-.1-1.6-.2-2.5-.1-2.5.1-4.1 1.6-4 3.6.1 1 .6 1.9 1.4 2.4.7.5 1.6.7 2.6.6 1.3-.1 2.3-.6 3-1.4.5-.7.9-1.5 1-2.6.6.4 1.1.9 1.3 1.5.4 1 .4 2.6-.9 3.9-1.2 1.2-2.6 1.7-4.7 1.7-2.4 0-4.2-.8-5.3-2.3C5.4 16.9 4.9 15 4.9 12.5s.5-4.4 1.6-5.8C7.6 5.3 9.4 4.5 11.8 4.5s4.2.8 5.4 2.2c.6.7 1 1.6 1.3 2.6l1.9-.5c-.4-1.3-.9-2.4-1.7-3.3-1.5-1.8-3.8-2.8-6.9-2.8-3 0-5.3 1-6.8 2.9C3.7 7.3 3 9.6 3 12.5s.7 5.2 2 6.9c1.5 1.9 3.8 2.9 6.8 2.9 2.6 0 4.5-.7 6.1-2.3 2-2 2-4.6 1.3-6.2-.4-1.1-1.3-2-2.5-2.6zm-4.5 4.4c-1.1.1-2.2-.4-2.3-1.4 0-.8.5-1.6 2.3-1.7h.6c.6 0 1.2.1 1.8.2-.2 2.4-1.3 2.8-2.4 2.9z"/></svg>',
  bsky: '<svg viewBox="0 0 24 24"><path d="M6.3 4.2C8.6 6 11.1 9.5 12 11.4c.9-1.9 3.4-5.4 5.7-7.2 1.7-1.3 4.3-2.2 4.3.8 0 .6-.3 5-.5 5.7-.7 2.5-3.2 3.1-5.5 2.7 4 .7 5 2.9 2.8 5.2-4.2 4.3-6-1.1-6.5-2.5l-.3-.8-.3.8c-.5 1.4-2.3 6.8-6.5 2.5-2.2-2.3-1.2-4.5 2.8-5.2-2.3.4-4.8-.2-5.5-2.7C2.3 10 2 5.6 2 5c0-3 2.6-2.1 4.3-.8z"/></svg>',
  hatena: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3zM7 7v10h3.8c2.2 0 3.4-1 3.4-2.7 0-1.3-.7-2.1-1.9-2.3 1-.3 1.5-1 1.5-2 0-1.6-1.1-2.9-3.1-2.9zm2.2 1.7h1.1c.8 0 1.2.4 1.2 1s-.4 1.1-1.2 1.1H9.2zm0 3.7h1.3c.9 0 1.4.4 1.4 1.1 0 .8-.5 1.2-1.4 1.2H9.2zM15.6 7h2.1v6.6h-2.1zm1.05 7.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" fill-rule="evenodd"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M9 9h11v11H9zM4 4h11v3H7v8H4z"/></svg>'
};
function shareTargets(ctx) {
  const u = encodeURIComponent(ctx.url), t = encodeURIComponent(ctx.text), tu = encodeURIComponent(ctx.text + ' ' + ctx.url + ' #' + SITE.tags);
  const L = [];
  if (navigator.share) L.push({ k: 'native', label: 'スマホの共有メニューで送る', act: () => navigator.share({ title: ctx.title, text: ctx.text, url: ctx.url }).catch(() => {}) });
  L.push({ k: 'x', label: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}&hashtags=${SITE.tags}` });
  L.push({ k: 'line', label: 'LINE', href: `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}` });
  L.push({ k: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` });
  L.push({ k: 'threads', label: 'Threads', href: `https://www.threads.net/intent/post?text=${tu}` });
  L.push({ k: 'bsky', label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${tu}` });
  L.push({ k: 'hatena', label: 'はてブ', href: `https://b.hatena.ne.jp/add?mode=confirm&url=${u}&title=${encodeURIComponent(ctx.title)}` });
  L.push({ k: 'copy', label: 'リンクをコピー', act: async b => { try { await navigator.clipboard.writeText(ctx.url); } catch (e) { const ta = document.createElement('textarea'); ta.value = ctx.url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); }
    b.classList.add('done'); $('span', b).textContent = 'コピーしました'; toast('リンクをコピーしました。好きな場所に貼ってください'); setTimeout(() => { b.classList.remove('done'); $('span', b).textContent = 'リンクをコピー'; }, 2200); } });
  return L;
}
function renderShare(box, ctx) {
  box.innerHTML = ''; shareTargets(ctx).forEach(s => {
    const el = document.createElement(s.href ? 'a' : 'button'); el.className = 'sh-b ' + s.k; el.innerHTML = ICON[s.k] + `<span>${s.label}</span>`;
    if (s.href) { el.href = s.href; el.target = '_blank'; el.rel = 'noopener'; el.setAttribute('aria-label', s.label + 'でシェア（新しいタブ）'); el.addEventListener('click', e => { if (!MOBILE()) { e.preventDefault(); window.open(s.href, 'share', 'noopener,width=620,height=680'); } Snd.blip(); }); }
    else { el.type = 'button'; el.addEventListener('click', () => { s.act(el); Snd.blip(); }); }
    box.appendChild(el);
  });
}
renderShare($('[data-share-scope=site]'), SITE);
const sheet = $('#sheet'); let sheetFrom = null;
function openSheet(ctx = SITE, from) {
  sheetFrom = from || document.activeElement; renderShare($('[data-share-scope=sheet]', sheet), ctx);
  $('#sheet-title').textContent = ctx.title; $('#sheet-url').textContent = ctx.url.replace(/^https?:\/\//, '');
  $('#sheet-t').textContent = ctx === SITE ? 'この基地を、教える。' : `「${ctx.name}」を、教える。`;
  sheet.hidden = false; Snd.blip(); setTimeout(() => { const f = $('.sh-b', sheet); f && f.focus(); }, 30);
}
function closeModal(m) { if (m.hidden) return; m.hidden = true; if (m === mapEl) $('#map-open').setAttribute('aria-expanded', 'false'); const f = m === sheet ? sheetFrom : mapFrom; f && f.focus && f.focus(); }
$('#share-open').addEventListener('click', e => openSheet(SITE, e.currentTarget));
$$('[data-share-open]').forEach(b => b.addEventListener('click', e => openSheet(SITE, e.currentTarget)));
$$('[data-share-machine]').forEach(b => b.addEventListener('click', e => {
  const m = b.closest('[data-machine]'), name = m.dataset.machine;
  openSheet({ name, title: `${name} ── HANGAR F. 主力機`, text: `「${name}」── 路地裏のガレージ、HANGAR F.（第F格納庫）から出撃。`, url: m.dataset.url }, e.currentTarget);
}));
$$('.modal').forEach(m => { $$('[data-close]', m).forEach(c => c.addEventListener('click', () => closeModal(m))); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { $$('.modal').forEach(closeModal); closeNfx(false); }
  if (e.key === 'Tab') { const m = $$('.modal').find(x => !x.hidden); if (!m) return; const f = $$('a,button', m).filter(x => x.offsetParent); if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
});

/* =====================================================================
   見取り図（メニュー）
   ===================================================================== */
const mapEl = $('#map'), plan = $('#plan'); let mapFrom = null;
const ZONES = [
  ['top', 'ENTRANCE', '入口', -3, .9, 3, -.3], ['concept', 'CONCEPT', '次期機体', -1.6, -3.4, 1.9, -9.4], ['pit', 'THE PIT', '主力機', -5, -2.7, -3.55, -5.6],
  ['screening', 'SCREENING', '映写室', 3.85, -6.6, 5, -7.7], ['crew', 'CREW', '乗組員', -5, -8.5, -3.6, -10.3], ['log', 'LOGBOOK', '出庫記録', -1.9, -11.7, 1.9, -12.5],
  ['b1f', 'B1F', '地下工場', -3.3, -10.3, -1.9, -11.5], ['parts', 'PARTS', '部品棚', 4.05, -8.3, 5, -10.4], ['safe', 'SAFE', '金庫', 3.8, -10.9, 5, -12.2], ['radio', 'RADIO', '無線室', 3.1, -1.5, 5, -6.2]
];
{
  const X = x => (x + 5) * 50, Y = z => (1.2 - z) * 50; const el = (n, at, txt) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); if (txt) e.textContent = txt; plan.appendChild(e); return e; };
  el('path', { class: 'wall', d: `M${X(-3)} ${Y(0)} H${X(-5)} V${Y(-12.5)} H${X(5)} V${Y(0)} H${X(3)}` });
  el('line', { class: 'door', x1: X(-3), y1: Y(0), x2: X(3), y2: Y(0) });
  el('text', { x: X(0), y: Y(1.0), 'text-anchor': 'middle', class: 's' }, '↑ 路地（シャッター）');
  ZONES.forEach(([id, en, jp, x0, z0, x1, z1]) => {
    const r = el('rect', { class: 'zone', x: X(Math.min(x0, x1)), y: Y(Math.max(z0, z1)), width: Math.abs(x1 - x0) * 50, height: Math.abs(z1 - z0) * 50, rx: 4, tabindex: -1 }); r.dataset.id = id;
    r.addEventListener('click', () => { closeModal(mapEl); goTo('#' + id); });
    const cxp = X((x0 + x1) / 2), cyp = Y((z0 + z1) / 2); el('text', { x: cxp, y: cyp, 'text-anchor': 'middle' }, en); el('text', { x: cxp, y: cyp + 15, 'text-anchor': 'middle', class: 's' }, jp);
  });
  const me = el('g', { class: 'nome' }); const r1 = document.createElementNS(NS, 'circle'); r1.setAttribute('r', 7); r1.setAttribute('class', 'me'); const r2 = document.createElementNS(NS, 'circle'); r2.setAttribute('r', 14); r2.setAttribute('class', 'me-ring'); me.append(r2, r1); plan._me = me; plan._X = X; plan._Y = Y;
  const ml = $('#map-list');
  secs.forEach(s => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = '#' + s.id; a.dataset.id = s.id; const z = ZONES.find(z => z[0] === s.id);
    a.innerHTML = `<b>${s.dataset.no}</b><span>${s.dataset.nav}</span><small>${z ? z[2] : 'またね'}</small>`; a.addEventListener('click', e => { e.preventDefault(); closeModal(mapEl); goTo('#' + s.id); }); li.appendChild(a); ml.appendChild(li); });
}
$('#map-open').addEventListener('click', e => { mapFrom = e.currentTarget; mapEl.hidden = false; e.currentTarget.setAttribute('aria-expanded', 'true'); Snd.blip(); setTimeout(() => { const a = $('.map-list a.on', mapEl) || $('.map-list a', mapEl); a && a.focus(); }, 30); });
function updateMapMe() { if (mapEl.hidden || !G) return; plan._me.classList.remove('nome'); const p = G.camera.position; plan._me.setAttribute('transform', `translate(${plan._X(clamp(p.x, -5.5, 5.5))} ${plan._Y(clamp(p.z, -12.5, 1.6))})`); }

/* =====================================================================
   出撃カットイン／新着
   ===================================================================== */
{
  const fx = $('#sortie'); let busy = false;
  addEventListener('pageshow', e => { fx.hidden = true; busy = false; body.classList.remove('sortie'); if (e.persisted) location.reload(); });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-sortie]'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault(); if (busy) return; busy = true;
    const nm = (a.closest('[data-machine]') && a.closest('[data-machine]').dataset.machine) || ($('.n', a) && $('.n', a).textContent) || '';
    $('#sx-sub').textContent = nm ? `「${nm}」 ── 出撃` : 'HANGAR F. ── 出撃'; fx.hidden = false; Snd.whoosh(); navigator.vibrate && navigator.vibrate(30); if (G && G.sortie) { G.sortie(); body.classList.add('sortie'); } else root.classList.add('no3d');
    setTimeout(() => { location.href = a.href; }, RM ? 200 : 1500); setTimeout(() => { fx.hidden = true; busy = false; body.classList.remove('sortie'); }, 4500);
  });
}
const nfx = $('#new-fx'); let nfxT;
function closeNfx(go) { if (nfx.hidden || nfx.classList.contains('leaving')) return; clearTimeout(nfxT); nfx.classList.add('leaving'); setTimeout(() => { nfx.hidden = true; nfx.classList.remove('leaving'); }, 250); if (go) goTo('#parts'); }
function showNfx() { if (TOUR || store.get('hf3_newfx') || gateState !== 'open' || scrollY > 120) return; store.set('hf3_newfx', '1'); nfx.hidden = false; Snd.blip(); nfxT = setTimeout(() => closeNfx(false), 2800); }
nfx.addEventListener('click', () => closeNfx(true)); addEventListener('keydown', e => { if (e.key === 'Enter' && !nfx.hidden) closeNfx(true); });

/* =====================================================================
   隠しコマンド（ロゴ5連打／コナミコマンド）
   ===================================================================== */
{
  const floor = $('#floor');
  const scr = () => { if (!floor || floor.classList.contains('scramble')) return; floor.classList.add('scramble'); setTimeout(() => floor.classList.remove('scramble'), 7000); };
  const od = () => { body.classList.add('overdrive'); if (G) G.overdrive(true); Snd.rumble(); toast('ENGINE START ── オーバードライブ'); setTimeout(() => { body.classList.remove('overdrive'); if (G) G.overdrive(false); }, 6000); };
  let taps = []; logo.addEventListener('click', () => { scr(); Snd.blip(); const n = Date.now(); taps = taps.filter(t => n - t < 3000); taps.push(n); if (taps.length >= 5) { taps = []; od(); } });
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let pos = 0;
  addEventListener('keydown', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; pos = (k === code[pos]) ? pos + 1 : (k === code[0] ? 1 : 0); if (pos === code.length) { pos = 0; od(); } });
}

/* =====================================================================
   地下工場CCTV・時計
   ===================================================================== */
const cctvScreen = $('.cctv-screen'), floorEl = $('#floor');
function fitFloor() { const h = cctvScreen.clientHeight; floorEl.style.setProperty('--s', clamp(h / 230, 1, 1.9).toFixed(3)); }
let lastSec = -1;
function clocks() {
  const t = jst(), s = +t.s; if (s === lastSec) return; lastSec = s;
  $$('.js-clock').forEach(e => e.textContent = `${t.h}:${t.m}:${t.s}`); $$('.js-jst').forEach(e => e.textContent = `${t.h}:${t.m}`);
  $$('.js-cctv-time').forEach(e => e.textContent = `${t.Y}-${t.M}-${t.D} ${t.h}:${t.m}:${t.s} JST`);
}

/* =====================================================================
   メインループ
   ===================================================================== */
let last = performance.now(), perf = { n: 0, acc: 0, checked: 0, level: 0 };
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; S.t += dt; S.y = scrollY;
  gateTick(dt); updateCursor(); trackSections(); logoPhysics(); updateStk(); vaultTick(dt);
  const ctr = L.cH - innerHeight, p = ctr > 0 ? clamp((S.y - L.cTop) / ctr) : 0;
  if (S.y > L.cTop - innerHeight && S.y < L.cTop + L.cH) { const ps = p.toFixed(3); if (ps !== conceptSec._p) { conceptSec._p = ps; conceptSec.style.setProperty('--p', ps); } updateConcept(p); }
  demos.forEach(d => d(S.t)); updateSpots(); updateMapMe(); clocks();
  const ts = (now - tcT0) / 1000; const tc = [ts / 3600 | 0, (ts / 60 | 0) % 60, ts % 60 | 0, (ts * 24 | 0) % 24].map(n => String(n).padStart(2, '0')).join(':'); tcEls.forEach(e => e.textContent = tc);
  if (G && !document.hidden) {
    G.update(dt, S.music);
    // 重い端末では自動で画質を下げる
    if (gateState === 'open' && perf.checked < 3) { perf.n++; perf.acc += dt; if (perf.n >= 90) { const avg = perf.acc / perf.n; perf.n = 0; perf.acc = 0; perf.checked++;
      if (avg > .028) { perf.level++; root.classList.add('lowfx'); const q = S.q; q.dpr = Math.max(.6, q.dpr * .78); G.setQuality(q.dpr, perf.level >= 2 ? false : undefined); } } }
  }
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { measure(); fitFloor(); if (G) G.resize(); });
addEventListener('load', () => { measure(); fitFloor(); });
document.fonts && document.fonts.ready.then(() => { measure(); fitFloor(); });
measure(); fitFloor(); onSection(secs[0]);

window.HF = { sync: () => { S.y = scrollY; measure(); trackSections(); if (G) G.snap(); }, openGate: () => { gateDown({}); latched = true; holding = false; }, closeGate, skipGate, goTo, openSheet, Snd, get G() { return G; }, set G(v) {} };
if (TOUR) { store.set('hf3_newfx', '1'); body.classList.add('tour'); }
if (!TOUR && (RM || store.get('hf3_in'))) skipGate(); else { try { gateBtn.focus({ preventScroll: true }); } catch (e) {} }
requestAnimationFrame(frame);
if (/[?&]no3d/.test(location.search)) { g3dState = 'fail'; setGateReady(true); } else boot3D();

/* =====================================================================
   録画用ツアー（?tour）── 画面収録しながら放置するだけで紹介映像の素材になる
   ===================================================================== */
if (TOUR) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const go = (y, ms) => new Promise(res => { const y0 = scrollY, t0 = performance.now(); const st = now => { const k = clamp((now - t0) / ms); scrollTo(0, y0 + (y - y0) * ease(k)); k < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); });
  const top = id => $(id).offsetTop;
  const ev = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, clientX: x, clientY: y }));
  (async () => {
    while (g3dState === 'loading') await wait(200);
    await wait(1500); gateDown({}); await wait(900); gateUp(); latched = true;
    while (gateState !== 'open') await wait(100);
    await wait(4500);
    await go(top('#concept') + 10, 2600); await go(top('#concept') + innerHeight * 1.9, 8000); await wait(1800);
    await go(top('#pit') + 40, 2600); await wait(1500);
    for (const id of ['#cv-sumi', '#cv-star']) { const art = $(id).parentNode; await go(art.getBoundingClientRect().top + scrollY - innerHeight * .2, 1800); const r = art.getBoundingClientRect();
      for (let k = 0; k < 12; k++) { ev(art, 'pointermove', r.left + r.width * (.2 + .05 * k), r.top + r.height * (.3 + .2 * Math.sin(k))); ev(art, 'pointerdown', r.left + r.width * .5, r.top + r.height * .5); await wait(220); } }
    { const art = $('#charger').parentNode; await go(art.getBoundingClientRect().top + scrollY - innerHeight * .2, 1800); ev(art, 'pointerenter', 5, 5); await wait(1800); }
    for (const id of ['#screening', '#crew', '#log', '#b1f']) { await go(top(id) + 20, 2600); await wait(id === '#log' ? 3800 : 2600); }
    await go(top('#parts') + 20, 2600); stks.forEach((s, i) => { s.vx = (i % 2 ? 1 : -1) * (14 + i * 3); s.vy = -10 + i * 4; }); await wait(3200);
    await go(top('#safe') + 20, 2600); hold.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 })); await wait(1500); hold.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 })); await wait(2600);
    await go(top('#radio') + 20, 2600); await wait(3000);
    await go(document.documentElement.scrollHeight, 4000); await wait(3500);
    console.log('TOUR_DONE');
  })();
}

/* BudouX：日本語の文節改行（任意） */
(async () => { try { const { loadDefaultJapaneseParser } = await import('https://cdn.jsdelivr.net/npm/budoux@0.6.2/+esm'); const p = loadDefaultJapaneseParser();
  $$('.jp').forEach(el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ns = []; while (w.nextNode()) ns.push(w.currentNode); ns.forEach(n => { if (n.nodeValue && n.nodeValue.trim()) n.nodeValue = p.parse(n.nodeValue).join('​'); }); }); measure(); } catch (e) {} })();
