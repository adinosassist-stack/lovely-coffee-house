(function(){
  function closeFaqs(except){
    document.querySelectorAll('details.faq-item[open]').forEach(function(item){
      if(item!==except) item.removeAttribute('open');
    });
  }
  document.querySelectorAll('details.faq-item').forEach(function(item){
    item.addEventListener('toggle',function(){
      if(item.open) closeFaqs(item);
    });
  });
  document.addEventListener('pointerdown',function(event){
    if(!event.target.closest('details.faq-item')) closeFaqs(null);
    var aiPanel=document.getElementById('lovelyAiPanel');
    if(aiPanel && aiPanel.classList.contains('open') &&
       !event.target.closest('#lovelyAiPanel') &&
       !event.target.closest('#lovelyAiLauncher')){
      var aiClose=document.getElementById('lovelyAiClose');
      if(aiClose) aiClose.click();
    }
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape') closeFaqs(null);
  });

  var STORAGE_PREFIX='lovely-';
  var HYDRATION_REMINDER_KEY=STORAGE_PREFIX+'hydration-reminder-v1';
  var HYDRATION_REMINDER_TIME_KEY=STORAGE_PREFIX+'hydration-reminder-time-v1';
  var HYDRATION_REMINDER_LAST_KEY=STORAGE_PREFIX+'hydration-reminder-last-v1';
  var PURCHASE_PENDING_KEY=STORAGE_PREFIX+'purchase-pending-v1';
  var RECOMMENDATIONS_KEY=STORAGE_PREFIX+'recommendations-v1';
  var TWO_WEEKS=14*24*60*60*1000;
  var ONE_DAY=24*60*60*1000;

  function safeGet(key){
    try{return localStorage.getItem(key)||''}catch(_){return''}
  }
  function safeSet(key,value){
    try{localStorage.setItem(key,value);return true}catch(_){return false}
  }
  function safeRemove(key){
    try{localStorage.removeItem(key)}catch(_){}
  }
  function todayKey(d){
    d=d||new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function parseJson(raw){
    try{var value=JSON.parse(raw);return value&&typeof value==='object'?value:null}catch(_){return null}
  }
  function notifyText(text,duration){
    var toast=document.getElementById('toast');
    if(toast){
      toast.textContent=text;
      toast.classList.add('show');
      clearTimeout(toast._lovelyEnhancementTimer);
      toast._lovelyEnhancementTimer=setTimeout(function(){toast.classList.remove('show');},duration||4200);
      return;
    }
    try{window.alert(text)}catch(_){}
  }

  // If a customer speaks to Lovely and voice replies are on, every final bot text should
  // also be spoken. Core TTS is preferred; this fallback only speaks when the core has
  // not already started voice output.
  var voiceBody=document.getElementById('lovelyAiBody');
  var voicePanel=document.getElementById('lovelyAiPanel');
  var voiceToggle=document.getElementById('lovelyAiVoiceToggle');
  var voiceStatus=document.getElementById('lovelyAiVoiceStatus');
  var voiceFallbackSerial=0;
  var voiceFallbackAudio=null;
  var voiceFallbackUtterance=null;

  function coreVoiceBusy(){
    var status=(voiceStatus&&voiceStatus.textContent)||'';
    return Boolean((voicePanel&&voicePanel.classList.contains('is-speaking'))||
      /preparing lovely|lovely is speaking/i.test(status));
  }
  function stopFallbackVoice(){
    voiceFallbackSerial++;
    if(voiceFallbackAudio){
      try{voiceFallbackAudio.pause();voiceFallbackAudio.src=''}catch(_){}
      voiceFallbackAudio=null;
    }
    if(voiceFallbackUtterance&&'speechSynthesis' in window){
      try{window.speechSynthesis.cancel()}catch(_){}
      voiceFallbackUtterance=null;
    }
  }
  function browserSpeakFallback(text){
    if(!('speechSynthesis' in window)||!text)return;
    try{
      var utter=new SpeechSynthesisUtterance(text);
      utter.rate=.96;utter.pitch=1.02;utter.volume=1;
      var voices=window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[];
      var preferred=voices.find(function(v){return /female|samantha|victoria|karen|moira|tessa|zira/i.test((v.name||'')+' '+(v.voiceURI||''))})||
        voices.find(function(v){return /^en[-_]/i.test(v.lang||'')})||voices[0];
      if(preferred)utter.voice=preferred;
      voiceFallbackUtterance=utter;
      utter.onend=utter.onerror=function(){if(voiceFallbackUtterance===utter)voiceFallbackUtterance=null};
      window.speechSynthesis.speak(utter);
    }catch(_){}
  }
  function speakFinalBotText(text){
    text=String(text||'').replace(/\s+/g,' ').trim().slice(0,900);
    if(!text||!voiceToggle||voiceToggle.getAttribute('aria-pressed')!=='true')return;
    if(/^(thinking|checking)[.…]*$/i.test(text))return;
    var serial=++voiceFallbackSerial;
    setTimeout(async function(){
      if(serial!==voiceFallbackSerial||coreVoiceBusy())return;
      try{
        var res=await fetch('/api/lovely-tts',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'audio/mpeg'},
          body:JSON.stringify({text:text})
        });
        if(serial!==voiceFallbackSerial||coreVoiceBusy())return;
        if(!res.ok)throw new Error('tts unavailable');
        var blob=await res.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);
        voiceFallbackAudio=audio;
        var clean=function(){if(voiceFallbackAudio===audio)voiceFallbackAudio=null;URL.revokeObjectURL(url)};
        audio.onended=clean;audio.onerror=function(){clean();browserSpeakFallback(text)};
        await audio.play();
      }catch(_){
        if(serial===voiceFallbackSerial&&!coreVoiceBusy())browserSpeakFallback(text);
      }
    },700);
  }
  if(voiceBody&&window.MutationObserver){
    new MutationObserver(function(records){
      records.forEach(function(record){
        Array.from(record.addedNodes||[]).forEach(function(node){
          if(!node||node.nodeType!==1||!node.classList||!node.classList.contains('lovely-ai-message')||!node.classList.contains('bot')||node.classList.contains('thinking'))return;
          speakFinalBotText(node.textContent||'');
        });
      });
    }).observe(voiceBody,{childList:true});
  }
  if(voiceToggle){
    voiceToggle.addEventListener('click',function(){
      if(voiceToggle.getAttribute('aria-pressed')!=='true')stopFallbackVoice();
    });
  }

  // A safe deterministic general-health knowledge layer. It supplements Lovely AI for
  // common wellness questions without diagnosing, prescribing, or making product claims.
  var originalFetch=window.fetch.bind(window);
  var productWords=/\b(?:focus|thrive|glow|refresh|bloom|unwind|balance|immunity|cappuccino|americano|espresso|latte|mocha|boba|lemonade|smoothie|mineral water|alkaline water|health drink|meeting box|muffin|brownie)\b/i;
  var urgentHealth=/\b(?:chest pain|chest pressure|cannot breathe|can't breathe|trouble breathing|difficulty breathing|severe shortness of breath|choking|face droop|one[- ]sided weakness|slurred speech|unconscious|passed out|seizure|severe bleeding|vomiting blood|coughing blood|overdose|poison(?:ed|ing)|severe allergic|anaphyl|suicid|kill myself|self[- ]?harm|want to die|sudden worst headache|confusion and faint|heat stroke)\b/i;

  function generalHealthAnswer(raw){
    var q=String(raw||'').toLowerCase().replace(/[’]/g,"'");
    if(!q||urgentHealth.test(q)||productWords.test(q))return'';
    if(/\b(?:sleep|insomnia|can't sleep|cannot sleep|sleeping|bedtime)\b/.test(q)){
      return 'For better sleep, keep a fairly regular sleep and wake time, make the room dark and comfortable, wind down before bed, and avoid heavy meals or caffeine close to bedtime. Daytime activity can help sleep quality. If poor sleep is persistent, severe, or affecting safety and daily function, speak with a qualified health professional.';
    }
    if(/\b(?:stress|stressed|anxiety|anxious|overwhelmed|relax|relaxation)\b/.test(q)){
      return 'For everyday stress, simple steps can include slow breathing, a short walk or movement break, regular meals, enough sleep, and talking with someone you trust. Reduce caffeine if it makes you shaky or more anxious. If anxiety or low mood is persistent, worsening, or affecting daily life, a qualified health professional can help.';
    }
    if(/\b(?:exercise|workout|fitness|recovery|muscle soreness|sore muscles)\b/.test(q)){
      return 'General exercise basics are to build activity gradually, warm up, stay hydrated, eat regular balanced meals, and allow recovery between harder sessions. Mild muscle soreness after unfamiliar exercise can happen, but severe pain, fainting, chest pain, or unusual breathing difficulty needs medical attention.';
    }
    if(/\b(?:balanced diet|healthy diet|nutrition|protein|fibre|fiber|fruit|vegetable|whole grain|healthy eating|meal)\b/.test(q)){
      return 'A balanced eating pattern usually includes a variety of vegetables and fruit, whole-grain or other high-fibre starches, protein foods, and enough water, while keeping highly sugary foods and drinks more occasional. Needs vary by age, activity, pregnancy, and medical conditions, so personalised diets are best discussed with a qualified professional.';
    }
    if(/\b(?:heat|hot weather|sun|very hot|sweating)\b/.test(q)){
      return 'In hot weather, drink fluids regularly, use shade or a cooler space, wear light clothing, and reduce strenuous activity during the hottest part of the day. Heavy sweating can increase fluid needs. Confusion, fainting, severe weakness, or rapidly worsening heat illness needs urgent medical help.';
    }
    if(/\b(?:hydrat|dehydrat|thirst|drink water|how much water|fluid)\b/.test(q)){
      return 'Hydration needs vary with body size, food, heat, activity, pregnancy, and sweating, so there is no single amount that fits everyone. Drink water regularly and use thirst plus urine colour as rough day-to-day cues; very dark urine can be a sign you need more fluid. If a clinician has given you a fluid limit, follow that individual plan.';
    }
    if(/\b(?:caffeine|coffee makes|energy|alertness)\b/.test(q)){
      return 'Caffeine can temporarily improve alertness, but sensitivity varies and too much can cause jitteriness, a fast heartbeat, stomach discomfort, anxiety, or poor sleep. If sleep is affected, having caffeine earlier in the day or reducing the amount can help. Follow any clinician-set caffeine limit.';
    }
    if(/\b(?:reflux|heartburn|acid reflux|indigestion)\b/.test(q)){
      return 'For occasional reflux or heartburn, smaller meals, avoiding lying down soon after eating, and noticing personal triggers such as very fatty, spicy, acidic, or caffeinated foods can help. Persistent symptoms, trouble swallowing, vomiting blood, black stools, or unexplained weight loss should be assessed by a health professional.';
    }
    if(/\b(?:constipat|hard stool)\b/.test(q)){
      return 'For occasional constipation, regular fluids, gradual increases in fibre-rich foods, movement, and a consistent toilet routine can help. Increase fibre gradually because a sudden increase can cause bloating. Severe abdominal pain, vomiting, blood in stool, or persistent constipation needs medical assessment.';
    }
    if(/\b(?:diarrh|stomach bug|vomit|vomiting|nausea)\b/.test(q)){
      return 'With mild short-lived stomach upset, the priority is usually small frequent sips of fluid and rest, then simple foods as tolerated. Watch for signs of dehydration. Blood in vomit or stool, severe abdominal pain, inability to keep fluids down, confusion, or symptoms that are persistent or worsening need medical care.';
    }
    if(/\b(?:cold|flu|cough|sore throat|runny nose|fever)\b/.test(q)){
      return 'For a mild cold or flu-like illness, rest, fluids, and simple comfort measures can help while the body recovers. Seek medical advice if symptoms are severe, worsening, persistent, or you are in a higher-risk group. Serious breathing difficulty, chest pain, confusion, or dehydration needs urgent attention.';
    }
    if(/\b(?:headache|migraine)\b/.test(q)){
      return 'For an ordinary mild headache, rest, water, regular meals, and reducing obvious triggers such as missed sleep may help. A sudden extremely severe headache, headache after a serious injury, or headache with weakness, speech problems, confusion, fainting, or severe illness needs urgent medical assessment.';
    }
    if(/\b(?:allerg|food allergy|ingredient reaction)\b/.test(q)){
      return 'For allergies or strict diets, check the exact ingredient and supplier labels and ask about cross-contact before ordering. A severe allergic reaction with breathing difficulty, throat or tongue swelling, collapse, or rapidly worsening symptoms is an emergency and needs urgent medical help.';
    }
    if(/\b(?:pregnan|breastfeed|breastfeeding)\b/.test(q)){
      return 'During pregnancy or breastfeeding, food, caffeine, supplements, and medicines can have individual considerations. Use exact ingredient labels and follow guidance from your clinician or pharmacist rather than relying on a café assistant to decide what is medically suitable.';
    }
    if(/\b(?:tired|fatigue|fatigued|low energy)\b/.test(q)){
      return 'Tiredness can have many everyday causes, including poor sleep, stress, missed meals, dehydration, or heavy activity. Regular sleep, balanced meals, fluids, and pacing activity are reasonable basics. Persistent, unexplained, or severe fatigue should be discussed with a qualified health professional.';
    }
    return'';
  }

  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var local='';
    if(/\/api\/lovely-ai(?:$|[?#])/.test(url)&&init&&typeof init.body==='string'){
      try{
        var payload=JSON.parse(init.body);
        local=generalHealthAnswer(payload&&payload.question);
      }catch(_){}
    }
    if(!local)return originalFetch(input,init);
    try{
      var response=await originalFetch(input,init);
      var headers=new Headers(response.headers);
      headers.set('Content-Type','application/json; charset=utf-8');
      headers.set('Cache-Control','no-store');
      return new Response(JSON.stringify({answer:local}),{status:200,headers:headers});
    }catch(_){
      return new Response(JSON.stringify({answer:local}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
    }
  };

  // Improve hydration reminders: the core assistant checks every five minutes while active.
  // These hooks make a missed reminder catch up immediately when the customer returns.
  async function hydrationCatchUp(){
    if(safeGet(HYDRATION_REMINDER_KEY)!=='1')return;
    var raw=safeGet(HYDRATION_REMINDER_TIME_KEY)||'10:00';
    var parts=raw.split(':').map(Number),now=new Date();
    if(parts.length!==2||!parts.every(Number.isFinite))return;
    if(now.getHours()*60+now.getMinutes()<parts[0]*60+parts[1])return;
    var today=todayKey(now);
    if(safeGet(HYDRATION_REMINDER_LAST_KEY)===today)return;
    safeSet(HYDRATION_REMINDER_LAST_KEY,today);
    var text='Hydration check-in: have some water when it suits you. Heat, activity and sweating can increase fluid needs; follow any clinician-set fluid limit.';
    try{
      if('Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker){
        var reg=await navigator.serviceWorker.ready;
        if(reg&&reg.showNotification){
          await reg.showNotification('Lovely hydration reminder',{body:text,icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:'lovely-hydration-daily',renotify:false,data:{url:'/'}});
          return;
        }
      }
    }catch(_){}
    notifyText(text,5200);
  }
  window.addEventListener('focus',hydrationCatchUp);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)hydrationCatchUp()});
  setTimeout(hydrationCatchUp,900);

  // WhatsApp handoff + purchase confirmation. A handoff is not treated as a completed
  // purchase. The customer confirms completion on their next return before personalised
  // biweekly recommendations are enabled.
  var engine=window.LovelyOrderEngine;
  var handoffPending=false;

  function snapshotItems(snapshot){
    var list=(snapshot&&Array.isArray(snapshot.items)&&snapshot.items)||
      (snapshot&&Array.isArray(snapshot.order)&&snapshot.order)||[];
    return list.map(function(item){
      var name=String((item&&item.name)||(item&&item.n)||'').trim();
      var qty=Number((item&&item.qty)||(item&&item.quantity)||1);
      return name?{name:name,qty:Number.isFinite(qty)&&qty>0?Math.floor(qty):1}:null;
    }).filter(Boolean).slice(0,20);
  }
  function rememberPendingPurchase(snapshot){
    var items=snapshotItems(snapshot);
    if(!items.length)return;
    safeSet(PURCHASE_PENDING_KEY,JSON.stringify({
      createdAt:Date.now(),
      items:items,
      total:Number(snapshot&&snapshot.total)||0
    }));
  }
  function showWhatsAppSendCue(){
    var text='WhatsApp is opening with your order ready. Tap Send to confirm it with Lovely Coffee House.';
    var body=document.getElementById('lovelyAiBody');
    if(body){
      var messages=body.querySelectorAll('.lovely-ai-message.bot');
      var last=messages[messages.length-1];
      if(last && /opening WhatsApp/i.test(last.textContent||'')) last.textContent=text;
    }
    notifyText(text,3200);
  }
  if(engine && typeof engine.execute==='function' && typeof engine.snapshot==='function' && !engine.__lovelyCustomerCareV2){
    var baseEngine=engine;
    var originalExecute=baseEngine.execute.bind(baseEngine);
    var snapshotFn=baseEngine.snapshot.bind(baseEngine);
    var wrappedExecute=function(actions,options){
      var hasCheckout=Array.isArray(actions)&&actions.some(function(action){return action&&action.type==='CHECKOUT_WHATSAPP'});
      var purchaseSnapshot=hasCheckout?snapshotFn():null;
      if(purchaseSnapshot&&purchaseSnapshot.requirement&&purchaseSnapshot.requirement.state==='ready')rememberPendingPurchase(purchaseSnapshot);
      var opts=options||{};
      var aiCheckout=hasCheckout&&opts.source==='ai'&&opts.checkoutSameTab===true;
      if(!aiCheckout)return originalExecute(actions,options);
      if(handoffPending){
        var current=snapshotFn();
        return {ok:true,checkout:'handoff-pending',state:current,requirement:current&&current.requirement};
      }
      handoffPending=true;
      showWhatsAppSendCue();
      var snapshot=snapshotFn();
      setTimeout(function(){
        handoffPending=false;
        originalExecute(actions,options);
      },1200);
      return {ok:true,checkout:'handoff-pending',state:snapshot,requirement:snapshot&&snapshot.requirement};
    };
    window.LovelyOrderEngine=Object.freeze({execute:wrappedExecute,snapshot:snapshotFn,__lovelyCustomerCareV2:true});
    engine=window.LovelyOrderEngine;
    var manualCheckout=document.getElementById('checkout');
    if(manualCheckout)manualCheckout.addEventListener('click',function(){
      var current=snapshotFn();
      if(current&&current.requirement&&current.requirement.state==='ready')rememberPendingPurchase(current);
    },true);
  }

  var popup=null;
  var popupReturnFocus=null;
  function closePopup(){
    if(!popup)return;
    var node=popup;popup=null;
    try{if(node.open&&typeof node.close==='function')node.close()}catch(_){}
    node.remove();
    if(popupReturnFocus&&document.contains(popupReturnFocus)){try{popupReturnFocus.focus()}catch(_){} }
    popupReturnFocus=null;
  }
  function showPopup(title,text,actions,small){
    closePopup();
    popupReturnFocus=document.activeElement;
    var dialog=document.createElement('dialog');
    dialog.className='lovely-customer-popup';
    dialog.setAttribute('aria-label',title);
    var h=document.createElement('h3');h.textContent=title;
    var p=document.createElement('p');p.textContent=text;
    dialog.append(h,p);
    if(small){var s=document.createElement('p');s.textContent=small;dialog.appendChild(s)}
    var row=document.createElement('div');row.className='actions';
    (actions||[]).forEach(function(action,index){
      var b=document.createElement('button');b.type='button';b.textContent=action.label;b.className=index===0?'btn dark':'btn';
      b.addEventListener('click',function(){var fn=action.onClick;closePopup();if(fn)fn()});
      row.appendChild(b);
    });
    dialog.appendChild(row);document.body.appendChild(dialog);popup=dialog;
    dialog.addEventListener('cancel',function(e){e.preventDefault();closePopup()});
    dialog.addEventListener('click',function(e){if(e.target===dialog)closePopup()});
    if(typeof dialog.showModal==='function'){dialog.showModal();setTimeout(function(){var first=dialog.querySelector('button');if(first)first.focus()},0);return}
    var primary=(actions||[])[0],accepted=window.confirm(title+'\n\n'+text+(small?'\n\n'+small:''));
    closePopup();if(accepted&&primary&&primary.onClick)primary.onClick();
  }

  function productRecommendation(items,cycle){
    var names=(items||[]).map(function(x){return String(x.name||'').toLowerCase()}).join(' ');
    var options;
    if(/meeting|corporate|training|breakfast box/.test(names)){
      options=[
        {name:'Coffee Meeting Box — 10',price:'P590',copy:'A ready-to-share option for the next office meeting.'},
        {name:'Small Coffee Meeting Box — 6',price:'P360',copy:'A compact fixed-price coffee-and-muffin meeting option for six people.'}
      ];
    }else if(/boba|milk tea|popping/.test(names)){
      options=[
        {name:'Boba + Muffin',price:'P55',copy:'Pair a fixed-price boba drink with a muffin next time.'},
        {name:'Lovely Pink Lemonade',price:'P35',copy:'A chilled fruit-forward option for a different kind of treat.'}
      ];
    }else if(/hydration|mineral water|alkaline water|focus|thrive|glow|refresh|bloom|unwind|balance|immunity/.test(names)){
      options=[
        {name:'Mango-Yoghurt Smoothie',price:'P48',copy:'A creamy fruit-and-yoghurt option for your next visit.'},
        {name:'Coffee + Muffin',price:'P49',copy:'A simple coffee-and-bake bundle when you want something different.'}
      ];
    }else if(/muffin|brownie|cookie|cake|break box/.test(names)){
      options=[
        {name:'Cappuccino',price:'P35',copy:'A classic coffee pairing for your next bake.'},
        {name:'Lovely Break Box',price:'P140',copy:'A mixed bake box when you want something to share.'}
      ];
    }else if(/lemonade|iced|cooler|summer/.test(names)){
      options=[
        {name:'Boba + Muffin',price:'P55',copy:'A cold drink-and-bake combo for the next order.'},
        {name:'Tropical Mango Cooler',price:'P38',copy:'Another chilled option from the summer menu.'}
      ];
    }else{
      options=[
        {name:'Coffee + Muffin',price:'P49',copy:'A simple bundle for your next coffee break.'},
        {name:'Blackcurrant & Acai Hydration',price:'P25',copy:'A blackcurrant-and-acai health drink with its listed ingredients shown in the menu.'}
      ];
    }
    return options[Math.abs(Number(cycle)||0)%options.length];
  }
  function saveConfirmedPurchase(pending,enable){
    var existing=parseJson(safeGet(RECOMMENDATIONS_KEY))||{};
    var purchases=Array.isArray(existing.purchases)?existing.purchases.slice(-5):[];
    purchases.push({at:Date.now(),items:pending.items||[]});
    var next={
      enabled:enable===true,
      purchases:purchases.slice(-6),
      lastItems:pending.items||[],
      nextAt:enable===true?Date.now()+TWO_WEEKS:0,
      cycle:Number(existing.cycle)||0
    };
    safeSet(RECOMMENDATIONS_KEY,JSON.stringify(next));
  }
  function askRecommendationOptIn(pending){
    showPopup(
      'A little Lovely follow-up?',
      'Would you like one short product recommendation every two weeks on this device, based on your Lovely orders?',
      [
        {label:'TURN ON',onClick:function(){saveConfirmedPurchase(pending,true);notifyText('Biweekly Lovely recommendations are on. You can turn them off from any recommendation.',3600)}},
        {label:'NO THANKS',onClick:function(){saveConfirmedPurchase(pending,false)}}
      ],
      'On-screen only. No phone number is collected and nothing is sent when the site or PWA is fully closed.'
    );
  }
  function maybeAskPurchaseConfirmation(){
    if(popup)return;
    var pending=parseJson(safeGet(PURCHASE_PENDING_KEY));
    if(!pending||!Array.isArray(pending.items)||!pending.items.length)return;
    var age=Date.now()-Number(pending.createdAt||0);
    if(age<60*1000){setTimeout(maybeAskPurchaseConfirmation,Math.max(1200,60*1000-age+800));return}
    if(age>14*ONE_DAY){safeRemove(PURCHASE_PENDING_KEY);return}
    if(Number(pending.remindAfter||0)>Date.now())return;
    showPopup(
      'Did you complete your Lovely order?',
      'We opened WhatsApp with your order. Did you finish and send that order to Lovely Coffee House?',
      [
        {label:'YES, I ORDERED',onClick:function(){safeRemove(PURCHASE_PENDING_KEY);askRecommendationOptIn(pending)}},
        {label:'NOT YET',onClick:function(){pending.remindAfter=Date.now()+ONE_DAY;safeSet(PURCHASE_PENDING_KEY,JSON.stringify(pending))}}
      ],
      'We ask because opening WhatsApp does not by itself prove that a purchase was completed.'
    );
  }
  function maybeShowRecommendation(){
    if(popup)return;
    var prefs=parseJson(safeGet(RECOMMENDATIONS_KEY));
    if(!prefs||prefs.enabled!==true)return;
    if(Number(prefs.nextAt||0)>Date.now())return;
    var rec=productRecommendation(prefs.lastItems,prefs.cycle);
    if(!rec)return;
    prefs.cycle=(Number(prefs.cycle)||0)+1;
    prefs.nextAt=Date.now()+TWO_WEEKS;
    safeSet(RECOMMENDATIONS_KEY,JSON.stringify(prefs));
    showPopup(
      'A Lovely pick for you',
      rec.name+' · '+rec.price+'. '+rec.copy,
      [
        {label:'VIEW MENU',onClick:function(){var menu=document.getElementById('menu');if(menu)menu.scrollIntoView({behavior:'smooth',block:'start'})}},
        {label:'NOT NOW'},
        {label:'TURN OFF',onClick:function(){var p=parseJson(safeGet(RECOMMENDATIONS_KEY))||{};p.enabled=false;safeSet(RECOMMENDATIONS_KEY,JSON.stringify(p));notifyText('Biweekly recommendations are off.',3000)}}
      ],
      'Based only on purchase confirmations saved on this device.'
    );
  }
  function runCustomerCare(){
    hydrationCatchUp();
    maybeAskPurchaseConfirmation();
    if(!popup)maybeShowRecommendation();
  }
  window.addEventListener('pageshow',function(){setTimeout(runCustomerCare,1200)});
  window.addEventListener('focus',function(){setTimeout(function(){if(!popup){maybeAskPurchaseConfirmation();if(!popup)maybeShowRecommendation()}},700)});
  setTimeout(runCustomerCare,1600);
})();
