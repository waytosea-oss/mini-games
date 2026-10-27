"use strict";
(()=>{
// ================= utils =================
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const DBG={botColor:Q.has('botcolor'),level:+Q.get('level')||0,god:Q.has('god'),bot:Q.has('bot'),coins:Q.has('coins')?+Q.get('coins'):null,up:Q.get('up'),shop:Q.has('shop'),fast:Q.has('fast'),reset:Q.has('reset'),mute:Q.has('mute'),screen:Q.get('screen')};
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fmt=n=>{n=Math.floor(n);return n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'M':n>=1e4?(n/1e3).toFixed(n>=1e5?0:1)+'K':String(n);};

// ================= save =================
const SKEY='pilldoctor_v1';
const DEF={unlocked:1,stars:{},coins:0,up:{pow:0,rate:0,coin:0},pc:[1,0,0,0,0],cur:0,music:true,sfx:true,vib:true,tip:0};
let S;
try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem(SKEY)||'{}'));S.up=Object.assign({},DEF.up,S.up);if(!Array.isArray(S.pc)||S.pc.length!==5)S.pc=DEF.pc.slice();}catch(e){S=JSON.parse(JSON.stringify(DEF));}
if(DBG.reset)S=JSON.parse(JSON.stringify(DEF));
if(DBG.coins!==null)S.coins=DBG.coins;
if(DBG.up){const a=DBG.up.split(',').map(Number);S.up={pow:a[0]||0,rate:a[1]||0,coin:a[2]||0};}
if(Q.get('pc')){S.pc=Q.get('pc').split(',').map(Number).concat([0,0,0,0,0]).slice(0,5);if(!S.pc[0])S.pc[0]=1;}
if(Q.has('cur'))S.cur=+Q.get('cur')||0;
if(Q.has('notip'))S.tip=1;
if(DBG.level)S.unlocked=Math.max(S.unlocked,Math.min(NLV,DBG.level));
if(DBG.mute){S.music=false;S.sfx=false;}
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S))}catch(e){}}

// ================= data =================
// 五色药丸：每种颜色一种攻击方式（关卡解锁 / 金币提前购买，Lv.1–5 可升级）
const COLORS=[
 {n:'红',k:'速射',hex:'#ff3b4e',hi:'#ff9aa4',dk:'#a8101f',glow:'rgba(255,60,80,.9)',unlock:1,buy:0},
 {n:'蓝',k:'穿透',hex:'#2f8dff',hi:'#9cd0ff',dk:'#0a4aa8',glow:'rgba(50,140,255,.9)',unlock:4,buy:600},
 {n:'绿',k:'散射',hex:'#2fd27a',hi:'#a8ffcc',dk:'#0f7a3e',glow:'rgba(50,220,120,.9)',unlock:8,buy:1500},
 {n:'黄',k:'爆裂',hex:'#ffcc1a',hi:'#fff08a',dk:'#b07800',glow:'rgba(255,210,30,.9)',unlock:13,buy:3200},
 {n:'紫',k:'连锁闪电',hex:'#b06bff',hi:'#e2c4ff',dk:'#5b20a8',glow:'rgba(180,110,255,.9)',unlock:19,buy:5200},
];
const PCMAX=5,pcUpCost=(i,l)=>Math.round([220,400,600,850,1100][i]*Math.pow(2.1,l-1));
// 每种颜色的具体参数（l = 等级 1..5）
function pcSpec(i,l){l=Math.max(1,l);switch(i){
 case 0:return{rate:1.45+0.1*l,dmg:0.8,txt:`射速 ×${(1.45+0.1*l).toFixed(2)}，药丸连成一条火线`};
 case 1:return{rate:0.9,dmg:1.05,pierce:1+l,txt:`贯穿 ${1+l} 个病毒，无视铁甲`};
 case 2:{const n=3+Math.floor((l-1)/2);return{rate:0.95,dmg:0.5+0.04*l,n,txt:`一次扇形发射 ${n} 颗，每颗 ${Math.round((0.5+0.04*l)*100)}% 伤害`};}
 case 3:return{rate:0.62,dmg:1.35,rad:34+8*l,spl:0.55+0.07*l,txt:`命中爆炸，半径 ${34+8*l}，溅射 ${Math.round((0.55+0.07*l)*100)}% 伤害`};
 case 4:{const c=1+Math.ceil(l/2);return{rate:0.85,dmg:0.95,chain:c,cd:0.6+0.05*l,txt:`闪电连锁 ${c} 个病毒，每跳 ${Math.round((0.6+0.05*l)*100)}% 伤害`};}
}}
const WORLDS=[
 {n:'药瓶世界',s:'第一章 · 在巨大的药瓶里清除病菌',bg:'bg1',tint:'#0d3b44'},
 {n:'培养皿',s:'第二章 · 小心带金属护甲的病毒',bg:'bg2',tint:'#1d3a33'},
 {n:'显微镜下',s:'第三章 · 会冲刺的急速病毒出现了',bg:'bg3',tint:'#1a1440'},
 {n:'血管急救',s:'第四章 · 病毒在血液里横冲直撞',bg:'bg4',tint:'#3a0c14'},
 {n:'终极实验室',s:'第五章 · 与病毒大王的最终决战',bg:'bg5',tint:'#0a1630'},
 // 第六~十章（31–60 关）：沿用五张场景图，换色调区分
 {n:'冰封药柜',s:'第六章 · 病毒卷土重来，药柜结了冰',bg:'bg1',tint:'#0a2c4a'},
 {n:'菌落迷宫',s:'第七章 · 铁甲病毒成群结队',bg:'bg2',tint:'#25360f'},
 {n:'细胞深处',s:'第八章 · 急速病毒更多更快',bg:'bg3',tint:'#2a0f40'},
 {n:'心脏要塞',s:'第九章 · 守住心脏的最后防线',bg:'bg4',tint:'#40100a'},
 {n:'病毒母巢',s:'第十章 · 捣毁病毒母巢，彻底治愈',bg:'bg5',tint:'#061028'},
];
const NW=WORLDS.length, NLV=NW*6;
const BOSSN=['病毒大王·初','铁甲大王','急速大王','血魔大王','病毒大王·终极','寒霜大王','菌落女王','疾影大王','心魔大王','病毒母巢之主'];
const UPS=[
 {k:'pow',n:'火力',d:l=>`每颗药丸伤害 ${pdmg(l)} → ${pdmg(l+1)}`,max:40,cost:l=>Math.round(30*Math.pow(1.2,l)),icon:'pow'},
 {k:'rate',n:'射速',d:l=>`每秒发射 ${prate(l).toFixed(1)} → ${prate(l+1).toFixed(1)} 颗`,max:15,cost:l=>Math.round(50*Math.pow(1.33,l)),icon:'rate'},
 {k:'coin',n:'金币加成',d:l=>`金币收益 ×${(1+l*.2).toFixed(1)} → ×${(1.2+l*.2).toFixed(1)}`,max:10,cost:l=>Math.round(80*Math.pow(1.5,l)),icon:'coin'},
];
function pdmg(l){return 10+l*3}
function prate(l){return 7+l*0.6}
const ICONS={
 pow:'<svg viewBox="0 0 40 40"><g transform="rotate(-35 20 20)"><rect x="6" y="13" width="28" height="14" rx="7" fill="#fff"/><path d="M13 13h7v14h-7a7 7 0 0 1 0-14z" fill="#ff3b4e"/><rect x="9" y="15" width="10" height="3" rx="1.5" fill="#fff" opacity=".6"/></g><path d="M30 3l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#ffd84a"/></svg>',
 rate:'<svg viewBox="0 0 40 40"><path d="M23 3L9 22h9l-3 15 15-20h-9z" fill="#ffd84a" stroke="#b07800" stroke-width="2" stroke-linejoin="round"/></svg>',
 num:'<svg viewBox="0 0 40 40"><rect x="4" y="12" width="9" height="20" rx="4.5" fill="#fff"/><path d="M4 22v-5.5a4.5 4.5 0 0 1 9 0V22z" fill="#ff3b4e"/><rect x="15.5" y="6" width="9" height="20" rx="4.5" fill="#fff"/><path d="M15.5 16v-5.5a4.5 4.5 0 0 1 9 0V16z" fill="#ffcc1a"/><rect x="27" y="12" width="9" height="20" rx="4.5" fill="#fff"/><path d="M27 22v-5.5a4.5 4.5 0 0 1 9 0V22z" fill="#2f8dff"/></svg>',
 coin:'<svg viewBox="0 0 40 40"><circle cx="20" cy="21" r="14" fill="#f0a000"/><circle cx="20" cy="19" r="14" fill="#ffd23a"/><circle cx="20" cy="19" r="10" fill="none" stroke="#c98200" stroke-width="2"/><text x="20" y="25" font-size="15" font-weight="900" text-anchor="middle" fill="#a35a00">¥</text></svg>',
 vib:'<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="18" rx="2" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M4.5 8v8M2 10v4M19.5 8v8M22 10v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
 mOn:'<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="#fff"/><circle cx="17.5" cy="16" r="2.8" fill="#fff"/></svg>',
 sOn:'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
 heart:c=>`<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="${c}" stroke="#5a0a18" stroke-width="1.6"/><ellipse cx="8.5" cy="9" rx="2" ry="1.4" fill="#fff" opacity=".6"/></svg>`,
 star:(on,cls)=>`<svg class="${cls||''}" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" fill="${on?'#ffd84a':'#2b4a60'}" stroke="${on?'#b07800':'#14293a'}" stroke-width="1.5" stroke-linejoin="round"/>${on?'<path d="M8 9l2.5-.3L12 5" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>':''}</svg>`,
};


// ================= level gen =================
// 病毒血量（H0 = 本关最大号病毒血量）：100 起步，每关 ×1.13，取整到 10
const TIERM=[0.3,0.5,0.75,1];
function r10(v){return Math.max(10,Math.round(v/10)*10)}
// 31–60 关：每关血量 ×1.04（玩家升级在后期放缓，继续 ×1.13 会断崖），难度改由数量、铁甲/急速占比、速度递进
function levelInfo(L){
 const w=Math.min(NW-1,Math.floor((L-1)/6)), i=(L-1)%6, boss=i===5;
 const H0=r10(L<=30?100*Math.pow(1.13,L-1):100*Math.pow(1.13,29)*Math.pow(1.04,L-30));
 const R=mulberry(L*7919+13);
 const q=[];
 const drift=L<=30?24+L*1.3:63+(L-30)*0.55, side=L<=30?38+L*1.6:86+(L-30)*0.6;
 if(!boss){
  const n=5+Math.floor(i*0.9)+Math.min(w,4)+(w>4?Math.ceil((w-4)/2):0);
  for(let k=0;k<n;k++){
   let tier=R()<Math.min(0.6,0.18+i*0.08+w*0.05)?3:R()<0.6?2:1;
   if(L<=2)tier=k<2?1:2;
   let kind='n';
   if(w>=1&&R()<Math.min(0.36,0.12+w*0.05))kind='armor';
   else if(w>=2&&R()<(w>4?0.24:0.18))kind='fast';
   const hp=r10(H0*TIERM[tier]*(0.85+R()*0.3)*(kind==='fast'?0.7:1));
   q.push({delay:k===0?0.6:Math.max(1.1,3.4-Math.min(L,46)*0.05+R()*1.8-Math.min(w,4)*0.2),tier,hp,c:Math.floor(R()*3),kind});
  }
 }
 return {L,w,i,boss,H0,q,drift,side,bossHp:boss?r10(H0*32*(1+Math.min(w,4)*0.15+Math.max(0,w-4)*0.04)):0};
}

// ================= assets =================
const IMG={};
const LIST=['robot','v_red','v_yellow','v_blue','boss','bg1','bg2','bg3','bg4','bg5'];
function loadAll(cb){let n=0;LIST.forEach(k=>{const im=new Image();im.onload=im.onerror=()=>{n++;$('ldBar').style.width=(n/LIST.length*100)+'%';if(n===LIST.length)cb();};im.src='assets/'+k+(k.startsWith('bg')?'.jpg':'.png');IMG[k]=im;});}
const VS=[];
function tinted(img,col,alpha){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=alpha;x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return c;}
// ================= audio (WebAudio synth) =================
const AU={ctx:null,master:null,mus:null,sfx:null,delay:null};
const MUSV=0.5,SFXV=0.8;
function audioInit(){
 if(AU.ctx){if(AU.ctx.state!=='running')AU.ctx.resume();return;}
 const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
 const c=AU.ctx=new AC();
 const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.2;comp.connect(c.destination);
 AU.master=c.createGain();AU.master.gain.value=0.9;AU.master.connect(comp);
 AU.mus=c.createGain();AU.mus.gain.value=S.music?MUSV:0;AU.mus.connect(AU.master);
 AU.sfx=c.createGain();AU.sfx.gain.value=S.sfx?SFXV:0;AU.sfx.connect(AU.master);
 const d=c.createDelay(1);d.delayTime.value=0.27;const fb=c.createGain();fb.gain.value=0.28;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
 d.connect(lp);lp.connect(fb);fb.connect(d);const wet=c.createGain();wet.gain.value=0.35;lp.connect(wet);wet.connect(AU.master);AU.delay=d;
 const nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const ch=nb.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;AU.noise=nb;
 const b=c.createBuffer(1,1,22050);const s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);
 if(c.resume)c.resume();
 Music.start();
}
['pointerdown','touchend','click','keydown'].forEach(e=>window.addEventListener(e,audioInit,{passive:true}));
function setMusic(on){S.music=on;save();if(AU.mus)AU.mus.gain.setTargetAtTime(on?MUSV:0,AU.ctx.currentTime,0.05);refreshToggles();}
function setSfx(on){S.sfx=on;save();if(AU.sfx)AU.sfx.gain.setTargetAtTime(on?SFXV:0,AU.ctx.currentTime,0.05);refreshToggles();}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function osc(type,f,t,dur,vol,dest,opt={}){
 const c=AU.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
 if(opt.to)o.frequency.exponentialRampToValueAtTime(Math.max(20,opt.to),t+(opt.tt||dur));
 if(opt.det)o.detune.value=opt.det;
 if(opt.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*0.012,t+Math.min(dur,0.35));l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+0.05);}
 const a=opt.a||0.005;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);
 if(opt.hold){g.gain.setValueAtTime(vol,t+dur*0.7);}
 g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 let node=o;if(opt.lp){const f2=c.createBiquadFilter();f2.type='lowpass';f2.frequency.value=opt.lp;f2.Q.value=opt.q||1;o.connect(f2);node=f2;}
 node.connect(g);g.connect(dest);if(opt.send&&AU.delay){const sg=c.createGain();sg.gain.value=opt.send;g.connect(sg);sg.connect(AU.delay);}
 o.start(t);o.stop(t+dur+0.05);return o;
}
function noise(t,dur,vol,dest,type='bandpass',f=2000,q=1,opt={}){
 const c=AU.ctx,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.noise;fl.type=type;fl.frequency.setValueAtTime(f,t);if(opt.to)fl.frequency.exponentialRampToValueAtTime(opt.to,t+dur);fl.Q.value=q;
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(dest);s.start(t,Math.random()*0.5);s.stop(t+dur+0.02);
}
const lastS={};
function sfx(name){
 if(!AU.ctx||!S.sfx||AU.ctx.state!=='running')return;const c=AU.ctx,t=c.currentTime,D=AU.sfx;
 const thr={zap:0.06,boom:0.07,pierce:0.06,shoot:0.07,hit:0.05,match:0.06,coin:0.045,pop:0.03,bounce:0.08,split:0.05}[name]||0;
 if(thr){if(lastS[name]&&t-lastS[name]<thr)return;lastS[name]=t;}
 switch(name){
  case 'shoot':osc('sine',rand(760,860),t,0.06,0.045,D,{to:480});noise(t,0.03,0.025,D,'highpass',6000,1);break;
  case 'hit':osc('square',rand(300,360),t,0.05,0.03,D,{to:170,lp:1600});noise(t,0.04,0.045,D,'bandpass',1300,2);break;
  case 'match':osc('triangle',rand(1150,1350),t,0.09,0.06,D,{to:1900});osc('sine',2600,t+0.02,0.07,0.025,D);break;
  case 'pop':{const p=rand(0.9,1.15);noise(t,0.22,0.32,D,'lowpass',2400*p,1,{to:300});osc('sine',460*p,t,0.2,0.3,D,{to:70});osc('square',950*p,t,0.07,0.05,D,{to:220,lp:2500});osc('triangle',1400*p,t+0.03,0.08,0.04,D,{to:2200});break;}
  case 'bigpop':noise(t,0.55,0.5,D,'lowpass',1800,1,{to:120});osc('sine',220,t,0.5,0.5,D,{to:40});osc('sawtooth',520,t,0.2,0.07,D,{to:80,lp:1500});[0,4,7].forEach((n,i)=>osc('triangle',mtof(79+n),t+0.05+i*0.04,0.15,0.04,D));break;
  case 'coin':osc('square',1318,t,0.07,0.035,D,{lp:5000});osc('square',1975,t+0.06,0.16,0.035,D,{lp:5000});break;
  case 'power':[0,4,7,12,16].forEach((n,i)=>osc('square',mtof(72+n),t+i*0.05,0.12,0.055,D,{lp:4000,send:.3}));osc('sine',mtof(96),t+0.25,0.3,0.05,D,{send:.4});break;
  case 'hurt':osc('sawtooth',320,t,0.35,0.2,D,{to:60,lp:1200});noise(t,0.3,0.22,D,'lowpass',900,1);osc('square',140,t+0.05,0.25,0.08,D,{to:70,lp:600});break;
  case 'shield':osc('sine',400,t,0.4,0.14,D,{to:1200});osc('triangle',800,t+0.05,0.3,0.05,D,{to:2000,send:.3});break;
  case 'shieldbreak':noise(t,0.4,0.3,D,'highpass',3000,1);osc('triangle',1500,t,0.3,0.1,D,{to:300});break;
  case 'freeze':for(let i=0;i<6;i++)osc('sine',mtof(84+[0,7,12,16,19,24][i]),t+i*0.04,0.4,0.04,D,{send:.4});noise(t,0.5,0.07,D,'highpass',6000,1);break;
  case 'laser':osc('sawtooth',110,t,0.55,0.09,D,{to:440,lp:2000});osc('square',220,t,0.55,0.045,D,{to:880,lp:3000});break;
  case 'switch':osc('triangle',660,t,0.06,0.07,D,{to:990});osc('sine',1320,t+0.03,0.06,0.04,D);break;
  case 'click':osc('triangle',900,t,0.05,0.08,D,{to:1300});osc('sine',1800,t+0.01,0.03,0.03,D);break;
  case 'buy':[0,7,12].forEach((n,i)=>osc('square',mtof(76+n),t+i*0.06,0.1,0.05,D,{lp:4500}));osc('triangle',mtof(100),t+0.18,0.25,0.05,D,{send:.3});break;
  case 'deny':osc('square',180,t,0.12,0.06,D,{lp:900});osc('square',150,t+0.12,0.16,0.06,D,{lp:900});break;
  case 'bounce':osc('sine',rand(130,170),t,0.1,0.07,D,{to:80});break;
  case 'split':osc('sine',600,t,0.1,0.07,D,{to:1150});break;
  case 'roar':osc('sawtooth',90,t,1.0,0.22,D,{to:45,lp:700,q:6});osc('sawtooth',93,t,1.0,0.18,D,{to:47,lp:700});noise(t,0.9,0.18,D,'lowpass',500,2);break;
  case 'spit':osc('square',260,t,0.15,0.07,D,{to:120,lp:1200});noise(t,0.12,0.1,D,'bandpass',800,3);break;
  case 'star':osc('triangle',mtof(88),t,0.25,0.08,D,{send:.4});osc('sine',mtof(95),t+0.04,0.3,0.05,D,{send:.4});break;
  case 'warn':for(let i=0;i<3;i++){osc('square',880,t+i*0.32,0.14,0.05,D,{lp:2400});osc('square',660,t+i*0.32+0.15,0.14,0.05,D,{lp:2400});}break;
  case 'zap':osc('sawtooth',rand(900,1300),t,0.09,0.05,D,{to:200,lp:4000});noise(t,0.07,0.06,D,'highpass',5000,1);break;
  case 'boom':{const p=rand(.9,1.1);noise(t,0.3,0.28,D,'lowpass',1500*p,1,{to:150});osc('sine',180*p,t,0.28,0.32,D,{to:45});break;}
  case 'pierce':osc('triangle',rand(1500,1700),t,0.05,0.035,D,{to:2400});break;
  case 'mutate':osc('sine',300,t,0.2,0.06,D,{to:900});osc('sine',450,t+0.05,0.2,0.04,D,{to:1300});break;
 }
}
// ---------- music sequencer (original compositions) ----------
const NOTE={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
function pn(s){const m=s.match(/^([A-G][#b]?)(\d)$/);return m?NOTE[m[1]]+12*(+m[2]+1):null;}
function parseBar(str){return str.trim().split(/\s+/).map(t=>t==='.'?0:t==='-'?-1:pn(t));}
const MEL_A=['E5 . G5 . C6 . G5 . A5 G5 E5 . D5 . E5 .','C5 . E5 . A5 . E5 . G5 E5 C5 . B4 . C5 .','A4 . C5 . F5 . A5 . G5 F5 E5 . D5 . C5 .','D5 . G5 . B5 . D6 . C6 B5 G5 . F5 . D5 .',
 'C6 - - - B5 - A5 - G5 - - - E5 - G5 -','A5 - - - G5 - E5 - C5 - - - D5 - E5 -','F5 - - - E5 - D5 - C5 - A4 - C5 - F5 -','G5 - - - A5 - B5 - D6 - - - - - - -'];
const SONGS={
 menu:{bpm:104,lead:'tri',drums:1,chords:[[48,'M'],[45,'m'],[41,'M'],[43,'M']],mel:MEL_A},
 bright:{bpm:136,lead:'sq',drums:2,chords:[[48,'M'],[45,'m'],[41,'M'],[43,'M']],mel:MEL_A},
 funky:{bpm:146,lead:'sq',drums:2,chords:[[50,'m'],[46,'M'],[48,'M'],[45,'M']],
  mel:['D5 . F5 A5 . F5 D5 . E5 F5 . E5 D5 . C5 .','D5 . F5 Bb5 . A5 F5 . D5 . F5 . G5 . A5 .','G5 . E5 C5 . E5 G5 . C6 . Bb5 . A5 . G5 .','A5 . C#6 . E6 . C#6 . A5 . G5 . F5 . E5 .',
       'F5 - - A5 - - D6 - C6 - A5 - F5 - G5 -','F5 - D5 - - - F5 G5 A5 - - - Bb5 - A5 -','G5 - E5 - C5 - E5 - G5 - C6 - E6 - D6 -','C#6 - - - A5 - - - E5 - G5 - A5 - - -']},
 boss:{bpm:164,lead:'saw',drums:3,chords:[[40,'m'],[36,'M'],[38,'M'],[35,'M']],
  mel:['E5 E5 . G5 . E5 F#5 G5 . B5 . A5 G5 . F#5 .','E5 . . G5 . C6 . B5 . G5 . E5 . G5 A5 .','F#5 . A5 . D6 . A5 . F#5 . D5 . F#5 . A5 .','B5 . . A5 . G5 . F#5 . D#5 . F#5 . B4 .',
       'E6 - - B5 - - G5 - E6 - D6 - B5 - A5 -','C6 - - G5 - - E5 - C6 - B5 - G5 - E5 -','D6 - - A5 - - F#5 - D6 - C6 - A5 - F#5 -','D#6 - - - B5 - - - F#5 - A5 - B5 - - -']},
};
Object.values(SONGS).forEach(s=>s.bars=s.mel.map(parseBar));
const Music={cur:null,tr:0,step:0,next:0,timer:null,
 play(name,tr=0){if(this.cur===name&&this.tr===tr)return;this.cur=name;this.tr=tr;this.step=0;if(AU.ctx)this.next=AU.ctx.currentTime+0.08;},
 start(){if(this.timer)return;this.next=AU.ctx.currentTime+0.1;this.timer=setInterval(()=>this.tick(),25);},
 tick(){const c=AU.ctx;if(!c||!this.cur||c.state!=='running'||!S.music)return;const s=SONGS[this.cur];const sp=60/s.bpm/4;
  if(this.next<c.currentTime-0.2)this.next=c.currentTime+0.05;
  while(this.next<c.currentTime+0.14){this.playStep(s,this.step,this.next,sp);this.step++;this.next+=sp;}},
 playStep(s,st,t,sp){
  const D=AU.mus,tr=this.tr;const bar=Math.floor(st/16)%s.bars.length,i=st%16;
  const ch=s.chords[bar%4];const root=ch[0]+tr;const third=ch[1]==='m'?3:4;
  const notes=s.bars[bar];const n=notes[i];
  if(n>0){let len=1;for(let k=i+1;k<16&&notes[k]===-1;k++)len++;const dur=len*sp*0.95+0.04;const f=mtof(n+tr);
   if(s.lead==='sq'){osc('square',f,t,dur,0.05,D,{lp:3000,send:.3,a:0.008,vib:len>2});osc('square',f,t,dur,0.025,D,{lp:2000,det:10});}
   else if(s.lead==='saw'){osc('sawtooth',f,t,dur,0.045,D,{lp:2600,q:3,send:.25,vib:len>2});osc('square',f/2,t,dur,0.022,D,{lp:1400});}
   else {osc('triangle',f,t,dur,0.09,D,{send:.4,a:0.01,vib:len>2});osc('sine',f*2,t,dur*0.6,0.018,D);}
  }
  const heavy=s.drums===3;
  const bp=heavy?[0,2,4,6,8,10,12,14]:[0,3,6,8,11,14];
  if(bp.includes(i)){const oct=heavy?(i%4===2?12:0):(i===6||i===14?12:0);osc(heavy?'sawtooth':'triangle',mtof(root-12+oct),t,sp*1.6,heavy?0.065:0.15,D,{lp:heavy?700:1200,a:0.004});}
  if(i%2===1){const arp=[0,third,7,12,7,third,12,19];const an=root+24+arp[(i>>1)%8];osc('square',mtof(an),t,sp*0.9,s.drums===1?0.01:0.014,D,{lp:5000,send:.25});}
  if(i===0){[0,third,7].forEach(o=>osc('triangle',mtof(root+12+o),t,sp*15,s.drums===1?0.025:0.016,D,{a:0.25,hold:1}));}
  const dk=s.drums;
  const kick=dk===3?(i%4===0):dk===2?(i===0||i===8||i===10):(i===0||i===8);
  if(kick)osc('sine',150,t,0.18,dk===1?0.22:0.38,D,{to:45,tt:0.12});
  if(dk>=2&&(i===4||i===12)){noise(t,0.14,0.2,D,'bandpass',1800,0.8);osc('triangle',220,t,0.08,0.1,D,{to:120});}
  if(dk===1&&(i===4||i===12))noise(t,0.05,0.05,D,'highpass',4000,1);
  if(dk>=2&&i%2===0)noise(t,0.035,i%4===2?0.065:0.035,D,'highpass',8000,1);
  if(dk===3&&i%2===1)noise(t,0.025,0.028,D,'highpass',9000,1);
 },
 stinger(kind){if(!AU.ctx||!S.sfx)return;const t=AU.ctx.currentTime+0.02,D=AU.sfx;
  if(kind==='win'){[[72,0],[76,.1],[79,.2],[84,.3],[83,.48],[84,.58]].forEach(([n,d],k)=>{osc('square',mtof(n),t+d,k===5?0.7:0.14,0.065,D,{lp:4000,send:.35});osc('triangle',mtof(n-12),t+d,k===5?0.7:0.14,0.08,D);});
   osc('sine',mtof(96),t+0.6,0.6,0.04,D,{send:.5});}
  else{[[67,0],[66,.18],[65,.36],[64,.54]].forEach(([n,d],k)=>osc('square',mtof(n),t+d,k===3?0.8:0.18,0.065,D,{lp:1800,to:k===3?mtof(n-5):null,tt:0.8}));}
 }
};
// ================= canvas =================
const cv=$('c'),ctx=cv.getContext('2d');
let W=390,H=844,DPR=1,SC=1,FY=700,TOP=90,RB=40;
function resize(){
 const r=$('app').getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(3,window.devicePixelRatio||1);
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);SC=clamp(Math.min(W/390,H/760),0.8,1.25);
 const cb=$('colors').getBoundingClientRect();
 const barTop=cb.height>0?cb.top-r.top:H-90;
 FY=Math.min(H-80,barTop-8);TOP=90;RB=38*SC;
 if(G){doc.x=clamp(doc.x,RB,W-RB);doc.y=clamp(doc.y,minY(),maxY());}
 buildPills();buildBubble();
}
window.addEventListener('resize',resize);
const minY=()=>TOP+RB+40*SC, maxY=()=>FY-RB*0.9;

// pill sprites
const PILLS=[];
function pillPath(x,w,h,r){x.beginPath();x.moveTo(0,r);x.arc(r,r,r,Math.PI,0);x.lineTo(w,h-r);x.arc(r,h-r,r,0,Math.PI);x.closePath();}
function makePill(ci,w,h,dpr){
 const c=document.createElement('canvas');const pad=4;c.width=Math.ceil((w+pad*2)*dpr);c.height=Math.ceil((h+pad*2)*dpr);const x=c.getContext('2d');x.scale(dpr,dpr);x.translate(pad,pad);
 const r=w/2;
 x.save();pillPath(x,w,h,r);x.clip();
 const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,COLORS[ci].dk);g.addColorStop(.35,COLORS[ci].hex);g.addColorStop(1,COLORS[ci].dk);x.fillStyle=g;
 x.fillRect(0,0,w,h/2);
 const g2=x.createLinearGradient(0,0,w,0);g2.addColorStop(0,'#c3ced8');g2.addColorStop(.35,'#ffffff');g2.addColorStop(1,'#b0bcc8');x.fillStyle=g2;x.fillRect(0,h/2,w,h/2);
 x.fillStyle='rgba(255,255,255,.7)';x.fillRect(w*0.2,2,w*0.18,h-4);
 x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,h/2-0.8,w,1.6);
 x.restore();
 x.lineWidth=Math.max(1,w*0.12);x.strokeStyle='rgba(15,20,40,.75)';pillPath(x,w,h,r);x.stroke();
 return {c,w:w+pad*2,h:h+pad*2};
}
function buildPills(){for(let i=0;i<5;i++)PILLS[i]=makePill(i,10*SC,24*SC,DPR);buildColorBtns();}
// 预渲染防护罩泡泡（六边形纹理）
let BUBBLE=null,BUBBLE_R=null;
function bubbleSprite(rim,glow){
 const r=RB,pad=6,s=Math.ceil((r+pad)*2*DPR),c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');x.scale(DPR,DPR);const cx=r+pad,cy=r+pad;
 const g=x.createRadialGradient(cx-r*.25,cy-r*.3,r*.15,cx,cy,r);g.addColorStop(0,'rgba(190,255,255,.03)');g.addColorStop(.7,glow+'.12)');g.addColorStop(1,glow+'.6)');
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,6.283);x.fill();
 x.save();x.beginPath();x.arc(cx,cy,r,0,6.283);x.clip();x.strokeStyle='rgba(220,255,255,.16)';x.lineWidth=1;const hs=r*.24;
 for(let yy=-r;yy<r;yy+=hs*1.5)for(let xx=-r-hs;xx<r+hs;xx+=hs*1.732){const ox=(Math.round((yy+r)/(hs*1.5))%2)?hs*.866:0;x.beginPath();for(let k=0;k<6;k++){const an=k*1.0472+.5236;x.lineTo(cx+xx+ox+Math.cos(an)*hs*.92,cy+yy+Math.sin(an)*hs*.92);}x.closePath();x.stroke();}
 x.restore();
 x.strokeStyle=rim;x.lineWidth=2.2;x.beginPath();x.arc(cx,cy,r,0,6.283);x.stroke();
 x.fillStyle='rgba(255,255,255,.8)';x.beginPath();x.ellipse(cx-r*.45,cy-r*.52,r*.2,r*.08,-.7,0,6.283);x.fill();
 return {c,s:s/DPR};
}
function buildBubble(){BUBBLE=bubbleSprite('rgba(210,255,255,.95)','rgba(110,225,255,');BUBBLE_R=bubbleSprite('rgba(255,120,140,1)','rgba(255,70,100,');}
function pcIcon(i,size,lvl){
 const c=document.createElement('canvas');c.width=c.height=size*2;const x=c.getContext('2d');x.scale(2,2);const m=size/2,col=COLORS[i];
 const P=makePill(i,size*0.16,size*0.38,2);const dp=(px,py,rot,sc=1)=>{x.save();x.translate(px,py);x.rotate(rot);x.drawImage(P.c,-P.w*sc/2,-P.h*sc/2,P.w*sc,P.h*sc);x.restore();};
 const vir=(px,py,r)=>{x.fillStyle='#7a2a8a';x.beginPath();x.arc(px,py,r,0,6.28);x.fill();x.fillStyle='#c25bd6';x.beginPath();x.arc(px-r*.2,py-r*.2,r*.7,0,6.28);x.fill();};
 if(i===0){for(let k=0;k<3;k++)dp(m,size*0.78-k*size*0.27,0,0.85);}
 else if(i===1){vir(m,size*0.32,size*0.12);vir(m,size*0.58,size*0.1);x.strokeStyle=col.hi;x.lineWidth=3;x.beginPath();x.moveTo(m,size*0.95);x.lineTo(m,size*0.05);x.stroke();dp(m,size*0.12,0);}
 else if(i===2){const n=3+Math.floor((Math.max(1,lvl)-1)/2);for(let k=0;k<n;k++){const a=(k-(n-1)/2)*0.32;dp(m+Math.sin(a)*size*0.32,size*0.62-Math.cos(a)*size*0.32,a,0.8);}}
 else if(i===3){const g=x.createRadialGradient(m,m*0.85,1,m,m*0.85,size*0.42);g.addColorStop(0,'#fff');g.addColorStop(.35,col.hex);g.addColorStop(1,'rgba(255,150,0,0)');x.fillStyle=g;x.beginPath();x.arc(m,m*0.85,size*0.42,0,6.28);x.fill();dp(m,size*0.82,0);}
 else{vir(size*0.25,size*0.3,size*0.09);vir(size*0.75,size*0.25,size*0.09);vir(size*0.5,size*0.55,size*0.09);x.strokeStyle=col.hi;x.lineWidth=2.5;x.lineJoin='round';x.beginPath();x.moveTo(size*0.5,size*0.55);x.lineTo(size*0.4,size*0.42);x.lineTo(size*0.3,size*0.35);x.moveTo(size*0.5,size*0.55);x.lineTo(size*0.62,size*0.38);x.lineTo(size*0.72,size*0.3);x.stroke();dp(m,size*0.82,0);}
 return c;
}
function buildColorBtns(){
 const box=$('colors');box.innerHTML='';
 for(let i=0;i<5;i++){const lock=!S.pc[i];const b=document.createElement('button');b.className='cb'+(curColor()===i?' on':'')+(lock?' lock':'');b.style.setProperty('--g',COLORS[i].glow);b.setAttribute('aria-label',COLORS[i].n+'色药丸·'+COLORS[i].k);
  const c=pcIcon(i,48,S.pc[i]);b.appendChild(c);const k=document.createElement('span');k.className='k';k.textContent=i+1;b.appendChild(k);
  b.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();setColor(i);});box.appendChild(b);}
}
const curColor=()=>G?G.color:S.cur;

// ================= game state =================
let G=null;
const doc={x:195,y:700,vx:0,vy:0,lean:0,hp:3,inv:0,recoil:0,shield:0,hitT:0,thr:0};
let state='menu',paused=false;
let shakeT=0,shakeA=0,flashT=0,flashCol='255,60,60';
let bgDrift=0;
const ambient=[];
function stats(){const c=G?G.color:S.cur,sp=pcSpec(c,S.pc[c]);const base=pdmg(S.up.pow),r=prate(S.up.rate);return{dmg:base*sp.dmg,rate:r*sp.rate,coin:1+S.up.coin*0.2,sp,c};}
function songFor(info){return info.boss?['boss',0]:[['bright',0],['funky',0],['bright',-3],['funky',2],['funky',-2],['bright',2],['funky',-3],['bright',-2],['funky',3],['funky',-1]][info.w];}
function grantColors(){const got=[];for(let i=1;i<5;i++)if(!S.pc[i]&&S.unlocked>=COLORS[i].unlock){S.pc[i]=1;got.push(i);}if(got.length)save();return got;}
function vibrate(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}

function startLevel(L){
 L=clamp(L,1,NLV);try{GT.lv(L)}catch(_e){}
 const info=levelInfo(L);
 const nu=grantColors();
 if(!S.pc[S.cur])S.cur=0;
 G={L,info,q:info.q.slice(),spawnT:0,viruses:[],pills:[],coins:[],parts:[],pops:[],drops:[],shots:[],bolts:[],color:S.cur,t:0,fireT:0.3,earned:0,hurt:0,esc:0,kills:0,
   totalHp:0,doneHp:0,pw:{laser:0,spread:0,freeze:0},boss:null,ending:0,lost:false,revived:false,combo:0,comboT:0,botT:0,hintT:L<=2?4:0,vibT:0,popT:0};
 G.totalHp=info.boss?info.bossHp:info.q.reduce((s,e)=>s+e.hp*(e.tier+1),0);
 state='play';paused=false;showScreen(null);$('hud').classList.add('on');
 resize();
 doc.x=W/2;doc.y=maxY()-30*SC;doc.hp=3;doc.inv=1.5;doc.shield=0;doc.vx=0;doc.vy=0;doc.hitT=0;
 if(info.boss)G.boss=makeBoss(info);
 $('hLvl').textContent=`${WORLDS[info.w].n} · 第 ${L} 关`;
 $('bossbar').style.display=info.boss?'block':'none';
 if(info.boss)$('bossName').textContent=BOSSN[info.w];
 $('hHearts').dataset.k='';
 buildColorBtns();updHud();
 ambient.length=0;for(let i=0;i<24;i++)ambient.push(newAmb(true));
 const sg=songFor(info);Music.play(sg[0],sg[1]);
 banner(info.boss?'BOSS 来袭！':`第 ${L} 关`,info.boss?BOSSN[info.w]:WORLDS[info.w].n,info.boss);
 if(info.boss){setTimeout(()=>sfx('warn'),300);setTimeout(()=>sfx('roar'),1300);}
 if(nu.length)setTimeout(()=>{if(G)toast(`新药丸解锁：${nu.map(i=>COLORS[i].n+'色·'+COLORS[i].k).join('、')}！`);},900);
 if(!S.tip){paused=true;showScreen('tip');$('hud').classList.add('on');try{GT.ev('tip_show')}catch(_e){}}
}
function closeTip(){S.tip=1;save();try{GT.ev('tip_ok')}catch(_e){}sfx('click');$('tip').classList.remove('on');paused=false;}
function makeBoss(info){const r=Math.min(W*0.22,92*SC)*(info.w===4?1.12:1);return{x:W/2,y:-r*1.4,ty:TOP+r+40*SC,r,hp:info.bossHp,max:info.bossHp,c:info.w%3,shootT:3.2,spawnT:6,t:0,flash:0,dir:1,enter:true,sq:0,w:info.w,dead:false,deadT:0};}
function banner(a,b,boss){const el=$('banner');$('ban1').textContent=a;$('ban2').textContent=b||'';el.className='';void el.offsetWidth;el.className='show'+(boss?' boss':'');}
function setColor(i){
 if(!S.pc[i]){sfx('deny');toast(`${COLORS[i].n}色药丸·${COLORS[i].k}：第 ${COLORS[i].unlock} 关解锁，也可在商店提前购买`);return;}
 S.cur=i;save();
 if(G&&state==='play'&&!paused&&G.color!==i){G.color=i;sfx('switch');doc.recoil=1;G.pops.push({x:doc.x,y:doc.y-RB-30*SC,txt:COLORS[i].n+'色·'+COLORS[i].k,col:COLORS[i].hi,life:.9,max:.9,s:17,big:1});}
 document.querySelectorAll('.cb').forEach((b,k)=>b.classList.toggle('on',k===i));
}

function spawnVirus(e,x,y,vx,vy){
 const r=[17,24,33,44][e.tier]*SC;const I=G.info;
 const vd=(I.drift*(1.12-e.tier*0.08)*(e.kind==='fast'?1.7:1))*SC;
 const v={x:x!=null?x:rand(r+10,W-r-10),y:y!=null?y:TOP-r-6,vx:vx!=null?vx:(Math.random()<.5?-1:1)*rand(0.7,1.1)*I.side*SC,vy:vy!=null?vy:vd,vd,r,tier:e.tier,hp:e.hp,max:e.hp,c:e.c,kind:e.kind,flash:0,sq:0,rot:rand(0,6.28),rv:rand(-.6,.6),age:0,wob:rand(0,6)};
 G.viruses.push(v);return v;
}
function newAmb(init){return{x:rand(0,W),y:init?rand(0,H):H+10,r:rand(1.5,5)*SC,v:rand(10,35)*SC,a:rand(.12,.4),ph:rand(0,6)};}

// ================= input =================
// 相对拖动：手指在任意位置按下后，小卫士按手指位移同步移动（手指不会挡住角色）
let ptr=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;ptr={id:e.pointerId,x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!ptr||e.pointerId!==ptr.id||state!=='play'||paused)return;const dx=e.clientX-ptr.x,dy=e.clientY-ptr.y;ptr.x=e.clientX;ptr.y=e.clientY;const k=e.pointerType==='mouse'?1:1.25;doc.x=clamp(doc.x+dx*k,RB,W-RB);doc.y=clamp(doc.y+dy*k,minY(),maxY());doc.vx=dx;if(G)G.hintT=0;});
const endP=e=>{if(ptr&&e.pointerId===ptr.id)ptr=null;};
cv.addEventListener('pointerup',endP);cv.addEventListener('pointercancel',endP);
document.addEventListener('touchmove',e=>{if(e.target.closest&&e.target.closest('#shop'))return;e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());
const keys={};
window.addEventListener('keydown',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=1;if(state==='play'){if(e.key>='1'&&e.key<='5')setColor(+e.key-1);if(e.key==='p'||e.key==='Escape'){if($('tip').classList.contains('on'))closeTip();else togglePause();}if((e.key==='Enter'||e.key===' ')&&$('tip').classList.contains('on'))closeTip();}if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=0;});

// ================= update =================
function update(dt){
 bgDrift+=dt;
 for(const a of ambient){a.y-=a.v*dt;a.x+=Math.sin(bgDrift*0.8+a.ph)*6*dt;if(a.y<-10)Object.assign(a,newAmb(false));}
 if(state!=='play'||paused||!G)return;
 G.t+=dt;if(G.hintT>0)G.hintT-=dt*0.25;
 const st=stats();
 const ks=440*SC*dt;let kx=0,ky=0;
 if(keys.ArrowLeft||keys.a)kx-=1;if(keys.ArrowRight||keys.d)kx+=1;if(keys.ArrowUp||keys.w)ky-=1;if(keys.ArrowDown||keys.s)ky+=1;
 if(kx||ky){const n=Math.hypot(kx,ky);doc.x+=kx/n*ks;doc.y+=ky/n*ks;doc.vx=kx*6;G.hintT=0;}
 if(DBG.bot)bot(dt);
 doc.x=clamp(doc.x,RB,W-RB);doc.y=clamp(doc.y,minY(),maxY());
 doc.lean=lerp(doc.lean,clamp(doc.vx*0.035,-0.25,0.25),0.2);doc.vx*=0.7;
 doc.inv=Math.max(0,doc.inv-dt);doc.recoil=Math.max(0,doc.recoil-dt*8);doc.hitT=Math.max(0,doc.hitT-dt);
 if(doc.shield>0)doc.shield-=dt;
 G.vibT-=dt;
 for(const k in G.pw)G.pw[k]=Math.max(0,G.pw[k]-dt);
 const frozen=G.pw.freeze>0;
 if(!G.ending){G.fireT-=dt;const interval=1/st.rate;while(G.fireT<=0){G.fireT+=interval;fire(st);}}
 if(G.pw.laser>0&&!G.ending){
  const lw=22*SC,dps=st.dmg*st.rate*2+40;
  for(const v of G.viruses)if(Math.abs(v.x-doc.x)<v.r+lw/2&&v.y<doc.y)hitVirus(v,dps*dt,v.x,v.y+v.r*0.5,true);
  if(G.boss&&!G.boss.dead&&!G.boss.enter&&Math.abs(G.boss.x-doc.x)<G.boss.r*0.8+lw/2)damageBoss(dps*dt,true);
  if(Math.random()<0.6)G.parts.push({x:doc.x+rand(-8,8),y:rand(TOP,doc.y-RB-20*SC),vx:rand(-50,50),vy:rand(-80,-20),life:.4,max:.4,r:rand(2,4)*SC,col:'#bff',g:0});
 }
 if(!G.info.boss&&G.q.length){
  G.spawnT+=dt;const nxt=G.q[0];
  if(G.spawnT>=nxt.delay||(G.viruses.length===0&&G.spawnT>0.6)){G.q.shift();G.spawnT=0;spawnVirus(nxt);}
 }
 for(const v of G.viruses){
  v.age+=dt;v.flash=Math.max(0,v.flash-dt*8);v.sq*=Math.pow(0.004,dt);
  if(frozen)continue;
  v.rot+=v.rv*dt;
  // 缓慢下落：速度向本体漂移速度回归（分裂出的小病毒先向上弹起，再慢慢落下）
  v.vy+=(v.vd-v.vy)*Math.min(1,dt*1.4);
  v.x+=v.vx*dt;v.y+=v.vy*dt;
  if(v.x<v.r){v.x=v.r;v.vx=Math.abs(v.vx);v.sq=0.25;}if(v.x>W-v.r){v.x=W-v.r;v.vx=-Math.abs(v.vx);v.sq=0.25;}
  if(v.y<TOP-v.r*2.5&&v.vy<0)v.vy=Math.abs(v.vy)*0.3;
  if(v.y-v.r>H){v.dead=1;v.esc=1;G.esc++;G.doneHp+=Math.max(0,v.hp)*(v.tier+1);G.pops.push({x:clamp(v.x,50,W-50),y:FY-20*SC,txt:'漏网了！',col:'#ffb3c0',life:.8,max:.8,s:15});continue;}
  const dx=v.x-doc.x,dy=v.y-doc.y;const rr=v.r*0.85+RB;
  if(dx*dx+dy*dy<rr*rr&&!G.ending)touchVirus(v,dx,dy);
 }
 if(G.boss)updBoss(G.boss,dt,frozen);
 for(const p of G.pills){p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.y<-30||p.x<-30||p.x>W+30){p.dead=1;continue;}
  for(const v of G.viruses){if(v.dead||(p.hit&&p.hit.includes(v)))continue;const dx=p.x-v.x,dy=p.y-v.y,rr=v.r*0.92+5*SC;if(dx*dx+dy*dy<rr*rr){pillHit(p,v,st);if(p.dead)break;}}
  if(!p.dead&&G.boss&&!G.boss.dead&&!G.boss.enter){const b=G.boss,dx=p.x-b.x,dy=p.y-b.y,rr=b.r*0.9;if(dx*dx+dy*dy<rr*rr){p.dead=1;damageBoss(p.dmg,false,p.x,p.y);if(p.c===3)explode(p.x,p.y,p,st,null);}}
 }
 G.pills=G.pills.filter(p=>!p.dead);
 G.viruses=G.viruses.filter(v=>!v.dead);
 for(const s of G.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=dt*5;
  if(s.y>H+20||s.x<-20||s.x>W+20){s.dead=1;continue;}
  const dx=s.x-doc.x,dy=s.y-doc.y;if(dx*dx+dy*dy<(s.r+RB)**2&&!G.ending){s.dead=1;burst(s.x,s.y,-1,14,12);if(doc.inv<=0)hurtDoc(null,'boss_shot');}}
 G.shots=G.shots.filter(s=>!s.dead);
 const hc=coinTarget();
 for(const c of G.coins){c.t+=dt;
  if(c.t<0.55){c.vy+=700*SC*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.x<8||c.x>W-8)c.vx*=-1;}
  else{const dx=hc.x-c.x,dy=hc.y-c.y,d=Math.hypot(dx,dy);const sp=(500+(c.t-0.55)*1600)*SC;if(d<sp*dt+10){c.dead=1;S.coins+=c.v;G.earned+=c.v;sfx('coin');bumpCoin();}else{c.x+=dx/d*sp*dt;c.y+=dy/d*sp*dt;}}
 }
 G.coins=G.coins.filter(c=>!c.dead);
 for(const d of G.drops){d.t+=dt;d.y+=70*SC*dt;d.x=clamp(d.x+Math.sin(d.t*3)*20*dt,20,W-20);
  if(Math.hypot(d.x-doc.x,d.y-doc.y)<RB+18*SC){d.dead=1;applyPower(d.k);}
  if(d.y>H+20)d.dead=1;}
 G.drops=G.drops.filter(d=>!d.dead);
 for(const p of G.parts){p.life-=dt;if(!p.ring&&!p.flash){p.vy+=(p.g!=null?p.g:500)*SC*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}}
 G.parts=G.parts.filter(p=>p.life>0);if(G.parts.length>450)G.parts.splice(0,G.parts.length-450);
 for(const p of G.pops){p.life-=dt;p.y-=(p.big?40:70)*SC*dt;}
 G.pops=G.pops.filter(p=>p.life>0);if(G.pops.length>70)G.pops.splice(0,G.pops.length-70);
 for(const b of G.bolts)b.life-=dt;G.bolts=G.bolts.filter(b=>b.life>0);
 if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0;}
 // 推进器尾焰
 doc.thr-=dt;if(doc.thr<=0){doc.thr=0.03;for(const s of[-1,1])G.parts.push({x:doc.x+s*RB*0.22+rand(-2,2),y:doc.y+RB*0.62,vx:rand(-15,15),vy:rand(90,160)*SC,life:.22,max:.22,r:rand(2,3.5)*SC,col:Math.random()<.5?'#bff7ff':'#5fd0ff',g:0,add:1});}
 updHud();
 const cleared=G.info.boss?(G.boss.dead&&G.viruses.length===0):(G.q.length===0&&G.viruses.length===0);
 if(cleared&&!G.ending){G.ending=0.001;G.shots.length=0;}
 if(G.ending){G.ending+=dt;for(const c of G.coins)c.t=Math.max(c.t,0.55);if(G.ending>(G.info.boss?2.4:1.2)&&G.coins.length===0)winLevel();}
}
function updFx(dt){shakeT=Math.max(0,shakeT-dt);flashT=Math.max(0,flashT-dt);}
let hcCache=null,hcT=0;
function coinTarget(){if(!hcCache||performance.now()-hcT>500){const r=$('hCoinBox').getBoundingClientRect(),a=$('app').getBoundingClientRect();hcCache={x:r.left-a.left+16,y:r.top-a.top+r.height/2};hcT=performance.now();}return hcCache;}
let coinBumpT=0;function bumpCoin(){const el=$('hCoinBox');el.style.transform='scale(1.15)';clearTimeout(coinBumpT);coinBumpT=setTimeout(()=>el.style.transform='',90);}

function fire(st){
 const c=st.c,sp=-1100*SC,by=doc.y-RB*0.9,dmg=st.dmg;
 const mk=(ox,a)=>G.pills.push({x:doc.x+ox,y:by+Math.abs(ox)*0.3,vx:Math.sin(a)*-sp,vy:Math.cos(a)*sp,c,dmg,rot:a,pierce:st.sp.pierce||0,hit:st.sp.pierce?[]:null});
 if(c===2){const n=st.sp.n;for(let i=0;i<n;i++)mk(0,(i-(n-1)/2)*0.17);}
 else if(c===0){G.alt=!G.alt;mk(G.alt?-5*SC:5*SC,0);}
 else mk(0,0);
 if(G.pw.spread>0){for(const a of[-0.32,0.32])mk(0,a);}
 doc.recoil=1;sfx('shoot');
}
function pillHit(p,v,st){
 let d=p.dmg;
 if(v.kind==='armor'&&p.c!==1)d*=0.6;
 hitVirus(v,d,p.x,p.y);
 if(G.pw.freeze<=0)v.vy-=6*SC;
 if(p.c===1){p.hit.push(v);sfx('pierce');if(p.hit.length>p.pierce)p.dead=1;}
 else p.dead=1;
 if(p.c===3)explode(p.x,p.y,p,st,v);
 if(p.c===4)chain(v,p,st);
}
function explode(x,y,p,st,src){
 const sp=pcSpec(3,S.pc[3]),R=sp.rad*SC,d=p.dmg*sp.spl;
 for(const o of G.viruses){if(o===src||o.dead)continue;const dx=o.x-x,dy=o.y-y;if(dx*dx+dy*dy<(R+o.r)**2)hitVirus(o,d*(o.kind==='armor'?0.6:1),o.x,o.y-o.r*0.3);}
 G.parts.push({x,y,vx:0,vy:0,g:0,ring:1,life:.28,max:.28,r:R*0.75,col:COLORS[3].hi,w:4});
 for(let i=0;i<6;i++){const a=rand(0,6.28),s=rand(60,200)*SC;G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3,max:.3,r:rand(2.5,4.5)*SC,col:Math.random()<.5?'#fff3a0':'#ff9a1a',g:0,add:1});}
 G.parts.push({x,y,vx:0,vy:0,g:0,flash:1,life:.14,max:.14,r:R*0.6,col:'255,220,90'});
 sfx('boom');
}
function chain(v,p,st){
 let cur=v;const done=[v];const pts=[[v.x,v.y]];let d=p.dmg*pcSpec(4,S.pc[4]).cd;
 const csp=pcSpec(4,S.pc[4]);for(let k=0;k<csp.chain;k++){let best=null,bd=(150*SC)**2;for(const o of G.viruses){if(o.dead||done.includes(o))continue;const dd=(o.x-cur.x)**2+(o.y-cur.y)**2;if(dd<bd){bd=dd;best=o;}}
  if(!best)break;done.push(best);pts.push([best.x,best.y]);hitVirus(best,d,best.x,best.y);cur=best;d*=0.85;}
 if(pts.length>1){G.bolts.push({pts,life:.16,max:.16,seed:Math.random()*100});sfx('zap');}
}
// 伤害数字：同一个病毒在 0.1 秒内的伤害合并成一个跳字，避免刷屏
function hitVirus(v,d,px,py,silent){
 if(v.dead)return;const real=Math.min(d,Math.max(0,v.hp));v.hp-=d;v.flash=1;v.sq=Math.max(v.sq,0.08);G.doneHp+=real;
 v.acc=(v.acc||0)+d;
 if(!silent||v.hp<=0){if(!v.accT||G.t-v.accT>0.1){G.pops.push({x:px+rand(-8,8)*SC,y:py-6*SC,txt:String(Math.round(v.acc)),col:d>=pdmg(S.up.pow)*1.2?'#ffe36b':'#ffffff',life:.55,max:.55,s:13+Math.min(8,Math.log2(1+v.acc/10)*2)});v.acc=0;v.accT=G.t;}}
 if(!silent){sfx('hit');if(Math.random()<0.35)G.parts.push({x:px,y:py,vx:rand(-70,70),vy:rand(-130,-30),life:.22,max:.22,r:rand(2,3.5)*SC,col:'#fff'});}
 if(v.hp<=0)killVirus(v);
}
function killVirus(v){
 v.dead=1;const st=stats();G.kills++;
 burst(v.x,v.y,v.c,10+v.tier*7,v.r);
 G.parts.push({x:v.x,y:v.y,ring:1,life:.4,max:.4,r:v.r*1.6,col:VCOL[v.c]});
 sfx(v.tier>=3?'bigpop':'pop');
 if(v.tier>=2){shakeT=Math.max(shakeT,0.12);shakeA=Math.max(shakeA,v.tier*1.5);}
 if(S.vib&&G.vibT<=0){G.vibT=0.09;vibrate(v.tier>=2?18:10);}
 G.combo++;G.comboT=1.3;
 if(G.combo>=5&&G.combo%5===0)G.pops.push({x:clamp(v.x,60,W-60),y:v.y-v.r,txt:`连击 ×${G.combo}`,col:'#ffe36b',life:.9,max:.9,s:21,big:1});
 const n=[1,1,2,3][v.tier]+(G.combo>=10?1:0);const val=Math.max(1,Math.round((2+G.L*0.5)*st.coin));
 for(let i=0;i<n;i++)G.coins.push({x:v.x,y:v.y,vx:rand(-120,120)*SC,vy:rand(-340,-140)*SC,t:rand(0,0.15),v:val});
 // 分裂：大病毒被消灭后裂成两个小一号的病毒，向两侧弹开
 if(v.tier>0){
  const hp=r10(G.info.H0*TIERM[v.tier-1]*0.8);
  for(const s of[-1,1])spawnVirus({tier:v.tier-1,hp,c:v.c,kind:v.kind==='armor'?'n':v.kind},v.x+s*v.r*0.4,v.y,s*rand(0.9,1.2)*G.info.side*SC,-rand(160,220)*SC);
  sfx('split');
 }
 const pc=[0.025,0.04,0.07,0.12][v.tier];
 if(Math.random()<pc&&G.drops.length<2){const ks=['laser','shield','spread','freeze'];G.drops.push({x:v.x,y:v.y,k:ks[Math.floor(Math.random()*ks.length)],t:0});}
}
const VCOL=['#ff6b7a','#ffd84a','#6cb8ff'];
function damageBoss(d,silent,px,py){
 const b=G.boss;if(b.dead||b.enter)return;b.hp-=d;b.flash=1;G.doneHp+=d;
 b.acc=(b.acc||0)+d;
 if(!silent){sfx('hit');if(Math.random()<0.5)G.parts.push({x:px,y:py,vx:rand(-80,80),vy:rand(-100,0),life:.3,max:.3,r:rand(2,4)*SC,col:'#d7b8ff'});
  if(!b.accT||G.t-b.accT>0.12){G.pops.push({x:px+rand(-14,14),y:py,txt:String(Math.round(b.acc)),col:'#fff',life:.55,max:.55,s:15});b.acc=0;b.accT=G.t;}}
 if(b.hp<=0){b.dead=true;b.hp=0;
  for(let i=0;i<6;i++)setTimeout(()=>{if(!G||G.boss!==b)return;burst(b.x+rand(-b.r,b.r)*0.7,b.y+rand(-b.r,b.r)*0.7,i%3,26,b.r*0.6);sfx('bigpop');shakeT=0.3;shakeA=10;},i*170);
  flashT=0.5;flashCol='255,255,255';sfx('roar');if(S.vib)vibrate([30,40,60]);const val=Math.max(1,Math.round((2+G.L*0.5)*stats().coin));
  for(let i=0;i<40;i++)G.coins.push({x:b.x,y:b.y,vx:rand(-260,260)*SC,vy:rand(-520,-150)*SC,t:rand(0,0.3),v:val*2});
  for(const v of G.viruses){v.dead=1;burst(v.x,v.y,v.c,10,v.r);}G.viruses.length=0;
 }
}
function updBoss(b,dt,frozen){
 b.t+=dt;b.flash=Math.max(0,b.flash-dt*7);b.sq*=Math.pow(0.01,dt);
 if(b.dead){b.deadT+=dt;b.y+=40*dt;return;}
 if(b.enter){b.y+=(b.ty-b.y)*dt*1.6;if(Math.abs(b.y-b.ty)<4){b.enter=false;b.sq=0.35;shakeT=0.4;shakeA=8;}return;}
 const rage=b.hp<b.max*0.4;
 if(frozen)return;
 const sp=(50+b.w*12)*(rage?1.5:1)*SC;
 b.x+=b.dir*sp*dt;if(b.x<b.r*0.9)b.dir=1;if(b.x>W-b.r*0.9)b.dir=-1;
 b.y=b.ty+Math.sin(b.t*1.3)*16*SC;
 b.shootT-=dt;
 if(b.shootT<=0){b.shootT=Math.max(1.0,(rage?1.6:2.5)-b.w*0.12);sfx('spit');b.sq=0.2;
  const n=1+(b.w>=2?1:0)+(rage?1:0);const a0=Math.atan2(doc.y-b.y,doc.x-b.x);
  for(let i=0;i<n;i++){const a=a0+(i-(n-1)/2)*0.32;const v=(170+b.w*18)*SC;G.shots.push({x:b.x,y:b.y+b.r*0.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:10*SC,rot:0});}}
 b.spawnT-=dt;
 if(b.spawnT<=0&&G.viruses.length<6){b.spawnT=rage?5.5:7.5;const H0=G.info.H0;
  for(const s of[-1,1])spawnVirus({tier:b.w>=3?2:1,hp:r10(H0*0.45),c:Math.floor(Math.random()*3),kind:b.w>=1&&Math.random()<.3?'armor':'n'},b.x+s*b.r*0.6,b.y,s*G.info.side*SC,-120*SC);}
}
// 病毒撞上防护罩：病毒被弹开；防护罩无敌时间内只弹开不掉血
function touchVirus(v,dx,dy){
 const d=Math.hypot(dx,dy)||1;const nx=dx/d,ny=dy/d;
 v.x=doc.x+nx*(v.r*0.85+RB+1);v.y=doc.y+ny*(v.r*0.85+RB+1);
 v.vx=(nx>=0?1:-1)*Math.max(Math.abs(v.vx),G.info.side*SC);v.vy=Math.min(v.vy,ny*220*SC-60*SC);v.sq=0.3;
 if(doc.inv<=0)hurtDoc(v,'virus');
}
function hurtDoc(v,why){
 if(DBG.god){doc.inv=0.5;doc.hitT=0.35;return;}
 if(doc.shield>0){doc.shield=0;doc.inv=1.2;doc.hitT=0.3;sfx('shieldbreak');burst(doc.x,doc.y,-2,24,30);return;}
 doc.hp--;G.hurt++;doc.inv=1.6;doc.hitT=0.5;sfx('hurt');shakeT=0.35;shakeA=12;flashT=0.22;flashCol='255,60,60';
 // 命中反馈：安卓等支持的浏览器短震动；iOS Safari 不支持震动，只有屏幕震动
 vibrate([70,40,90]);
 G.pops.push({x:doc.x,y:doc.y-RB-14*SC,txt:'防护罩 -1',col:'#ff6b81',life:.9,max:.9,s:18,big:1});
 for(let i=0;i<14;i++){const a=rand(0,6.28),s=rand(120,280)*SC;G.parts.push({x:doc.x+Math.cos(a)*RB,y:doc.y+Math.sin(a)*RB,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4,max:.4,r:rand(2,4)*SC,col:Math.random()<.5?'#ff8095':'#dff',g:0});}
 G.parts.push({x:doc.x,y:doc.y,ring:1,life:.35,max:.35,r:RB*1.3,col:'#ff6b81',w:5});
 G.lastHurt=why;
 updHud();
 if(doc.hp<=0)loseLevel(why);
}
function applyPower(k){
 sfx('power');const names={laser:'针筒激光！',shield:'维C护盾！',spread:'三向药丸！',freeze:'冰冻病毒！'};
 G.pops.push({x:clamp(doc.x,80,W-80),y:doc.y-RB-60*SC,txt:names[k],col:'#fff',life:1.3,max:1.3,s:22,big:1});
 if(k==='shield'){doc.shield=14;sfx('shield');}
 else if(k==='laser'){G.pw.laser=4.5;sfx('laser');}
 else if(k==='spread')G.pw.spread=8;
 else if(k==='freeze'){G.pw.freeze=4;sfx('freeze');}
}
function burst(x,y,ci,n,r){
 const col=ci===-1?'#a6ff4d':ci===-2?'#9ff0ff':VCOL[ci],hi='#fff';
 for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(80,320)*SC;G.parts.push({x:x+Math.cos(a)*r*0.4,y:y+Math.sin(a)*r*0.4,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120*SC,life:rand(.35,.75),max:.75,r:rand(3,7)*SC*(r>30?1.3:1),col:Math.random()<.3?hi:col,goo:1});}
}

// ================= bot (debug ?bot) =================
function bot(dt){
 let best=doc.x,bestScore=-1e9;const by=maxY()-10*SC;
 for(let x=RB;x<=W-RB;x+=8*SC){
  let s=0;
  for(const v of G.viruses){
   const tt=clamp((by-v.y)/Math.max(20,v.vy),0,2.5);let px=v.x+v.vx*tt;if(px<v.r)px=2*v.r-px;if(px>W-v.r)px=2*(W-v.r)-px;
   const d=Math.abs(px-x),R=v.r+RB+14*SC;
   if(v.y>by-260*SC&&d<R)s-=4000*(1-d/R)*(0.4+v.y/by);
   if(Math.abs(v.x-x)<v.r)s+=60+v.tier*25;
  }
  for(const sh of G.shots){const tl=Math.max(0.05,(by-sh.y)/Math.max(60,sh.vy));const lx=sh.x+sh.vx*tl;if(Math.abs(lx-x)<RB+16*SC&&sh.y<by)s-=3500;}
  if(G.boss&&!G.boss.dead&&Math.abs(G.boss.x-x)<G.boss.r*0.7)s+=90;
  for(const d of G.drops)if(Math.abs(d.x-x)<30*SC)s+=160;
  s-=Math.abs(x-doc.x)*0.35;
  if(s>bestScore){bestScore=s;best=x;}
 }
 const mv=560*SC*dt;const dx=clamp(best-doc.x,-mv,mv);doc.x+=dx;doc.vx=dx*0.3;doc.y+=clamp(by-doc.y,-mv,mv);
 if(DBG.botColor){G.botT-=dt;if(G.botT<=0){G.botT=2.5;const own=[0,1,2,3,4].filter(i=>S.pc[i]);setColor(own[(own.indexOf(G.color)+1)%own.length]);}}
}
// ================= render =================
const BOSSI={};
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawCover(img){if(!img||!img.width)return;const s=Math.max(W/img.width,H/img.height)*1.06;const w=img.width*s,h=img.height*s;const ox=(W-w)/2+Math.sin(bgDrift*0.15)*W*0.015,oy=(H-h)/2+Math.cos(bgDrift*0.11)*H*0.01;ctx.drawImage(img,ox,oy,w,h);}
let menuWorld=0;
function render(){
 ctx.setTransform(DPR,0,0,DPR,0,0);
 const w=G?G.info.w:menuWorld;
 ctx.fillStyle=WORLDS[w].tint;ctx.fillRect(0,0,W,H);
 let sx=0,sy=0;if(shakeT>0&&G){sx=rand(-1,1)*shakeA*shakeT*4;sy=rand(-1,1)*shakeA*shakeT*4;}
 window.__shake=Math.abs(sx)+Math.abs(sy);
 ctx.save();ctx.translate(sx,sy);
 drawCover(IMG[WORLDS[w].bg]);
 const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,10,20,.38)');gr.addColorStop(.45,'rgba(0,10,20,.12)');gr.addColorStop(1,'rgba(0,10,20,.5)');ctx.fillStyle=gr;ctx.fillRect(-20,-20,W+40,H+40);
 for(const a of ambient){ctx.globalAlpha=a.a;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,6.28);ctx.stroke();}
 ctx.globalAlpha=1;
 if(G&&(state==='play'||state==='end'))drawGame();
 ctx.restore();
 if(flashT>0){ctx.fillStyle=`rgba(${flashCol},${Math.min(0.8,flashT*1.6)})`;ctx.fillRect(0,0,W,H);}
 const vg=ctx.createRadialGradient(W/2,H*0.45,Math.min(W,H)*0.45,W/2,H*0.45,Math.max(W,H)*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 if(G&&G.pw.freeze>0){ctx.fillStyle=`rgba(150,220,255,${0.12+0.05*Math.sin(bgDrift*6)})`;ctx.fillRect(0,0,W,H);}
 if(G&&doc.hp===1&&state==='play'){const a=0.25+0.15*Math.sin(bgDrift*6);const rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.4,W/2,H/2,Math.max(W,H)*0.7);rg.addColorStop(0,'rgba(255,0,40,0)');rg.addColorStop(1,`rgba(255,0,40,${a})`);ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);}
}
function drawExitLine(){
 // 底部「防线」：病毒从这里离开屏幕就算漏网
 const y=FY+4;ctx.fillStyle='rgba(255,90,120,.10)';ctx.fillRect(0,y,W,H-y);
 ctx.strokeStyle='rgba(255,140,160,.35)';ctx.lineWidth=2;ctx.setLineDash([10*SC,8*SC]);ctx.lineDashOffset=-bgDrift*20;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.setLineDash([]);
}
function drawVirus(v){
 const img=VS[v.c];const s=v.r*2.35;
 ctx.save();ctx.translate(v.x,v.y);
 const sq=v.sq,wob=Math.sin(v.age*6+v.wob)*0.035;
 ctx.scale(1+sq*0.5+wob,1-sq*0.45-wob);
 ctx.rotate(Math.sin(v.rot)*0.25);
 if(v.kind==='fast'){ctx.globalAlpha=0.35;ctx.drawImage(img.img,-s/2,-s/2-v.vy*0.08,s,s);ctx.globalAlpha=1;}
 const frozen=G.pw.freeze>0;
 ctx.drawImage(frozen?img.ice:img.img,-s/2,-s/2,s,s);
 if(v.flash>0){ctx.globalAlpha=v.flash*0.7;ctx.drawImage(img.white,-s/2,-s/2,s,s);ctx.globalAlpha=1;}
 if(v.kind==='armor'){const R=v.r*0.97;ctx.lineWidth=5*SC;const ag=ctx.createLinearGradient(-R,-R,R,R);ag.addColorStop(0,'#ffffff');ag.addColorStop(.45,'#8d9aa8');ag.addColorStop(.55,'#6e7b89');ag.addColorStop(1,'#e8eef3');ctx.strokeStyle=ag;ctx.beginPath();ctx.arc(0,0,R,0,6.28);ctx.stroke();
  for(let i=0;i<6;i++){const a=i/6*6.28+0.3;ctx.fillStyle='#4a5664';ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,2.2*SC,0,6.28);ctx.fill();}}
 if(v.kind==='fast'){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;for(const o of[-0.4,0,0.4]){ctx.beginPath();ctx.moveTo(o*v.r,-v.r*1.05);ctx.lineTo(o*v.r,-v.r*1.45);ctx.stroke();}}
 ctx.restore();
 // 血量环：受伤后在病毒外圈显示剩余血量（不显示数字）
 if(v.hp<v.max){const f=Math.max(0,v.hp/v.max),R=v.r*1.12+3*SC;ctx.lineCap='round';
  ctx.lineWidth=4.5*SC;ctx.strokeStyle='rgba(10,20,40,.55)';ctx.beginPath();ctx.arc(v.x,v.y,R,0,6.283);ctx.stroke();
  ctx.lineWidth=3*SC;ctx.strokeStyle=f>0.5?'#7dffb0':f>0.25?'#ffd84a':'#ff5a6a';ctx.beginPath();ctx.arc(v.x,v.y,R,-1.571,-1.571+6.283*f);ctx.stroke();ctx.lineCap='butt';}
}
function drawBoss(b){
 const img=IMG.boss;const s=b.r*2.5;const ar=img.height/img.width;const oy=-s*ar/2-b.r*0.12;
 ctx.save();ctx.translate(b.x,b.y);
 ctx.scale(1+b.sq*0.4,1-b.sq*0.35);ctx.rotate(Math.sin(b.t*1.7)*0.06);
 if(b.dead){ctx.globalAlpha=Math.max(0,1-b.deadT*1.2);ctx.rotate(b.deadT*2.5);const k=1+b.deadT*0.4;ctx.scale(k,k);}
 ctx.drawImage(G.pw.freeze>0?BOSSI.ice:img,-s/2,oy,s,s*ar);
 if(b.flash>0){ctx.globalAlpha=ctx.globalAlpha*b.flash*0.3;ctx.drawImage(BOSSI.white,-s/2,oy,s,s*ar);}
 ctx.restore();ctx.globalAlpha=1;
}
function drawRobot(){
 const img=IMG.robot;const h=RB*1.7,w=h*img.width/img.height;
 const blink=doc.inv>0&&doc.hitT<=0&&state==='play'&&Math.floor(doc.inv*12)%2===0;
 if(G.pw.laser>0){const lw=(17+Math.sin(bgDrift*40)*4)*SC;const lg=ctx.createLinearGradient(doc.x-lw,0,doc.x+lw,0);lg.addColorStop(0,'rgba(80,220,255,0)');lg.addColorStop(.3,'rgba(80,220,255,.6)');lg.addColorStop(.5,'rgba(255,255,255,.95)');lg.addColorStop(.7,'rgba(80,220,255,.6)');lg.addColorStop(1,'rgba(80,220,255,0)');
  ctx.globalCompositeOperation='lighter';ctx.fillStyle=lg;ctx.fillRect(doc.x-lw,0,lw*2,doc.y-RB);ctx.globalCompositeOperation='source-over';}
 const bob=Math.sin(bgDrift*5)*2*SC;
 ctx.save();ctx.translate(doc.x,doc.y+bob);ctx.rotate(doc.lean);const rc=doc.recoil*0.03;ctx.scale(1+rc,1-rc);
 if(!blink)ctx.drawImage(img,-w/2,-h*0.52,w,h);
 ctx.restore();
 // 防护罩泡泡：被击中时变红、抖动、出现裂纹
 const hit=doc.hitT>0,k=hit?1+Math.sin(doc.hitT*60)*0.06:1+Math.sin(bgDrift*3)*0.015;const B=hit?BUBBLE_R:BUBBLE;
 const bs=B.s*k;ctx.globalAlpha=blink?0.45:1;ctx.drawImage(B.c,doc.x-bs/2,doc.y+bob-bs/2,bs,bs);
 if(doc.hp<3&&state==='play'){ctx.strokeStyle=hit?'rgba(255,200,210,.9)':'rgba(230,250,255,.55)';ctx.lineWidth=1.4;ctx.beginPath();const cr=doc.hp===1?[[-.2,-.95,.05,-.55,-.1,-.3],[.7,-.6,.45,-.35,.55,-.1],[-.8,.4,-.5,.3,-.55,.05]]:[[-.2,-.95,.05,-.55,-.1,-.3]];for(const c of cr){ctx.moveTo(doc.x+c[0]*RB,doc.y+bob+c[1]*RB);ctx.lineTo(doc.x+c[2]*RB,doc.y+bob+c[3]*RB);ctx.lineTo(doc.x+c[4]*RB,doc.y+bob+c[5]*RB);}ctx.stroke();}
 ctx.globalAlpha=1;
 if(doc.shield>0){const a=doc.shield<3?(Math.floor(doc.shield*6)%2?0.3:0.9):0.9;ctx.globalAlpha=a;ctx.strokeStyle='rgba(255,210,90,.95)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(doc.x,doc.y+bob,RB+6*SC,0,6.28);ctx.stroke();ctx.globalAlpha=a*0.5;ctx.lineWidth=8;ctx.strokeStyle='rgba(255,180,40,.4)';ctx.stroke();ctx.globalAlpha=1;}
 // 当前药丸颜色指示环
 const col=COLORS[G.color];ctx.strokeStyle=col.hex;ctx.globalAlpha=0.55;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(doc.x,doc.y+bob,RB+2,-2.2,-0.94);ctx.stroke();ctx.globalAlpha=1;
}
function drawPowerIcon(k,x,y,r,t){
 ctx.save();ctx.translate(x,y);
 const col={laser:'#4fd8ff',shield:'#ffb020',spread:'#7cff6b',freeze:'#9fe8ff'}[k];
 const gl=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.7);gl.addColorStop(0,col);gl.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=0.5+0.3*Math.sin(t*8);ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,0,r*1.7,0,6.28);ctx.fill();ctx.globalAlpha=1;
 const bg=ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r);bg.addColorStop(0,'#fff');bg.addColorStop(.35,col);bg.addColorStop(1,'#123');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#fff';ctx.stroke();
 ctx.fillStyle='#fff';ctx.strokeStyle='#123';ctx.lineWidth=1.5;const u=r/14;
 if(k==='laser'){ctx.rotate(-0.6);roundRect(-4*u,-4*u,8*u,14*u,2*u);ctx.fill();ctx.stroke();ctx.fillStyle='#1aa8e0';ctx.fillRect(-2.5*u,0,5*u,8*u);ctx.fillStyle='#fff';ctx.fillRect(-0.8*u,-11*u,1.6*u,7*u);ctx.fillRect(-5*u,10*u,10*u,2*u);}
 else if(k==='shield'){ctx.beginPath();ctx.moveTo(0,-9*u);ctx.lineTo(8*u,-5*u);ctx.quadraticCurveTo(8*u,6*u,0,10*u);ctx.quadraticCurveTo(-8*u,6*u,-8*u,-5*u);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff8a00';ctx.font=`900 ${11*u}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('C',0,1*u);}
 else if(k==='spread'){for(const a of[-0.55,0,0.55]){ctx.save();ctx.rotate(a);roundRect(-2.6*u,-11*u,5.2*u,11*u,2.6*u);ctx.fill();ctx.stroke();ctx.restore();}}
 else if(k==='freeze'){ctx.strokeStyle='#fff';ctx.lineWidth=2.2*u;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*1.047);ctx.beginPath();ctx.moveTo(0,-9*u);ctx.lineTo(0,9*u);ctx.moveTo(-3*u,-6.5*u);ctx.lineTo(0,-3.5*u);ctx.lineTo(3*u,-6.5*u);ctx.moveTo(-3*u,6.5*u);ctx.lineTo(0,3.5*u);ctx.lineTo(3*u,6.5*u);ctx.stroke();ctx.restore();}}
 ctx.restore();
}
function drawBolt(b){
 const a=b.life/b.max;ctx.globalCompositeOperation='lighter';
 for(const [lw,col] of [[7*SC,'rgba(180,110,255,'+(0.35*a)+')'],[2.4*SC,'rgba(245,230,255,'+a+')']]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.beginPath();
  for(let i=0;i<b.pts.length-1;i++){const [x1,y1]=b.pts[i],[x2,y2]=b.pts[i+1];ctx.moveTo(x1,y1);const n=5;for(let k=1;k<n;k++){const t=k/n;const j=(Math.sin(b.seed+k*7.3+i*3.1+bgDrift*60)*14)*SC;const nx=-(y2-y1),ny=x2-x1,l=Math.hypot(nx,ny)||1;ctx.lineTo(x1+(x2-x1)*t+nx/l*j,y1+(y2-y1)*t+ny/l*j);}ctx.lineTo(x2,y2);}
  ctx.stroke();}
 ctx.globalCompositeOperation='source-over';
}
function drawGame(){
 drawExitLine();
 for(const d of G.drops)drawPowerIcon(d.k,d.x,d.y,17*SC,d.t);
 for(const v of G.viruses)drawVirus(v);
 if(G.boss)drawBoss(G.boss);
 for(const s of G.shots){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);const gg=ctx.createRadialGradient(-s.r*0.3,-s.r*0.3,1,0,0,s.r);gg.addColorStop(0,'#f0ffc0');gg.addColorStop(.5,'#8fdc2a');gg.addColorStop(1,'#3b7a0a');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,s.r,0,6.28);ctx.fill();ctx.strokeStyle='#1d3d05';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 ctx.globalCompositeOperation='lighter';
 for(const p of G.pills){ctx.fillStyle=COLORS[p.c].glow.replace('.9)',p.c===1?'.45)':'.26)');ctx.beginPath();ctx.ellipse(p.x,p.y+16*SC,p.c===1?4*SC:5*SC,p.c===1?30*SC:18*SC,-p.rot,0,6.28);ctx.fill();}
 ctx.globalCompositeOperation='source-over';
 for(const p of G.pills){const s=PILLS[p.c];if(p.rot){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-p.rot);ctx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h);ctx.restore();}else ctx.drawImage(s.c,p.x-s.w/2,p.y-s.h/2,s.w,s.h);}
 drawRobot();
 for(const b of G.bolts)drawBolt(b);
 for(const p of G.parts){const a=clamp(p.life/p.max,0,1);
  if(p.flash){ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.4,`rgba(${p.col},${a*0.8})`);g.addColorStop(1,`rgba(${p.col},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);ctx.fill();ctx.globalCompositeOperation='source-over';}
  else if(p.ring){ctx.globalAlpha=a;ctx.strokeStyle=p.col;ctx.lineWidth=(p.w||3)*a+0.5;const rr=p.r*(1.4-a*0.6);ctx.beginPath();ctx.arc(p.x,p.y,rr,0,6.28);ctx.stroke();}
  else{if(p.add)ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,a*1.5);ctx.fillStyle=p.col;const rr=p.r*(p.goo?(0.5+a*0.5):1);ctx.beginPath();ctx.arc(p.x,p.y,rr,0,6.28);ctx.fill();if(p.add)ctx.globalCompositeOperation='source-over';}
 }
 ctx.globalAlpha=1;
 for(const c of G.coins){const sx=Math.abs(Math.cos(c.t*10+c.x));const r=8*SC;ctx.save();ctx.translate(c.x,c.y);ctx.scale(Math.max(0.25,sx),1);const cg=ctx.createRadialGradient(-r*0.3,-r*0.3,1,0,0,r);cg.addColorStop(0,'#fff6b0');cg.addColorStop(.4,'#ffd23a');cg.addColorStop(1,'#d08a00');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.strokeStyle='#9a5a00';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const p of G.pops){const a=clamp(p.life/p.max,0,1);const sc=a>0.8?1+(a-0.8)*2.5:1;ctx.globalAlpha=Math.min(1,a*2.2);ctx.font=`900 ${p.s*SC*sc}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.lineWidth=p.big?4:3;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(p.txt,p.x,p.y);ctx.fillStyle=p.col;ctx.fillText(p.txt,p.x,p.y);}
 ctx.globalAlpha=1;
 let px=12*SC;for(const k of['laser','spread','freeze']){if(G.pw[k]>0){const cx=px+14*SC,cy=FY-24*SC;drawPowerIcon(k,cx,cy,11*SC,bgDrift);const mx={laser:4.5,spread:8,freeze:4}[k];ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,15*SC,-1.57,-1.57+6.28*G.pw[k]/mx);ctx.stroke();px+=36*SC;}}
 if(G.hintT>0&&state==='play'&&!paused){const a=clamp(G.hintT,0,1);ctx.globalAlpha=a;const hx=W/2+Math.sin(bgDrift*2.4)*60*SC,hy=doc.y+Math.cos(bgDrift*1.7)*20*SC+RB+10*SC;
  ctx.font=`900 ${17*SC}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.strokeText('按住任意位置拖动小卫士',W/2,doc.y-RB-80*SC);ctx.fillStyle='#fff';ctx.fillText('按住任意位置拖动小卫士',W/2,doc.y-RB-80*SC);
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(hx,hy,12*SC,0,6.28);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hx,hy,20*SC+Math.sin(bgDrift*8)*3,0,6.28);ctx.stroke();ctx.globalAlpha=1;}
}
// ================= HUD / screens =================
function updHud(){
 if(!G)return;$('hCoins').textContent=fmt(S.coins);
 const pr=G.info.boss?(1-G.boss.hp/G.boss.max):clamp(G.doneHp/G.totalHp,0,1);
 $('hProg').style.width=(pr*100).toFixed(1)+'%';
 if(G.info.boss)$('bossHp').style.width=(G.boss.hp/G.boss.max*100).toFixed(1)+'%';
 const hh=$('hHearts');const key=String(doc.hp);if(hh.dataset.k!==key){hh.dataset.k=key;let s='';for(let i=0;i<3;i++)s+=ICONS.heart(i<doc.hp?'#ff4d6a':'rgba(255,255,255,.2)');hh.innerHTML=s;}
}
const SCREENS=['title','levels','shop','tip','pause','win','lose','ending'];
function showScreen(id){SCREENS.forEach(s=>$(s).classList.toggle('on',s===id));if(id&&id!=='pause')$('hud').classList.remove('on');document.querySelectorAll('.cval').forEach(e=>e.textContent=fmt(S.coins));}
function goTitle(){state='menu';G=null;menuWorld=0;showScreen('title');Music.play('menu');}
function goLevels(w){state='menu';G=null;if(w==null)w=Math.min(NW-1,Math.floor((Math.min(S.unlocked,NLV)-1)/6));menuWorld=w;renderLevels();showScreen('levels');Music.play('menu');}
function renderLevels(){
 const w=menuWorld;$('wName').textContent=WORLDS[w].n;$('wSub').textContent=WORLDS[w].s;$('lvBossN').textContent='本章BOSS · 第'+(w*6+6)+'关';
 $('wPrev').disabled=w===0;$('wNext').disabled=w===NW-1;
 let h='';for(let i=0;i<6;i++){const L=w*6+i+1;const lock=L>S.unlocked;const st=S.stars[L]||0;const boss=i===5;
  h+=`<button class="lv${boss?' boss':''}${lock?' lock':''}" data-l="${L}">${lock?'<svg viewBox="0 0 24 24" width="30" height="30"><rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(255,255,255,.5)"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="rgba(255,255,255,.5)" stroke-width="2.5" fill="none"/></svg>':L}${!lock?`<span class="st">${[0,1,2].map(k=>k<st?'★':'<i>★</i>').join('')}</span>`:''}${boss?'<span class="bt">BOSS</span>':''}</button>`;}
 $('wGrid').innerHTML=h;
 $('wDots').innerHTML=WORLDS.map((_,k)=>`<b class="${k===w?'on':''}"></b>`).join('');
 $('wGrid').querySelectorAll('.lv').forEach(b=>b.onclick=()=>{const L=+b.dataset.l;if(L>S.unlocked){sfx('deny');toast('先通过前面的关卡吧');return;}sfx('click');startLevel(L);});
}
let shopNext=1;
function goShop(next){shopNext=next||Math.min(S.unlocked,NLV);state='menu';G=null;grantColors();renderShop();showScreen('shop');$('shop').scrollTop=0;Music.play('menu');}
function refreshCoins(){document.querySelectorAll('.cval').forEach(e=>e.textContent=fmt(S.coins));}
function renderShop(){
 let h='';for(const u of UPS){const l=S.up[u.k];const mx=l>=u.max;const c=mx?0:u.cost(l);const can=!mx&&S.coins>=c;
  const bars=u.max<=15?Array.from({length:u.max},(_,i)=>`<i class="${i<l?'f':''}"></i>`).join(''):'';
  h+=`<div class="up"><div class="ic">${ICONS[u.icon]}</div><div class="tx"><div class="nm">${u.n}<small>Lv.${l}${mx?'（满级）':''}</small></div><div class="ds">${mx?'已达到最高等级':u.d(l)}</div>${bars?`<div class="bar">${bars}</div>`:''}</div>
  <button class="btn ${mx?'gray':'orange'} buy ${can||mx?'':'no'}" data-k="${u.k}">${mx?'满级':`<span class="coin">¥</span>${fmt(c)}`}</button></div>`;}
 $('ups').innerHTML=h;
 $('ups').querySelectorAll('.buy').forEach(b=>b.onclick=()=>{const u=UPS.find(x=>x.k===b.dataset.k);const l=S.up[u.k];if(l>=u.max)return;const c=u.cost(l);if(S.coins<c){sfx('deny');toast('金币不足，去关卡里赚更多金币吧');return;}S.coins-=c;S.up[u.k]++;save();sfx('buy');try{GT.ev('shop_buy',{k:u.k,lv:S.up[u.k]})}catch(_e){}renderShop();refreshCoins();});
 const box=$('skins');box.innerHTML='';
 COLORS.forEach((c,i)=>{const l=S.pc[i];const el=document.createElement('div');el.className='pc'+(S.cur===i?' eq':'');el.style.setProperty('--c',c.hex);
  const sp=pcSpec(i,l||1),nx=l&&l<PCMAX?pcSpec(i,l+1):null;
  el.appendChild(pcIcon(i,64,l||1));
  const tx=document.createElement('div');tx.className='tx';
  tx.innerHTML=`<div class="nm" style="color:${c.hi}">${c.n}色 · ${c.k}<small>${l?'Lv.'+l+(l>=PCMAX?'（满级）':''):'第 '+c.unlock+' 关解锁'}</small></div><div class="ds">${sp.txt}${nx?`<br>下一级：${nx.txt}`:''}</div>`;
  el.appendChild(tx);const bt=document.createElement('div');bt.className='bt';
  if(!l){const b=document.createElement('button');b.className='btn orange buy'+(S.coins>=c.buy?'':' no');b.innerHTML=`<span class="coin">¥</span>${fmt(c.buy)}`;b.onclick=()=>{if(S.coins<c.buy){sfx('deny');toast('金币不足');return;}S.coins-=c.buy;S.pc[i]=1;S.cur=i;save();sfx('buy');try{GT.ev('shop_color',{c:i,lv:1})}catch(_e){}renderShop();refreshCoins();};bt.appendChild(b);}
  else{if(l<PCMAX){const cost=pcUpCost(i,l);const b=document.createElement('button');b.className='btn orange buy'+(S.coins>=cost?'':' no');b.innerHTML=`<span class="coin">¥</span>${fmt(cost)}`;b.onclick=()=>{if(S.coins<cost){sfx('deny');toast('金币不足');return;}S.coins-=cost;S.pc[i]++;save();sfx('buy');try{GT.ev('shop_color',{c:i,lv:S.pc[i]})}catch(_e){}renderShop();refreshCoins();};bt.appendChild(b);}
   const e=document.createElement('button');e.className='btn '+(S.cur===i?'gray':'blue');e.textContent=S.cur===i?'使用中':'装备';e.onclick=()=>{S.cur=i;save();sfx('click');renderShop();};bt.appendChild(e);}
  el.appendChild(bt);box.appendChild(el);});
 $('bShopGo').textContent=`开始第 ${shopNext} 关`;
}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>e.style.display='none',1900);}
function togglePause(){if(state!=='play'||$('tip').classList.contains('on'))return;paused=!paused;ptr=null;if(paused){try{GT.pause()}catch(_e){}$('pSub').textContent=`第 ${G.L} 关 · ${WORLDS[G.info.w].n}`;$('pause').classList.add('on');}else $('pause').classList.remove('on');sfx('click');}
function winLevel(){
 state='end';const L=G.L;const stars=G.hurt===0&&G.esc===0?3:G.hurt<=1&&G.esc<=2?2:1;try{GT.win(L,{stars:stars,coins:G.earned,boss:G.info.boss?1:0,hurt:G.hurt,esc:G.esc,c:G.color})}catch(_e){}
 const bonus=Math.round((30+L*15)*stats().coin*(G.info.boss?2:1));S.coins+=bonus;G.earned+=bonus;
 S.stars[L]=Math.max(S.stars[L]||0,stars);S.unlocked=Math.max(S.unlocked,Math.min(NLV,L+1));save();
 $('hud').classList.remove('on');
 Music.stinger('win');Music.play('menu');
 if(L===NLV){showScreen('ending');return;}
 const nu=COLORS.findIndex((c,i)=>i>0&&!S.pc[i]&&c.unlock===L+1);
 $('wSubT').textContent=G.info.boss?`击败了 ${BOSSN[G.info.w]}！新世界已解锁`:nu>0?`第 ${L} 关 完成！下一关解锁${COLORS[nu].n}色药丸·${COLORS[nu].k}`:`第 ${L} 关 完成！${G.esc?'漏网病毒 '+G.esc+' 个':''}`;$('wEarn').textContent=fmt(G.earned);
 $('wRib').textContent=G.info.boss?'BOSS 击败！':stars===3?'完美守护！':'守护成功！';
 $('wStars').innerHTML=[0,1,2].map(k=>ICONS.star(k<stars,k===1?'mid':'')).join('');
 showScreen('win');
 $('wStars').querySelectorAll('svg').forEach((s,k)=>setTimeout(()=>{s.classList.add('pop');if(k<stars)sfx('star');},350+k*260));
}
function loseLevel(why){
 state='end';G.lost=true;try{GT.fail(G.L,{r:why||'virus',revived:G.revived?1:0,c:G.color})}catch(_e){}$('hud').classList.remove('on');Music.stinger('lose');Music.play('menu');
 const cost=reviveCost();$('bRevive').innerHTML=`<span class="coin" style="width:22px;height:22px;font-size:13px;vertical-align:-4px">¥</span> ${fmt(cost)} 立即复活`;
 $('bRevive').style.display=G.revived?'none':'';
 $('lSub').textContent=['防护罩被病毒撞破了……','培养皿失守了……','显微镜下一片混乱……','血管告急！','实验室沦陷了……','药柜被冻住了……','菌落蔓延开了……','细胞失守了……','心脏要塞告急！','母巢又扩张了……'][G.info.w]+' 升级火力和射速再来！';
 showScreen('lose');
}
function reviveCost(){return Math.round(80+G.L*25);}
function revive(){const c=reviveCost();if(S.coins<c){sfx('deny');toast('金币不足');return;}S.coins-=c;save();G.revived=true;try{GT.revive('coins')}catch(_e){}doc.hp=3;doc.inv=3;doc.shield=8;$('hHearts').dataset.k='';
 for(const v of G.viruses){const dx=v.x-doc.x,dy=v.y-doc.y;if(dx*dx+dy*dy<(200*SC)**2){v.vy=-260*SC;}}state='play';paused=false;showScreen(null);$('hud').classList.add('on');sfx('power');const sg=songFor(G.info);Music.play(sg[0],sg[1]);}
const HASVIB=typeof navigator.vibrate==='function';
function refreshToggles(){
 ['bMus1','bMus2'].forEach(id=>{const b=$(id);b.innerHTML=ICONS.mOn;b.classList.toggle('off',!S.music);b.style.position='relative';});
 ['bSfx1','bSfx2'].forEach(id=>{const b=$(id);b.innerHTML=ICONS.sOn;b.classList.toggle('off',!S.sfx);b.style.position='relative';});
 ['bVib1','bVib2'].forEach(id=>{const b=$(id);b.innerHTML=ICONS.vib;b.classList.toggle('off',!S.vib);b.style.position='relative';b.style.display=HASVIB?'':'none';});
}
const on=(id,f)=>$(id).addEventListener('click',f);
on('bStart',()=>{sfx('click');try{GT.title()}catch(_e){}goLevels();});
on('bShop1',()=>{sfx('click');goShop();});on('bShop2',()=>{sfx('click');goShop();});
on('bBack1',()=>{sfx('click');goTitle();});on('bBack2',()=>{sfx('click');goLevels();});
on('bShopGo',()=>{sfx('click');startLevel(shopNext);});
on('wPrev',()=>{if(menuWorld>0){menuWorld--;renderLevels();sfx('click');}});on('wNext',()=>{if(menuWorld<NW-1){menuWorld++;renderLevels();sfx('click');}});
['bMus1','bMus2'].forEach(id=>on(id,()=>{setMusic(!S.music);sfx('click');try{GT.sound('music',S.music)}catch(_e){}}));
['bSfx1','bSfx2'].forEach(id=>on(id,()=>{setSfx(!S.sfx);sfx('click');try{GT.sound('sfx',S.sfx)}catch(_e){}}));
['bVib1','bVib2'].forEach(id=>on(id,()=>{S.vib=!S.vib;save();refreshToggles();sfx('click');if(S.vib)vibrate(25);try{GT.sound('vib',S.vib)}catch(_e){}}));
on('bTipOk',closeTip);
$('tip').addEventListener('click',e=>{if(e.target===$('tip'))closeTip();});
$('bPause').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();togglePause();});
on('bResume',()=>togglePause());
on('bRestart',()=>{sfx('click');startLevel(G.L);});
on('bQuit',()=>{sfx('click');try{GT.quit('menu')}catch(_e){}goLevels();});
on('bNext',()=>{sfx('click');startLevel(Math.min(NLV,G.L+1));});
on('bWinShop',()=>{sfx('click');goShop(Math.min(30,G.L+1));});
on('bWinMenu',()=>{sfx('click');goLevels();});
on('bRetry',()=>{sfx('click');startLevel(G.L);});
on('bRevive',()=>revive());
on('bLoseShop',()=>{sfx('click');goShop(G.L);});
on('bLoseMenu',()=>{sfx('click');goLevels();});
on('bEndOk',()=>{sfx('click');goLevels(4);});
// back to hub (Tilo 游戏屋): save, then leave
function goHub(e){if(e)e.stopPropagation();save();try{sfx('click');}catch(_){}try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){}location.href='../';}
['bHub0','bHubP','bHubW','bHubL','bHubE'].forEach(id=>on(id,goHub));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='play'&&!paused)togglePause();if(AU.ctx)AU.ctx.suspend();}else if(AU.ctx)AU.ctx.resume();});
(()=>{let sx=null;const el=$('levels');el.addEventListener('pointerdown',e=>{sx=e.clientX;});el.addEventListener('pointerup',e=>{if(sx==null)return;const d=e.clientX-sx;sx=null;if(Math.abs(d)>60){if(d<0&&menuWorld<NW-1)menuWorld++;else if(d>0&&menuWorld>0)menuWorld--;else return;renderLevels();sfx('click');}});})();

// ================= loop =================
let last=performance.now();
function frame(now){
 let dt=Math.min(0.05,(now-last)/1000);last=now;
 if(DBG.fast)dt*=2;
 const steps=dt>0.034?3:dt>0.02?2:1;for(let i=0;i<steps;i++)update(dt/steps);
 updFx(dt);render();requestAnimationFrame(frame);
}
window.__T={n:NLV,start:L=>startLevel(L),win:()=>winLevel()};
window.__dbg={get state(){return state},get G(){return G},S,doc,start:startLevel,setColor,UPS,save,levelInfo,pcSpec,stats,closeTip,get W(){return W},get FY(){return FY},spawnVirus:(e,x,y,vx,vy)=>spawnVirus(e,x,y,vx,vy)};
loadAll(()=>{
 for(const k of['v_red','v_yellow','v_blue']){const im=IMG[k];VS.push({img:im,white:tinted(im,'#fff',1),ice:tinted(im,'#bfefff',0.55)});}
 BOSSI.white=tinted(IMG.boss,'#fff',1);BOSSI.ice=tinted(IMG.boss,'#bfefff',0.55);
 resize();refreshToggles();
 $('loading').style.display='none';
 if(DBG.level)startLevel(DBG.level);
 else if(DBG.shop)goShop();
 else if(DBG.screen==='levels')goLevels();
 else goTitle();
 requestAnimationFrame(frame);
});
})();
