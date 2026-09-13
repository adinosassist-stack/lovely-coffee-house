(function(){
  'use strict';

  const BUILD='r22-experience-20260913';
  const LAST_ORDER_KEY='lovely-last-completed-order-v1';
  const REPEAT_DISMISS_KEY='lovely-repeat-dismissed-v1';
  const MAX_ITEM_QTY=99;
  const EVENT_NAMES=new Set([
    'ai_open','commerce_local_route','drink_finder_open','drink_recommend',
    'meeting_planner_open','meeting_plan','meeting_plan_add','cart_view',
    'whatsapp_checkout','repeat_order_shown','repeat_order_add'
  ]);
  const upstreamFetch=window.fetch.bind(window);
  let commerceRouteReported=false;

  function safeProducts(){try{return Array.isArray(products)?products:[]}catch(_){return[]}}
  function safeEntries(){try{return typeof entries==='function'?entries():[]}catch(_){return[]}}
  function safeTotal(){try{return typeof grandTotal==='function'?Number(grandTotal())||0:0}catch(_){return 0}}
  function canon(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function money(v){return 'P'+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function safeToken(v){const x=String(v||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24);return x||'none'}
  function eventMeta(meta){
    const out={};
    for(const [key,value] of Object.entries(meta||{})){
      if(!/^[a-z][a-z0-9_]{0,23}$/.test(key))continue;
      if(typeof value==='number'&&Number.isFinite(value))out[key]=Math.round(value*100)/100;
      else if(typeof value==='boolean')out[key]=value;
      else if(typeof value==='string')out[key]=safeToken(value);
    }
    return out;
  }
  function track(name,meta={}){
    if(!EVENT_NAMES.has(name))return;
    const payload=JSON.stringify({event:name,page:'home',meta:eventMeta(meta)});
    try{
      if(navigator.sendBeacon){
        const blob=new Blob([payload],{type:'application/json'});
        if(navigator.sendBeacon('/api/lovely-events',blob))return;
      }
    }catch(_){}
    upstreamFetch('/api/lovely-events',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true,credentials:'same-origin'}).catch(()=>{});
  }

  function connectionNode(){return document.getElementById('lovelyAiConnection')}
  function setConnectionText(text,state){
    const node=connectionNode();if(!node)return;
    if(state&&node.dataset.state!==state)node.dataset.state=state;
    const last=node.lastChild;
    if(last&&last.nodeType===Node.TEXT_NODE){if(last.textContent!==text)last.textContent=text}
    else if(node.textContent!==text)node.appendChild(document.createTextNode(text));
  }
  function markAiLimited(){setConnectionText('Ordering ready · AI answers temporarily limited','basic')}
  function markAiReady(){setConnectionText('Lovely ready · ordering instant','online')}
  function normalizeConnection(){
    const node=connectionNode();if(!node)return;
    const state=node.dataset.state;
    if(navigator.onLine===false){setConnectionText('Ordering ready · offline menu guide','basic');return}
    if(state==='online')setConnectionText('Lovely ready · ordering instant','online');
    else setConnectionText('Ordering ready · menu guide','basic');
  }

  // R22 browser policy: transaction interpretation is deterministic-first. Returning the
  // same validated unavailable envelope as R21 makes the proven local engine run immediately,
  // without a network round-trip or Workers AI neuron spend.
  window.fetch=function(input,init){
    let url=null;
    try{url=new URL(typeof input==='string'?input:input&&input.url?input.url:String(input),location.href)}catch(_){}
    if(url&&url.origin===location.origin&&url.pathname==='/api/lovely-actions'){
      if(!commerceRouteReported){commerceRouteReported=true;track('commerce_local_route')}
      return Promise.resolve(new Response(JSON.stringify({error:'ai_unavailable'}),{
        status:503,
        headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Lovely-R22':'deterministic-commerce'}
      }));
    }
    const promise=upstreamFetch(input,init);
    if(url&&url.origin===location.origin&&['/api/lovely-ai','/api/lovely-tts','/api/lovely-stt'].includes(url.pathname)){
      return promise.then(response=>{if(response.status===503)markAiLimited();else if(response.ok)markAiReady();return response});
    }
    return promise;
  };

  function clearR22Cards(kind){
    document.querySelectorAll(kind?`.r22-card[data-r22-kind="${kind}"]`:'.r22-card').forEach(el=>el.remove());
    if(kind==='drink'||kind==='meeting')document.querySelectorAll('.lovely-ai-experience').forEach(el=>el.remove());
  }
  function aiBody(){return document.getElementById('lovelyAiBody')}
  function ensurePanelVisible(){
    const panel=document.getElementById('lovelyAiPanel');
    if(panel&&panel.getAttribute('aria-hidden')==='true')document.getElementById('lovelyAiLauncher')?.click();
  }
  function scrollAi(){const body=aiBody();if(body)requestAnimationFrame(()=>{body.scrollTop=body.scrollHeight})}
  function button(label,cls='') {const b=document.createElement('button');b.type='button';b.className=('r22-button '+cls).trim();b.textContent=label;return b}
  function field(labelText,control){const label=document.createElement('label');label.className='r22-field';const s=document.createElement('span');s.textContent=labelText;label.append(s,control);return label}
  function select(options,value){const s=document.createElement('select');for(const [v,t] of options){const o=document.createElement('option');o.value=v;o.textContent=t;if(v===value)o.selected=true;s.appendChild(o)}return s}
  function card(kind,title,sub){
    const root=document.createElement('section');root.className='r22-card';root.dataset.r22Kind=kind;
    const h=document.createElement('h3');h.textContent=title;root.appendChild(h);
    if(sub){const p=document.createElement('p');p.className='r22-sub';p.textContent=sub;root.appendChild(p)}
    return root;
  }
  function addCard(root){const body=aiBody();if(!body)return;body.appendChild(root);scrollAi()}
  function exactProduct(name){const key=canon(name);const list=safeProducts();const idx=list.findIndex(p=>canon(p&&p.n)===key);return idx>=0?{idx,p:list[idx]}:null}
  function addFixedProduct(index,qty=1){
    const list=safeProducts(),p=list[index];if(!p||p.quote||!Number.isFinite(Number(p.p)))return false;
    try{
      const current=Number(cart[index]||0),next=Math.min(MAX_ITEM_QTY,current+Math.max(1,Math.floor(Number(qty)||1)));
      cart[index]=next;
      if(typeof saveOrderSession==='function')saveOrderSession();
      if(typeof renderCart==='function')renderCart();
      if(typeof toast==='function')toast(p.n+' added');
      return true;
    }catch(_){return false}
  }
  function setExplicitFulfilment(value){
    if(!['collection','delivery','corporate'].includes(value))return;
    try{fulfil=value;if(typeof saveOrderSession==='function')saveOrderSession();if(typeof renderCart==='function')renderCart()}catch(_){}
  }

  function isCaffeinated(p){return /(?:espresso|coffee beans|\bcoffee\b|black tea|brewed tea|\btea\b|caffeine)/i.test([p?.n,p?.k,p?.s].join(' '))}
  function drinkCandidates(temp,style,caffeine){
    const list=safeProducts().map((p,idx)=>({p,idx,score:0})).filter(x=>x.p&&!x.p.quote&&Number.isFinite(Number(x.p.p))&&['Coffee','Boba','Summer','Health Drinks','Smoothies'].includes(x.p.c));
    for(const x of list){
      const p=x.p,n=canon(p.n),cat=p.c,caf=isCaffeinated(p);
      if(caffeine==='avoid'&&caf){x.score=-100;continue}
      if(caffeine==='yes')x.score+=caf?5:-2;
      if(temp==='hot')x.score+=(cat==='Coffee'&&!/iced/.test(n))?7:-1;
      if(temp==='cold')x.score+=(['Summer','Boba','Health Drinks','Smoothies'].includes(cat)||/iced/.test(n))?7:-2;
      if(style==='coffee')x.score+=(cat==='Coffee'||/coffee/.test(n))?9:-2;
      if(style==='fruity')x.score+=(['Summer','Boba','Smoothies'].includes(cat))?8:-2;
      if(style==='wellness')x.score+=cat==='Health Drinks'?10:-3;
      if(/seasonal/.test(n))x.score-=1;
      if(p.quote)x.score-=20;
    }
    return list.filter(x=>x.score>-50).sort((a,b)=>b.score-a.score||Number(a.p.p)-Number(b.p.p)).slice(0,3);
  }
  function renderDrinkResults(root,temp,style,caffeine){
    root.querySelector('.r22-results')?.remove();
    const wrap=document.createElement('div');wrap.className='r22-results';
    const results=drinkCandidates(temp,style,caffeine);
    if(!results.length){const p=document.createElement('p');p.textContent='No exact match is available. Try “Either” for temperature or caffeine.';wrap.appendChild(p);root.appendChild(wrap);return}
    results.forEach(({p,idx},position)=>{
      const row=document.createElement('article');row.className='r22-result';
      const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=(position===0?'Best match · ':'')+p.n;const meta=document.createElement('small');meta.textContent=`${money(p.p)}${p.k?' · '+p.k:''}`;copy.append(title,meta);
      const actions=document.createElement('div');actions.className='r22-row-actions';
      const addBtn=button('ADD','primary');addBtn.addEventListener('click',()=>{if(addFixedProduct(idx,1)){track('drink_recommend',{rank:position+1,category:p.c});try{openCart()}catch(_){}}});
      const ing=button('INGREDIENTS');ing.addEventListener('click',()=>{let fact=row.querySelector('.r22-fact');if(fact){fact.remove();return}fact=document.createElement('p');fact.className='r22-fact';fact.textContent=String(p.s||'Ingredients are confirmed on the menu and supplier label.');row.appendChild(fact)});
      actions.append(addBtn,ing);row.append(copy,actions);wrap.appendChild(row);
    });
    root.appendChild(wrap);track('drink_recommend',{temperature:temp,style,caffeine});scrollAi();
  }
  function showDrinkFinder(){
    ensurePanelVisible();clearR22Cards('drink');track('drink_finder_open');
    const root=card('drink','Find My Drink','Three quick choices. Lovely will show one best match and two alternatives from the current menu.');
    const grid=document.createElement('div');grid.className='r22-grid';
    const temp=select([['either','Hot or cold'],['hot','Hot'],['cold','Cold']],'either');
    const style=select([['coffee','Coffee-forward'],['fruity','Fruity / refreshing'],['wellness','Wellness / hydration']],'coffee');
    const caf=select([['either','Any caffeine level'],['avoid','Avoid caffeine sources'],['yes','Caffeine is fine']],'either');
    grid.append(field('Temperature',temp),field('Style',style),field('Caffeine',caf));root.appendChild(grid);
    const go=button('FIND MY DRINK','primary');go.addEventListener('click',()=>renderDrinkResults(root,temp.value,style.value,caf.value));root.appendChild(go);addCard(root);
  }

  const COFFEE_BOXES=[
    {name:'Small Coffee Meeting Box — 6',cap:6},
    {name:'Coffee Meeting Box — 10',cap:10},
    {name:'Large Coffee Meeting Box — 20',cap:20}
  ];
  function fixedCoffeeBoxes(){return COFFEE_BOXES.map(x=>{const found=exactProduct(x.name);return found?{...x,...found,price:Number(found.p.p)}:null}).filter(Boolean)}
  function bestBoxPlan(people){
    const boxes=fixedCoffeeBoxes();if(boxes.length!==3)return null;
    const max=Math.ceil(people/6)+2;let best=null;
    for(let a=0;a<=max;a++)for(let b=0;b<=max;b++)for(let c=0;c<=max;c++){
      const qs=[a,b,c],coverage=qs.reduce((s,q,i)=>s+q*boxes[i].cap,0);if(coverage<people||coverage===0)continue;
      const cost=qs.reduce((s,q,i)=>s+q*boxes[i].price,0),boxCount=a+b+c;
      const candidate={coverage,cost,boxCount,items:qs.map((q,i)=>q?{...boxes[i],qty:q}:null).filter(Boolean)};
      if(!best||cost<best.cost||(cost===best.cost&&coverage<best.coverage)||(cost===best.cost&&coverage===best.coverage&&boxCount<best.boxCount))best=candidate;
    }
    return best;
  }
  function summerPlan(people){
    const found=exactProduct('Summer Meeting Box');if(!found||found.p.quote||!Number.isFinite(Number(found.p.p)))return null;
    const qty=Math.max(1,Math.ceil(people/6));return{coverage:qty*6,cost:qty*Number(found.p.p),boxCount:qty,items:[{...found,cap:6,price:Number(found.p.p),qty}]};
  }
  function combinedPlan(people){
    const coldPeople=Math.floor(people/2),hotPeople=people-coldPeople;
    const hot=bestBoxPlan(Math.max(1,hotPeople)),cold=summerPlan(Math.max(1,coldPeople));
    if(!hot||!cold)return null;
    return{coverage:hot.coverage+cold.coverage,cost:hot.cost+cold.cost,boxCount:hot.boxCount+cold.boxCount,items:[...hot.items,...cold.items]};
  }
  function meetingPlan(people,style,duration){
    if(duration==='half'||duration==='full'){
      const name=duration==='half'?'Half-Day Training Refreshments':'Full-Day Training Refreshments';
      const found=exactProduct(name);return{quote:true,people,style,duration,product:found?.p||{n:name},minimum:10};
    }
    const fixed=style==='cold'?summerPlan(people):style==='mixed'?combinedPlan(people):bestBoxPlan(people);
    return fixed?{quote:false,people,style,duration,...fixed}:null;
  }
  function meetingSummary(plan){
    if(plan.quote){return `${plan.product.n} · ${Math.max(plan.people,plan.minimum)}-person minimum basis · final configuration and price confirmed on WhatsApp.`}
    const itemText=plan.items.map(x=>`${x.qty} × ${x.p.n}`).join(' + ');
    return `${itemText} · serves at least ${plan.coverage} · estimated product subtotal ${money(plan.cost)}.`;
  }
  function meetingWhatsApp(plan,fulfilment){
    const fulfilText={collection:'collection',delivery:'local delivery',corporate:'corporate delivery'}[fulfilment]||fulfilment;
    const message=`Hello Lovely Coffee House, I used the website Meeting Planner for ${plan.people} people. Style: ${plan.style}. Duration: ${plan.duration}. Fulfilment: ${fulfilText}. Suggested plan: ${meetingSummary(plan)} Please confirm final availability, configuration, timing, delivery charge if applicable, and payment instructions.`;
    try{if(typeof openWhatsAppMessage==='function')openWhatsAppMessage(message,{sameTab:true});else location.href='https://wa.me/26774583606?text='+encodeURIComponent(message)}catch(_){location.href='https://wa.me/26774583606?text='+encodeURIComponent(message)}
  }
  function renderMeetingPlan(root,people,style,duration,fulfilment){
    root.querySelector('.r22-results')?.remove();const plan=meetingPlan(people,style,duration);const wrap=document.createElement('div');wrap.className='r22-results';
    if(!plan){const p=document.createElement('p');p.textContent='I could not build a fixed plan from the current menu. Please use WhatsApp for a custom meeting quote.';wrap.appendChild(p);root.appendChild(wrap);return}
    const result=document.createElement('article');result.className='r22-result r22-meeting-result';const strong=document.createElement('strong');strong.textContent=plan.quote?'Custom meeting quote':'Recommended meeting order';const text=document.createElement('p');text.textContent=meetingSummary(plan);result.append(strong,text);
    const actions=document.createElement('div');actions.className='r22-row-actions';
    if(!plan.quote){
      const addPlan=button('ADD SUGGESTED ORDER','primary');addPlan.addEventListener('click',()=>{
        let added=0;for(const item of plan.items)if(addFixedProduct(item.idx,item.qty))added+=item.qty;
        setExplicitFulfilment(fulfilment);track('meeting_plan_add',{people,coverage:plan.coverage,boxes:added,style,fulfilment});if(added){try{openCart()}catch(_){}}
      });actions.appendChild(addPlan);
    }
    const wa=button(plan.quote?'GET WHATSAPP QUOTE':'SEND PLAN TO WHATSAPP');wa.addEventListener('click',()=>meetingWhatsApp(plan,fulfilment));actions.appendChild(wa);result.appendChild(actions);wrap.appendChild(result);root.appendChild(wrap);
    track('meeting_plan',{people,coverage:plan.coverage||people,quote:Boolean(plan.quote),style,duration,fulfilment});scrollAi();
  }
  function showMeetingPlanner(){
    ensurePanelVisible();clearR22Cards('meeting');track('meeting_planner_open');
    const root=card('meeting','Meeting Planner','Choose the group size and meeting type. Fixed-price plans can be added to the order immediately; training packages remain WhatsApp-confirmed.');
    const grid=document.createElement('div');grid.className='r22-grid';
    const people=document.createElement('input');people.type='number';people.min='1';people.max='100';people.inputMode='numeric';people.value='10';people.setAttribute('aria-label','Number of people');
    const style=select([['coffee','Coffee + muffins + fruit'],['cold','Cold drinks + muffins + fruit'],['mixed','Mix hot and cold']],'coffee');
    const duration=select([['short','Meeting / up to 2 hours'],['half','Half-day training'],['full','Full-day training']],'short');
    const fulfilment=select([['corporate','Corporate delivery'],['delivery','Local delivery'],['collection','Collection']],'corporate');
    grid.append(field('People',people),field('Drinks',style),field('Duration',duration),field('Fulfilment',fulfilment));root.appendChild(grid);
    const go=button('BUILD MEETING ORDER','primary');go.addEventListener('click',()=>{const n=Math.max(1,Math.min(100,Math.floor(Number(people.value)||1)));people.value=String(n);renderMeetingPlan(root,n,style.value,duration.value,fulfilment.value)});root.appendChild(go);addCard(root);
  }

  function currentOrderSnapshot(){
    const list=safeProducts();const items=safeEntries().map(([i,q])=>({name:list[Number(i)]?.n||'',qty:Math.max(1,Math.min(MAX_ITEM_QTY,Math.floor(Number(q)||1)))})).filter(x=>x.name);
    let f='collection';try{if(['collection','delivery','corporate'].includes(fulfil))f=fulfil}catch(_){}
    return{at:Date.now(),items,fulfil:f};
  }
  function saveLastOrder(){
    const snapshot=currentOrderSnapshot();if(!snapshot.items.length)return;
    try{localStorage.setItem(LAST_ORDER_KEY,JSON.stringify(snapshot))}catch(_){}
  }
  function loadLastOrder(){
    try{
      const raw=localStorage.getItem(LAST_ORDER_KEY);if(!raw)return null;const data=JSON.parse(raw);
      if(!data||!Array.isArray(data.items)||!Number.isFinite(Number(data.at))||Date.now()-Number(data.at)>45*86400000)return null;
      const mapped=[];for(const item of data.items){const found=exactProduct(item.name),qty=Math.max(1,Math.min(MAX_ITEM_QTY,Math.floor(Number(item.qty)||1)));if(found&&!found.p.quote&&Number.isFinite(Number(found.p.p)))mapped.push({...found,qty})}
      if(!mapped.length)return null;return{...data,mapped};
    }catch(_){return null}
  }
  function repeatLastOrder(data){
    try{for(const key of Object.keys(cart))delete cart[key];for(const item of data.mapped)cart[item.idx]=item.qty;setExplicitFulfilment(data.fulfil);if(typeof saveOrderSession==='function')saveOrderSession();if(typeof renderCart==='function')renderCart();track('repeat_order_add',{count:data.mapped.reduce((s,x)=>s+x.qty,0)});document.querySelector('.r22-card[data-r22-kind="repeat"]')?.remove();openCart()}catch(_){}
  }
  function showRepeatOrder(){
    if(safeEntries().length)return;
    try{if(sessionStorage.getItem(REPEAT_DISMISS_KEY)==='1')return}catch(_){}
    const data=loadLastOrder();if(!data)return;const body=aiBody();if(!body||body.querySelector('[data-r22-kind="repeat"]'))return;
    const count=data.mapped.reduce((s,x)=>s+x.qty,0),total=data.mapped.reduce((s,x)=>s+x.qty*Number(x.p.p),0);
    const root=card('repeat','Repeat your last order?',`${count} item${count===1?'':'s'} · current menu total ${money(total)}. Prices are recalculated from today’s menu.`);
    const actions=document.createElement('div');actions.className='r22-row-actions';const repeat=button('REPEAT ORDER','primary');repeat.addEventListener('click',()=>repeatLastOrder(data));const dismiss=button('NOT NOW');dismiss.addEventListener('click',()=>{try{sessionStorage.setItem(REPEAT_DISMISS_KEY,'1')}catch(_){}root.remove()});actions.append(repeat,dismiss);root.appendChild(actions);body.prepend(root);track('repeat_order_shown',{count,total});
  }

  function bindTelemetry(){
    document.addEventListener('click',event=>{
      const t=event.target.closest?.('button,a');if(!t)return;
      if(t.id==='lovelyAiLauncher')track('ai_open');
      if(t.id==='cartPill'||t.id==='topOrder'||t.dataset.aiCartSummary==='true')track('cart_view',{count:safeEntries().reduce((s,[,q])=>s+Number(q),0),total:safeTotal()});
      if(t.id==='checkout'){
        try{if(typeof checkoutRequirement==='function'&&checkoutRequirement().state==='ready'){saveLastOrder();track('whatsapp_checkout',{count:safeEntries().reduce((s,[,q])=>s+Number(q),0),total:safeTotal()})}}catch(_){}
      }
    },true);
  }
  function bindExperienceOverrides(){
    document.addEventListener('click',event=>{
      const trigger=event.target.closest?.('[data-ai-experience]');if(!trigger)return;
      if(trigger.dataset.aiExperience==='meeting'){event.preventDefault();event.stopImmediatePropagation();showMeetingPlanner()}
      else if(trigger.dataset.aiExperience==='drink'){event.preventDefault();event.stopImmediatePropagation();showDrinkFinder()}
    },true);
  }
  function enhanceCartPill(){
    const pill=document.getElementById('cartPill'),totalNode=document.getElementById('pillTotal');if(!pill||!totalNode)return;
    const label=pill.querySelector('span');const sync=()=>{const count=safeEntries().reduce((s,[,q])=>s+Number(q),0);if(label)label.textContent=count?`VIEW ORDER · ${count} ITEM${count===1?'':'S'}`:'VIEW ORDER'};sync();new MutationObserver(sync).observe(totalNode,{childList:true,characterData:true,subtree:true});
  }
  function bindConnection(){const node=connectionNode();if(!node)return;normalizeConnection();new MutationObserver(normalizeConnection).observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});window.addEventListener('online',normalizeConnection);window.addEventListener('offline',normalizeConnection)}

  function init(){
    document.documentElement.dataset.lovelyExperience=BUILD;
    bindTelemetry();bindExperienceOverrides();enhanceCartPill();bindConnection();showRepeatOrder();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
