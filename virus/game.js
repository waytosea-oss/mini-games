"use strict";
(()=>{
// ================= utils =================
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const DBG={level:+Q.get('level')||0,god:Q.has('god'),bot:Q.has('bot'),coins:Q.has('coins')?+Q.get('coins'):null,up:Q.get('up'),shop:Q.has('shop'),fast:Q.has('fast'),reset:Q.has('reset'),mute:Q.has('mute'),screen:Q.get('screen')};
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fmt=n=>{n=Math.floor(n);return n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'M':n>=1e4?(n/1e3).toFixed(n>=1e5?0:1)+'K':String(n);};

// ================= save =================
const SKEY='pilldoctor_v1';
const DEF={unlocked:1,stars:{},coins:0,up:{pow:0,rate:0,num:0,coin:0},skins:[1,0,0],skin:0,music:true,sfx:true};
let S;
try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem(SKEY)||'{}'));S.up=Object.assign({},DEF.up,S.up);}catch(e){S=JSON.parse(JSON.stringify(DEF));}
if(DBG.reset)S=JSON.parse(JSON.stringify(DEF));
if(DBG.coins!==null)S.coins=DBG.coins;
if(DBG.up){const a=DBG.up.split(',').map(Number);S.up={pow:a[0]||0,rate:a[1]||0,num:a[2]||0,coin:a[3]||0};}
if(DBG.level)S.unlocked=Math.max(S.unlocked,Math.min(30,DBG.level));
if(DBG.mute){S.music=false;S.sfx=false;}
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S))}catch(e){}}

// ================= data =================
const COLORS=[{n:'红',hex:'#ff3b4e',hi:'#ff9aa4',dk:'#a8101f',glow:'rgba(255,60,80,.9)'},{n:'黄',hex:'#ffcc1a',hi:'#fff08a',dk:'#b07800',glow:'rgba(255,210,30,.9)'},{n:'蓝',hex:'#2f8dff',hi:'#9cd0ff',dk:'#0a4aa8',glow:'rgba(50,140,255,.9)'}];
const WORLDS=[
 {n:'药瓶世界',s:'第一章 · 在巨大的药瓶里清除病菌',bg:'bg1',tint:'#0d3b44'},
 {n:'培养皿',s:'第二章 · 小心带金属护甲的病毒',bg:'bg2',tint:'#1d3a33'},
 {n:'显微镜下',s:'第三章 · 会变色的变异病毒出现了',bg:'bg3',tint:'#1a1440'},
 {n:'血管急救',s:'第四章 · 病毒在血液里横冲直撞',bg:'bg4',tint:'#3a0c14'},
 {n:'终极实验室',s:'第五章 · 与病毒大王的最终决战',bg:'bg5',tint:'#0a1630'},
];
const BOSSN=['病毒大王·初','铁甲大王','变色大王','血魔大王','病毒大王·终极'];
const SKINS=[{n:'小林医生',d:'标准装备',img:'doctor1',cost:0,pow:1,rate:1,coin:1},{n:'樱桃医生',d:'射速 +15%',img:'doctor2',cost:1800,pow:1,rate:1.15,coin:1},{n:'白胡子教授',d:'药力+25% 金币+20%',img:'doctor3',cost:5000,pow:1.25,rate:1,coin:1.2}];
function rate(l){return 6+l*0.65}
const UPS=[
 {k:'pow',n:'药力',d:l=>`每颗药丸伤害 ${1+l} → ${2+l}`,max:40,cost:l=>Math.round(40*Math.pow(1.27,l)),icon:'pow'},
 {k:'rate',n:'射速',d:l=>`每秒投掷 ${rate(l).toFixed(1)} → ${rate(l+1).toFixed(1)} 次`,max:15,cost:l=>Math.round(60*Math.pow(1.38,l)),icon:'rate'},
 {k:'num',n:'药丸数量',d:l=>`同时投掷 ${1+l} → ${2+l} 颗药丸`,max:4,cost:l=>[400,1600,4500,10000][l],icon:'num'},
 {k:'coin',n:'金币加成',d:l=>`金币收益 ×${(1+l*.2).toFixed(1)} → ×${(1.2+l*.2).toFixed(1)}`,max:10,cost:l=>Math.round(80*Math.pow(1.5,l)),icon:'coin'},
];
const ICONS={
 pow:'<svg viewBox="0 0 40 40"><g transform="rotate(-35 20 20)"><rect x="6" y="13" width="28" height="14" rx="7" fill="#fff"/><path d="M13 13h7v14h-7a7 7 0 0 1 0-14z" fill="#ff3b4e"/><rect x="9" y="15" width="10" height="3" rx="1.5" fill="#fff" opacity=".6"/></g><path d="M30 3l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#ffd84a"/></svg>',
 rate:'<svg viewBox="0 0 40 40"><path d="M23 3L9 22h9l-3 15 15-20h-9z" fill="#ffd84a" stroke="#b07800" stroke-width="2" stroke-linejoin="round"/></svg>',
 num:'<svg viewBox="0 0 40 40"><rect x="4" y="12" width="9" height="20" rx="4.5" fill="#fff"/><path d="M4 22v-5.5a4.5 4.5 0 0 1 9 0V22z" fill="#ff3b4e"/><rect x="15.5" y="6" width="9" height="20" rx="4.5" fill="#fff"/><path d="M15.5 16v-5.5a4.5 4.5 0 0 1 9 0V16z" fill="#ffcc1a"/><rect x="27" y="12" width="9" height="20" rx="4.5" fill="#fff"/><path d="M27 22v-5.5a4.5 4.5 0 0 1 9 0V22z" fill="#2f8dff"/></svg>',
 coin:'<svg viewBox="0 0 40 40"><circle cx="20" cy="21" r="14" fill="#f0a000"/><circle cx="20" cy="19" r="14" fill="#ffd23a"/><circle cx="20" cy="19" r="10" fill="none" stroke="#c98200" stroke-width="2"/><text x="20" y="25" font-size="15" font-weight="900" text-anchor="middle" fill="#a35a00">¥</text></svg>',
 mOn:'<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="#fff"/><circle cx="17.5" cy="16" r="2.8" fill="#fff"/></svg>',
 sOn:'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
 heart:c=>`<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="${c}" stroke="#5a0a18" stroke-width="1.6"/><ellipse cx="8.5" cy="9" rx="2" ry="1.4" fill="#fff" opacity=".6"/></svg>`,
 star:(on,cls)=>`<svg class="${cls||''}" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" fill="${on?'#ffd84a':'#2b4a60'}" stroke="${on?'#b07800':'#14293a'}" stroke-width="1.5" stroke-linejoin="round"/>${on?'<path d="M8 9l2.5-.3L12 5" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>':''}</svg>`,
};

// ================= level gen =================
function levelInfo(L){
 const w=Math.min(4,Math.floor((L-1)/6)), i=(L-1)%6, boss=i===5;
 const H0=9*Math.pow(1.15,L-1)*(L<=2?0.85:1);
 const R=mulberry(L*7919+13);
 const q=[];
 if(!boss){
  const n=4+Math.floor(i*0.8)+w;
  for(let k=0;k<n;k++){
   let tier=R()<0.25+i*0.08+w*0.04?3:R()<0.6?2:1;
   if(L===1)tier=k<2?1:2;
   const hp=Math.max(2,Math.round(H0*[.25,.45,.7,1][tier]*(0.8+R()*0.45)));
   let kind='n';
   if(w>=1&&R()<0.15+w*0.05)kind='armor';
   else if(w>=2&&R()<0.22)kind='mut';
   q.push({delay:k===0?0.8:Math.max(1.6,2.8+R()*2.6-w*0.3),tier,hp,c:Math.floor(R()*3),kind});
  }
 }
 return {L,w,i,boss,H0,q,bossHp:boss?Math.round(H0*150*(1+w*0.25)):0};
}

// ================= assets =================
const IMG={};
const LIST=['doctor1','doctor2','doctor3','v_red','v_yellow','v_blue','boss','bg1','bg2','bg3','bg4','bg5'];
function loadAll(cb){let n=0;LIST.forEach(k=>{const im=new Image();im.onload=im.onerror=()=>{n++;$('ldBar').style.width=(n/LIST.length*100)+'%';if(n===LIST.length)cb();};im.src='assets/'+k+(k.startsWith('bg')?'.jpg':'.png');IMG[k]=im;});}
const VS=[];
function tinted(img,col,alpha){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=alpha;x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return c;}
// ================= audio =================
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
 const thr={shoot:0.07,hit:0.05,match:0.06,coin:0.045,pop:0.03,bounce:0.08,split:0.05}[name]||0;
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
let W=390,H=844,DPR=1,SC=1,FY=700,TOP=90;
function resize(){
 const r=$('app').getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(3,window.devicePixelRatio||1);
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);SC=clamp(Math.min(W/390,H/760),0.8,1.25);
 const cb=$('colors').getBoundingClientRect();
 const barTop=cb.height>0?cb.top-r.top:H-90;
 FY=Math.min(H-88,barTop-12);TOP=90;
 if(doc)doc.y=FY;
 buildPills();
}
window.addEventListener('resize',resize);

// pill sprites
const PILLS=[];
function pillPath(x,w,h,r){x.beginPath();x.moveTo(0,r);x.arc(r,r,r,Math.PI,0);x.lineTo(w,h-r);x.arc(r,h-r,r,0,Math.PI);x.closePath();}
function makePill(ci,w,h,dpr){
 const c=document.createElement('canvas');const pad=4;c.width=Math.ceil((w+pad*2)*dpr);c.height=Math.ceil((h+pad*2)*dpr);const x=c.getContext('2d');x.scale(dpr,dpr);x.translate(pad,pad);
 const r=w/2;
 x.save();pillPath(x,w,h,r);x.clip();
 if(ci===3){const g=x.createLinearGradient(0,0,0,h/2);g.addColorStop(0,'#ff3b4e');g.addColorStop(.5,'#ffcc1a');g.addColorStop(1,'#2f8dff');x.fillStyle=g;}
 else{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,COLORS[ci].dk);g.addColorStop(.35,COLORS[ci].hex);g.addColorStop(1,COLORS[ci].dk);x.fillStyle=g;}
 x.fillRect(0,0,w,h/2);
 const g2=x.createLinearGradient(0,0,w,0);g2.addColorStop(0,'#c3ced8');g2.addColorStop(.35,'#ffffff');g2.addColorStop(1,'#b0bcc8');x.fillStyle=g2;x.fillRect(0,h/2,w,h/2);
 x.fillStyle='rgba(255,255,255,.7)';x.fillRect(w*0.2,2,w*0.18,h-4);
 x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,h/2-0.8,w,1.6);
 x.restore();
 x.lineWidth=Math.max(1,w*0.12);x.strokeStyle='rgba(15,20,40,.75)';pillPath(x,w,h,r);x.stroke();
 return {c,w:w+pad*2,h:h+pad*2};
}
function buildPills(){for(let i=0;i<4;i++)PILLS[i]=makePill(i,11*SC,26*SC,DPR);buildColorBtns();}
function buildColorBtns(){
 const box=$('colors');box.innerHTML='';
 for(let i=0;i<3;i++){const b=document.createElement('button');b.className='cb'+((G?G.color:0)===i?' on':'');b.style.setProperty('--g',COLORS[i].glow);b.setAttribute('aria-label',COLORS[i].n+'色药丸');
  const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');const p=makePill(i,20,48,2);x.translate(48,48);x.rotate(0.75);x.drawImage(p.c,-p.c.width/2,-p.c.height/2);
  b.appendChild(c);const k=document.createElement('span');k.className='k';k.textContent=i+1;b.appendChild(k);
  b.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();setColor(i);});box.appendChild(b);}
}

// ================= game state =================
let G=null;
const doc={x:195,y:700,vx:0,lean:0,hp:3,inv:0,recoil:0,shield:0};
let state='menu',paused=false;
let shakeT=0,shakeA=0,flashT=0,flashCol='255,60,60';
let bgDrift=0;
const ambient=[];
function stats(){const sk=SKINS[S.skin];return{dmg:(1+S.up.pow)*sk.pow,rate:rate(S.up.rate)*sk.rate,num:1+S.up.num,coin:(1+S.up.coin*0.2)*sk.coin};}
function songFor(info){return info.boss?['boss',0]:[['bright',0],['funky',0],['bright',-3],['funky',2],['funky',-2]][info.w];}

function startLevel(L){
 L=clamp(L,1,30);
 const info=levelInfo(L);
 G={L,info,q:info.q.slice(),spawnT:0,viruses:[],pills:[],coins:[],parts:[],pops:[],drops:[],shots:[],color:0,t:0,fireT:0.3,earned:0,hurt:0,
   totalHp:0,doneHp:0,pw:{laser:0,spread:0,freeze:0,rainbow:0},boss:null,ending:0,lost:false,revived:false,combo:0,comboT:0,botT:0,hintT:L<=2?4:0};
 G.totalHp=info.boss?info.bossHp:info.q.reduce((s,e)=>s+e.hp*(e.tier+1),0);
 state='play';paused=false;showScreen(null);$('hud').classList.add('on');
 resize();
 doc.x=W/2;doc.y=FY;doc.hp=3;doc.inv=1.5;doc.shield=0;doc.vx=0;
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
}
function makeBoss(info){const r=Math.min(W*0.22,92*SC)*(info.w===4?1.12:1);return{x:W/2,y:-r*1.4,ty:TOP+r+46*SC,r,hp:info.bossHp,max:info.bossHp,c:0,colorT:5,shootT:3.2,spawnT:6,t:0,flash:0,dir:1,enter:true,sq:0,w:info.w,dead:false,deadT:0};}
function banner(a,b,boss){const el=$('banner');$('ban1').textContent=a;$('ban2').textContent=b||'';el.className='';void el.offsetWidth;el.className='show'+(boss?' boss':'');}
function setColor(i){if(!G||state!=='play'||paused)return;if(G.color!==i){G.color=i;sfx('switch');doc.recoil=1;}document.querySelectorAll('.cb').forEach((b,k)=>b.classList.toggle('on',k===i));}

function spawnVirus(e,x,y,vx,vy){
 const r=[17,25,35,48][e.tier]*SC;
 const v={x:x!=null?x:rand(r+10,W-r-10),y:y!=null?y:-r-10,vx:vx!=null?vx:(Math.random()<.5?-1:1)*rand(55,95)*SC,vy:vy!=null?vy:40,r,tier:e.tier,hp:e.hp,max:e.hp,c:e.c,kind:e.kind,flash:0,sq:0,rot:rand(0,6.28),rv:rand(-.6,.6),mutT:rand(2.5,4),age:0};
 G.viruses.push(v);return v;
}
function bounceV(tier){const g=900*SC;const h=(FY-TOP-40)*[0.34,0.44,0.54,0.62][tier];return Math.sqrt(2*g*h);}
function newAmb(init){return{x:rand(0,W),y:init?rand(0,H):H+10,r:rand(1.5,5)*SC,v:rand(10,35)*SC,a:rand(.12,.4),ph:rand(0,6)};}

// ================= input =================
let ptr=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;ptr={id:e.pointerId,x:e.clientX};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!ptr||e.pointerId!==ptr.id||state!=='play'||paused)return;const dx=e.clientX-ptr.x;ptr.x=e.clientX;doc.x=clamp(doc.x+dx*1.3,24*SC,W-24*SC);doc.vx=dx;if(G)G.hintT=0;});
const endP=e=>{if(ptr&&e.pointerId===ptr.id)ptr=null;};
cv.addEventListener('pointerup',endP);cv.addEventListener('pointercancel',endP);
document.addEventListener('touchmove',e=>{if(e.target.closest&&e.target.closest('#shop'))return;e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());
const keys={};
window.addEventListener('keydown',e=>{keys[e.key]=1;if(state==='play'){if(e.key==='1'||e.key==='2'||e.key==='3')setColor(+e.key-1);if(e.key==='p'||e.key==='Escape')togglePause();}});
window.addEventListener('keyup',e=>{keys[e.key]=0;});

// ================= update =================
function update(dt){
 bgDrift+=dt;
 for(const a of ambient){a.y-=a.v*dt;a.x+=Math.sin(bgDrift*0.8+a.ph)*6*dt;if(a.y<-10)Object.assign(a,newAmb(false));}
 if(state!=='play'||paused||!G)return;
 G.t+=dt;if(G.hintT>0)G.hintT-=dt*0.25;
 const st=stats();
 if(keys.ArrowLeft||keys.a){doc.x-=420*SC*dt;doc.vx=-6;}if(keys.ArrowRight||keys.d){doc.x+=420*SC*dt;doc.vx=6;}
 if(DBG.bot)bot(dt);
 doc.x=clamp(doc.x,24*SC,W-24*SC);
 doc.lean=lerp(doc.lean,clamp(doc.vx*0.035,-0.22,0.22),0.2);doc.vx*=0.7;
 doc.inv=Math.max(0,doc.inv-dt);doc.recoil=Math.max(0,doc.recoil-dt*8);
 if(doc.shield>0)doc.shield-=dt;
 for(const k in G.pw)G.pw[k]=Math.max(0,G.pw[k]-dt);
 const frozen=G.pw.freeze>0;
 if(!G.ending){G.fireT-=dt;const interval=1/st.rate;while(G.fireT<=0){G.fireT+=interval;fire(st);}}
 if(G.pw.laser>0&&!G.ending){
  const lw=22*SC,dps=st.dmg*st.rate*st.num*1.8+10;
  for(const v of G.viruses)if(Math.abs(v.x-doc.x)<v.r+lw/2&&v.y<doc.y)damage(v,dps*dt,true,v.x,v.y+v.r*0.5,true);
  if(G.boss&&!G.boss.dead&&!G.boss.enter&&Math.abs(G.boss.x-doc.x)<G.boss.r*0.8+lw/2)damageBoss(dps*dt,true,true);
  if(Math.random()<0.6)G.parts.push({x:doc.x+rand(-8,8),y:rand(TOP,doc.y-120*SC),vx:rand(-50,50),vy:rand(-80,-20),life:.4,max:.4,r:rand(2,4)*SC,col:'#bff',g:0});
 }
 if(!G.info.boss&&G.q.length){
  G.spawnT+=dt;const nxt=G.q[0];
  if(G.spawnT>=nxt.delay||(G.viruses.length===0&&G.spawnT>0.7)){G.q.shift();G.spawnT=0;spawnVirus(nxt);}
 }
 const g=900*SC;
 for(const v of G.viruses){
  v.age+=dt;v.flash=Math.max(0,v.flash-dt*7);v.sq*=Math.pow(0.002,dt);
  if(v.kind==='mut'&&!frozen){v.mutT-=dt;if(v.mutT<=0){v.mutT=rand(2.5,4);v.c=(v.c+1+Math.floor(Math.random()*2))%3;v.sq=0.3;burst(v.x,v.y,v.c,8,v.r*0.8);sfx('mutate');}}
  if(frozen)continue;
  v.rot+=v.rv*dt;v.vy+=g*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;
  if(v.x<v.r){v.x=v.r;v.vx=Math.abs(v.vx);}if(v.x>W-v.r){v.x=W-v.r;v.vx=-Math.abs(v.vx);}
  if(v.y>FY-v.r){v.y=FY-v.r;v.vy=-bounceV(v.tier);v.sq=0.35;if(v.tier>=2)sfx('bounce');G.parts.push({x:v.x,y:FY,ring:1,life:.35,max:.35,r:v.r,col:'rgba(255,255,255,.5)'});}
  const dx=v.x-doc.x,dy=v.y-(doc.y-50*SC);const rr=v.r*0.8+24*SC;
  if(dx*dx+dy*dy<rr*rr&&doc.inv<=0&&!G.ending)hurtDoc(v);
 }
 if(G.boss)updBoss(G.boss,dt,frozen);
 for(const p of G.pills){p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.y<-30||p.x<-30||p.x>W+30){p.dead=1;continue;}
  for(const v of G.viruses){if(v.dead)continue;const dx=p.x-v.x,dy=p.y-v.y,rr=v.r*0.92+5*SC;if(dx*dx+dy*dy<rr*rr){p.dead=1;const m=p.c===3||p.c===v.c;damage(v,p.dmg*(m?3:1)*(v.kind==='armor'&&!m?0.34:1),m,p.x,p.y);if(!frozen)v.vy-=10*SC;break;}}
  if(!p.dead&&G.boss&&!G.boss.dead&&!G.boss.enter){const b=G.boss,dx=p.x-b.x,dy=p.y-b.y,rr=b.r*0.9;if(dx*dx+dy*dy<rr*rr){p.dead=1;const m=p.c===3||p.c===b.c;damageBoss(p.dmg*(m?3:1),m,false,p.x,p.y);}}
 }
 G.pills=G.pills.filter(p=>!p.dead);
 G.viruses=G.viruses.filter(v=>!v.dead);
 for(const s of G.shots){s.vy+=300*SC*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=dt*5;
  if(s.y>FY-s.r*0.5){s.dead=1;burst(s.x,FY-4,-1,10,10);continue;}
  const dx=s.x-doc.x,dy=s.y-(doc.y-50*SC);if(dx*dx+dy*dy<(s.r+22*SC)**2&&doc.inv<=0&&!G.ending){s.dead=1;burst(s.x,s.y,-1,14,12);hurtDoc(null);}}
 G.shots=G.shots.filter(s=>!s.dead);
 const hc=coinTarget();
 for(const c of G.coins){c.t+=dt;
  if(c.t<0.6){c.vy+=g*0.8*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y>FY-6){c.y=FY-6;c.vy*=-0.5;}if(c.x<8||c.x>W-8)c.vx*=-1;}
  else{const dx=hc.x-c.x,dy=hc.y-c.y,d=Math.hypot(dx,dy);const sp=(500+(c.t-0.6)*1600)*SC;if(d<sp*dt+10){c.dead=1;S.coins+=c.v;G.earned+=c.v;sfx('coin');bumpCoin();}else{c.x+=dx/d*sp*dt;c.y+=dy/d*sp*dt;}}
 }
 G.coins=G.coins.filter(c=>!c.dead);
 for(const d of G.drops){d.t+=dt;d.y=Math.min(FY-20*SC,d.y+85*SC*dt);d.x=clamp(d.x+Math.sin(d.t*3)*20*dt,20,W-20);
  if(Math.abs(d.x-doc.x)<36*SC&&Math.abs(d.y-(doc.y-45*SC))<65*SC){d.dead=1;applyPower(d.k);}
  if(d.t>9)d.dead=1;}
 G.drops=G.drops.filter(d=>!d.dead);
 for(const p of G.parts){p.life-=dt;if(!p.ring){p.vy+=(p.g!=null?p.g:500)*SC*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}}
 G.parts=G.parts.filter(p=>p.life>0);if(G.parts.length>500)G.parts.splice(0,G.parts.length-500);
 for(const p of G.pops){p.life-=dt;p.y-=40*dt;}
 G.pops=G.pops.filter(p=>p.life>0);
 if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0;}
 updHud();
 const cleared=G.info.boss?(G.boss.dead&&G.viruses.length===0):(G.q.length===0&&G.viruses.length===0);
 if(cleared&&!G.ending){G.ending=0.001;G.shots.length=0;}
 if(G.ending){G.ending+=dt;for(const c of G.coins)c.t=Math.max(c.t,0.6);if(G.ending>(G.info.boss?2.4:1.4)&&G.coins.length===0)winLevel();}
}
function updFx(dt){shakeT=Math.max(0,shakeT-dt);flashT=Math.max(0,flashT-dt);}
let hcCache=null,hcT=0;
function coinTarget(){if(!hcCache||performance.now()-hcT>500){const r=$('hCoinBox').getBoundingClientRect(),a=$('app').getBoundingClientRect();hcCache={x:r.left-a.left+16,y:r.top-a.top+r.height/2};hcT=performance.now();}return hcCache;}
let coinBumpT=0;function bumpCoin(){const el=$('hCoinBox');el.style.transform='scale(1.15)';clearTimeout(coinBumpT);coinBumpT=setTimeout(()=>el.style.transform='',90);}

function fire(st){
 const n=st.num,gap=12*SC,sp=-980*SC,c=G.pw.rainbow>0?3:G.color;
 const by=doc.y-118*SC;
 for(let i=0;i<n;i++){const ox=(i-(n-1)/2)*gap;G.pills.push({x:doc.x+ox,y:by+Math.abs(ox)*0.4,vx:0,vy:sp,c,dmg:st.dmg,rot:0});}
 if(G.pw.spread>0){for(const a of[-0.3,-0.15,0.15,0.3])G.pills.push({x:doc.x,y:by,vx:Math.sin(a)*-sp,vy:Math.cos(a)*sp,c,dmg:st.dmg,rot:a});}
 doc.recoil=1;sfx('shoot');
}
function damage(v,d,match,px,py,silent){
 if(v.dead)return;const real=Math.min(d,Math.max(0,v.hp));v.hp-=d;v.flash=1;G.doneHp+=real;
 if(!silent){
  if(match){sfx('match');if(Math.random()<0.45)spark(px,py);if(Math.random()<0.2)G.pops.push({x:px+rand(-10,10),y:py,txt:'×3',col:COLORS[v.c].hi,life:.5,max:.5,s:17});}
  else{sfx('hit');if(v.kind==='armor'&&Math.random()<0.25)G.pops.push({x:px,y:py,txt:'护甲!',col:'#dfe7ef',life:.45,max:.45,s:13});}
  G.parts.push({x:px,y:py,vx:rand(-60,60),vy:rand(-120,-30),life:.25,max:.25,r:rand(2,3.5)*SC,col:match?COLORS[v.c].hi:'#fff'});
 }
 if(v.hp<=0)killVirus(v);
}
function killVirus(v){
 v.dead=1;const st=stats();
 burst(v.x,v.y,v.c,10+v.tier*7,v.r);
 G.parts.push({x:v.x,y:v.y,ring:1,life:.4,max:.4,r:v.r*1.6,col:COLORS[v.c].hi});
 sfx(v.tier>=3?'bigpop':'pop');
 if(v.tier>=2){shakeT=0.18;shakeA=v.tier*2;}
 G.combo++;G.comboT=1.3;
 if(G.combo>=5&&G.combo%5===0)G.pops.push({x:clamp(v.x,60,W-60),y:v.y-v.r,txt:`连击 ×${G.combo}`,col:'#ffe36b',life:.9,max:.9,s:21});
 const n=[1,1,2,3][v.tier]+(G.combo>=10?1:0);const val=Math.max(1,Math.round((1+G.L*0.35)*st.coin));
 for(let i=0;i<n;i++)G.coins.push({x:v.x,y:v.y,vx:rand(-120,120)*SC,vy:rand(-380,-160)*SC,t:rand(0,0.15),v:val});
 if(v.tier>0){
  const hp=Math.max(1,Math.ceil(v.max*0.5));
  for(const s of[-1,1])spawnVirus({tier:v.tier-1,hp,c:v.c,kind:v.kind},v.x+s*v.r*0.4,v.y,s*rand(70,105)*SC,-rand(380,460)*SC);
  sfx('split');
 }
 const pc=[0.03,0.05,0.09,0.16][v.tier];
 if(Math.random()<pc&&G.drops.length<2){const ks=['laser','shield','spread','freeze','rainbow'];G.drops.push({x:v.x,y:v.y,k:ks[Math.floor(Math.random()*ks.length)],t:0});}
}
function damageBoss(d,match,silent,px,py){
 const b=G.boss;if(b.dead||b.enter)return;b.hp-=d;b.flash=1;G.doneHp+=d;
 if(!silent){sfx(match?'match':'hit');if(match&&Math.random()<0.4)spark(px,py);
  if(Math.random()<0.5)G.parts.push({x:px,y:py,vx:rand(-80,80),vy:rand(-100,0),life:.3,max:.3,r:rand(2,4)*SC,col:match?COLORS[b.c].hi:'#d7b8ff'});
  if(match&&Math.random()<0.12)G.pops.push({x:px,y:py,txt:'×3',col:COLORS[b.c].hi,life:.5,max:.5,s:18});}
 if(b.hp<=0){b.dead=true;b.hp=0;
  for(let i=0;i<6;i++)setTimeout(()=>{if(!G||G.boss!==b)return;burst(b.x+rand(-b.r,b.r)*0.7,b.y+rand(-b.r,b.r)*0.7,i%3,26,b.r*0.6);sfx('bigpop');shakeT=0.3;shakeA=10;},i*170);
  flashT=0.5;flashCol='255,255,255';sfx('roar');const val=Math.max(1,Math.round((1+G.L*0.35)*stats().coin));
  for(let i=0;i<40;i++)G.coins.push({x:b.x,y:b.y,vx:rand(-260,260)*SC,vy:rand(-520,-150)*SC,t:rand(0,0.3),v:val*2});
  for(const v of G.viruses){v.dead=1;burst(v.x,v.y,v.c,10,v.r);}G.viruses.length=0;
 }
}
function updBoss(b,dt,frozen){
 b.t+=dt;b.flash=Math.max(0,b.flash-dt*7);b.sq*=Math.pow(0.01,dt);
 if(b.dead){b.deadT+=dt;b.y+=40*dt;return;}
 if(b.enter){b.y+=(b.ty-b.y)*dt*1.6;if(Math.abs(b.y-b.ty)<4){b.enter=false;b.sq=0.35;shakeT=0.4;shakeA=8;}return;}
 const rage=b.hp<b.max*0.4;
 b.colorT-=dt;if(b.colorT<=0){b.colorT=rage?3.2:4.5;b.c=(b.c+1)%3;b.sq=0.25;burst(b.x,b.y,b.c,16,b.r*0.8);sfx('mutate');}
 if(frozen)return;
 const sp=(50+b.w*12)*(rage?1.5:1)*SC;
 b.x+=b.dir*sp*dt;if(b.x<b.r*0.9)b.dir=1;if(b.x>W-b.r*0.9)b.dir=-1;
 b.y=b.ty+Math.sin(b.t*1.3)*16*SC;
 b.shootT-=dt;
 if(b.shootT<=0){b.shootT=Math.max(1.0,(rage?1.5:2.4)-b.w*0.12);sfx('spit');b.sq=0.2;
  const n=1+(b.w>=2?1:0)+(rage?1:0);
  for(let i=0;i<n;i++){const tx=clamp(doc.x+(i-(n-1)/2)*80*SC+rand(-20,20),20,W-20),ty=FY,dx=tx-b.x;const T=1.45;G.shots.push({x:b.x,y:b.y+b.r*0.6,vx:dx/T,vy:((ty-b.y-b.r*0.6)-0.5*300*SC*T*T)/T,r:11*SC,rot:0});}}
 b.spawnT-=dt;
 if(b.spawnT<=0&&G.viruses.length<6){b.spawnT=rage?5.5:7.5;const H0=G.info.H0;
  for(const s of[-1,1])spawnVirus({tier:b.w>=3?2:1,hp:Math.round(H0*0.5),c:Math.floor(Math.random()*3),kind:b.w>=2&&Math.random()<.3?'mut':b.w>=1&&Math.random()<.3?'armor':'n'},b.x+s*b.r*0.6,b.y,s*90*SC,-200*SC);}
}
function hurtDoc(v){
 if(DBG.god){doc.inv=0.5;return;}
 if(doc.shield>0){doc.shield=0;doc.inv=1.2;sfx('shieldbreak');burst(doc.x,doc.y-50*SC,-2,24,30);if(v){v.vy=-bounceV(v.tier)*1.05;v.vx=(v.x<doc.x?-1:1)*Math.abs(v.vx);}return;}
 doc.hp--;G.hurt++;doc.inv=2;sfx('hurt');shakeT=0.35;shakeA=12;flashT=0.25;flashCol='255,60,60';
 if(v){v.vy=-bounceV(v.tier);v.vx=(v.x<doc.x?-1:1)*Math.abs(v.vx);}
 if(navigator.vibrate)try{navigator.vibrate(80)}catch(e){}
 updHud();
 if(doc.hp<=0)loseLevel();
}
function applyPower(k){
 sfx('power');const names={laser:'针筒激光！',shield:'维C护盾！',spread:'散射药丸！',freeze:'冰冻病毒！',rainbow:'彩虹药丸！'};
 G.pops.push({x:clamp(doc.x,80,W-80),y:doc.y-150*SC,txt:names[k],col:'#fff',life:1.3,max:1.3,s:22});
 if(k==='shield'){doc.shield=14;sfx('shield');}
 else if(k==='laser'){G.pw.laser=4.5;sfx('laser');}
 else if(k==='spread')G.pw.spread=8;
 else if(k==='freeze'){G.pw.freeze=4;sfx('freeze');}
 else if(k==='rainbow')G.pw.rainbow=7;
}
function burst(x,y,ci,n,r){
 const col=ci===-1?'#a6ff4d':ci===-2?'#9ff0ff':COLORS[ci].hex,hi=ci<0?'#fff':COLORS[ci].hi;
 for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(80,320)*SC;G.parts.push({x:x+Math.cos(a)*r*0.4,y:y+Math.sin(a)*r*0.4,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120*SC,life:rand(.35,.75),max:.75,r:rand(3,7)*SC*(r>30?1.3:1),col:Math.random()<.3?hi:col,goo:1});}
}
function spark(x,y){for(let i=0;i<5;i++){const a=rand(0,6.28),s=rand(100,260)*SC;G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3,max:.3,r:rand(2,3)*SC,col:'#fff',star:1,g:0});}}

// ================= bot (debug ?bot) =================
function bot(dt){
 let best=doc.x,bestScore=-1e9;
 for(let x=30*SC;x<W-30*SC;x+=8*SC){
  let s=0;
  for(const v of G.viruses){
   const tt=clamp((FY-v.y)/400,0,0.6);const px=v.x+v.vx*tt;const d=Math.abs(px-x);
   const danger=v.y>FY-(v.vy>0?190:130)*SC;const R=v.r+40*SC;
   if(danger&&d<R)s-=4000*(1-d/R)*(0.5+v.y/FY);
   if(Math.abs(v.x-x)<v.r)s+=50+v.tier*25+(v.c===G.color?30:0);
  }
  for(const sh of G.shots){const tl=Math.max(0.05,(FY-sh.y)/Math.max(80,Math.abs(sh.vy)+150));const lx=sh.x+sh.vx*tl;if(Math.abs(lx-x)<52*SC)s-=3500;}
  if(G.boss&&!G.boss.dead&&Math.abs(G.boss.x-x)<G.boss.r*0.7)s+=90;
  for(const d of G.drops)if(Math.abs(d.x-x)<30*SC)s+=160;
  s-=Math.abs(x-doc.x)*0.35;
  if(s>bestScore){bestScore=s;best=x;}
 }
 const mv=560*SC*dt;const dx=clamp(best-doc.x,-mv,mv);doc.x+=dx;doc.vx=dx*0.3;
 G.botT-=dt;
 if(G.botT<=0){G.botT=0.35;const tg=G.viruses.concat(G.boss&&!G.boss.dead?[G.boss]:[]);let near=null,nd=1e9;for(const v of tg){const d=Math.abs(v.x-doc.x)+(FY-v.y)*0.05;if(d<nd){nd=d;near=v;}}if(near&&near.c!==G.color)setColor(near.c);}
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
 ctx.save();ctx.translate(sx,sy);
 drawCover(IMG[WORLDS[w].bg]);
 const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,10,20,.38)');gr.addColorStop(.45,'rgba(0,10,20,.12)');gr.addColorStop(1,'rgba(0,10,20,.5)');ctx.fillStyle=gr;ctx.fillRect(-20,-20,W+40,H+40);
 for(const a of ambient){ctx.globalAlpha=a.a;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,6.28);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(a.x-a.r*0.35,a.y-a.r*0.35,a.r*0.3,0,6.28);ctx.fill();}
 ctx.globalAlpha=1;
 if(G&&(state==='play'||state==='end'))drawGame();
 ctx.restore();
 if(flashT>0){ctx.fillStyle=`rgba(${flashCol},${Math.min(0.8,flashT*1.6)})`;ctx.fillRect(0,0,W,H);}
 const vg=ctx.createRadialGradient(W/2,H*0.45,Math.min(W,H)*0.45,W/2,H*0.45,Math.max(W,H)*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 if(G&&G.pw.freeze>0){ctx.fillStyle=`rgba(150,220,255,${0.12+0.05*Math.sin(bgDrift*6)})`;ctx.fillRect(0,0,W,H);}
 if(G&&doc.hp===1&&state==='play'){const a=0.25+0.15*Math.sin(bgDrift*6);const rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.4,W/2,H/2,Math.max(W,H)*0.7);rg.addColorStop(0,'rgba(255,0,40,0)');rg.addColorStop(1,`rgba(255,0,40,${a})`);ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);}
}
function drawFloor(){
 const y=FY;
 const g=ctx.createLinearGradient(0,y,0,H);g.addColorStop(0,'rgba(190,245,255,.30)');g.addColorStop(0.08,'rgba(120,200,230,.16)');g.addColorStop(1,'rgba(0,15,30,.7)');
 ctx.fillStyle=g;ctx.fillRect(-20,y,W+40,H-y+20);
 ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(-20,y-1,W+40,2);
 ctx.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<7;i++){const x=((i*113+bgDrift*16)%(W+120))-60;ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+46,y+3);ctx.lineTo(x+16,H);ctx.lineTo(x-30,H);ctx.fill();}
}
function drawVirus(v){
 const img=VS[v.c];const s=v.r*2.35;
 const hgt=clamp((FY-v.y)/(FY-TOP),0,1);ctx.fillStyle=`rgba(0,0,0,${0.3*(1-hgt*0.7)})`;ctx.beginPath();ctx.ellipse(v.x,FY+2,v.r*(1-hgt*0.5),v.r*0.22*(1-hgt*0.5),0,0,6.28);ctx.fill();
 ctx.save();ctx.translate(v.x,v.y);
 const sq=v.sq,wob=Math.sin(v.age*8)*0.03;
 ctx.scale(1+sq*0.5+wob,1-sq*0.45-wob);
 ctx.rotate(Math.sin(v.rot)*0.25);
 if(v.kind==='mut'){ctx.save();ctx.rotate(v.age*2);ctx.lineWidth=4*SC;if(ctx.createConicGradient){const cg=ctx.createConicGradient(0,0,0);cg.addColorStop(0,'#ff3b4e');cg.addColorStop(.33,'#ffcc1a');cg.addColorStop(.66,'#2f8dff');cg.addColorStop(1,'#ff3b4e');ctx.strokeStyle=cg;}else ctx.strokeStyle='#fff';ctx.setLineDash([8*SC,6*SC]);ctx.beginPath();ctx.arc(0,0,v.r*1.2,0,6.28);ctx.stroke();ctx.restore();}
 const frozen=G.pw.freeze>0;
 ctx.drawImage(frozen?img.ice:img.img,-s/2,-s/2,s,s);
 if(v.flash>0){ctx.globalAlpha=v.flash*0.65;ctx.drawImage(img.white,-s/2,-s/2,s,s);ctx.globalAlpha=1;}
 if(v.kind==='armor'){const R=v.r*0.97;ctx.lineWidth=5.5*SC;const ag=ctx.createLinearGradient(-R,-R,R,R);ag.addColorStop(0,'#ffffff');ag.addColorStop(.45,'#8d9aa8');ag.addColorStop(.55,'#6e7b89');ag.addColorStop(1,'#e8eef3');ctx.strokeStyle=ag;ctx.beginPath();ctx.arc(0,0,R,0,6.28);ctx.stroke();
  ctx.strokeStyle='rgba(20,30,45,.75)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,R+3*SC,0,6.28);ctx.stroke();ctx.beginPath();ctx.arc(0,0,R-3*SC,0,6.28);ctx.stroke();
  for(let i=0;i<6;i++){const a=i/6*6.28+0.3;ctx.fillStyle='#4a5664';ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,2.4*SC,0,6.28);ctx.fill();ctx.fillStyle='#f2f6f9';ctx.beginPath();ctx.arc(Math.cos(a)*R-0.6,Math.sin(a)*R-0.6,1.2*SC,0,6.28);ctx.fill();}}
 if(frozen){ctx.fillStyle='rgba(220,250,255,.85)';for(let i=0;i<3;i++){const a=i*2.1+0.5;ctx.save();ctx.translate(Math.cos(a)*v.r*0.75,Math.sin(a)*v.r*0.75);ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-5*SC);ctx.lineTo(3*SC,0);ctx.lineTo(0,5*SC);ctx.lineTo(-3*SC,0);ctx.fill();ctx.restore();}}
 ctx.restore();
 const hp=Math.ceil(v.hp);const fs=Math.max(13,v.r*0.6);
 ctx.font=`900 ${fs}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 const ty=v.y+v.r*0.66;const txt=fmt(hp);const tw=ctx.measureText(txt).width;
 ctx.fillStyle='rgba(8,14,30,.78)';roundRect(v.x-tw/2-6,ty-fs*0.58,tw+12,fs*1.16,fs*0.5);ctx.fill();
 ctx.lineWidth=2;ctx.strokeStyle=COLORS[v.c].hex;ctx.stroke();
 ctx.fillStyle='#fff';ctx.fillText(txt,v.x,ty+1);
}
function drawBoss(b){
 const img=IMG.boss;const s=b.r*2.5;const ar=img.height/img.width;const oy=-s*ar/2-b.r*0.12;
 ctx.save();ctx.translate(b.x,b.y);
 const pul=0.6+0.4*Math.sin(b.t*6);const ag=ctx.createRadialGradient(0,0,b.r*0.6,0,0,b.r*1.55);ag.addColorStop(0,'rgba(0,0,0,0)');ag.addColorStop(.6,COLORS[b.c].glow.replace('.9)',(0.5*pul).toFixed(2)+')'));ag.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ag;ctx.beginPath();ctx.arc(0,0,b.r*1.55,0,6.28);ctx.fill();
 ctx.scale(1+b.sq*0.4,1-b.sq*0.35);ctx.rotate(Math.sin(b.t*1.7)*0.06);
 if(b.dead){ctx.globalAlpha=Math.max(0,1-b.deadT*1.2);ctx.rotate(b.deadT*2.5);const k=1+b.deadT*0.4;ctx.scale(k,k);}
 ctx.drawImage(G.pw.freeze>0?BOSSI.ice:img,-s/2,oy,s,s*ar);
 const ga=ctx.globalAlpha;
 ctx.globalAlpha=ga*0.2;ctx.drawImage(BOSSI.tint[b.c],-s/2,oy,s,s*ar);
 if(b.flash>0){ctx.globalAlpha=ga*b.flash*0.3;ctx.drawImage(BOSSI.white,-s/2,oy,s,s*ar);}
 ctx.restore();ctx.globalAlpha=1;
 if(!b.dead&&!b.enter){
  const bbr=$('bossbar').getBoundingClientRect(),ar0=$('app').getBoundingClientRect();const y=(bbr.height>0?bbr.bottom-ar0.top:100)+16*SC;ctx.font=`900 ${13*SC}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const t='弱点：'+COLORS[b.c].n+'色药丸';const tw=ctx.measureText(t).width;const bx=clamp(b.x,tw/2+14,W-tw/2-14);
  ctx.fillStyle='rgba(0,0,0,.65)';roundRect(bx-tw/2-10,y-11*SC,tw+20,22*SC,11*SC);ctx.fill();ctx.strokeStyle=COLORS[b.c].hex;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=COLORS[b.c].hi;ctx.fillText(t,bx,y+1);
  const pct=b.colorT/(b.hp<b.max*0.4?3.2:4.5);ctx.fillStyle=COLORS[b.c].hex;ctx.fillRect(bx-tw/2,y+12*SC,tw*pct,2.5*SC);
 }
}
function drawDoctor(){
 const img=IMG[SKINS[S.skin].img];const h=120*SC,w=h*img.width/img.height;
 const blink=doc.inv>0&&state==='play'&&Math.floor(doc.inv*12)%2===0;
 ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(doc.x,FY+2,30*SC,7*SC,0,0,6.28);ctx.fill();
 if(G.pw.laser>0){const lw=(17+Math.sin(bgDrift*40)*4)*SC;const lg=ctx.createLinearGradient(doc.x-lw,0,doc.x+lw,0);lg.addColorStop(0,'rgba(80,220,255,0)');lg.addColorStop(.3,'rgba(80,220,255,.6)');lg.addColorStop(.5,'rgba(255,255,255,.95)');lg.addColorStop(.7,'rgba(80,220,255,.6)');lg.addColorStop(1,'rgba(80,220,255,0)');
  ctx.globalCompositeOperation='lighter';ctx.fillStyle=lg;ctx.fillRect(doc.x-lw,0,lw*2,doc.y-130*SC);ctx.globalCompositeOperation='source-over';
  ctx.save();ctx.translate(doc.x,doc.y-132*SC);ctx.fillStyle='#e8f6ff';ctx.strokeStyle='#234';ctx.lineWidth=1.5;roundRect(-7*SC,0,14*SC,24*SC,3*SC);ctx.fill();ctx.stroke();ctx.fillStyle='#5cf';ctx.fillRect(-5*SC,6*SC,10*SC,14*SC);ctx.fillStyle='#ddd';ctx.fillRect(-1.2*SC,-10*SC,2.4*SC,10*SC);ctx.restore();}
 ctx.save();ctx.translate(doc.x,FY);ctx.rotate(doc.lean);const rc=doc.recoil*0.035;ctx.scale(1+rc,1-rc);
 const bob=Math.sin(bgDrift*7)*1.5*SC;
 if(!blink)ctx.drawImage(img,-w/2,-h+bob,w,h);
 ctx.restore();
 const pc=G.pw.rainbow>0?3:G.color;const p=PILLS[pc];ctx.save();ctx.translate(doc.x,doc.y-h-10*SC+Math.sin(bgDrift*5)*2);ctx.rotate(1.57+Math.sin(bgDrift*3)*0.25);
 ctx.globalCompositeOperation='lighter';ctx.fillStyle=pc===3?'rgba(255,255,255,.3)':COLORS[pc].glow.replace('.9)','.35)');ctx.beginPath();ctx.ellipse(0,0,p.h*0.55,p.w*0.9,0,0,6.28);ctx.fill();ctx.globalCompositeOperation='source-over';
 ctx.drawImage(p.c,-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
 if(doc.shield>0){const a=doc.shield<3?(Math.floor(doc.shield*6)%2?0.3:0.85):0.85;ctx.globalAlpha=a;const cy=doc.y-60*SC,r=72*SC;const sg=ctx.createRadialGradient(doc.x-r*0.3,cy-r*0.3,r*0.1,doc.x,cy,r);sg.addColorStop(0,'rgba(255,255,255,.3)');sg.addColorStop(.7,'rgba(255,200,60,.12)');sg.addColorStop(1,'rgba(255,170,30,.55)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(doc.x,cy,r,0,6.28);ctx.fill();ctx.strokeStyle='rgba(255,225,130,.95)';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;}
}
function drawPowerIcon(k,x,y,r,t){
 ctx.save();ctx.translate(x,y);
 const col={laser:'#4fd8ff',shield:'#ffb020',spread:'#7cff6b',freeze:'#9fe8ff',rainbow:'#ff6bd6'}[k];
 const gl=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.7);gl.addColorStop(0,col);gl.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=0.5+0.3*Math.sin(t*8);ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,0,r*1.7,0,6.28);ctx.fill();ctx.globalAlpha=1;
 const bg=ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r);bg.addColorStop(0,'#fff');bg.addColorStop(.35,col);bg.addColorStop(1,'#123');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#fff';ctx.stroke();
 ctx.fillStyle='#fff';ctx.strokeStyle='#123';ctx.lineWidth=1.5;const u=r/14;
 if(k==='laser'){ctx.rotate(-0.6);roundRect(-4*u,-4*u,8*u,14*u,2*u);ctx.fill();ctx.stroke();ctx.fillStyle='#1aa8e0';ctx.fillRect(-2.5*u,0,5*u,8*u);ctx.fillStyle='#fff';ctx.fillRect(-0.8*u,-11*u,1.6*u,7*u);ctx.fillRect(-5*u,10*u,10*u,2*u);}
 else if(k==='shield'){ctx.beginPath();ctx.moveTo(0,-9*u);ctx.lineTo(8*u,-5*u);ctx.quadraticCurveTo(8*u,6*u,0,10*u);ctx.quadraticCurveTo(-8*u,6*u,-8*u,-5*u);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ff8a00';ctx.font=`900 ${11*u}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('C',0,1*u);}
 else if(k==='spread'){for(const a of[-0.55,0,0.55]){ctx.save();ctx.rotate(a);roundRect(-2.6*u,-11*u,5.2*u,11*u,2.6*u);ctx.fill();ctx.stroke();ctx.restore();}}
 else if(k==='freeze'){ctx.strokeStyle='#fff';ctx.lineWidth=2.2*u;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*1.047);ctx.beginPath();ctx.moveTo(0,-9*u);ctx.lineTo(0,9*u);ctx.moveTo(-3*u,-6.5*u);ctx.lineTo(0,-3.5*u);ctx.lineTo(3*u,-6.5*u);ctx.moveTo(-3*u,6.5*u);ctx.lineTo(0,3.5*u);ctx.lineTo(3*u,6.5*u);ctx.stroke();ctx.restore();}}
 else if(k==='rainbow'){const p=PILLS[3];ctx.rotate(0.7);const sc=r*1.3/p.h;ctx.drawImage(p.c,-p.w*sc/2,-p.h*sc/2,p.w*sc,p.h*sc);}
 ctx.restore();
}
function drawGame(){
 drawFloor();
 for(const d of G.drops){if(d.t>7&&Math.floor(d.t*8)%2)continue;drawPowerIcon(d.k,d.x,d.y,17*SC,d.t);}
 for(const v of G.viruses)drawVirus(v);
 if(G.boss)drawBoss(G.boss);
 for(const s of G.shots){
  const tl=Math.max(0.05,(FY-s.y)/Math.max(80,Math.abs(s.vy)+150));ctx.fillStyle='rgba(140,255,60,.22)';ctx.beginPath();ctx.ellipse(s.x+s.vx*tl,FY,16*SC,4*SC,0,0,6.28);ctx.fill();
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);const gg=ctx.createRadialGradient(-s.r*0.3,-s.r*0.3,1,0,0,s.r);gg.addColorStop(0,'#f0ffc0');gg.addColorStop(.5,'#8fdc2a');gg.addColorStop(1,'#3b7a0a');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,s.r,0,6.28);ctx.fill();ctx.strokeStyle='#1d3d05';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#8fdc2a';ctx.beginPath();ctx.arc(s.r*0.75,-s.r*0.55,s.r*0.35,0,6.28);ctx.fill();ctx.stroke();ctx.restore();}
 ctx.globalCompositeOperation='lighter';
 for(const p of G.pills){ctx.fillStyle=p.c===3?'rgba(255,255,255,.3)':COLORS[p.c].glow.replace('.9)','.26)');ctx.beginPath();ctx.ellipse(p.x,p.y+16*SC,5*SC,18*SC,-p.rot,0,6.28);ctx.fill();}
 ctx.globalCompositeOperation='source-over';
 for(const p of G.pills){const s=PILLS[p.c];if(p.rot){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-p.rot);ctx.drawImage(s.c,-s.w/2,-s.h/2,s.w,s.h);ctx.restore();}else ctx.drawImage(s.c,p.x-s.w/2,p.y-s.h/2,s.w,s.h);}
 drawDoctor();
 for(const p of G.parts){const a=clamp(p.life/p.max,0,1);
  if(p.ring){ctx.globalAlpha=a;ctx.strokeStyle=p.col;ctx.lineWidth=3*a+0.5;const rr=p.r*(1.4-a*0.6);ctx.beginPath();ctx.ellipse(p.x,p.y,rr,rr*(p.y>=FY-1?0.25:1),0,0,6.28);ctx.stroke();}
  else if(p.star){ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*10);ctx.fillRect(-p.r*2,-p.r*0.4,p.r*4,p.r*0.8);ctx.fillRect(-p.r*0.4,-p.r*2,p.r*0.8,p.r*4);ctx.restore();}
  else{ctx.globalAlpha=Math.min(1,a*1.5);ctx.fillStyle=p.col;const rr=p.r*(p.goo?(0.5+a*0.5):1);ctx.beginPath();ctx.arc(p.x,p.y,rr,0,6.28);ctx.fill();if(p.goo&&rr>3){ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(p.x-rr*0.3,p.y-rr*0.3,rr*0.28,0,6.28);ctx.fill();}}
 }
 ctx.globalAlpha=1;
 for(const c of G.coins){const sx=Math.abs(Math.cos(c.t*10+c.x));const r=8*SC;ctx.save();ctx.translate(c.x,c.y);ctx.scale(Math.max(0.25,sx),1);const cg=ctx.createRadialGradient(-r*0.3,-r*0.3,1,0,0,r);cg.addColorStop(0,'#fff6b0');cg.addColorStop(.4,'#ffd23a');cg.addColorStop(1,'#d08a00');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.strokeStyle='#9a5a00';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#b06a00';ctx.font=`900 ${10*SC}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('¥',0,0.5);ctx.restore();}
 for(const p of G.pops){const a=clamp(p.life/p.max,0,1);const sc=a>0.8?1+(a-0.8)*3:1;ctx.globalAlpha=Math.min(1,a*2);ctx.font=`900 ${p.s*SC*sc}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(p.txt,p.x,p.y);ctx.fillStyle=p.col;ctx.fillText(p.txt,p.x,p.y);}
 ctx.globalAlpha=1;
 let px=12*SC;for(const k of['laser','spread','freeze','rainbow']){if(G.pw[k]>0){const cx=px+14*SC,cy=FY-30*SC;drawPowerIcon(k,cx,cy,11*SC,bgDrift);const mx={laser:4.5,spread:8,freeze:4,rainbow:7}[k];ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,15*SC,-1.57,-1.57+6.28*G.pw[k]/mx);ctx.stroke();px+=36*SC;}}
 if(G.hintT>0&&state==='play'){const a=clamp(G.hintT,0,1);ctx.globalAlpha=a;const hx=W/2+Math.sin(bgDrift*3)*60*SC,hy=FY-170*SC;
  ctx.font=`900 ${17*SC}px "PingFang SC","Noto Sans CJK SC",sans-serif`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.strokeText('← 按住左右滑动 →',W/2,hy-36*SC);ctx.fillStyle='#fff';ctx.fillText('← 按住左右滑动 →',W/2,hy-36*SC);
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(hx,hy,14*SC,0,6.28);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hx,hy,22*SC+Math.sin(bgDrift*8)*3,0,6.28);ctx.stroke();ctx.globalAlpha=1;}
}
// ================= HUD / screens =================
function updHud(){
 if(!G)return;$('hCoins').textContent=fmt(S.coins);
 const pr=G.info.boss?(1-G.boss.hp/G.boss.max):clamp(G.doneHp/G.totalHp,0,1);
 $('hProg').style.width=(pr*100).toFixed(1)+'%';
 if(G.info.boss)$('bossHp').style.width=(G.boss.hp/G.boss.max*100).toFixed(1)+'%';
 const hh=$('hHearts');const key=String(doc.hp);if(hh.dataset.k!==key){hh.dataset.k=key;let s='';for(let i=0;i<3;i++)s+=ICONS.heart(i<doc.hp?'#ff4d6a':'rgba(255,255,255,.2)');hh.innerHTML=s;}
}
const SCREENS=['title','levels','shop','pause','win','lose','ending'];
function showScreen(id){SCREENS.forEach(s=>$(s).classList.toggle('on',s===id));if(id&&id!=='pause')$('hud').classList.remove('on');document.querySelectorAll('.cval').forEach(e=>e.textContent=fmt(S.coins));}
function goTitle(){state='menu';G=null;menuWorld=0;showScreen('title');$('tDoc').src='assets/'+SKINS[S.skin].img+'.png';Music.play('menu');}
function goLevels(w){state='menu';G=null;if(w==null)w=Math.min(4,Math.floor((Math.min(S.unlocked,30)-1)/6));menuWorld=w;renderLevels();showScreen('levels');Music.play('menu');}
function renderLevels(){
 const w=menuWorld;$('wName').textContent=WORLDS[w].n;$('wSub').textContent=WORLDS[w].s;$('lvDoc').src='assets/'+SKINS[S.skin].img+'.png';$('lvBossN').textContent='本章BOSS · 第'+(w*6+6)+'关';
 $('wPrev').disabled=w===0;$('wNext').disabled=w===4;
 let h='';for(let i=0;i<6;i++){const L=w*6+i+1;const lock=L>S.unlocked;const st=S.stars[L]||0;const boss=i===5;
  h+=`<button class="lv${boss?' boss':''}${lock?' lock':''}" data-l="${L}">${lock?'<svg viewBox="0 0 24 24" width="30" height="30"><rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(255,255,255,.5)"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="rgba(255,255,255,.5)" stroke-width="2.5" fill="none"/></svg>':L}${!lock?`<span class="st">${[0,1,2].map(k=>k<st?'★':'<i>★</i>').join('')}</span>`:''}${boss?'<span class="bt">BOSS</span>':''}</button>`;}
 $('wGrid').innerHTML=h;
 $('wDots').innerHTML=[0,1,2,3,4].map(k=>`<b class="${k===w?'on':''}"></b>`).join('');
 $('wGrid').querySelectorAll('.lv').forEach(b=>b.onclick=()=>{const L=+b.dataset.l;if(L>S.unlocked){sfx('deny');toast('先通过前面的关卡吧');return;}sfx('click');startLevel(L);});
}
let shopNext=1;
function goShop(next){shopNext=next||Math.min(S.unlocked,30);state='menu';G=null;renderShop();showScreen('shop');$('shop').scrollTop=0;Music.play('menu');}
function renderShop(){
 let h='';for(const u of UPS){const l=S.up[u.k];const mx=l>=u.max;const c=mx?0:u.cost(l);const can=!mx&&S.coins>=c;
  const bars=u.max<=15?Array.from({length:u.max},(_,i)=>`<i class="${i<l?'f':''}"></i>`).join(''):'';
  h+=`<div class="up"><div class="ic">${ICONS[u.icon]}</div><div class="tx"><div class="nm">${u.n}<small>Lv.${l}${mx?' (满级)':''}</small></div><div class="ds">${mx?'已达到最高等级':u.d(l)}</div>${bars?`<div class="bar">${bars}</div>`:''}</div>
  <button class="btn ${mx?'gray':'orange'} buy ${can||mx?'':'no'}" data-k="${u.k}">${mx?'满级':`<span class="coin">¥</span>${fmt(c)}`}</button></div>`;}
 $('ups').innerHTML=h;
 $('ups').querySelectorAll('.buy').forEach(b=>b.onclick=()=>{const u=UPS.find(x=>x.k===b.dataset.k);const l=S.up[u.k];if(l>=u.max)return;const c=u.cost(l);if(S.coins<c){sfx('deny');toast('金币不足，去关卡里赚更多金币吧');return;}S.coins-=c;S.up[u.k]++;save();sfx('buy');renderShop();document.querySelectorAll('.cval').forEach(e=>e.textContent=fmt(S.coins));});
 let k='';SKINS.forEach((s,i)=>{const own=S.skins[i];k+=`<div class="skin${S.skin===i?' eq':''}" data-i="${i}"><img src="assets/${s.img}.png" alt=""><div class="sn">${s.n}</div><div class="sd">${s.d}</div><div class="sb">${S.skin===i?'使用中':own?'点击装备':`<span class="coin">¥</span>${fmt(s.cost)}`}</div></div>`;});
 $('skins').innerHTML=k;
 $('skins').querySelectorAll('.skin').forEach(el=>el.onclick=()=>{const i=+el.dataset.i;const s=SKINS[i];if(!S.skins[i]){if(S.coins<s.cost){sfx('deny');toast('金币不足');return;}S.coins-=s.cost;S.skins[i]=1;sfx('buy');}else sfx('click');S.skin=i;save();renderShop();document.querySelectorAll('.cval').forEach(e=>e.textContent=fmt(S.coins));});
 $('bShopGo').textContent=`开始第 ${shopNext} 关`;
}
let toastT=0;function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>e.style.display='none',1600);}
function togglePause(){if(state!=='play')return;paused=!paused;ptr=null;if(paused){$('pSub').textContent=`第 ${G.L} 关 · ${WORLDS[G.info.w].n}`;$('pause').classList.add('on');}else $('pause').classList.remove('on');sfx('click');}
function winLevel(){
 state='end';const L=G.L;const stars=G.hurt===0?3:G.hurt===1?2:1;
 const bonus=Math.round((30+L*12)*stats().coin*(G.info.boss?2:1));S.coins+=bonus;G.earned+=bonus;
 S.stars[L]=Math.max(S.stars[L]||0,stars);S.unlocked=Math.max(S.unlocked,Math.min(30,L+1));save();
 $('hud').classList.remove('on');
 Music.stinger('win');Music.play('menu');
 if(L===30){$('endDoc').src='assets/'+SKINS[S.skin].img+'.png';showScreen('ending');return;}
 $('wSubT').textContent=G.info.boss?`击败了 ${BOSSN[G.info.w]}！新世界已解锁`:`第 ${L} 关 完成！`;$('wEarn').textContent=fmt(G.earned);
 $('wRib').textContent=G.info.boss?'BOSS 击败！':stars===3?'完美治疗！':'治疗成功！';
 $('wStars').innerHTML=[0,1,2].map(k=>ICONS.star(k<stars,k===1?'mid':'')).join('');
 showScreen('win');
 $('wStars').querySelectorAll('svg').forEach((s,k)=>setTimeout(()=>{s.classList.add('pop');if(k<stars)sfx('star');},350+k*260));
}
function loseLevel(){
 state='end';G.lost=true;$('hud').classList.remove('on');Music.stinger('lose');Music.play('menu');
 const cost=reviveCost();$('bRevive').innerHTML=`<span class="coin" style="width:22px;height:22px;font-size:13px;vertical-align:-4px">¥</span> ${fmt(cost)} 立即复活`;
 $('bRevive').style.display=G.revived?'none':'';
 $('lSub').textContent=['病毒占领了药瓶……','培养皿失守了……','显微镜下一片混乱……','血管告急！','实验室沦陷了……'][G.info.w]+' 升级药力再来！';
 showScreen('lose');
}
function reviveCost(){return Math.round(80+G.L*25);}
function revive(){const c=reviveCost();if(S.coins<c){sfx('deny');toast('金币不足');return;}S.coins-=c;save();G.revived=true;doc.hp=3;doc.inv=3;doc.shield=8;$('hHearts').dataset.k='';
 for(const v of G.viruses)v.vy=-bounceV(v.tier)*1.1;state='play';paused=false;showScreen(null);$('hud').classList.add('on');sfx('power');const sg=songFor(G.info);Music.play(sg[0],sg[1]);}
function refreshToggles(){
 ['bMus1','bMus2'].forEach(id=>{const b=$(id);b.innerHTML=ICONS.mOn;b.classList.toggle('off',!S.music);b.style.position='relative';});
 ['bSfx1','bSfx2'].forEach(id=>{const b=$(id);b.innerHTML=ICONS.sOn;b.classList.toggle('off',!S.sfx);b.style.position='relative';});
}
const on=(id,f)=>$(id).addEventListener('click',f);
on('bStart',()=>{sfx('click');goLevels();});
on('bShop1',()=>{sfx('click');goShop();});on('bShop2',()=>{sfx('click');goShop();});
on('bBack1',()=>{sfx('click');goTitle();});on('bBack2',()=>{sfx('click');goLevels();});
on('bShopGo',()=>{sfx('click');startLevel(shopNext);});
on('wPrev',()=>{if(menuWorld>0){menuWorld--;renderLevels();sfx('click');}});on('wNext',()=>{if(menuWorld<4){menuWorld++;renderLevels();sfx('click');}});
['bMus1','bMus2'].forEach(id=>on(id,()=>{setMusic(!S.music);sfx('click');}));
['bSfx1','bSfx2'].forEach(id=>on(id,()=>{setSfx(!S.sfx);sfx('click');}));
$('bPause').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();togglePause();});
on('bResume',()=>togglePause());
on('bRestart',()=>{sfx('click');startLevel(G.L);});
on('bQuit',()=>{sfx('click');goLevels();});
on('bNext',()=>{sfx('click');startLevel(Math.min(30,G.L+1));});
on('bWinShop',()=>{sfx('click');goShop(Math.min(30,G.L+1));});
on('bWinMenu',()=>{sfx('click');goLevels();});
on('bRetry',()=>{sfx('click');startLevel(G.L);});
on('bRevive',()=>revive());
on('bLoseShop',()=>{sfx('click');goShop(G.L);});
on('bLoseMenu',()=>{sfx('click');goLevels();});
on('bEndOk',()=>{sfx('click');goLevels(4);});
// back to hub (Tilo 游戏屋): save, then leave
function goHub(e){if(e)e.stopPropagation();save();try{sfx('click');}catch(_){}location.href='../';}
['bHub0','bHubP','bHubW','bHubL','bHubE'].forEach(id=>on(id,goHub));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='play'&&!paused)togglePause();if(AU.ctx)AU.ctx.suspend();}else if(AU.ctx)AU.ctx.resume();});
// swipe between worlds on level select
(()=>{let sx=null;const el=$('levels');el.addEventListener('pointerdown',e=>{sx=e.clientX;});el.addEventListener('pointerup',e=>{if(sx==null)return;const d=e.clientX-sx;sx=null;if(Math.abs(d)>60){if(d<0&&menuWorld<4)menuWorld++;else if(d>0&&menuWorld>0)menuWorld--;else return;renderLevels();sfx('click');}});})();

// ================= loop =================
let last=performance.now();
function frame(now){
 let dt=Math.min(0.05,(now-last)/1000);last=now;
 if(DBG.fast)dt*=2;
 const steps=dt>0.034?3:dt>0.02?2:1;for(let i=0;i<steps;i++)update(dt/steps);
 updFx(dt);render();requestAnimationFrame(frame);
}
window.__dbg={get state(){return state},get G(){return G},S,doc,start:startLevel,setColor,UPS,save,levelInfo};
loadAll(()=>{
 for(const k of['v_red','v_yellow','v_blue']){const im=IMG[k];VS.push({img:im,white:tinted(im,'#fff',1),ice:tinted(im,'#bfefff',0.55)});}
 BOSSI.white=tinted(IMG.boss,'#fff',1);BOSSI.ice=tinted(IMG.boss,'#bfefff',0.55);BOSSI.tint=COLORS.map(c=>tinted(IMG.boss,c.hex,1));
 resize();refreshToggles();
 $('loading').style.display='none';
 if(DBG.level)startLevel(DBG.level);
 else if(DBG.shop)goShop();
 else if(DBG.screen==='levels')goLevels();
 else goTitle();
 requestAnimationFrame(frame);
});
})();
