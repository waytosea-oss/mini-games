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
  // tap -> game, with a short spring press before leaving
  document.addEventListener('click',function(e){
    var a=e.target.closest('a.story,a.game,a.li');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();a.classList.add('tap-zoom');document.body.classList.add('leaving');
    setTimeout(function(){location.href=a.getAttribute('href')},170);
  });
  addEventListener('pageshow',function(){document.body.classList.remove('leaving');
    [].forEach.call(document.querySelectorAll('.tap-zoom'),function(x){x.classList.remove('tap-zoom')})});
})();
