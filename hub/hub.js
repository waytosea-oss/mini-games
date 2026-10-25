(function(){
  var d=new Date(),W='日一二三四五六';
  document.getElementById('date').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 星期'+W[d.getDay()];
  var bar=document.getElementById('topbar');
  function onScroll(){bar.classList.toggle('on',window.scrollY>70)}
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  // hero carousel
  var track=document.getElementById('track'),cards=[].slice.call(track.children),dots=document.getElementById('dots');
  cards.forEach(function(){dots.appendChild(document.createElement('i'))});
  var di=[].slice.call(dots.children),cur=0;
  function idx(){var w=cards[0].offsetWidth+14;return Math.round(track.scrollLeft/w)}
  function maxIdx(){var w=cards[0].offsetWidth+14;return Math.max(0,Math.round((track.scrollWidth-track.clientWidth)/w))}
  function paint(){var m=maxIdx();cur=Math.min(idx(),m);di.forEach(function(x,i){x.style.display=i>m?'none':'';x.classList.toggle('on',i===cur)})}
  addEventListener('resize',paint);
  track.addEventListener('scroll',function(){requestAnimationFrame(paint)},{passive:true});paint();
  var paused=0,timer=setInterval(function(){
    if(paused||document.hidden||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;var n=idx()+1;if(n>maxIdx())n=0;
    track.scrollTo({left:n*(cards[0].offsetWidth+14),behavior:'smooth'});
  },5000);
  ['pointerdown','touchstart','wheel'].forEach(function(t){track.addEventListener(t,function(){paused=1;clearTimeout(track._r);track._r=setTimeout(function(){paused=0},8000)},{passive:true})});
  di.forEach(function(x,i){x.addEventListener('click',function(){track.scrollTo({left:i*(cards[0].offsetWidth+14),behavior:'smooth'})})});
  // tab bar active state
  var tabs=[].slice.call(document.querySelectorAll('#tabbar a'));
  function setTab(id){tabs.forEach(function(a){a.classList.toggle('on',a.dataset.s===id)})}
  var secs=['today','games','all'].map(function(id){return document.getElementById(id)});
  function spy(){var y=window.scrollY+innerHeight*0.35,cur='today';
    secs.forEach(function(s){if(s.offsetTop<=y)cur=s.id});
    if(innerHeight+window.scrollY>=document.body.scrollHeight-4)cur='all';setTab(cur)}
  addEventListener('scroll',spy,{passive:true});spy();

  // 分类筛选
  var chips=document.getElementById('chips');
  if(chips)chips.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    [].forEach.call(chips.children,function(x){x.classList.toggle('on',x===b)});var c=b.dataset.c,n=0;
    [].forEach.call(document.querySelectorAll('#all .li'),function(li){var ok=!c||(' '+li.dataset.cat+' ').indexOf(' '+c+' ')>=0;li.classList.toggle('hide',!ok);if(ok)n++});
    document.getElementById('allN').textContent=n+' 款'});
  // 最近玩过
  function ago(t){var m=Math.round((Date.now()-t)/60000);return m<1?'刚刚':m<60?m+' 分钟前':m<1440?Math.round(m/60)+' 小时前':Math.round(m/1440)+' 天前'}
  try{var rec=JSON.parse(localStorage.getItem('th_recent')||'[]'),rw=document.getElementById('rrow'),k=0;
    rec.forEach(function(r){var li=r&&document.querySelector('#all .li[href="'+r.g+'/"]');if(!li||k>=8)return;k++;
      var a=document.createElement('a');a.href=r.g+'/';a.className='rli';
      a.innerHTML='<img src="hub/icons/'+r.g+'-s.webp" alt="">'+li.querySelector('.name').firstChild.textContent+'<small>'+ago(r.t)+'</small>';rw.appendChild(a)});
    if(k){document.getElementById('recent').hidden=false;document.getElementById('recentN').textContent=k+' 款'}}catch(e){}
  function remember(h){var g=(h||'').replace(/\/.*$/,'');if(!/^[a-z0-9]+$/.test(g))return;
    try{var a=JSON.parse(localStorage.getItem('th_recent')||'[]').filter(function(x){return x&&x.g!==g});a.unshift({g:g,t:Date.now()});localStorage.setItem('th_recent',JSON.stringify(a.slice(0,12)))}catch(e){}}
  // tap -> game, with a short spring press before leaving
  document.addEventListener('click',function(e){
    var a=e.target.closest('a.story,a.game,a.li,a.rli');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();remember(a.getAttribute('href'));a.classList.add('tap-zoom');document.body.classList.add('leaving');
    setTimeout(function(){location.href=a.getAttribute('href')},170);
  });
  addEventListener('pageshow',function(){document.body.classList.remove('leaving');
    [].forEach.call(document.querySelectorAll('.tap-zoom'),function(x){x.classList.remove('tap-zoom')})});
})();
