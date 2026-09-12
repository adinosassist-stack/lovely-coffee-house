// Pricing control: fixed menu and corporate prices follow Lovely Coffee House Operating System 2026 v2.0 Final.
// Seasonal smoothie additions and custom Solo configurations remain quote-only until recipe/packaging costing is approved. Health drinks use fixed launch prices.
const MEETING_BOX_6={p:360,ingredients:'Ingredients: 6 Americanos or Cappuccinos + 6 Vanilla/Plain or Chocolate Muffins + 6 seasonal fruit portions (approx. 120 g prepared fruit each; mix varies with availability).'};
const products=[
{n:'Espresso',p:25,c:'Coffee',s:'Ingredients: espresso coffee beans + water.'},
{n:'Americano',p:30,c:'Coffee',s:'Ingredients: espresso + hot water.'},
{n:'Cappuccino',p:35,c:'Coffee',s:'Ingredients: espresso + steamed milk + milk foam.'},
{n:'Café Latte',p:38,c:'Coffee',s:'Ingredients: espresso + steamed milk + light milk foam.'},
{n:'Mocha',p:45,c:'Coffee',s:'Ingredients: espresso + chocolate + steamed milk + milk foam.'},
{n:'Hot Chocolate',p:40,c:'Coffee',s:'Ingredients: chocolate/cocoa drinking mix + steamed milk.'},
{n:'Tea',p:20,c:'Coffee',s:'Ingredients: tea + hot water; milk and sugar are optional.'},
{n:'Classic Milk Tea',p:40,c:'Boba',s:'Ingredients: black tea + milk + sweetener + tapioca pearls + ice.'},
{n:'Brown Sugar Milk Tea',p:42,c:'Boba',s:'Ingredients: black tea + milk + brown-sugar syrup + tapioca pearls + ice.'},
{n:'Strawberry Milk Tea',p:42,c:'Boba',s:'Ingredients: black tea + milk + strawberry flavour/purée + sweetener + tapioca pearls + ice.'},
{n:'Mango Fruit Tea + Popping Boba',p:42,c:'Boba',s:'Ingredients: tea + mango flavour/purée + water + sweetener + mango popping boba + ice.'},
{n:'Passion Fruit Tea + Popping Boba',p:42,c:'Boba',s:'Ingredients: tea + passion-fruit flavour/purée + water + sweetener + popping boba + ice.'},
{n:'Extra Pearls / Popping Boba',p:8,c:'Boba',s:'Ingredients: 1 extra serving of tapioca pearls or popping boba.'},
{n:'Lovely Pink Lemonade',p:35,c:'Summer',s:'Ingredients: lemon juice + water + sugar syrup + berry/pink fruit flavour + ice.'},
{n:'Classic Lemonade',p:30,c:'Summer',s:'Ingredients: lemon juice + water + sugar syrup + ice.'},
{n:'Passion Fruit Lemonade',p:35,c:'Summer',s:'Ingredients: lemon juice + passion-fruit flavour/purée + water + sugar syrup + ice.'},
{n:'Peach Iced Tea',p:30,c:'Summer',s:'Ingredients: brewed tea + peach flavour/purée + water + sweetener + ice.'},
{n:'Lemon-Mint Iced Tea',p:30,c:'Summer',s:'Ingredients: brewed tea + lemon + fresh mint + water + sweetener + ice.'},
{n:'Iced Coffee',p:40,c:'Summer',s:'Ingredients: espresso + chilled milk + ice; sweetener is optional.'},
{n:'Tropical Mango Cooler',p:38,c:'Summer',s:'Ingredients: mango flavour/purée + water or sparkling water + citrus juice + ice.'},
{n:'Seasonal Cooler',p:38,c:'Summer',s:'Ingredients: seasonal fruit/flavour base + water or sparkling water + ice. Exact current-flavour ingredients are confirmed before order.',from:true,quote:true},
{n:'Blackcurrant & Acai Hydration',p:25,c:'Health Drinks',k:'THRIVE · B1 + B3',s:'Ingredients: filtered still or sparkling water + natural blackcurrant & acai flavour + vitamins B1 & B3 + hibiscus extract + green tea extract + citric acid + sucralose + potassium sorbate + plant colour concentrate.'},
{n:'Peach Hydration',p:25,c:'Health Drinks',k:'GLOW · Vitamin C + B3',s:'Ingredients: filtered still or sparkling water + natural peach flavour + vitamin C + vitamin B3 + citric acid + sucralose + potassium sorbate + plant colour concentrate.'},
{n:'Fresh Lemon Hydration',p:25,c:'Health Drinks',k:'IMMUNITY · Vitamins C + D + B12',s:'Ingredients: filtered still or sparkling water + natural lemon flavour + vitamin C + vitamin D + vitamin B12 + zinc gluconate + citric acid + sucralose + potassium sorbate + stabilisers.'},
{n:'Cucumber & Yuzu Hydration',p:25,c:'Health Drinks',k:'REFRESH · Vitamin C + B12',s:'Ingredients: filtered still or sparkling water + natural cucumber, yuzu & mint flavour + vitamins C & B12 + mint extract + citric acid + invert sugar syrup + potassium sorbate; artificial-sweetener free.'},
{n:'Elderflower & Lychee Hydration',p:25,c:'Health Drinks',k:'BLOOM · B1 + B3',s:'Ingredients: filtered still or sparkling water + natural elderflower & lychee flavour + vitamins B1 & B3 + citric acid + invert sugar syrup + potassium sorbate; artificial-sweetener free.'},
{n:'Red Fruits & Mint Hydration',p:25,c:'Health Drinks',k:'FOCUS · Vitamin D + caffeine',s:'Ingredients: filtered still or sparkling water + natural red-fruit & mint flavour + vitamin D + caffeine (25 mg/100 ml finished drink) + citric acid + invert sugar syrup + sucralose + potassium sorbate + carrot colour concentrate.'},
{n:'Mango & Guava Hydration',p:25,c:'Health Drinks',k:'UNWIND · Vitamins C + B6 + B12',s:'Ingredients: filtered still or sparkling water + natural mango & guava flavour + vitamins C, B5, B6, biotin & B12 + citric acid + invert sugar syrup + sucralose + potassium sorbate + gum arabic + plant colour E160e.'},
{n:'Raspberry & Pomegranate Hydration',p:25,c:'Health Drinks',k:'BALANCE · Vitamins E + B5 + B6 + B12',s:'Ingredients: filtered still or sparkling water + natural raspberry & pomegranate flavour + vitamins E, B5, B6, biotin & B12 + citric acid + invert sugar syrup + sucralose + potassium sorbate + carrot colour concentrate.'},
{n:'Mineral Water',p:15,c:'Health Drinks',s:'Ingredients: 500 ml bottled mineral water. Brand/source may vary.'},
{n:'Alkaline Water',p:20,c:'Health Drinks',s:'Ingredients: 500 ml bottled alkaline water. Brand, pH and mineral composition may vary; confirm the supplier label for exact details.'},
{n:'Mango-Yoghurt Smoothie',p:48,c:'Smoothies',s:'Ingredients: mango + plain yoghurt + milk + ice; no added syrup by default.'},
{n:'Berry-Mint Yoghurt Smoothie',p:null,c:'Smoothies',s:'Ingredients: mixed berries + plain yoghurt + milk + fresh mint + ice; no added syrup by default.',quote:true},
{n:'Green Mango & Ginger Smoothie',p:null,c:'Smoothies',s:'Ingredients: mango + plain yoghurt + milk + fresh ginger + ice; no added syrup by default.',quote:true},
{n:'Vanilla / Plain Muffin',p:20,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + milk + butter/oil + baking powder + vanilla.'},
{n:'Chocolate Muffin',p:22,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + milk + butter/oil + cocoa/chocolate + baking powder.'},
{n:'Premium Muffin',p:25,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + milk + butter/oil + baking powder + current premium flavour. Exact flavour ingredients are confirmed before order.'},
{n:'Brownie',p:25,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + butter/oil + cocoa/chocolate.'},
{n:'Cookie',p:12,c:'Bakes',s:'Ingredients: wheat flour + sugar + butter/oil + egg + vanilla.'},
{n:'Cake Slice',p:40,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + milk + butter/oil + icing + current standard flavour.'},
{n:'Premium Cake Slice',p:45,c:'Bakes',s:'Ingredients: wheat flour + sugar + egg + milk + butter/oil + icing + current premium flavour. Exact flavour ingredients are confirmed before order.'},
{n:'Continental Breakfast',p:50,c:'Breakfast',s:'Ingredients: toast + cereal or yoghurt + seasonal fruit + tea or Americano. Milk-coffee upgrades cost extra.'},
{n:'Lovely Full Breakfast',p:70,c:'Breakfast',s:'Ingredients: eggs + bacon + sausage + grilled tomato + toast + tea or Americano. Milk-coffee upgrades cost extra.'},
{n:'Executive Breakfast',p:95,c:'Breakfast',s:'Ingredients: eggs + bacon + sausage + grilled tomato + toast + juice + seasonal fruit + tea or Americano + premium presentation. Milk-coffee upgrades cost extra.'},
{n:'Room Guest Coffee + Muffin',p:45,c:'Breakfast',s:'Ingredients: 1 Americano or Cappuccino + 1 Vanilla/Plain or Chocolate Muffin. Standard Room guest pre-order; upgrades extra.'},
{n:'Coffee + Muffin',p:49,c:'Bundles',s:'Ingredients: 1 Americano or Cappuccino + 1 Vanilla/Plain or Chocolate Muffin. Latte, Mocha and Premium Muffin upgrades cost extra.'},
{n:'Morning for Two',p:95,c:'Bundles',s:'Ingredients: 2 Americanos or Cappuccinos + 2 Vanilla/Plain or Chocolate Muffins. Upgrades cost extra.'},
{n:'Lovely Break Box',p:140,c:'Bundles',s:'Ingredients: 2 Vanilla/Plain Muffins + 2 Chocolate Muffins + 2 Brownies + 2 Cookies.'},
{n:'Sweet Meeting Box',p:290,c:'Bundles',s:'Ingredients: 6 assorted standard Cake Slices + 6 seasonal fruit portions (approx. 120 g prepared fruit each; mix varies with availability). Premium Cake Slice upgrades cost extra.'},
{n:'Coffee Meeting Box',p:MEETING_BOX_6.p,c:'Bundles',s:MEETING_BOX_6.ingredients+' Latte, Mocha and Premium Muffin upgrades cost extra.'},
{n:'Celebration Box',p:250,c:'Bundles',s:'Ingredients: 1 mini celebration cake + 2 Vanilla/Plain Muffins + 1 Brownie + 1 Cookie + 1 message card. Cake size/flavour and upgrades are confirmed on WhatsApp.',from:true,quote:true},
{n:'Boba + Muffin',p:55,c:'Bundles',s:'Ingredients: 1 fixed-price Boba drink + 1 Vanilla/Plain or Chocolate Muffin. Premium Muffin and extra-pearls upgrades cost extra.'},
{n:'Summer Meeting Box',p:360,c:'Bundles',s:'Ingredients: 6 Classic Lemonades, Peach Iced Teas or Lemon-Mint Iced Teas + 6 Vanilla/Plain or Chocolate Muffins + 6 seasonal fruit portions (approx. 120 g prepared fruit each; mix varies with availability). Boba and premium upgrades cost extra.'},
{n:'Solo / Individual Meeting Box',p:null,c:'Corporate',s:'Ingredients: 1 Americano or Cappuccino + 2 Vanilla/Plain or Chocolate Muffins + 1 Brownie + 1 seasonal fruit portion (approx. 120 g prepared fruit; mix varies with availability). Final configuration and price confirmed on WhatsApp.',quote:true},
{n:'Solo Executive Box',p:null,c:'Corporate',s:'Ingredients: 1 Americano or Cappuccino + 2 Vanilla/Plain Muffins + 1 Chocolate Muffin + 2 Brownies + 1 seasonal fruit portion (approx. 120 g prepared fruit) + premium presentation. Final configuration and price confirmed on WhatsApp.',quote:true},
{n:'Small Coffee Meeting Box — 6',p:MEETING_BOX_6.p,c:'Corporate',s:MEETING_BOX_6.ingredients+' Upgrades extra; direct or scheduled delivery.'},
{n:'Coffee Meeting Box — 10',p:590,c:'Corporate',s:'Ingredients: 10 Americanos or Cappuccinos + 10 Vanilla/Plain or Chocolate Muffins + 10 seasonal fruit portions (approx. 120 g prepared fruit each; mix varies with availability). Recommended corporate option; upgrades extra.'},
{n:'Large Coffee Meeting Box — 20',p:1160,c:'Corporate',s:'Ingredients: 20 Americanos or Cappuccinos + 20 Vanilla/Plain or Chocolate Muffins + 20 seasonal fruit portions (approx. 120 g prepared fruit each; mix varies with availability). Upgrades extra; pre-order and scheduled dispatch.'},
{n:'Business Breakfast Box',p:75,c:'Corporate',s:'Per-person ingredients: 1 egg + 1 sausage + grilled tomato + toast + 1 seasonal fruit portion (approx. 120 g prepared fruit; mix varies with availability) + tea or Americano. Minimum 6; substitutions/upgrades confirmed on WhatsApp.',from:true,quote:true},
{n:'Half-Day Training Refreshments',p:90,c:'Corporate',s:'Per-person ingredients: 1 Americano, Cappuccino or Tea + 1 Vanilla/Plain or Chocolate Muffin + 1 bottled water + 1 seasonal fruit portion (approx. 120 g). Minimum 10; premium upgrades extra.',from:true,quote:true},
{n:'Full-Day Training Refreshments',p:140,c:'Corporate',s:'Per-person ingredients: morning Americano/Cappuccino/Tea + standard muffin + bottled water + 1 seasonal fruit portion (approx. 120 g prepared fruit; mix varies with availability); afternoon Americano/Cappuccino/Tea + Brownie or Cookie. Minimum 10; upgrades extra.',from:true,quote:true},
{n:'Boba / Summer Staff Treat Pack — 10',p:350,c:'Corporate',s:'Ingredients: 10 cold drinks total — 4 Classic Lemonades + 3 Peach Iced Teas + 3 Lemon-Mint Iced Teas. Boba and higher-priced drink upgrades are quoted.',from:true,quote:true},
{n:'Office Celebration Box',p:450,c:'Corporate',s:'Ingredients: 1 mini celebration cake + 3 Vanilla/Plain Muffins + 2 Brownies + 1 Cookie + 1 message card. Cake size/flavour and upgrades are confirmed on WhatsApp.',from:true,quote:true}
];
const cats=['Coffee','Boba','Summer','Health Drinks','Smoothies','Bakes','Breakfast','Bundles','Corporate'];let active='Coffee',cart={},fulfil='collection';const VAT_ENABLED=false;const VAT_RATE=0.14;const CART_SESSION_KEY='lovely-coffee-order-v1';const MAX_ITEM_QTY=99;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],money=n=>'P'+Number(n).toLocaleString(),money2=n=>'P'+Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
function catalogSignature(){let h=2166136261;for(const p of products){const str=`${p.n}|${p.p??''}|${p.min??''}|${p.quote?1:0};`;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}}return (h>>>0).toString(36)}
const CART_CATALOG_SIGNATURE=catalogSignature();
function saveOrderSession(){try{sessionStorage.setItem(CART_SESSION_KEY,JSON.stringify({catalog:CART_CATALOG_SIGNATURE,cart,fulfil,active}))}catch(_){}}
function restoreOrderSession(){try{const raw=sessionStorage.getItem(CART_SESSION_KEY);if(!raw)return;const data=JSON.parse(raw);if(!data||data.catalog!==CART_CATALOG_SIGNATURE){sessionStorage.removeItem(CART_SESSION_KEY);return}const next={};if(data.cart&&typeof data.cart==='object'){Object.entries(data.cart).forEach(([i,q])=>{const idx=Number(i),qty=Math.floor(Number(q));if(Number.isInteger(idx)&&idx>=0&&idx<products.length&&Number.isFinite(qty)&&qty>0&&products[idx]&&products[idx].p!=null&&!products[idx].quote)next[idx]=Math.min(qty,MAX_ITEM_QTY)})}cart=next;if(['collection','delivery','corporate'].includes(data.fulfil))fulfil=data.fulfil;if(cats.includes(data.active))active=data.active}catch(_){try{sessionStorage.removeItem(CART_SESSION_KEY)}catch(__){}}}
function clearOrderSessionIfEmpty(){if(entries().length)return;try{sessionStorage.removeItem(CART_SESSION_KEY)}catch(_){}}
function renderCats(){
  const root=$('#cats');root.replaceChildren();
  cats.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='cat'+(c===active?' active':'');b.dataset.cat=c;b.setAttribute('aria-pressed',c===active?'true':'false');b.setAttribute('aria-controls','menuGrid');b.textContent=c;root.appendChild(b)});
  requestAnimationFrame(()=>{const current=root.querySelector('.cat.active');if(current)current.scrollIntoView({block:'nearest',inline:'center'})});
}
function renderMenu(){
  const root=$('#menuGrid');root.replaceChildren();
  products.filter(p=>p.c===active).forEach(p=>{const i=products.indexOf(p),price=p.quote||p.p==null?'QUOTE':((p.from?'FROM ':'')+money(p.p)),action=p.quote?'ENQUIRE':'ADD';
    const item=document.createElement('div');item.className='item';
    const name=document.createElement('div');name.className='item-name';name.append(document.createTextNode(p.n));
    if(p.k){const claim=document.createElement('span');claim.className='functional-claim';claim.textContent=p.k;name.appendChild(claim)}
    const small=document.createElement('small');small.textContent=p.s+(p.min?' · MIN '+p.min:'');name.appendChild(small);item.appendChild(name);
    const priceEl=document.createElement('span');priceEl.className='price';priceEl.textContent=price;item.appendChild(priceEl);
    const btn=document.createElement('button');btn.type='button';btn.className='add';btn.dataset[p.quote?'enquire':'add']=String(i);btn.setAttribute('aria-label',action+' '+p.n);btn.textContent=action;item.appendChild(btn);root.appendChild(item);
  });
}
function legacyCopyTextForHandoff(text){
  try{
    const ta=document.createElement('textarea');
    ta.value=String(text||'');ta.setAttribute('readonly','');ta.setAttribute('aria-hidden','true');
    ta.style.position='fixed';ta.style.opacity='0';ta.style.pointerEvents='none';ta.style.left='-9999px';ta.style.top='0';
    document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,ta.value.length);
    const ok=typeof document.execCommand==='function'&&document.execCommand('copy');ta.remove();return Boolean(ok);
  }catch(_){return false}
}
async function copyTextForHandoff(text){
  const value=String(text||'');
  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'&&window.isSecureContext){
    try{await navigator.clipboard.writeText(value);return true}catch(_){}
  }
  return legacyCopyTextForHandoff(value)
}
function navigateToWhatsApp(url,mobile,popup=null,forceSameTab=false){
  // AI-triggered checkout deliberately uses same-tab navigation. Browsers can block a
  // delayed window.open() after speech/AI processing because user activation has expired.
  // Same-tab navigation is deterministic and works on desktop, mobile and installed PWAs.
  if(forceSameTab){window.location.assign(url);return}
  if(mobile){window.location.href=url;return}
  if(popup){try{popup.location.href=url}catch(_){window.location.href=url}return}
  const opened=window.open(url,'_blank');if(opened){try{opened.opener=null}catch(_){}}else{window.location.href=url}
}
function openWhatsAppMessage(message,{sameTab=false}={}){
  const full=String(message||''),encodedFull=encodeURIComponent(full);
  const mobile=window.matchMedia('(max-width:900px)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
  if(encodedFull.length<=1800){navigateToWhatsApp(`https://wa.me/26774583606?text=${encodedFull}`,mobile,null,sameTab);return}
  const popup=(mobile||sameTab)?null:window.open('about:blank','_blank');if(popup){try{popup.opener=null}catch(_){}}
  copyTextForHandoff(full).then(async copied=>{
    if(copied){
      const short='Hello Lovely Coffee House, I have a large mixed order copied from your website. I will paste the full order details in this chat.';
      toast('Large order copied — paste the full details in WhatsApp.');
      navigateToWhatsApp(`https://wa.me/26774583606?text=${encodeURIComponent(short)}`,mobile,popup,sameTab);return
    }
    if(mobile&&navigator.share&&typeof navigator.share==='function'){
      try{await navigator.share({text:full});toast('Choose WhatsApp to share the full order.');if(popup)try{popup.close()}catch(_){}return}catch(_){}
    }
    toast('Could not copy the large order automatically. Opening WhatsApp with the full order.');
    navigateToWhatsApp(`https://wa.me/26774583606?text=${encodedFull}`,mobile,popup,sameTab);
  }).catch(()=>navigateToWhatsApp(`https://wa.me/26774583606?text=${encodedFull}`,mobile,popup,sameTab));
}
function enquire(i){const p=products[i],msg=`Hello Lovely Coffee House, I would like a quote for ${p.n}. Please confirm the final ingredients/configuration, price, availability, requested time and delivery charge if applicable.`;openWhatsAppMessage(msg)}
const originalButtonLabels=new WeakMap();function flashAddedButton(btn){if(!btn)return;let original=originalButtonLabels.get(btn);if(!original){original=btn.textContent;originalButtonLabels.set(btn,original)}btn.classList.add('is-added');btn.textContent='ADDED ✓';clearTimeout(btn._lovelyAddedTimer);btn._lovelyAddedTimer=setTimeout(()=>{if(document.body.contains(btn)){btn.textContent=original;btn.classList.remove('is-added')}},900)}
function add(i,trigger){const p=products[i];if(p.p==null||p.quote){enquire(i);return}const q=p.min||1,current=Number(cart[i]||0);if(current>=MAX_ITEM_QTY){toast(`Maximum ${MAX_ITEM_QTY} per item. Contact us for a larger order.`);return}const next=Math.min(MAX_ITEM_QTY,current+q);cart[i]=next;saveOrderSession();renderCart();flashAddedButton(trigger);toast(next-current<q?`${p.n} capped at ${MAX_ITEM_QTY}. Contact us for a larger order.`:p.n+' added')}
const catsRoot=$('#cats'),menuRoot=$('#menuGrid');
if(catsRoot)catsRoot.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b||!catsRoot.contains(b))return;active=b.dataset.cat;saveOrderSession();renderCats();renderMenu()});
if(menuRoot)menuRoot.addEventListener('click',e=>{const addBtn=e.target.closest('[data-add]'),enquireBtn=e.target.closest('[data-enquire]');if(addBtn&&menuRoot.contains(addBtn)){add(+addBtn.dataset.add,addBtn);return}if(enquireBtn&&menuRoot.contains(enquireBtn))enquire(+enquireBtn.dataset.enquire)});
function entries(){return Object.entries(cart).filter(([,q])=>Number(q)>0)}function total(){return entries().reduce((s,[i,q])=>s+(Number(products[i].p)||0)*Number(q),0)}
function vatAmount(){return VAT_ENABLED?total()*VAT_RATE:0}
function grandTotal(){return total()+vatAmount()}
function checkoutRequirement(){
  const t=total();
  if(!entries().length)return{state:'empty',short:0};
  if(fulfil==='delivery'&&t<100)return{state:'needs-more',short:100-t,label:'local delivery'};
  if(fulfil==='corporate'&&t<200)return{state:'needs-more',short:200-t,label:'corporate delivery'};
  return{state:'ready',short:0};
}
function updateCheckoutState(){
  const btn=$('#checkout'),guide=$('#checkoutGuidance');if(!btn||!guide)return;
  const req=checkoutRequirement();btn.dataset.state=req.state;
  if(req.state==='empty'){btn.disabled=true;btn.textContent='ADD ITEMS TO ORDER';btn.setAttribute('aria-label','Add menu items before checkout');guide.textContent='Choose at least one menu item to start your order.';return}
  btn.disabled=false;
  if(req.state==='needs-more'){btn.textContent=`ADD ${money(req.short)} MORE`;btn.setAttribute('aria-label',`Add ${money(req.short)} more to reach the ${req.label} minimum`);guide.textContent=`The ${req.label} product-subtotal minimum has not been reached. Tap below to return to the menu and add ${money(req.short)} more.`;return}
  btn.textContent='PLACE ORDER ON WHATSAPP';btn.setAttribute('aria-label','Place order on WhatsApp');
  guide.textContent=fulfil==='collection'?'Your order is ready to send. Collection timing and payment will be confirmed on WhatsApp.':fulfil==='delivery'?'Your order meets the local-delivery minimum. Delivery charge, timing and payment will be confirmed on WhatsApp.':'Your order meets the corporate-delivery minimum. Final timing, delivery charge and payment will be confirmed on WhatsApp.';
}
function renderCart(){
  const e=entries(),t=total(),v=vatAmount(),g=grandTotal(),count=e.reduce((s,[,q])=>s+Number(q),0);
  $('#topCount').textContent=count;$('#pillTotal').textContent=`${money2(g)} · ${count}`;$('#cartPill').classList.toggle('show',count>0);document.body.classList.toggle('has-cart-items',count>0);$('#subtotal').textContent=money2(t);$('#vatAmount').textContent=money2(v);$('#grandTotal').textContent=money2(g);
  const vatRow=$('#vatRow');if(vatRow)vatRow.hidden=!VAT_ENABLED;const gtLabel=$('#grandTotalLabel');if(gtLabel)gtLabel.textContent=VAT_ENABLED?'Total including VAT':'Order total';
  const menuTaxNote=$('#menuTaxNote');if(menuTaxNote)menuTaxNote.textContent=VAT_ENABLED?'PRICES SHOWN EXCLUDE VAT · 14% VAT IS ADDED IN THE CART':'CURRENT MENU PRICES · DELIVERY AND QUOTE ITEMS CONFIRMED ON WHATSAPP';
  const taxFaq=$('#taxFaqAnswer');if(taxFaq)taxFaq.textContent=VAT_ENABLED?'Menu prices are shown excluding VAT and 14% VAT is added in the cart before you send the order to WhatsApp.':'Fixed-price menu items show the current product price. Delivery charges and quote-only items are confirmed on WhatsApp.';
  const policy=$('#cartPolicyNote');if(policy)policy.textContent=(VAT_ENABLED?'Prices shown exclude VAT; 14% VAT is added at checkout. ':'')+'For same-day local delivery, order by 16:30. Corporate orders for 10+ people are preferably placed by 15:00 the previous day and new corporate customers must prepay. Please mention allergies or dietary requirements before payment. No card payment is taken on this page. Lovely AI processes questions and, when cloud transcription is needed, voice audio only when you choose to use the assistant; see Privacy.';
  const cartRoot=$('#cartItems');cartRoot.replaceChildren();
  if(count){
    e.forEach(([i,q])=>{const p=products[i];if(!p)return;const row=document.createElement('div');row.className='cart-row';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=p.n;left.appendChild(title);const each=document.createElement('small');each.textContent=money2(p.p)+' each';left.appendChild(each);const qty=document.createElement('div');qty.className='qty';
      const dec=document.createElement('button');dec.type='button';dec.dataset.dec=String(i);dec.setAttribute('aria-label','Decrease '+p.n+' quantity');dec.textContent='−';qty.appendChild(dec);const amount=document.createElement('span');amount.setAttribute('aria-label','Quantity '+q);amount.textContent=String(q);qty.appendChild(amount);const inc=document.createElement('button');inc.type='button';inc.dataset.inc=String(i);inc.setAttribute('aria-label','Increase '+p.n+' quantity');inc.textContent='+';qty.appendChild(inc);const rem=document.createElement('button');rem.type='button';rem.className='remove';rem.dataset.rem=String(i);rem.setAttribute('aria-label','Remove '+p.n+' from order');rem.textContent='REMOVE';qty.appendChild(rem);left.appendChild(qty);row.appendChild(left);const lineTotal=document.createElement('strong');lineTotal.textContent=money2(p.p*q);row.appendChild(lineTotal);cartRoot.appendChild(row)});
  }else{const empty=document.createElement('div');empty.className='empty';empty.append(document.createTextNode('Your order is empty.'));empty.appendChild(document.createElement('br'));const browseBtn=document.createElement('button');browseBtn.className='empty-order-cta';browseBtn.id='emptyOrderBrowse';browseBtn.type='button';browseBtn.textContent='BROWSE MENU';empty.appendChild(browseBtn);cartRoot.appendChild(empty)};
  $$('[data-inc]').forEach(b=>b.onclick=()=>{const i=b.dataset.inc,current=Number(cart[i]||0);if(current>=MAX_ITEM_QTY){toast(`Maximum ${MAX_ITEM_QTY} per item. Contact us for a larger order.`);return}cart[i]=current+1;saveOrderSession();renderCart()});
  $$('[data-dec]').forEach(b=>b.onclick=()=>{const i=b.dataset.dec,min=products[i].min||1;if(Number(cart[i])-1<min){toast(min>1?`Minimum quantity is ${min}. Use REMOVE to delete it.`:'Use REMOVE to delete this item.');return}cart[i]=Number(cart[i])-1;saveOrderSession();renderCart()});
  $$('[data-rem]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.rem];saveOrderSession();clearOrderSessionIfEmpty();renderCart()});
  const browse=$('#emptyOrderBrowse');if(browse)browse.onclick=()=>{closeCart();setTimeout(goToOrderStart,80)};
  $$('[data-f]').forEach(x=>{const selected=x.dataset.f===fulfil;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',selected?'true':'false')});
  updateCheckoutState();
}
let lastFocus=null;const cartBackgroundState=new Map();
function setCartBackgroundInert(on){for(const el of document.body.children){if(!el||el.id==='cart'||el.id==='shade'||el.id==='toast'||el.tagName==='SCRIPT')continue;if(on){if(!cartBackgroundState.has(el))cartBackgroundState.set(el,Boolean(el.inert));el.inert=true}else if(cartBackgroundState.has(el))el.inert=cartBackgroundState.get(el)}if(!on)cartBackgroundState.clear()}
function isCartOpen(){return $('#cart')&&$('#cart').classList.contains('open')}
function cartFocusables(){const cartEl=$('#cart');if(!cartEl)return[];return [...cartEl.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden&&el.getClientRects().length)}
function trapCartFocus(e){if(e.key!=='Tab'||!isCartOpen())return;const nodes=cartFocusables();if(!nodes.length){e.preventDefault();$('#closeCart').focus();return}const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
function openCart(){if(isCartOpen())return;lastFocus=document.activeElement;const cartEl=$('#cart');document.body.classList.add('cart-open');setCartBackgroundInert(true);if(cartEl){cartEl.inert=false;cartEl.classList.add('open');cartEl.setAttribute('aria-hidden','false')}$('#shade').classList.add('show');$('#topOrder').setAttribute('aria-expanded','true');$('#cartPill').setAttribute('aria-expanded','true');document.body.style.overflow='hidden';window.setTimeout(()=>$('#closeCart').focus(),0)}
function closeCart({restoreFocus=true}={}){if(!isCartOpen())return;const cartEl=$('#cart');document.body.classList.remove('cart-open');if(cartEl){cartEl.classList.remove('open');cartEl.setAttribute('aria-hidden','true');cartEl.inert=true}$('#shade').classList.remove('show');$('#topOrder').setAttribute('aria-expanded','false');$('#cartPill').setAttribute('aria-expanded','false');document.body.style.overflow='';setCartBackgroundInert(false);const focusTarget=lastFocus;lastFocus=null;if(restoreFocus&&focusTarget&&typeof focusTarget.focus==='function')focusTarget.focus()}function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1400)}
function orderText(){
  const f={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[fulfil];
  const lines=['Hello Lovely Coffee House, I would like to place this order:',...entries().map(([i,q])=>`${q} x ${products[i].n} — ${money2(products[i].p*q)}`),`Product subtotal: ${money2(total())}`];
  if(VAT_ENABLED){lines.push(`VAT (14%): ${money2(vatAmount())}`,`Total including VAT: ${money2(grandTotal())}`)}else{lines.push(`Order total: ${money2(grandTotal())}`)}
  lines.push(`Fulfilment: ${f}`,'Please confirm availability, requested time, delivery charge if applicable, and payment instructions. I will also advise you of any allergies or dietary requirements.');
  return lines.join('\n');
}
function orderEnquiryText(requirement){
  const f={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[fulfil]||'Fulfilment not selected';
  const lines=['Hello Lovely Coffee House, I would like help with this order:',...entries().map(([i,q])=>`${q} x ${products[i].n} — ${money2(products[i].p*q)}`),`Product subtotal: ${money2(total())}`,`Fulfilment requested: ${f}`];
  if(requirement&&requirement.state==='needs-more')lines.push(`Delivery minimum note: I am ${money(requirement.short)} below the ${requirement.label} product-subtotal minimum. This is an enquiry, not a confirmed delivery order.`);
  lines.push('Please advise what I can add to meet the minimum, or whether I should switch to collection. Please also confirm availability, timing, any delivery charge and payment instructions.');
  return lines.join('\n');
}
let checkoutBusy=false;function resetCheckoutBusy(){checkoutBusy=false;const btn=$('#checkout');if(btn){btn.removeAttribute('aria-busy');updateCheckoutState()}}function checkout(options={}){const sameTab=Boolean(options&&options.sameTab);if(checkoutBusy)return{state:'busy'};const req=checkoutRequirement();if(req.state==='empty'){closeCart();setTimeout(goToOrderStart,80);toast('Choose an item to start your order.');return req}if(req.state==='needs-more'){closeCart();setTimeout(()=>{goToOrderStart();toast(`Add ${money(req.short)} more for ${req.label}.`)},100);return req}checkoutBusy=true;const btn=$('#checkout');if(btn){btn.setAttribute('aria-busy','true');btn.disabled=true}openWhatsAppMessage(orderText(),{sameTab});return{state:'opened',fulfil,total:grandTotal()}}

// One deterministic commerce bridge owns all AI cart mutations. The assistant may
// interpret language, but only these validated actions are allowed to change order state.
function lovelyOrderSnapshot(){return{items:entries().map(([i,q])=>({index:Number(i),name:products[i]?.n,qty:Number(q),price:Number(products[i]?.p)||0})),subtotal:total(),total:grandTotal(),fulfil,requirement:checkoutRequirement()}}
function normalizeEngineQty(value,fallback=1){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?Math.min(n,MAX_ITEM_QTY):fallback}
function executeLovelyOrderActions(actions,{source='ai',checkoutSameTab=true}={}){
  if(!Array.isArray(actions)||!actions.length||actions.length>16)return{ok:false,error:'invalid_actions',state:lovelyOrderSnapshot()};
  // Validate and apply to a draft first. A malformed multi-action command can never
  // leave a half-mutated customer order.
  const draftCart={...cart};let draftFulfil=fulfil,changed=false,checkoutRequested=false,enquiryRequested=false,lastAction=null;
  for(const raw of actions){
    if(!raw||typeof raw!=='object')return{ok:false,error:'invalid_action',state:lovelyOrderSnapshot()};
    const type=String(raw.type||'').toUpperCase();
    if(type==='ADD_ITEM'){
      const i=Number(raw.index),p=products[i];if(!Number.isInteger(i)||!p||p.quote||p.p==null)return{ok:false,error:'invalid_product',state:lovelyOrderSnapshot()};
      const qty=Math.max(p.min||1,normalizeEngineQty(raw.quantity,1)),before=Number(draftCart[i]||0),next=Math.min(MAX_ITEM_QTY,before+qty);
      if(next<=before)return{ok:false,error:'item_limit',state:lovelyOrderSnapshot()};draftCart[i]=next;changed=true;lastAction={type,index:i,added:next-before,before,after:next};
    }else if(type==='REMOVE_ITEM'){
      const i=Number(raw.index),p=products[i];if(!Number.isInteger(i)||!p)return{ok:false,error:'invalid_product',state:lovelyOrderSnapshot()};
      const before=Number(draftCart[i]||0);if(before<=0)return{ok:false,error:'item_not_in_order',state:lovelyOrderSnapshot()};const qty=Math.min(before,normalizeEngineQty(raw.quantity,before)),after=before-qty;if(after>0)draftCart[i]=after;else delete draftCart[i];changed=true;lastAction={type,index:i,removed:qty,before,after};
    }else if(type==='SET_QUANTITY'){
      const i=Number(raw.index),p=products[i];if(!Number.isInteger(i)||!p||p.quote||p.p==null)return{ok:false,error:'invalid_product',state:lovelyOrderSnapshot()};
      const before=Number(draftCart[i]||0),qty=normalizeEngineQty(raw.quantity,p.min||1),after=Math.max(p.min||1,qty);draftCart[i]=after;changed=true;lastAction={type,index:i,before,after};
    }else if(type==='SWAP_ITEM'){
      const from=Number(raw.fromIndex),to=Number(raw.toIndex),a=products[from],b=products[to];if(!Number.isInteger(from)||!Number.isInteger(to)||!a||!b||b.quote||b.p==null||from===to)return{ok:false,error:'invalid_swap',state:lovelyOrderSnapshot()};
      const fromBefore=Number(draftCart[from]||0);if(fromBefore<=0)return{ok:false,error:'item_not_in_order',state:lovelyOrderSnapshot()};
      const removeQty=Math.min(fromBefore,normalizeEngineQty(raw.fromQuantity,1)),addQty=Math.max(b.min||1,normalizeEngineQty(raw.toQuantity,removeQty)),toBefore=Number(draftCart[to]||0);
      if(toBefore+addQty>MAX_ITEM_QTY)return{ok:false,error:'item_limit',state:lovelyOrderSnapshot()};const fromAfter=fromBefore-removeQty;if(fromAfter>0)draftCart[from]=fromAfter;else delete draftCart[from];draftCart[to]=toBefore+addQty;changed=true;lastAction={type,fromIndex:from,toIndex:to,fromBefore,toBefore,fromQuantity:removeQty,toQuantity:addQty};
    }else if(type==='SET_FULFILMENT'){
      const value=String(raw.value||'');if(!['collection','delivery','corporate'].includes(value))return{ok:false,error:'invalid_fulfilment',state:lovelyOrderSnapshot()};draftFulfil=value;changed=true;lastAction={type,value};
    }else if(type==='CLEAR_ORDER'){for(const key of Object.keys(draftCart))delete draftCart[key];changed=true;lastAction={type};
    }else if(type==='CHECKOUT_WHATSAPP'){checkoutRequested=true;
    }else if(type==='ENQUIRE_WHATSAPP'){enquiryRequested=true;
    }else return{ok:false,error:'unsupported_action',state:lovelyOrderSnapshot()};
  }
  if(changed){cart=draftCart;fulfil=draftFulfil;saveOrderSession();clearOrderSessionIfEmpty();renderCart()}
  const requirement=checkoutRequirement(),state=lovelyOrderSnapshot();
  if(enquiryRequested){
    if(requirement.state==='empty')return{ok:true,checkout:'blocked',requirement,state,lastAction};
    openWhatsAppMessage(orderEnquiryText(requirement),{sameTab:source==='ai'&&checkoutSameTab});
    return{ok:true,checkout:'enquiry-opened',requirement,state,lastAction};
  }
  if(checkoutRequested){
    if(requirement.state!=='ready')return{ok:true,checkout:'blocked',requirement,state,lastAction};
    const result=checkout({sameTab:source==='ai'&&checkoutSameTab});return{ok:true,checkout:'opened',requirement,state,lastAction,result};
  }
  return{ok:true,checkout:'not-requested',requirement,state,lastAction};
}
window.LovelyOrderEngine=Object.freeze({execute:executeLovelyOrderActions,snapshot:lovelyOrderSnapshot});
function orderEntry(){if(entries().length){openCart();return}goToOrderStart();toast('Choose an item to start your order.')}
function focusCat(cat){active=cat;saveOrderSession();renderCats();renderMenu();const target=document.querySelector('#menu');if(target){const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}}
function goToOrderStart(){const target=document.querySelector('#orderStart');if(!target)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});window.setTimeout(()=>{try{target.focus({preventScroll:true})}catch(e){target.focus()}},reduced?0:420)}
$('#menuTop').onclick=goToOrderStart;$('#topOrder').onclick=orderEntry;$('#startOrder').onclick=goToOrderStart;$('#corpMenu').onclick=()=>focusCat('Corporate');$('#cartPill').onclick=openCart;$('#closeCart').onclick=closeCart;$('#shade').onclick=closeCart;$('#checkout').onclick=checkout;$$('[data-f]').forEach(b=>b.onclick=()=>{fulfil=b.dataset.f;saveOrderSession();$$('[data-f]').forEach(x=>{const selected=x===b;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',selected?'true':'false')});updateCheckoutState()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isCartOpen()){e.preventDefault();closeCart();return}trapCartFocus(e)});const io=(typeof window.IntersectionObserver==='function')?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.10,rootMargin:'0px 0px -4% 0px'}):null;function observeScrollEls(){ $$('.reveal,.scroll-in').forEach(el=>{if(!el.dataset.observed){el.dataset.observed='1';if(io)io.observe(el);else el.classList.add('visible')}}) }const originalRenderMenu=renderMenu;renderMenu=function(){originalRenderMenu();$$('#menuGrid .item').forEach((el,i)=>{el.classList.add('scroll-in');el.style.setProperty('--delay',Math.min(i%8,7)*45+'ms')});observeScrollEls()};let ticking=false;window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.innerWidth>920){const y=Math.min(window.scrollY,760);const heroImg=$('.hero-img');const heroCopy=$('.hero-copy-float');if(heroImg)heroImg.style.transform=`translateY(${y*.028}px)`;if(heroCopy)heroCopy.style.transform=`translateY(${y*.014}px)`}ticking=false})},{passive:true});observeScrollEls();restoreOrderSession();renderCats();renderMenu();renderCart();

const beanLayer=document.querySelector('.beans-layer');
let beansPlayed=false;
function playBeansOnce(){
  if(beansPlayed||!beanLayer||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  beansPlayed=true;
  beanLayer.classList.add('beans-run');
  window.setTimeout(()=>beanLayer.classList.remove('beans-run'),3050);
}
window.addEventListener('scroll',playBeansOnce,{passive:true,once:true});
window.addEventListener('pagehide',saveOrderSession,{capture:false});
window.addEventListener('pageshow',()=>{resetCheckoutBusy();restoreOrderSession();renderCats();renderMenu();renderCart()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetCheckoutBusy()});window.addEventListener('focus',resetCheckoutBusy);


// Production home page: Lovely Rooms is served separately at /rooms/.
