(()=>{
  'use strict';
  const INSTALL_DISMISS_KEY='lovelyPwaInstallDismissedAt';
  const AUTO_ATTEMPT_KEY='lovelyPwaAutoPromptAttempted';
  const DAY=86400000;
  let deferredPrompt=null;
  let installCard=null;
  let autoPromptArmed=false;
  let prompting=false;
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isInApp=/FBAN|FBAV|Instagram|WhatsApp|Telegram|TikTok|Line\//i.test(ua)||/; wv\)/i.test(ua)||(/Android/i.test(ua)&&/wv/i.test(ua));
  const storage={
    get(k){try{return localStorage.getItem(k)}catch{return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}},
    sessionGet(k){try{return sessionStorage.getItem(k)}catch{return null}},
    sessionSet(k,v){try{sessionStorage.setItem(k,v)}catch{}}
  };
  const recentlyDismissed=()=>{const t=Number(storage.get(INSTALL_DISMISS_KEY)||0);return t&&Date.now()-t<DAY;};
  function removeCard(){if(installCard){installCard.remove();installCard=null}}
  function markDismissed(){storage.set(INSTALL_DISMISS_KEY,String(Date.now()));removeCard()}
  let commerceObserver=null;
  function syncInstallCardPlacement(){
    if(!installCard) return;
    const cartOpen=document.body.classList.contains('cart-open');
    const cartPillVisible=Boolean(document.querySelector('.cart-pill.show'));
    installCard.classList.toggle('avoid-commerce',cartOpen||cartPillVisible);
    installCard.inert=cartOpen;
  }
  function watchCommerceControls(){
    if(commerceObserver||!document.body) return;
    commerceObserver=new MutationObserver(syncInstallCardPlacement);
    commerceObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    const pill=document.querySelector('.cart-pill');
    if(pill) commerceObserver.observe(pill,{attributes:true,attributeFilter:['class']});
  }
  function showHelp(kind){
    removeCard();
    const box=document.createElement('div');box.className='lovely-install-help';box.setAttribute('role','dialog');box.setAttribute('aria-label','Install Lovely Coffee House');
    let title='Install Lovely Coffee House';let text='Use your browser menu and choose Install app or Add to Home screen.';
    if(kind==='ios') text='On iPhone or iPad: tap Share, choose Add to Home Screen, keep Open as Web App on, then tap Add.';
    if(kind==='inapp') text='This link is open inside another app. Use its menu to Open in Chrome or Safari, then install Lovely Coffee House from the browser.';
    const h=document.createElement('h3');h.textContent=title;const para=document.createElement('p');para.textContent=text;const done=document.createElement('button');done.type='button';done.textContent='GOT IT';box.append(h,para,done);
    done.addEventListener('click',()=>{storage.set(INSTALL_DISMISS_KEY,String(Date.now()));box.remove()});
    document.body.appendChild(box);done.focus({preventScroll:true});
  }
  async function promptInstall(source='button'){
    if(prompting||!deferredPrompt||isStandalone()) return false;
    prompting=true;
    try{
      const event=deferredPrompt;deferredPrompt=null;
      await event.prompt();
      const choice=await event.userChoice;
      if(choice?.outcome==='accepted') removeCard();
      else {storage.set(INSTALL_DISMISS_KEY,String(Date.now()));removeCard()}
      return choice?.outcome==='accepted';
    }catch(err){
      console.debug('Lovely install prompt unavailable',err);
      if(source==='button') showHelp(isIOS?'ios':isInApp?'inapp':'generic');
      return false;
    }finally{prompting=false}
  }
  function buildCard(mode){
    if(isStandalone()||recentlyDismissed()||installCard) return;
    const card=document.createElement('aside');card.className='lovely-install-card';card.setAttribute('role','region');card.setAttribute('aria-label','Install Lovely Coffee House app');
    const native=mode==='native';
    const text=native?'Install Lovely Coffee House on this phone for one-tap access.':mode==='ios'?'Add Lovely Coffee House to your Home Screen with its app icon.':mode==='inapp'?'Open this page in Chrome or Safari to install the Lovely app.':'Install from your browser menu for app-style access.';
    const button=native?'INSTALL':mode==='ios'?'HOW TO INSTALL':mode==='inapp'?'HOW TO OPEN':'INSTALL HELP';
    const icon=document.createElement('img');icon.className='lovely-install-icon';icon.src='/assets/icon-192.png';icon.alt='';icon.width=42;icon.height=42;
    const copy=document.createElement('div');copy.className='lovely-install-copy';const titleEl=document.createElement('p');titleEl.className='lovely-install-title';titleEl.textContent='Lovely Coffee House';const textEl=document.createElement('p');textEl.className='lovely-install-text';textEl.textContent=text;copy.append(titleEl,textEl);
    const actions=document.createElement('div');actions.className='lovely-install-actions';const installBtn=document.createElement('button');installBtn.className='lovely-install-btn';installBtn.type='button';installBtn.textContent=button;const dismiss=document.createElement('button');dismiss.className='lovely-install-dismiss';dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss install prompt');dismiss.textContent='×';actions.append(installBtn,dismiss);card.append(icon,copy,actions);
    installBtn.addEventListener('click',()=>native?promptInstall('button'):showHelp(mode));
    dismiss.addEventListener('click',markDismissed);
    document.body.appendChild(card);installCard=card;syncInstallCardPlacement();requestAnimationFrame(()=>card.dataset.show='true');
  }
  function armAutomaticNativePrompt(){
    if(autoPromptArmed||storage.sessionGet(AUTO_ATTEMPT_KEY)||recentlyDismissed()) return;
    autoPromptArmed=true;
    const attempt=()=>{
      if(!deferredPrompt||isStandalone()) return;
      storage.sessionSet(AUTO_ATTEMPT_KEY,'1');
      cleanup();
      promptInstall('gesture');
    };
    const cleanup=()=>{document.removeEventListener('pointerup',attempt,true);document.removeEventListener('keydown',attempt,true)};
    document.addEventListener('pointerup',attempt,{capture:true,once:true});
    document.addEventListener('keydown',attempt,{capture:true,once:true});
  }
  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)||location.protocol!=='https:') return;
    try{
      const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      reg.update().catch(()=>{});
    }catch(err){console.debug('Lovely service worker registration failed',err)}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(isStandalone()) return;
    event.preventDefault();deferredPrompt=event;
    setTimeout(()=>buildCard('native'),500);
    armAutomaticNativePrompt();
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;removeCard();
    storage.set(INSTALL_DISMISS_KEY,String(Date.now()));
  });
  const ready=()=>{
    watchCommerceControls();
    registerServiceWorker();
    if(isStandalone()) {document.documentElement.classList.add('lovely-installed-app');return;}
    setTimeout(()=>{
      if(deferredPrompt||recentlyDismissed()) return;
      if(isInApp) buildCard('inapp');
      else if(isIOS) buildCard('ios');
      else buildCard('generic');
    },2200);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
