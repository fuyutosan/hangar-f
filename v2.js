/* HANGAR F. v2 ── 依存ライブラリなし（BudouXのみ任意） */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const MOBILE=()=>matchMedia('(max-width:860px)').matches;
const store={get:k=>{try{return sessionStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){}}};
const root=document.documentElement,body=document.body;
const S={y:0,sy:0,mx:innerWidth/2,my:innerHeight/2,smx:0,smy:0,t:0,fly:0,over:0,tint:[1,.82,.45],dim:1,tTint:[1,.82,.45],tDim:1};
if(FINE)root.classList.add('fine');

/* ================= SOUND ================= */
const Snd={on:false,ctx:null,
  init(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();}if(this.ctx.state==='suspended')this.ctx.resume();},
  tone(f,d=.06,type='square',v=.035,slide=0){if(!this.on||!this.ctx)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain(),n=c.currentTime;o.type=type;o.frequency.setValueAtTime(f,n);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),n+d);g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g).connect(c.destination);o.start();o.stop(n+d+.02)},
  noise(d=1,f0=400,f1=60,v=.2){if(!this.on||!this.ctx)return;const c=this.ctx,n=c.currentTime,len=c.sampleRate*d,b=c.createBuffer(1,len,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<len;i++)a[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(f0,n);f.frequency.exponentialRampToValueAtTime(f1,n+d);const g=c.createGain();g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);s.connect(f).connect(g).connect(c.destination);s.start()},
  tick(){this.tone(1500,.025,'square',.015)},blip(){this.tone(620,.07,'square',.035);setTimeout(()=>this.tone(930,.09,'square',.035),70)},
  rumble(){this.noise(1.6,320,40,.3);this.tone(55,1.2,'sawtooth',.06,-20)},whoosh(){this.noise(1.3,200,4000,.16);this.tone(220,1.2,'sawtooth',.03,600)},
  ok(i=0){this.tone(520+i*110,.1,'triangle',.05)}
};
const sndBtn=$('#snd');
function setSnd(v){Snd.on=v;if(v)Snd.init();sndBtn.setAttribute('aria-pressed',v);sndBtn.textContent=v?'SOUND ON':'SOUND OFF';store.set('hf_snd',v?'1':'0');if(v)Snd.blip()}
sndBtn.addEventListener('click',()=>setSnd(!Snd.on));
if(store.get('hf_snd')==='1'){addEventListener('pointerdown',()=>{if(!Snd.on)setSnd(true)},{once:true})}
addEventListener('keydown',e=>{if(e.key==='s'&&!e.metaKey&&!e.ctrlKey&&!/input|textarea|button|a/i.test(e.target.tagName))setSnd(!Snd.on)});
document.addEventListener('pointerover',e=>{const t=e.target.closest&&e.target.closest('a,button,.chip');if(t&&t!==Snd._last){Snd._last=t;Snd.tick()}else if(!t)Snd._last=null});

/* ================= WebGL 回廊（スクロール＝奥へ歩く） ================= */
const cv=$('#gl');let gl=null,U={};
const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS=`precision highp float;
uniform vec2 uRes,uM,uMs;uniform float uT,uZ,uDim,uOver;uniform vec3 uTint;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float b2(vec2 p){p=floor(mod(p,2.));return mod(p.x*2.+p.y*3.,4.)/4.;}
float bayer(vec2 p){return (b2(p)*4.+b2(floor(p/2.)))/16.;}
void main(){
  vec2 uv0=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 uv=uv0;
  uv.x+=sin(uT*.23)*.012-uM.x*.07;
  uv.y+=sin(uZ*5.)*.0035-uM.y*.04;
  float W=1.15,H=.62;
  float ax=abs(uv.x)+1e-4,ay=abs(uv.y)+1e-4;
  float tf=H/ay,tw=W/ax,t=min(tf,tw);
  bool isFloor=tf<=tw;
  vec2 hit=uv*t;float z=t+uZ;
  float w=.018+t*.0035;
  vec3 col=vec3(0.);
  if(isFloor&&uv.y<0.){
    col=vec3(.045,.06,.1)+vec3(.02,.025,.04)*(1.-clamp(ay*2.,0.,1.));
    float lx=smoothstep(.5-w,.5,abs(fract(hit.x*.9)-.5));
    float lz=smoothstep(.5-w*.7,.5,abs(fract(z*.5)-.5));
    col+=vec3(.09,.12,.2)*max(lx,lz);
    if(abs(hit.x)<.055&&fract(z*.5)<.55)col=vec3(1.,.78,.2)*.85;
    float ex=abs(hit.x)-(W-.34);
    if(ex>0.&&ex<.2){float s=step(1.,mod((hit.x+z)*2.2,2.));col=mix(vec3(.9,.7,.15),vec3(.06,.06,.07),s)*.8;}
  }else if(isFloor){
    col=vec3(.03,.04,.07);
    float seg=fract(z*.25);
    float strip=step(seg,.16)*step(abs(hit.x),.55);
    float fl=.85+.15*sin(floor(z*.25)*7.+uT*3.);
    col+=vec3(1.,.93,.78)*strip*1.25*fl;
    col+=vec3(.12,.16,.26)*step(.92,seg)*.6;
    col+=vec3(.05,.07,.12)*smoothstep(.5-w,.5,abs(fract(hit.x*.9)-.5));
  }else{
    col=vec3(.065,.085,.135);
    float side=sign(uv.x);
    float seam=smoothstep(.0,.03+t*.002,abs(fract(z/3.)-.5)-.47);
    col*=1.-.55*seam;
    float rib=step(fract(z*.25),.07);
    col=mix(col,vec3(.2,.26,.4),rib*.8);
    if(hit.y<-H+.15){float s=step(1.,mod((hit.y+z)*2.4,2.));col=mix(vec3(.95,.74,.16),vec3(.07,.07,.08),s)*.75;}
    vec2 cell=floor(vec2(z*1.3,hit.y*6.));
    float hh=hash(cell+side*17.);
    if(hh>.965){float bl=step(.5,fract(uT*(.4+hh)+hh*9.));col+=(hh>.985?vec3(.2,1.,.55):vec3(1.,.72,.2))*(.5+bl);}
    float sign_=step(fract(z/12.),.22)*step(abs(hit.y-.08),.17);
    col=mix(col,vec3(1.,.5,.18)*(.7+.25*sin(uT*2.+z)),sign_*.9);
  }
  float fog=exp(-t*.07);
  col*=fog;
  col+=vec3(1.,.62,.2)*.6*exp(-length(uv)*8.5);
  float gate=smoothstep(.07,.03,length(uv));
  col=mix(col,vec3(1.,.82,.4),gate*.9);
  float sp=smoothstep(.55,0.,length(uv0-uMs));
  col=(col+.012)*(1.+sp*1.5)+vec3(1.,.9,.6)*sp*.035;
  vec2 dg=uv0*22.+vec2(0.,uT*.35);
  float dust=step(.985,hash(floor(dg)))*smoothstep(.2,.0,length(fract(dg)-.5));
  col+=dust*vec3(1.,.85,.55)*.55*(.4+sp*2.);
  col*=uTint*uDim;
  col+=uOver*vec3(.25,.16,0.)*(.5+.5*sin(uT*30.));
  col*=1.+uOver*.7;
  col=pow(clamp(col,0.,1.),vec3(.92));
  float L=6.;
  col=floor(col*L+bayer(gl_FragCoord.xy))/L;
  gl_FragColor=vec4(col,1.);
}`;
function initGL(){
  try{gl=cv.getContext('webgl',{antialias:false,powerPreference:'low-power',alpha:false});}catch(e){}
  if(!gl)return fallbackBG();
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(o));return null}return o};
  const v=sh(gl.VERTEX_SHADER,VS),f=sh(gl.FRAGMENT_SHADER,FS);if(!v||!f)return fallbackBG();
  const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.useProgram(p);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(p,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['uRes','uM','uMs','uT','uZ','uDim','uOver','uTint'].forEach(n=>U[n]=gl.getUniformLocation(p,n));
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;fallbackBG()});
  glResize();
}
function fallbackBG(){gl=null;cv.style.background='radial-gradient(ellipse at 50% 40%,#1a1f33,#06080d 70%)'}
function glResize(){if(!gl)return;const pix=Math.max(3,Math.round(innerHeight/270));cv.width=Math.ceil(innerWidth/pix);cv.height=Math.ceil(innerHeight/pix);gl.viewport(0,0,cv.width,cv.height)}
function glDraw(){
  if(!gl)return;
  const base=S.sy*.0042+S.t*.4-S.fly;
  gl.uniform2f(U.uRes,cv.width,cv.height);
  gl.uniform2f(U.uM,S.smx,S.smy);
  gl.uniform2f(U.uMs,(S.mx/innerWidth-.5)*(innerWidth/innerHeight),.5-S.my/innerHeight);
  gl.uniform1f(U.uT,S.t);gl.uniform1f(U.uZ,base);gl.uniform1f(U.uDim,S.dim);gl.uniform1f(U.uOver,S.over);
  gl.uniform3f(U.uTint,S.tint[0],S.tint[1],S.tint[2]);
  gl.drawArrays(gl.TRIANGLES,0,3);
}

/* ================= HERO ロゴ ================= */
const logo=$('#logo');logo.textContent='';
{
  [...'HANGAR F.'].forEach((c,i)=>{
    const a=document.createElement('span');a.className='ch'+(c===' '?' sp':'')+(c==='.'?' dt':'');a.style.setProperty('--i',i);a.setAttribute('aria-hidden','true');
    const b=document.createElement('span');b.className='chi';b.textContent=c===' '?' ':c;a.appendChild(b);logo.appendChild(a);
  });
}
const chs=$$('.ch',logo);
function logoPhysics(){
  if(!FINE||RM)return;
  chs.forEach(el=>{
    const r=el.getBoundingClientRect(),cx=r.left+r.width/2-(el._ox||0),cy=r.top+r.height/2-(el._oy||0);
    const dx=cx-S.mx,dy=cy-S.my,d=Math.hypot(dx,dy),R=260;
    let tx=0,ty=0;if(d<R){const k=(1-d/R)**2;tx=dx/d*k*38;ty=dy/d*k*26}
    el._ox=lerp(el._ox||0,tx,.12);el._oy=lerp(el._oy||0,ty,.12);
    el.style.transform=`translate3d(${el._ox.toFixed(1)}px,${el._oy.toFixed(1)}px,0) rotate(${(el._ox*.12).toFixed(2)}deg)`;
  });
}

/* ================= マニフェスト ================= */
const mf=$('#mf-text');let mfW=[];
{
  const txt=mf.textContent,hl=(mf.dataset.hl||'').split(',').filter(Boolean);mf.textContent='';
  const mark=new Array(txt.length).fill(false);
  hl.forEach(h=>{let i=-1;while((i=txt.indexOf(h,i+1))>=0)for(let k=0;k<h.length;k++)mark[i+k]=true});
  [...txt].forEach((c,i)=>{const s=document.createElement('span');s.className='w'+(mark[i]?' hl':'');s.textContent=c;mf.appendChild(s);mfW.push(s)});
}
const counters=$$('[data-count]');
function updateMf(p){
  const n=Math.floor(clamp(p/.72)*(mfW.length+1));
  mfW.forEach((s,i)=>s.classList.toggle('on',i<n));
  const cp=clamp((p-.6)/.3);
  counters.forEach(c=>{const to=+c.dataset.count;c.textContent=(c.dataset.pre||'')+Math.round(to*(1-(1-cp)**3))});
}

/* ================= ピン留め／横スクロール ================= */
const pins=$$('.pin').map(el=>({el,st:$('.stage',el)}));
const hs=$('#mainhangar'),hsTrack=$('#hs-track'),bays=$$('[data-bay]');let hsShift=0,hsP=0;
function layout(){
  if(MOBILE()){hs.style.height='';hsShift=0;hsTrack.style.removeProperty('--tx');return}
  hsShift=Math.max(0,hsTrack.scrollWidth-innerWidth);
  hs.style.height=(hsShift+$('.stage',hs).offsetHeight)+'px';
}
function updatePins(){
  pins.forEach(({el,st})=>{
    const r=el.getBoundingClientRect(),travel=r.height-st.offsetHeight;
    if(el===hs&&MOBILE())return;
    const p=travel>0?clamp(-r.top/travel):0;
    if(el===hs){hsP=lerp(hsP,p,RM?1:.12);el.style.setProperty('--p',hsP.toFixed(4));hsTrack.style.setProperty('--tx',(-hsP*hsShift).toFixed(1)+'px');
      bays.forEach(b=>{const br=b.getBoundingClientRect();b.style.setProperty('--bp',clamp(((br.left+br.width/2)-innerWidth/2)/(innerWidth/2),-1.5,1.5).toFixed(3))})}
    else{el.style.setProperty('--p',p.toFixed(4));if(el.id==='manifesto')updateMf(p)}
  });
}

/* ================= セクション追跡・HUD ================= */
const secs=$$('[data-nav]');const dots=$('#dots');const depthEl=$('#depth');let activeId='';
secs.forEach(s=>{const a=document.createElement('a');a.href='#'+s.id;a.innerHTML='<span>'+s.dataset.nav+'</span>';a.setAttribute('aria-label',s.dataset.nav);dots.appendChild(a);s._dot=a});
const heroEl=$('#hero'),footEl=$('footer');
function trackSections(){
  let cur=secs[0];
  secs.forEach(s=>{const r=s.getBoundingClientRect();if(r.top<=innerHeight*.5&&r.bottom>innerHeight*.5)cur=s});
  if(cur.id!==activeId){activeId=cur.id;secs.forEach(s=>s._dot.classList.toggle('on',s===cur));
    S.tTint=cur.dataset.tint.split(',').map(Number);S.tDim=+cur.dataset.dim}
  const hr=heroEl.getBoundingClientRect();heroEl.style.setProperty('--hp',clamp(-hr.top/(hr.height*.6)).toFixed(3));
  const max=document.documentElement.scrollHeight-innerHeight;root.style.setProperty('--sp',(max>0?S.y/max:0).toFixed(4));
  depthEl.textContent='DEPTH '+String(Math.round(S.y*.06)).padStart(4,'0')+'m';
  const fr=footEl.getBoundingClientRect();footEl.style.setProperty('--fp',clamp(1-fr.top/innerHeight).toFixed(3));
}

/* ================= カーソル ================= */
const cur=$('.cur'),curRing=$('.cur-ring'),curDot=$('.cur-dot'),curLabel=$('.cur-label');let cx=-100,cy=-100;
document.addEventListener('pointerover',e=>{
  if(!FINE)return;const t=e.target.closest&&e.target.closest('[data-cursor],a,button');
  if(t){cur.classList.add('hot');curLabel.textContent=t.dataset.cursor||(t.matches('button')?'':'GO')}else cur.classList.remove('hot');
});
document.addEventListener('pointerdown',()=>cur.classList.add('down'));document.addEventListener('pointerup',()=>cur.classList.remove('down'));
addEventListener('pointermove',e=>{S.mx=e.clientX;S.my=e.clientY},{passive:true});
function updateCursor(){
  S.smx=lerp(S.smx,(S.mx/innerWidth-.5)*2,.06);S.smy=lerp(S.smy,(S.my/innerHeight-.5)*-2,.06);
  cx=lerp(cx,S.mx,.22);cy=lerp(cy,S.my,.22);
  curRing.style.transform=`translate3d(${cx}px,${cy}px,0)`;curDot.style.transform=`translate3d(${S.mx}px,${S.my}px,0)`;
}

/* ================= チルト / 磁石 / 出現 ================= */
$$('[data-tilt]').forEach(el=>{
  el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.setProperty('--rx',((.5-y)*9).toFixed(2)+'deg');el.style.setProperty('--ry',((x-.5)*12).toFixed(2)+'deg');el.style.setProperty('--gx',(x*100)+'%');el.style.setProperty('--gy',(y*100)+'%')});
  el.addEventListener('pointerleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')});
});
const mags=$$('.mag');
function updateMags(){if(!FINE)return;mags.forEach(m=>{const r=m.getBoundingClientRect(),dx=S.mx-(r.left+r.width/2),dy=S.my-(r.top+r.height/2),d=Math.hypot(dx,dy);
  const k=d<140?(1-d/140)*.35:0;m._x=lerp(m._x||0,dx*k,.15);m._y=lerp(m._y||0,dy*k,.15);m.style.transform=`translate(${m._x.toFixed(1)}px,${m._y.toFixed(1)}px)`})}
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);if(en.target.id==='board')scrambleBoard()}}),{threshold:.12});
$$('.rv').forEach(el=>io.observe(el));

/* ================= 発着案内板 ================= */
const GL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=';
function scramble(el,final,delay=0,dur=700){
  const t0=performance.now()+delay;el.style.visibility='hidden';
  const step=()=>{const now=performance.now();if(now<t0){requestAnimationFrame(step);return}el.style.visibility='';
    const k=clamp((now-t0)/dur);let out='';for(let i=0;i<final.length;i++){out+=(i<final.length*k||final[i]===' ')?final[i]:GL[Math.random()*GL.length|0]}
    el.textContent=out;if(k<1)requestAnimationFrame(step);else el.textContent=final};
  requestAnimationFrame(step);
}
const rows=$$('.brow');
function scrambleBoard(){if(RM)return;rows.forEach((r,i)=>{$$('.d,.s',r).forEach(el=>scramble(el,el.textContent,i*45,600));const n=$('.n',r);scramble(n,n.textContent,i*45+80,800)})}
$$('.chip').forEach(c=>c.addEventListener('click',()=>{$$('.chip').forEach(x=>x.classList.toggle('on',x===c));const f=c.dataset.f;
  rows.forEach(r=>r.classList.toggle('hide',f!=='all'&&r.dataset.k!==f));layout()}));

/* ================= 整備記録 ================= */
(async()=>{try{
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const res=await fetch('kiroku.json',{cache:'no-store'});if(!res.ok)return;
  const list=((await res.json()).entries||[]).slice(0,12);if(!list.length)return;
  $('#maint-log').innerHTML=list.map((e,i)=>`<div class="l${i>=5?' fold':''}"><span>${esc(e.date)}</span><span>${esc(e.title)}</span></div>`).join('');
  $('#maint-sec').hidden=false;
  const b=$('#maint-more'),box=$('#maint-sec');const lab=()=>box.classList.contains('open')?'▲ 閉じる':'▼ すべて表示（あと'+(list.length-5)+'件）';
  if(list.length>5){b.textContent=lab();b.onclick=()=>{box.classList.toggle('open');b.textContent=lab()}}else b.hidden=true;
}catch(e){}})();

/* ================= YouTube ================= */
$$('.yt-play').forEach(btn=>btn.addEventListener('click',()=>{
  const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(btn.dataset.yt)+'?autoplay=1&rel=0&playsinline=1';
  f.title=btn.dataset.title||'動画';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;btn.replaceWith(f);
}));
const tc=$('#tc'),tcT0=performance.now();

/* ================= 機体デモ（墨・星・充電） ================= */
const visible=new Map();
const vio=new IntersectionObserver(es=>es.forEach(e=>visible.set(e.target,e.isIntersecting)),{rootMargin:'100px'});
const DPR=Math.min(devicePixelRatio||1,1.5);
function sized(c){const w=c.clientWidth,h=c.clientHeight;if(c.width!==Math.round(w*DPR)||c.height!==Math.round(h*DPR)){c.width=Math.round(w*DPR);c.height=Math.round(h*DPR)}return[c.width,c.height]}
const demos=[];
(()=>{ // 墨
  const c=$('#cv-sumi'),x=c.getContext('2d');vio.observe(c);const blots=[];let last=0,idle=0;
  const drop=(px,py,s=1)=>blots.push({x:px,y:py,r:3,max:(16+Math.random()*30)*s*DPR,a:.5+Math.random()*.2,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25+.1});
  const seal=document.createElement('span');seal.textContent='詠';seal.style.cssText='position:absolute;right:7%;bottom:7%;width:13%;aspect-ratio:1;display:grid;place-items:center;background:#c8301e;color:#f6e9d0;font:400 clamp(14px,2.6vw,30px) var(--f-disp);transform:rotate(4deg);opacity:.92;z-index:2';c.parentNode.appendChild(seal);
  c.parentNode.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),n=performance.now();if(n-last<45)return;last=n;drop((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height,.8);if(n%7<1)Snd.tone(180+Math.random()*80,.12,'sine',.03)});
  c.parentNode.addEventListener('pointerdown',e=>{const r=c.getBoundingClientRect();drop((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height,2.2);Snd.noise(.4,900,120,.12)});
  demos.push(t=>{if(!visible.get(c))return;const[W,H]=sized(c);
    idle+=1;if(idle>110){idle=0;drop(W*(.2+Math.random()*.6),H*(.15+Math.random()*.6),1.3)}
    x.globalCompositeOperation='destination-out';x.fillStyle='rgba(0,0,0,.004)';x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
    for(let i=blots.length-1;i>=0;i--){const b=blots[i];b.r+=(b.max-b.r)*.07;b.x+=b.vx;b.y+=b.vy;
      const g=x.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);g.addColorStop(0,`rgba(14,16,24,${b.a*.22})`);g.addColorStop(.6,`rgba(14,16,24,${b.a*.12})`);g.addColorStop(1,'rgba(14,16,24,0)');
      x.fillStyle=g;x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill();if(b.max-b.r<.6)blots.splice(i,1)}
  });
})();
(()=>{ // 星
  const c=$('#cv-star'),x=c.getContext('2d');vio.observe(c);const stars=[],extra=[];let shoot=null,nextShoot=3;
  for(let i=0;i<150;i++)stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.4,ph:Math.random()*6.28,sp:.6+Math.random()*1.6});
  const add=e=>{const r=c.getBoundingClientRect();extra.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,r:3.5,ph:0,sp:1,born:S.t});Snd.ok(extra.length%5)};
  c.parentNode.addEventListener('pointerdown',add);
  c.parentNode.addEventListener('pointermove',e=>{if(Math.random()<.12){const r=c.getBoundingClientRect();extra.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,r:1.6,ph:0,sp:2,born:S.t,fade:1})}});
  demos.push(t=>{if(!visible.get(c))return;const[W,H]=sized(c);x.clearRect(0,0,W,H);
    const breath=.62+.38*Math.sin(t*6.283/9);
    stars.forEach(s=>{const a=(.3+.7*(.5+.5*Math.sin(t*s.sp+s.ph)))*breath;x.fillStyle=`rgba(255,244,214,${a})`;x.fillRect(s.x*W,s.y*H,s.r*DPR,s.r*DPR)});
    for(let i=extra.length-1;i>=0;i--){const s=extra[i],age=t-s.born;if(s.fade&&age>1.2){extra.splice(i,1);continue}
      const a=s.fade?1-age/1.2:.6+.4*Math.sin(t*2+i)*breath;x.fillStyle=`rgba(255,236,180,${a})`;const R=s.r*DPR*(1+Math.max(0,.6-age)*3);
      x.shadowColor='rgba(255,220,140,.9)';x.shadowBlur=14*DPR;x.beginPath();x.arc(s.x*W,s.y*H,R,0,7);x.fill();x.shadowBlur=0;
      if(!s.fade&&age<1){x.strokeStyle=`rgba(255,236,180,${1-age})`;x.beginPath();x.arc(s.x*W,s.y*H,age*60*DPR,0,7);x.stroke()}}
    x.fillStyle='#f4eed3';x.beginPath();x.arc(W*.78,H*.2,W*.06,0,7);x.fill();x.fillStyle='#0d1533';x.beginPath();x.arc(W*.8,H*.18,W*.055,0,7);x.fill();
    if(!shoot&&t>nextShoot){shoot={x:Math.random()*.6+.2,y:Math.random()*.3,t0:t};nextShoot=t+5+Math.random()*5}
    if(shoot){const k=(t-shoot.t0)/.9;if(k>1)shoot=null;else{const sx=shoot.x*W+k*W*.35,sy=shoot.y*H+k*H*.3,g=x.createLinearGradient(sx,sy,sx-W*.12,sy-H*.09);g.addColorStop(0,`rgba(255,255,255,${1-k})`);g.addColorStop(1,'rgba(255,255,255,0)');x.strokeStyle=g;x.lineWidth=2*DPR;x.beginPath();x.moveTo(sx,sy);x.lineTo(sx-W*.12,sy-H*.09);x.stroke()}}
  });
})();
(()=>{ // 充電
  const el=$('#charger'),bars=$$('.batt i',el),pct=$('#pct'),msg=$('.msg',el);let level=0,target=0,leave=0;
  const set=v=>{level=v;bars.forEach((b,i)=>b.classList.toggle('on',i<level));pct.textContent=level*20+'%';el.classList.toggle('full',level===5);msg.textContent=level===5?'FULL ⚡ 元気いっぱい！':level?'CHARGING…':'待機中'};set(0);
  const on=()=>{clearTimeout(leave);target=5};const off=()=>{leave=setTimeout(()=>target=0,500)};
  const par=el.parentNode;par.addEventListener('pointerenter',on);par.addEventListener('pointerleave',off);par.addEventListener('pointerdown',()=>{target=target?0:5});
  setInterval(()=>{if(!visible.get(el)&&level===0)return;if(level<target){set(level+1);Snd.ok(level)}else if(level>target)set(level-1)},210);
  vio.observe(el);
})();

/* ================= ステッカー（ドラッグ） ================= */
const bench=$('#bench');const stks=[];let zTop=10;
$$('.stk',bench).forEach(a=>{
  a.draggable=false;const s={a,x:0,y:0,vx:0,vy:0,rot:+a.dataset.rot,base:+a.dataset.rot,drag:false,moved:0};stks.push(s);
  a.addEventListener('click',e=>{e.preventDefault();if(e.detail===0)window.open(a.href,'_blank','noopener')});
  a.addEventListener('pointerdown',e=>{s.drag=true;s.moved=0;s.px=e.clientX;s.py=e.clientY;try{a.setPointerCapture(e.pointerId)}catch(_){}a.classList.add('drag');a.style.zIndex=++zTop;Snd.tick()});
  a.addEventListener('pointermove',e=>{if(!s.drag)return;const dx=e.clientX-s.px,dy=e.clientY-s.py;s.px=e.clientX;s.py=e.clientY;s.x+=dx;s.y+=dy;s.vx=dx;s.vy=dy;s.moved+=Math.abs(dx)+Math.abs(dy)});
  const up=()=>{if(!s.drag)return;s.drag=false;a.classList.remove('drag');if(s.moved<6)window.open(a.href,'_blank','noopener');else Snd.blip()};
  a.addEventListener('pointerup',up);a.addEventListener('pointercancel',up);
});
function benchInit(){
  const br=bench.getBoundingClientRect();
  stks.forEach(s=>{if(s.init)return;const cs=getComputedStyle(s.a);s.ox=parseFloat(cs.left);s.oy=parseFloat(cs.top);s.a.style.left='0';s.a.style.top='0';s.x=s.ox;s.y=s.oy;s.init=true});
}
function updateStk(){
  if(!stks[0]||!stks[0].init){if(bench.getBoundingClientRect().width)benchInit();else return}
  const bw=bench.clientWidth,bh=bench.clientHeight;
  stks.forEach(s=>{const w=s.a.offsetWidth,h=s.a.offsetHeight;
    if(!s.drag){s.x+=s.vx;s.y+=s.vy;s.vx*=.92;s.vy*=.92;if(Math.abs(s.vx)<.05)s.vx=0;if(Math.abs(s.vy)<.05)s.vy=0}
    if(s.x<0){s.x=0;s.vx*=-.5}if(s.y<0){s.y=0;s.vy*=-.5}if(s.x>bw-w){s.x=bw-w;s.vx*=-.5}if(s.y>bh-h){s.y=bh-h;s.vy*=-.5}
    s.rot=lerp(s.rot,s.base+clamp(s.vx*1.6,-18,18),.15);
    s.a.style.transform=`translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) rotate(${s.rot.toFixed(1)}deg)`});
}

/* ================= 特別格納庫（長押し開扉） ================= */
{
  const rs=$('#rs'),hold=$('#hold'),ring=$('.hold-ring',hold);let t0=0,h=0,holding=false,opened=false,hT=0;
  const open=()=>{if(opened)return;opened=true;rs.classList.add('open','shake');setTimeout(()=>rs.classList.remove('shake'),1000);Snd.rumble();hold.setAttribute('aria-expanded','true');$$('#rs-list,.rs-note',rs).forEach(x=>x.removeAttribute('inert'))};
  hold.addEventListener('pointerdown',e=>{holding=true;t0=performance.now();clearTimeout(hT);hT=setTimeout(()=>{if(holding)open()},1100);try{hold.setPointerCapture(e.pointerId)}catch(_){}Snd.tone(90,1.1,'sawtooth',.04,200)});
  const rel=()=>{holding=false};hold.addEventListener('pointerup',rel);hold.addEventListener('pointercancel',rel);
  hold.addEventListener('click',e=>{if(e.detail===0)open()});
  demos.push(()=>{if(opened)return;h=holding?clamp((performance.now()-t0)/1100):Math.max(0,h-.04);ring.style.setProperty('--h',h.toFixed(3));if(h>=1)open()});
}

/* ================= 出撃カットイン ================= */
{
  const fx=$('#sortie');let busy=false;
  addEventListener('pageshow',()=>{fx.hidden=true;busy=false});
  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('a[data-sortie]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
    e.preventDefault();if(busy)return;busy=true;fx.hidden=false;Snd.whoosh();navigator.vibrate&&navigator.vibrate(30);
    setTimeout(()=>{location.href=a.href},RM?200:1500);setTimeout(()=>{fx.hidden=true;busy=false},4500);
  });
}

/* ================= 起動シーケンス（扉） ================= */
const boot=$('#boot'),sys=$('#sysstate');
let state='open',timers=[];const T=(fn,ms)=>timers.push(setTimeout(fn,ms)),clearT=()=>{timers.forEach(clearTimeout);timers=[]};
const setOn=()=>{sys.textContent='ONLINE';sys.className='online'},setOff=()=>{sys.textContent='OFFLINE';sys.className='offline'};
const nfx=$('#new-fx');let nfxT;
function closeNfx(go){if(nfx.hidden||nfx.classList.contains('leaving'))return;clearTimeout(nfxT);nfx.classList.add('leaving');setTimeout(()=>{nfx.hidden=true;nfx.classList.remove('leaving')},250);
  if(go){const d=$('#depot');scrollTo({top:d.offsetTop-60,behavior:'smooth'})}}
function showNfx(){if(store.get('hf_newfx'))return;store.set('hf_newfx','1');nfx.hidden=false;nfxT=setTimeout(()=>closeNfx(false),2600)}
nfx.addEventListener('click',()=>closeNfx(true));addEventListener('keydown',e=>{if(e.key==='Escape')closeNfx(false);if(e.key==='Enter'&&!nfx.hidden)closeNfx(true)});
function finish(){boot.hidden=true;body.classList.remove('locked');state='open';setOn();showNfx()}
function openDoors(fast){
  boot.classList.toggle('fast',!!fast);boot.classList.add('open1');Snd.rumble();
  S.fly=fast?30:46;
  T(()=>boot.classList.add('open2'),fast?120:320);
  T(()=>{root.classList.add('is-ready');setOn()},fast?150:500);
  T(finish,fast?900:2100);
}
function playBoot(){
  state='launching';clearT();boot.hidden=false;body.classList.add('locked');boot.classList.remove('fast','open1','open2');setOff();
  const lns=$$('.ln',boot),num=$('#boot-num'),bar=$('#boot-bar'),nn=$('#boot-n');
  lns.forEach((l,i)=>{l.classList.remove('show');T(()=>{l.classList.add('show');Snd.tick()},250+i*320)});
  const t0=performance.now()+700;
  const cnt=()=>{const k=clamp((performance.now()-t0)/1400);const n=Math.round(18*k);num.textContent=String(n).padStart(2,'0');bar.style.width=(k*100)+'%';if(n===18)nn.textContent='18/18 OK';if(k<1&&state==='launching')requestAnimationFrame(cnt)};
  requestAnimationFrame(cnt);
  $('#boot-skip').innerHTML='<span class="lamp"></span>TAP TO SKIP';
  T(()=>openDoors(false),2300);
}
function skipBoot(){clearT();$$('.ln',boot).forEach(l=>l.classList.add('show'));$('#boot-num').textContent='18';$('#boot-bar').style.width='100%';openDoors(true)}
function closeHangar(){
  if(state!=='open')return;state='closing';clearT();boot.hidden=false;body.classList.add('locked');boot.classList.remove('fast');
  boot.classList.add('open1','open2');setOff();void boot.offsetWidth;scrollTo({top:0,behavior:'smooth'});
  T(()=>boot.classList.remove('open2'),250);T(()=>boot.classList.remove('open1'),700);Snd.rumble();
  T(()=>{$('#boot-skip').innerHTML='▶ TAP TO OPEN';state='closed'},1700);
}
boot.addEventListener('pointerdown',()=>{if(state==='closed'){state='launching';openDoors(true)}else if(state==='launching')skipBoot()});
$('#close-hangar').addEventListener('click',closeHangar);
addEventListener('keydown',e=>{if(boot.hidden||(e.key!=='Enter'&&e.key!==' '&&e.key!=='Escape'))return;if(state==='closed'){state='launching';openDoors(true)}else if(state==='launching')skipBoot()});
window.__hangarLaunch=playBoot;window.__hangarClose=closeHangar;window.__newFx=()=>{try{sessionStorage.removeItem('hf_newfx')}catch(e){}showNfx()};

/* ================= ロゴ隠しコマンド ================= */
{
  const floor=$('#floor');
  const scr=()=>{if(!floor||floor.classList.contains('scramble'))return;floor.classList.add('scramble');setTimeout(()=>floor.classList.remove('scramble'),7000)};
  const od=()=>{body.classList.add('overdrive');S.over=1;Snd.rumble();setTimeout(()=>{body.classList.remove('overdrive');S.over=0},6000)};
  let taps=[];logo.addEventListener('click',()=>{scr();Snd.blip();const n=Date.now();taps=taps.filter(t=>n-t<3000);taps.push(n);if(taps.length>=5){taps=[];od()}});
  const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let pos=0;
  addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;pos=(k===code[pos])?pos+1:(k===code[0]?1:0);if(pos===code.length){pos=0;od()}});
}

/* ================= メインループ ================= */
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;S.t+=dt;
  S.y=scrollY;S.sy=lerp(S.sy,S.y,RM?1:1-Math.pow(.0008,dt));
  S.fly*=Math.pow(.05,dt);if(S.fly<.01)S.fly=0;
  for(let i=0;i<3;i++){S.tint[i]=lerp(S.tint[i],S.tTint[i],.04)}S.dim=lerp(S.dim,S.tDim,.05);
  updateCursor();glDraw();updatePins();trackSections();logoPhysics();updateMags();updateStk();
  demos.forEach(d=>d(S.t));
  const ts=Math.floor((now-tcT0)/1000);tc.textContent=[ts/3600|0,(ts/60|0)%60,ts%60].map(n=>String(n).padStart(2,'0')).join(':');
  requestAnimationFrame(frame);
}
addEventListener('resize',()=>{glResize();layout()});
document.fonts&&document.fonts.ready.then(layout);
addEventListener('load',()=>{layout();setTimeout(layout,600)});
initGL();layout();
const TOUR=/[?&]tour/.test(location.search);if(TOUR){store.set('hf_newfx','1');body.classList.add('tour')}
if(!TOUR&&(RM||store.get('hf_boot2'))){boot.hidden=true;body.classList.remove('locked');root.classList.add('is-ready')}
else{store.set('hf_boot2','1');playBoot()}
requestAnimationFrame(frame);


/* ================= 録画用ツアー（?tour）。画面収録しながら放置するだけで紹介映像の素材になる（約70秒） ================= */
if(TOUR){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const go=(y,ms)=>new Promise(res=>{const y0=scrollY,t0=performance.now();root.style.scrollBehavior='auto';
    const st=now=>{const k=clamp((now-t0)/ms);scrollTo(0,y0+(y-y0)*ease(k));k<1?requestAnimationFrame(st):res()};requestAnimationFrame(st)});
  const top=id=>$(id).offsetTop;
  const ev=(el,type,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:9,clientX:x,clientY:y}));
  (async()=>{
    while(!root.classList.contains('is-ready')||!boot.hidden)await wait(200);
    await wait(3500);                                    // ロゴ・キャッチ
    await go(top('#manifesto')+10,2500);await go(top('#manifesto')+innerHeight*1.9,9000);await wait(1500);   // コンセプト
    const h=$('#mainhangar'),span=h.offsetHeight-innerHeight;
    await go(h.offsetTop,2000);
    for(let i=0;i<3;i++){await go(h.offsetTop+span*(.1+i*.4),i?3200:2600);
      const art=$$('.bay-art')[i],r=art.getBoundingClientRect();
      for(let k=0;k<14;k++){ev(art.parentNode,'pointermove',r.left+r.width*(.2+.04*k),r.top+r.height*(.3+.2*Math.sin(k)));ev(art.parentNode,'pointerdown',r.left+r.width*.5,r.top+r.height*.5);await wait(220)}
      if(i===2){ev(art.parentNode,'pointerenter',r.left+5,r.top+5);await wait(1800)}
      await wait(900)}
    await go(top('#theater')-20,2500);await wait(2200);
    await go(top('#crew')-20,2000);await wait(2000);
    await go(top('#log')-20,2000);await wait(3500);
    await go(top('#depot')-20,2000);
    const stk=$$('.stk');stk.forEach((s,i)=>{s.vx=(i%2?1:-1)*(14+i*3);s.vy=-10+i*4});await wait(3500);
    await go(top('#restricted')-20,2000);
    const hd=$('#hold');hd.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9}));await wait(1700);hd.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));await wait(2500);
    await go(top('#tower')-20,2000);await wait(3000);
    await go(document.documentElement.scrollHeight,3500);await wait(3000);
    console.log('TOUR_DONE');
  })();
}

/* BudouX：日本語の文節改行（任意） */
(async()=>{try{const{loadDefaultJapaneseParser}=await import('https://cdn.jsdelivr.net/npm/budoux@0.6.2/+esm');const p=loadDefaultJapaneseParser();
  $$('.jp').forEach(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(n=>{if(n.nodeValue&&n.nodeValue.trim())n.nodeValue=p.parse(n.nodeValue).join('​')})})}catch(e){}})();
})();
