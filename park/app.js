/* HANGAR F. 園 ── 画面の動き
   正本は works.json。ガイド（DOM）と模型（3D）は、どちらもここから同じ内容を描く。
   数字（作品数・開園日数・新着）はHTMLに書かず、毎回ここで数える。 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jp = s => `<budoux-ja>${esc(s)}</budoux-ja>`;
const DAY = 864e5;
const day = s => new Date(s + 'T00:00:00+09:00');
const ymd = d => { const j = new Date(d.getTime() + 9 * 3600e3); return j.toISOString().slice(0, 10); };
const md = s => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = new URLSearchParams(location.search);
const NOW = new Date();
const TODAY = ymd(NOW);

let DATA, KIROKU = {}, ATT = [], BYID = {}, LANDS = {}, D = null, dioP = null, heroVis = true, SEASON, CELEB = '';

/* ---------- データ ---------- */
async function load() {
  // 正本と整備記録は同時に読む（整備記録が読めなくても園は開く）
  const [r, k] = await Promise.all([fetch('works.json', { cache: 'no-cache' }), fetch('kiroku.json', { cache: 'no-cache' }).then(x => x.json()).catch(() => ({}))]);
  DATA = await r.json();
  // 整備記録は自動生成だが、形が崩れていても園は開く（読めない項目は捨てる）
  const ok = e => e && typeof e.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
  KIROKU = { entries: Array.isArray(k?.entries) ? k.entries.filter(ok) : [], next: k?.next && typeof k.next.name === 'string' && ok({ title: k.next.name, date: k.next.date }) ? k.next : null };
  for (const l of DATA.lands) LANDS[l.id] = l;
  ATT = DATA.works.filter(w => !w.facility).sort((a, b) => a.date.localeCompare(b.date));
  ATT.forEach((w, i) => { w.no = 'F-' + String(i + 1).padStart(2, '0'); });
  for (const w of DATA.works) { BYID[w.id] = w; w.fresh = (NOW - day(w.date)) / DAY < 7; }
  DATA.nextNo = 'F-' + String(ATT.length + 1).padStart(2, '0');
  DATA.days = Math.floor((NOW - day(DATA.park.opened)) / DAY) + 1;
  // 次の機体の札：もう園に建った作品・45日より古いものは出さない（整備記録は日誌を書いたときしか作り直されないため）
  const nx = KIROKU.next;
  if (nx && (DATA.works.some(w => (w.url || '').includes(`//${nx.host}.pages.dev`)) || (NOW - day(nx.date)) / DAY > 45)) KIROKU.next = null;
  SEASON = seasonOf(Q.get('season'));
  CELEB = milestone();
}

/* 季節：日付だけで決まる（定期作業なし）。秋は毎日すこしずつ色づき、春は桜、冬は雪 */
function seasonOf(force) {
  const mmdd = TODAY.slice(5), y = +TODAY.slice(0, 4), d = (a, b) => (day(`${y}-${b}`) - day(`${y}-${a}`)) / DAY;
  const pick = { autumn: { kind: 'autumn', p: .6 }, sakura: { kind: 'sakura', p: 1 }, winter: { kind: 'winter', p: 1 }, green: { kind: 'green', p: 0 } }[force];
  if (pick) return pick;
  if (mmdd >= '03-20' && mmdd <= '04-15') { const p = mmdd <= '04-01' ? d('03-20', mmdd) / 12 : 1 - d('04-01', mmdd) / 14; return { kind: 'sakura', p: Math.max(.15, p) }; }
  // 秋は10/1から60日かけて色づき、雪が来る12/15まで色づいたまま（12月前半に緑へ戻さない）
  if (mmdd >= '10-01' && mmdd < '12-15') return { kind: 'autumn', p: Math.min(1, d('10-01', mmdd) / 60) };
  if (mmdd >= '12-15' || mmdd <= '02-29') return { kind: 'winter', p: 1 };
  return { kind: 'green', p: 0 };
}
function seasonText(s) {
  return s.kind === 'autumn' ? (s.p >= 1 ? '秋の終わり ── 園の木がすっかり色づきました' : `秋 ── 園の木の${Math.round(s.p * 100)}％が色づきました（毎日すこしずつ）`)
    : s.kind === 'sakura' ? '春 ── 園の桜が咲いています'
    : s.kind === 'winter' ? '冬 ── 園に雪が降っています'
    : `${+TODAY.slice(5, 7)}月 ── 緑の園`;
}
/* 節目：開園の日数と、アトラクションの数。達してから14日間だけ玄関に旗が立つ */
function milestone() {
  const days = DATA.days, out = [];
  const M = [30, 50, 100, 150, 200, 250, 300, 365, 400, 500, 600, 700, 730, 800, 900, 1000].filter(m => m <= days).pop();
  if (M && days - M < 14) out.push(`開園${M}日`);
  const n = Math.floor(ATT.length / 5) * 5;
  if (n && (NOW - day(ATT[n - 1].date)) / DAY < 14) out.push(`${n}基`);
  return out.length ? '祝 ' + out.join('・') : '';
}

/* 前回の訪問から増えた・更新されたもの（端末にだけ保存） */
function sinceLast() {
  const last = store.get('hf.last');
  const fresh = last ? DATA.works.filter(w => w.date > last || (w.updated && w.updated > last)) : [];
  addEventListener('pagehide', () => store.set('hf.last', TODAY));
  return { last, fresh };
}

/* ---------- 描画（ガイド・札で共用） ---------- */
function attHTML(w, { inCard = false } = {}) {
  const land = LANDS[w.land] || {};
  const shot = w.shot || w.thumb;
  const meta = [w.no ? `${w.no}` : '', `公開 ${md(w.date)}${w.date.slice(0, 4) !== TODAY.slice(0, 4) ? '（' + w.date.slice(0, 4) + '）' : ''}`, w.updated ? `刷新 ${md(w.updated)}` : ''].filter(Boolean);
  return `<article class="att" id="${inCard ? 'c' : 'w'}-${esc(w.id)}" style="--c:${esc(w.color || land.color)}" aria-labelledby="${inCard ? 'ct' : 't'}-${esc(w.id)}">
    <div class="att-shot">${shot ? `<img src="${esc(shot)}" alt="${esc(w.name)}の画面" loading="lazy" width="960" height="600">` : `<span class="glyph" aria-hidden="true">${esc(w.icon)}</span>`}
      ${w.no ? `<span class="att-no">${esc(w.no)}</span>` : ''}</div>
    <div class="att-body">
      <p class="att-meta">${w.flagship ? '<span class="tag-new tag-star">主力</span>' : ''}${w.fresh ? '<span class="tag-new">NEW</span>' : ''}<span>${esc(land.name || '')}</span>${meta.map(m => `<span>${esc(m)}</span>`).join('')}<span class="wait">待ち時間 0分</span></p>
      <h4 id="${inCard ? 'ct' : 't'}-${esc(w.id)}"><span class="nb">${esc(w.name)}</span></h4>
      <p class="att-one">${jp(w.one)}</p>
      <p class="att-desc">${jp(w.desc)}</p>
      <div class="att-btns">
        <a class="btn-go" href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.go || '開く')}</a>
        ${inCard ? `<button type="button" class="btn-line" data-guide="${esc(w.id)}">ガイドで見る</button>` : `<button type="button" class="btn-line" data-model="${esc(w.id)}">模型で見る</button>`}
        <button type="button" class="btn-line" data-share="${esc(w.id)}">教える</button>
      </div>
    </div></article>`;
}

function renderBoard(since) {
  const days = DATA.days;
  const latest = [...ATT].sort((a, b) => (b.updated || b.date).localeCompare(a.updated || a.date))[0];
  const flap = s => `<span class="flap" aria-hidden="true">${[...String(s)].map(c => `<b>${esc(c)}</b>`).join('')}</span>`;
  const ph = { day: '昼', dusk: '夕方', night: '夜' }[phaseNow()];
  let news;
  if (since.last && since.fresh.length) news = since.fresh.map(w => `<span class="tag-new">${w.updated && w.updated > since.last && w.date <= since.last ? '刷新' : 'NEW'}</span><a href="#w-${esc(w.id)}">${esc(w.name)}</a>`).join('、');
  else if (since.last) news = `前回（${md(since.last)}）から、まだ増えていません。いま工事中です。`;
  else news = `いちばん新しいのは <a href="#w-${esc(latest.id)}">${esc(latest.name)}</a>（${md(latest.updated || latest.date)}）`;
  $('#board').innerHTML = `
    <div><dt>開園から</dt><dd>${flap(days)} <span>日目</span><span class="sr-only" style="position:absolute;left:-999px">${days}日目</span></dd></div>
    <div><dt>アトラクション</dt><dd>${flap(ATT.length)} <span>基</span>（発信の設備 ${DATA.works.length - ATT.length}つ）</dd></div>
    <div><dt>${since.last ? '前回から' : '最新'}</dt><dd>${news}</dd></div>
    <div><dt>きょうの園</dt><dd>${jp(seasonText(SEASON))}${CELEB ? `<br><span class="tag-new">${esc(CELEB)}</span>` : ''}</dd></div>
    <div><dt>いま工事中</dt><dd>${esc(DATA.construction.label)} <b>${esc(DATA.nextNo)}</b> ── ${KIROKU.next ? jp(`新作「${KIROKU.next.name}」を建てています（${md(KIROKU.next.date)}〜）`) : jp(DATA.construction.note)}</dd></div>
    <div><dt>いまの園</dt><dd>${ph}の園（あなたの時計で ${NOW.getHours()}時）</dd></div>`;
}

function renderNow() {
  const g = ATT.find(w => w.flagship) || ATT.filter(w => w.land === 'play').sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!g) return;
  const el = $('#now'); el.hidden = false; el.style.setProperty('--c', g.color);
  $('.now-body', el).innerHTML = `<img src="${esc(g.shot)}" alt="${esc(g.name)}の画面" width="960" height="504">
    <h3><span class="nb">${esc(g.name)}</span></h3><p class="att-one" style="margin:0">${jp(g.one)}</p>
    <div class="att-btns"><a class="btn-go" style="--c:${esc(g.color)}" href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.go)}</a><button type="button" class="btn-line" data-model="${esc(g.id)}">模型で見る</button></div>`;
}

function renderGuide() {
  const order = ['play', 'rest', 'learn', 'ask'];
  $('#lands').innerHTML = order.map(id => {
    const l = LANDS[id], ws = DATA.works.filter(w => w.land === id).sort((a, b) => (!!b.flagship - !!a.flagship) || (!!a.facility - !!b.facility) || b.date.localeCompare(a.date));
    return `<section class="land" id="${id === 'ask' ? 'ask' : 'land-' + id}" style="--c:${esc(l.color)}" aria-labelledby="lh-${id}">
      <div class="land-head"><h3 id="lh-${id}">${esc(l.name)}</h3><span class="en">${esc(l.en)}</span><p>${jp(l.lead)}</p></div>
      <div class="cards">${ws.map(w => attHTML(w)).join('')}</div>
      ${id === 'ask' ? deskHTML() : ''}</section>`;
  }).join('');
}

function deskHTML() {
  const a = DATA.ask, days = DATA.days;
  return `<div class="desk" aria-label="相談の窓口">
    <div><h4>できること</h4><ul class="yes">${a.can.map(s => `<li>${jp(s)}</li>`).join('')}</ul></div>
    <div><h4>できないこと</h4><ul class="no">${a.cannot.map(s => `<li>${jp(s)}</li>`).join('')}</ul></div>
    <div class="desk-num"><span><b>${ATT.length}</b>基 公開中</span><span><b>${days}</b>日 作りつづけて</span></div>
    <div class="desk-cta"><a class="btn-go" style="--c:var(--ask)" href="${esc(BYID['pandasan-works'].url)}" target="_blank" rel="noopener">相談窓口へ</a><a class="btn-line" href="${esc(BYID.x.url)}" target="_blank" rel="noopener">XのDMで聞いてみる</a></div>
  </div>`;
}

function renderTheater() {
  const reels = DATA.media.filter(m => !m.from || NOW >= new Date(m.from));
  $('#reels').innerHTML = reels.map(m => `<div class="reel">
    <button type="button" class="yt" data-yt="${esc(m.yt)}" aria-label="${esc(m.title)}を再生する"><img src="https://i.ytimg.com/vi/${esc(m.yt)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="play" aria-hidden="true">▶</span></button>
    <div class="reel-cap"><h3>${esc(m.title)}</h3><p><a href="https://www.youtube.com/watch?v=${esc(m.yt)}" target="_blank" rel="noopener">YouTubeで見る</a></p></div></div>`).join('');
}

function renderLog() {
  const es = (KIROKU.entries || []).slice(0, 6);
  if (!es.length) return;
  $('#log-list').innerHTML = es.map(e => `<li><time datetime="${esc(e.date)}">${esc(e.date)}</time><span>${jp(e.title)}</span></li>`).join('');
  $('#logbook').hidden = false;
}

function renderExit() {
  const f = [
    ['HF101', 'X', 'いま作っているものを、ひとことで', 'https://x.com/intent/follow?screen_name=shirotapandasan', 'FOLLOW'],
    ['HF202', '相談窓口', 'パンダさんワークス ── 困りごと、ひとつ形にします', BYID['pandasan-works'].url, 'BOARDING'],
    ['HF303', '売店', 'パンダさんのステッカー', BYID.suzuri.url, 'OPEN'],
  ];
  $('#flights').innerHTML = f.map(([no, to, sub, url, st]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener"><span class="fno">${no}</span><span class="fto">${esc(to)}<small>${jp(sub)}</small></span><span class="fgo">${st}</span></a></li>`).join('');
  $('#stub-no').textContent = ticketNo(); $('#stub-d').textContent = `${TODAY.replace(/-/g, '.')} 入園`;
}
const ticketNo = () => 'F-' + TODAY.slice(5).replace('-', '');
function phaseNow() { const h = NOW.getHours() + NOW.getMinutes() / 60; return h >= 6.5 && h < 16.5 ? 'day' : (h >= 16.5 && h < 18.8) || (h >= 5 && h < 6.5) ? 'dusk' : 'night'; }

/* ---------- 共有・動画・お知らせ ---------- */
function toast(msg) { const t = $('#toast'); t.innerHTML = jp(msg); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3200); }
async function share(w) {
  const url = w ? `${DATA.park.url}#w-${w.id}` : DATA.park.url;
  const text = w ? `${w.name} ── ${w.one}（HANGAR F.）` : `HANGAR F. ── ${DATA.park.catch}`;
  try { if (navigator.share) { await navigator.share({ title: 'HANGAR F.', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('リンクをコピーしました'); } catch (e) { open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener'); }
}
function playYT(btn) {
  const id = btn.dataset.yt; if (!/^[\w-]{11}$/.test(id)) return;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`; f.title = btn.getAttribute('aria-label') || '動画';
  f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
  const box = document.createElement('div'); box.className = 'yt'; box.appendChild(f); btn.replaceWith(box);
}

/* ---------- 模型（3D） ---------- */
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
function bootDiorama() {
  if (dioP) return dioP;
  if (!webglOK()) return (dioP = Promise.resolve(null));
  dioP = (async () => {
    await Promise.race([Promise.all([document.fonts.load('700 40px "Zen Kaku Gothic New"'), document.fonts.load('900 40px "Big Shoulders Display"')]), new Promise(r => setTimeout(r, 1200))]);
    const { createDiorama } = await import('./diorama.js');
    const t = Q.get('phase');
    D = await createDiorama($('#cv'), { data: DATA, reduced: RM, pinsEl: $('#pins'), phase: ['day', 'dusk', 'night'].includes(t) ? t : undefined, season: SEASON, celebrate: CELEB,
      onSelect: (id, how) => id ? pick(id, how) : closeCard(), onSlow: slow });
    $('#stage').classList.add('ready');
    if (!document.body.classList.contains('in-park')) D.setIdle(true);
    return D;
  })().catch(e => { console.warn('模型を出せませんでした', e); return null; });
  return dioP;
}
function slow(ms) {
  if (!document.body.classList.contains('in-park')) { D?.setIdle(false); D?.pause(); return; }
  leavePark(); toast('この端末では模型が重いので、ガイドでご案内します'); location.hash = '#guide';
}

/* 入口の模型は、入口が見えているあいだだけ動かす（電池のため） */
function watchHero() {
  new IntersectionObserver(([e]) => { heroVis = e.isIntersecting; if (!D || D.slow || document.body.classList.contains('in-park')) return; heroVis ? D.resume() : D.pause(); }, { threshold: .05 }).observe($('#top'));
}

/* ---------- 園の中 ---------- */
let curLand = 'all', lastFocus = null;
async function enterPark(selectId) {
  lastFocus = document.activeElement;
  const ritual = !RM && !store.get('hf.ritual.' + TODAY);
  if (ritual) {
    $('#tk-no').textContent = ticketNo(); $('#tk-d').textContent = `${TODAY.replace(/-/g, '.')} ／ ${DATA.park.name}`;
    const r = $('#ritual'); r.hidden = false; store.set('hf.ritual.' + TODAY, '1');
    setTimeout(() => { r.hidden = true; }, 1900);
  }
  const d = await Promise.race([bootDiorama(), new Promise(r => setTimeout(() => r('late'), 3000))]);
  if (!d || d === 'late' || d.slow) { $('#ritual').hidden = true; toast(d?.slow ? 'この端末では模型が重いので、ガイドでご案内します' : '模型の準備が間に合わなかったので、ガイドでご案内します'); location.hash = '#guide'; return; }
  document.body.classList.add('in-park'); $('#park-ui').hidden = false;
  D.setIdle(false); D.resume(); D.resize(); D.watch();
  buildParkUI();
  if (Q.get('t')) setHistory(Q.get('t'));
  if (selectId) pick(selectId, 'guide'); else { D.select(null); $('#pk-tip').hidden = false; setTimeout(() => $('#pk-tip').hidden = true, 5200); }
  $('#pk-tabs button')?.focus({ preventScroll: true });
}
function leavePark() {
  document.body.classList.remove('in-park'); $('#park-ui').hidden = true; closeCard(true);
  D?.select(null); D?.setIdle(true); D?.setDate(new Date(8.64e15));
  $('#pk-time').hidden = true; $('#pk-range').value = 100; $('[data-history]')?.setAttribute('aria-expanded', 'false');
  if (!heroVis || D?.slow) D?.pause();
  lastFocus?.focus?.({ preventScroll: true });
}
function buildParkUI() {
  if (buildParkUI.done) return; buildParkUI.done = true;
  const tabs = [['all', 'すべて', '#1f2430'], ...DATA.lands.map(l => [l.id, l.name, l.color])];
  $('#pk-tabs').innerHTML = tabs.map(([id, n, c]) => `<button type="button" role="tab" data-land="${id}" aria-selected="${id === 'all'}" style="--c:${c}">${esc(n)}</button>`).join('')
    + `<button type="button" data-history aria-expanded="false" style="--c:var(--play)">⏳ 時間</button>`;
  drawStrip();
}
function drawStrip() {
  const ws = DATA.works.filter(w => curLand === 'all' || w.land === curLand).sort((a, b) => b.date.localeCompare(a.date));
  $('#pk-strip').innerHTML = ws.map(w => `<button type="button" data-pick="${esc(w.id)}" style="--c:${esc(w.color)}"><i aria-hidden="true">${esc(w.icon)}</i><span class="nb">${esc(w.name)}</span></button>`).join('');
}
function pick(id, how) {
  const w = BYID[id]; if (!w) return;
  D?.select(id);
  $('#card-in').innerHTML = attHTML(w, { inCard: true });
  const c = $('#card'); c.hidden = false; c.scrollTop = 0;
  $$('#pk-strip button').forEach(b => b.classList.toggle('on', b.dataset.pick === id));
  if (how !== 'tap') $(`#ct-${CSS.escape(id)}`)?.setAttribute('tabindex', '-1'), $(`#ct-${CSS.escape(id)}`)?.focus({ preventScroll: true });
}
function closeCard(silent) { $('#card').hidden = true; $$('#pk-strip button.on').forEach(b => b.classList.remove('on')); if (!silent) D?.select(null); }

/* 時間をさかのぼる：開園の日から今日まで */
function setHistory(v) {
  const start = day(DATA.park.opened).getTime(), end = day(TODAY).getTime(), span = Math.max(1, (end - start) / DAY);
  let t;
  if (typeof v === 'string') { const m = v.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/); t = m ? day(`${m[1]}-${m[2]}-${m[3] || '28'}`) : new Date(end); $('#pk-range').value = Math.round(Math.min(span, Math.max(0, (t - start) / DAY)) / span * 100); $('#pk-time').hidden = false; }
  else t = new Date(start + span * DAY * v / 100);
  if (t < start) t = new Date(start);
  if (+$('#pk-range').value >= 100) t = new Date(end + DAY);
  D?.setDate(t);
  const s = ymd(t), n = ATT.filter(w => day(w.date) <= t).length;
  $('#pk-date').textContent = `${s > TODAY ? '今日' : s.replace(/-/g, '.')} ── ${n}基`;
}

/* ---------- 起動 ---------- */
async function main() {
  await load();
  const since = sinceLast();
  renderBoard(since); renderNow(); renderGuide(); renderTheater(); renderExit(); renderLog();
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-enter],[data-model],[data-guide],[data-share],[data-pick],#pk-tabs [data-land],[data-history],[data-close],[data-leave],.yt[data-yt],#share-park,#pk-help');
    if (!t) return;
    if (t.matches('[data-enter]')) enterPark();
    else if (t.dataset.model) enterPark(t.dataset.model);
    else if (t.dataset.guide) { const id = t.dataset.guide; leavePark(); const a = $(`#w-${CSS.escape(id)}`); a?.scrollIntoView({ block: 'center' }); a?.classList.add('flash'); setTimeout(() => a?.classList.remove('flash'), 2400); }
    else if (t.dataset.share) share(BYID[t.dataset.share]);
    else if (t.dataset.pick) pick(t.dataset.pick, 'strip');
    else if (t.dataset.land) { curLand = t.dataset.land; $$('#pk-tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b === t)); drawStrip(); closeCard(true); D?.focusLand(curLand === 'all' ? null : curLand); }
    else if (t.matches('[data-history]')) { const p = $('#pk-time'), on = p.hidden; p.hidden = !on; t.setAttribute('aria-expanded', on); if (!on) { $('#pk-range').value = 100; setHistory(100); } else setHistory(+$('#pk-range').value); }
    else if (t.matches('[data-close]')) closeCard();
    else if (t.matches('[data-leave]')) leavePark();
    else if (t.matches('.yt[data-yt]')) playYT(t);
    else if (t.id === 'share-park') share(null);
    else if (t.id === 'pk-help') { const p = $('#pk-tip'); p.hidden = !p.hidden; t.setAttribute('aria-expanded', !p.hidden); }
  });
  $('#pk-range').addEventListener('input', e => setHistory(+e.target.value));
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !document.body.classList.contains('in-park')) return; $('#card').hidden ? leavePark() : closeCard(); });
  // 入口の模型は、最初の表示が終わってから読み込む（通信を節約する設定の端末では、入園を押すまで読まない）
  if (!navigator.connection?.saveData) (window.requestIdleCallback || setTimeout)(() => bootDiorama().then(() => watchHero()), { timeout: 900 });
  if (Q.get('t') || Q.has('park')) enterPark(Q.get('w') || undefined);
}
main().catch(e => { console.error(e); toast('園の案内を読み込めませんでした。時間をおいて開き直してください'); });
