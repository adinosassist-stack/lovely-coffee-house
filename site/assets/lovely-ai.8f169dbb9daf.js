(function(){
  const launcher=document.getElementById('lovelyAiLauncher');
  const panel=document.getElementById('lovelyAiPanel');
  const closeBtn=document.getElementById('lovelyAiClose');
  const body=document.getElementById('lovelyAiBody');
  const form=document.getElementById('lovelyAiForm');
  const input=document.getElementById('lovelyAiInput');
  const mic=document.getElementById('lovelyAiMic');
  const voiceToggle=document.getElementById('lovelyAiVoiceToggle');
  const wakeToggle=document.getElementById('lovelyAiWakeToggle');
  const voiceStatus=document.getElementById('lovelyAiVoiceStatus');
  const connection=document.getElementById('lovelyAiConnection');
  if(!launcher||!panel||!body||!form||!input||!mic||!voiceToggle||!wakeToggle||!voiceStatus) return;

  const standaloneMode=location.protocol==='file:'||location.origin==='null';

  const CLIENT_ID_KEY='lovely-client-id-v1';
  function lovelyClientId(){
    let id='';
    try{id=localStorage.getItem(CLIENT_ID_KEY)||''}catch(_){}
    if(!/^[A-Za-z0-9_-]{16,80}$/.test(id)){
      if(window.crypto&&typeof window.crypto.randomUUID==='function')id=window.crypto.randomUUID().replace(/-/g,'');
      else id=('lc'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,48);
      try{localStorage.setItem(CLIENT_ID_KEY,id)}catch(_){}
    }
    return id;
  }
  function apiHeaders(extra={}){return Object.assign({'X-Lovely-Client':lovelyClientId()},extra)}

  let conversation=[];
  let voiceReplyEnabled=false;
  let recognition=null;
  let isListening=false;
  let currentSpeech=null;
  let currentAudio=null;
  let speechAbort=null;
  let fallbackRecorder=null;
  let fallbackStream=null;
  let fallbackChunks=[];
  let fallbackRecording=false;
  let fallbackTimer=null;
  let experience={mode:null,step:null,data:{}};
  let cloudAvailable=null;
  let cloudCheckPromise=null;
  let cloudCheckController=null;
  let cloudCheckToken=0;
  let aiRequestBusy=false;
  let aiAbortController=null;
  let lastProductIndex=null;
  let wakeRecognition=null;
  let wakeEnabled=false;
  let wakeListening=false;
  let wakeRestartTimer=null;
  let handsFreeConversation=false;
  let handsFreeIdleCycles=0;
  let lastVoiceFingerprint='';
  let lastVoiceAt=0;
  let lastSpokenReply='';
  let lastSpeechStartedAt=0;
  let bargeInTimer=null;
  let bargePauseActive=false;
  let bargePausedAudio=null;
  let bargePausedSynth=false;
  let orderFollowupPending=false;
  let aiFulfilmentConfirmed=false;
  let aiRequestSerial=0;
  let lastOrderAction=null;
  let hydrationTimer=null;
  const WAKE_SESSION_KEY='lovely-hey-wake-v1';
  const HYDRATION_REMINDER_KEY='lovely-hydration-reminder-v1';
  const HYDRATION_REMINDER_TIME_KEY='lovely-hydration-reminder-time-v1';
  const HYDRATION_REMINDER_LAST_KEY='lovely-hydration-reminder-last-v1';

  function setConnection(state,text){
    if(!connection) return;
    connection.dataset.state=state;
    connection.lastChild.textContent=text;
  }
  function cancelCloudCheck(){
    cloudCheckToken++;
    if(cloudCheckController){try{cloudCheckController.abort()}catch(_){}cloudCheckController=null}
    cloudCheckPromise=null;
  }
  async function checkCloud(force=false){
    if(standaloneMode){cancelCloudCheck();cloudAvailable=false;setConnection('basic','Menu guide mode');return false}
    if(navigator.onLine===false){cancelCloudCheck();cloudAvailable=false;setConnection('basic','Offline menu guide');return false}
    if(cloudCheckPromise&&!force) return cloudCheckPromise;
    if(force) cancelCloudCheck();
    const token=++cloudCheckToken;
    const controller=new AbortController();cloudCheckController=controller;
    cloudCheckPromise=(async()=>{
      const timer=setTimeout(()=>controller.abort(),2500);
      try{
        const res=await fetch('/api/lovely-status',{headers:apiHeaders({'Accept':'application/json'}),signal:controller.signal,cache:'no-store'});
        if(!res.ok) throw new Error('status unavailable');
        const data=await res.json();
        if(token!==cloudCheckToken||navigator.onLine===false)return cloudAvailable===true;
        cloudAvailable=Boolean(data&&data.ai);
        setConnection(cloudAvailable?'online':'basic',cloudAvailable?'AI concierge online':'Menu guide mode');
        return cloudAvailable;
      }catch(err){
        if(token!==cloudCheckToken)return false;
        cloudAvailable=false;
        setConnection('basic',navigator.onLine===false?'Offline menu guide':'Menu guide mode');
        return false;
      }finally{
        clearTimeout(timer);
        if(token===cloudCheckToken){cloudCheckController=null;cloudCheckPromise=null}
      }
    })();
    return cloudCheckPromise;
  }
  function clearExperienceUI(){
    body.querySelectorAll('.lovely-ai-experience').forEach(el=>el.remove());
  }
  function resetExperience({quiet=false}={}){
    clearExperience();clearExperienceUI();
    if(!quiet)addMessage('You’re back in general concierge mode. Ask me anything about the menu or ordering.','bot');
  }

  const localAnswers={
    coffee:`Coffee guide\nEspresso is the shortest and most concentrated coffee on our menu. Americano is espresso with hot water. Cappuccino is milk-based with more foam. Café Latte is smoother and more milk-forward. Mocha adds chocolate. Coffee naturally contains caffeine; the exact caffeine amount varies with preparation. Caffeine can support temporary alertness, but individual sensitivity varies.`,
    health:`Health & wellness drinks
Lovely functional hydration includes these flavour and nutrient profiles: Blackcurrant & Acai — THRIVE (B1 + B3); Peach — GLOW (vitamin C + B3); Fresh Lemon — IMMUNITY (vitamins C + D + B12; the listed recipe also includes zinc); Cucumber, Yuzu & Mint — REFRESH (vitamin C + B12); Elderflower & Lychee — BLOOM (B1 + B3); Red Fruits & Mint — FOCUS (vitamin D + caffeine; 25 mg/100 ml finished drink); Mango & Guava — UNWIND (vitamins C, B5, B6, biotin + B12); Raspberry & Pomegranate — BALANCE (vitamins E, B5, B6, biotin + B12). All eight functional drinks are P25. Mineral Water remains P15 and Alkaline Water P20. Ingredients follow the listed recipes in the menu. These product-profile names are not medical claims and the drinks are not presented as treatments, detox products or disease-prevention products. FOCUS contains 25 mg caffeine per 100 ml finished drink and is not recommended for children, pregnant or breastfeeding customers, or people who should avoid caffeine.`,
    hydration:`Hydration guide\nDrink water regularly across the day rather than forcing one fixed amount on everyone. Fluid needs vary with body size, diet, heat, humidity, activity and sweating, and they can also vary with pregnancy and health conditions. In Botswana heat or during exercise, you may need more fluid than on a cool, quiet day. If a clinician has given you a fluid restriction or a specific intake target, follow that individual plan instead of generic hydration advice.`,
    caffeine:`Caffeine guide\nCoffee and tea naturally contain caffeine, but the exact amount varies with beans or tea, serving size and preparation. Lovely's FOCUS functional drink is the one menu item with a stated caffeine amount: 25 mg per 100 ml finished drink. FOCUS is not recommended for children, pregnant or breastfeeding customers, or people who should avoid caffeine; if you have a clinician-set caffeine limit, follow it.`,
    smoothies:`Smoothies\nMango-Yoghurt Smoothie is the fixed-price smoothie currently shown on the menu. Seasonal options include Berry-Mint Yoghurt and Green Mango & Ginger. Yoghurt can provide protein and calcium; fruit can contribute vitamins and fibre depending on the recipe. Fruit and yoghurt naturally contain sugars.`,
    water:`Water\n500 ml Mineral Water is P15 and 500 ml Alkaline Water is P20. Both support normal hydration. The alkaline water brand, pH and mineral composition may vary, so confirm the bottle label for exact details; no medical or detox claims are made.`,
    corporate:`Corporate orders\nEvery corporate item now shows its ingredients directly in the menu. Fixed Coffee Meeting Boxes include a seasonal fruit portion per person and are P360 for 6, P590 for 10 and P1160 for 20. Quote-based boxes show their ingredients, while final configuration, upgrades, delivery timing and price are confirmed on WhatsApp.`
  };

  const benefitFacts=[
    {re:/blackcurrant.*acai|acai|\bthrive\b/i,text:'THRIVE is Blackcurrant & Acai at P25 with vitamins B1 and B3, plus hibiscus and green-tea extracts in the listed recipe.'},
    {re:/peach hydration|peach water|\bglow\b/i,text:'GLOW is Peach at P25 with vitamin C and B3 in the listed recipe.'},
    {re:/fresh lemon hydration|lemon hydration|\bimmunity\b/i,text:'IMMUNITY is Fresh Lemon at P25 with vitamins C, D and B12; the listed recipe also includes zinc. The name is a product profile, not a medical claim.'},
    {re:/cucumber.*yuzu|yuzu|\brefresh\b/i,text:'REFRESH is Cucumber, Yuzu & Mint at P25 with vitamin C and B12. It follows the low-sugar, artificial-sweetener-free profile.'},
    {re:/elderflower.*lychee|lychee|\bbloom\b/i,text:'BLOOM is Elderflower & Lychee at P25 with vitamins B1 and B3. It follows the low-sugar, artificial-sweetener-free profile.'},
    {re:/red fruits?.*mint|red fruit|\bfocus\b/i,text:'FOCUS is Red Fruits & Mint at P25 with vitamin D and 25 mg caffeine per 100 ml finished drink. It is not recommended for children, pregnant or breastfeeding customers, or people who should avoid caffeine.'},
    {re:/mango.*guava|guava|\bunwind\b/i,text:'UNWIND is Mango & Guava at P25. The listed recipe includes vitamins C, B5, B6, biotin and B12. UNWIND is the product profile name; it is not a medical treatment or a guarantee of relaxation.'},
    {re:/raspberry.*pomegranate|pomegranate|\bbalance\b/i,text:'BALANCE is Raspberry & Pomegranate at P25 with vitamins E, B5, B6, biotin and B12 in the listed recipe. BALANCE is the product profile name rather than a guaranteed medical effect.'},
    {re:/mango.?yoghurt|mango yogurt/i,text:'Mango-Yoghurt Smoothie combines fruit with yoghurt. Yoghurt can provide protein and calcium, while mango can contribute vitamins. It also contains naturally occurring sugars, and exact nutrition depends on the recipe and portion.'},
    {re:/green mango.*ginger|ginger smoothie/i,text:'Green Mango & Ginger Smoothie is a fruit-and-yoghurt style seasonal option. Fruit can contribute vitamins and yoghurt can provide protein and calcium. Ginger is commonly used for flavour and digestive comfort, but the drink is food rather than medical treatment.'},
    {re:/mineral water/i,text:'Mineral water supports normal hydration. Its exact mineral profile varies by bottle or source, so check the bottle label when specific minerals matter.'},
    {re:/alkaline water/i,text:'Alkaline water supports normal hydration like other drinking water. Brand, pH and mineral composition may vary, and it is not presented as a treatment, detox product or disease-prevention product.'}
  ];

  function canonicalProductText(value){
    return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function productMatch(q){
    const normalized=canonicalProductText(q);
    const list=products;
    const boxCount=(normalized.match(/\b(6|10|20)\b/)||[])[1];
    if(boxCount&&/coffee meeting box/.test(normalized)){
      const counted=list.find(p=>canonicalProductText(p.n).includes('coffee meeting box '+boxCount));
      if(counted)return counted;
    }
    const exact=list.filter(p=>{const name=canonicalProductText(p.n),profile=canonicalProductText(p.k||'');return (name&&normalized.includes(name))||(profile&&profile.split(' ')[0]&&normalized.includes(profile.split(' ')[0]));}).sort((a,b)=>canonicalProductText(b.n).length-canonicalProductText(a.n).length)[0];
    if(exact) return exact;
    const words=normalized.split(/\s+/).filter(w=>w.length>3);
    let best=null,bestScore=0,bestNameLen=0;
    for(const p of list){
      const hay=canonicalProductText(p.n+' '+(p.k||'')+' '+p.s);
      const score=words.reduce((n,w)=>n+(hay.includes(w)?1:0),0),nameLen=canonicalProductText(p.n).length;
      if(score>bestScore||(score===bestScore&&score>0&&nameLen>bestNameLen)){best=p;bestScore=score;bestNameLen=nameLen}
    }
    return bestScore>=2?best:null;
  }
  function isProductInfoQuery(raw){
    const q=String(raw||'').toLowerCase();
    return /ingredient|contain|what is in|what's in|what comes|comes with|include|contents?|inside|allerg|dairy|milk|gluten|egg|nut|vegan|vegetarian|price|cost|how much|caffeine|decaf|stimulant|sugar|sweetener|vitamin|nutrient|pregnan|breastfeed/.test(q);
  }
  function isBroadProductHealthJudgement(raw){
    const q=String(raw||'').toLowerCase();
    return /healthy|healthiest|good for|bad for|benefit|better for|best for|safe for|suitable for|help with|helps with|treat|cure|prevent|detox|weight loss|immune|immunity/.test(q);
  }

  function caffeineStatus(product){
    if(!product)return '';
    const text=(String(product.n||'')+' '+String(product.k||'')+' '+String(product.s||'')).toLowerCase();
    if(/red fruits.*mint|\bfocus\b/.test(text)) return 'FOCUS contains 25 mg caffeine per 100 ml finished drink. It is not recommended for children, pregnant or breastfeeding customers, or people who should avoid caffeine.';
    if(/espresso|coffee beans|\bcoffee\b|black tea|brewed tea|\btea\b/.test(text)) return 'This item contains a coffee- or tea-based caffeine source. The exact caffeine amount varies with preparation and serving size unless the product label states it.';
    if(/chocolate|cocoa/.test(text)) return 'The listed recipe has no quantified caffeine value; chocolate or cocoa can contain some caffeine depending on the mix, so confirm the exact product label if strict avoidance matters.';
    return 'No caffeine ingredient is specifically listed in the approved recipe. If you need strict caffeine avoidance, confirm the exact product-label details before ordering.';
  }
  function isBroadHydrationQuestion(q){return /how much (?:water|fluid)|how often.*(?:water|drink)|drink.*water.*day|daily water|hydration.*day|stay hydrated|dehydrat|thirst|heat|hot weather|exercise|activity|sweat|fluid restriction/.test(String(q||'').toLowerCase())}
  function isUrgentHealthQuestion(q){
    const x=String(q||'').toLowerCase();
    return /(?:chest (?:pain|pressure|tightness)|heart attack|trouble breathing|difficulty breathing|can(?:not|'t) breathe|severe shortness of breath|choking|face droop|one[- ]sided weakness|sudden weakness|slurred speech|stroke symptoms?|sudden severe headache|worst headache|severe allergic reaction|anaphyl|swollen tongue|swollen throat|unconscious|passed out|faint(?:ed|ing)? and not waking|seizure|heavy bleeding|severe bleeding|vomit(?:ing)? blood|cough(?:ing)? blood|black tarry stool|severe burn|electrocution|overdose|poison(?:ed|ing)|suicid|kill myself|self[- ]?harm)/.test(x);
  }
  function isGeneralHealthSideQuestion(q){
    const x=String(q||'').toLowerCase().replace(/[’]/g,"'");
    const ordering=/\b(?:add|order|buy|get|give me|i(?:'d| would)? like|i want|can i have|put)\b/.test(x);
    if(ordering&&matchOrderProduct(q))return false;
    if(isUrgentHealthQuestion(x))return true;
    if(/\b(?:health|healthy|wellness|medical|medicine|medication|drug|symptom|disease|condition|doctor|clinician|pharmacist|infection|fever|temperature|pain|ache|hurt|sore|swollen|swelling|rash|itch|cough|cold|flu|headache|migraine|faint|nausea|stomach|abdomen|reflux|heartburn|chest|breath|asthma|blood pressure|hypertension|blood sugar|diabetes|kidney|heart|liver|cholesterol|sleep|insomnia|tired|fatigue|stress|anxiety|mental health|exercise|workout|fitness|muscle|joint|back|neck|skin|period|menstrual|sexual health|vitamin|mineral|nutrient|nutrition|calorie|protein|fibre|fiber|weight|diet|water|fluid|thirst|caffeine|sugar|sweetener|heat|sun|burn|first aid)\b|\b(?:pregnan\w*|breastfeed\w*|allerg\w*|dizz\w*|vomit\w*|diarrh\w*|constipat\w*|depress\w*|contracept\w*|hydrat\w*|dehydrat\w*)/.test(x))return true;
    return /(?:why|what|how|is it normal|should i|can i|could i|do i need|what causes|what helps|what should).{0,45}(?:feel|feeling|body|health|pain|ache|hurt|sleep|eat|drink|exercise|symptom|sick|ill|tired|dizzy|nauseous|stressed|anxious)/.test(x);
  }
  function isKnowledgeSideTurn(raw){
    const x=String(raw||'').trim().toLowerCase().replace(/[’]/g,"'");
    if(!x)return false;
    if(isGeneralHealthSideQuestion(x))return true;
    return /^(?:what|why|how|who|where|when|which|is|are|was|were|do|does|did|can|could|should|would|will|may|tell me|explain|define|describe)\b/.test(x)||/[?]$/.test(x);
  }
  function isBroadCorporateInfoQuery(raw){
    const x=normalizedChoice(raw);
    if(!x||!/(?:office|meeting|corporate)/.test(x))return false;
    if(/\b(?:add|buy|give me|get me|put|place|send|i want|i need|i d like|i would like|i ll have)\b/.test(x))return false;
    return /^(?:what|which|tell me|show me|recommend|can you recommend)\b/.test(x)
      && /\b(?:order|orders|options|available|have|offer|recommend|meeting|corporate)\b/.test(x);
  }
  function isExpectedExperienceReply(raw){
    const q=normalizedChoice(raw);if(!experience.mode)return false;
    if(experience.mode==='drink'){
      if(experience.step==='temp')return /\b(?:hot|cold|iced|chilled)\b/.test(q);
      if(experience.step==='style')return experience.data.temp==='hot'?/(?:strong|bold|espresso|smooth|milky|milk|latte|cappuccino|chocolate|mocha|no coffee|without coffee|tea|hot chocolate)/.test(q):/(?:iced coffee|coffee|fruit|fruity|lemonade|mango|passion|hydrat|light|refresh|water|cucumber|lime|smoothie|creamy|yoghurt|yogurt)/.test(q);
    }
    if(experience.mode==='meeting'){
      if(experience.step==='people'||experience.step==='people-custom')return parseSpokenNumber(q,200)!=null;
      if(experience.step==='style')return /(?:coffee|muffin|breakfast|morning meal|training|workshop|seminar|cold|boba|summer|lemonade|iced)/.test(q);
      if(experience.step==='timing')return /(?:today|same day|now|tomorrow|later|next|future)/.test(q);
    }
    return false;
  }

  function localAnswer(raw){
    const q=raw.trim();
    const lower=q.toLowerCase();
    const normalized=normalizedChoice(q);
    const askedCategory=ORDER_CATEGORIES.find(c=>{const n=normalizedChoice(c);return normalized===n||normalized.includes(n+' do you have')||normalized.includes(n+' are there')||normalized.includes(n+' are available')});
    if(askedCategory){
      const names=products.filter(p=>p.c===askedCategory).map(p=>p.n);
      if(names.length)return `${askedCategory}: ${names.join(', ')}.`;
    }
    if(isUrgentHealthQuestion(q)) return 'That could be an emergency. Please seek urgent in-person medical care or contact your local emergency service now. Do not rely on a café chatbot for severe or rapidly dangerous symptoms such as chest pain, serious breathing difficulty or choking, stroke-like symptoms, a severe allergic reaction, loss of consciousness, seizures, severe bleeding or vomiting/coughing blood, poisoning/overdose, severe burns/electrical injury, or immediate risk of self-harm.';
    if(isBroadHydrationQuestion(q)) return localAnswers.hydration;
    if(/caffeine|decaf|stimulant/i.test(q) && !productMatch(q)) return localAnswers.caffeine;
    if(/(?:what can i order|what(?: are|'s| is)?(?: the)? options?|recommend(?: me)?|office orders?)/i.test(q) && /(?:office|meeting|corporate)/i.test(q)) return localAnswers.corporate;
    const p=productMatch(q);
    if(p){
      const price=p.quote||p.p==null?'Price is confirmed on WhatsApp.':`${p.from?'From ':''}P${p.p}.`;
      if(/pregnan|breastfeed|caffeine|decaf|stimulant/i.test(q)) return `${p.n}: ${caffeineStatus(p)} ${p.s} For pregnancy, breastfeeding, a clinician-set caffeine limit or another medical reason to restrict caffeine, follow your clinician’s guidance.`;
      if(/ingredient|contain|what is in|what's in|what comes|comes with|include|contents?|inside|allerg|dairy|milk|gluten|egg|nut|vegan|vegetarian/i.test(q)) return `${p.n}: ${p.s} For allergies or strict diets, please confirm detailed ingredient-label information and possible cross-contact on WhatsApp before ordering.`;
      for(const fact of benefitFacts){if(fact.re.test(p.n+' '+(p.k||'')) && /benefit|healthy|health|good for|nutrition|vitamin|nutrient|hydration|what does|why/i.test(q)) return fact.text}
      if(/price|cost|how much/i.test(q)) return `${p.n} is ${price.replace(/\.$/,'')}.`;
      if(/sugar|sweetener/i.test(q)) return `${p.n}: ${p.s} I can describe the listed sweeteners, but I do not have a verified sugar-grams value unless the product label provides it.`;
      const description=String(p.s||'').trim().replace(/\.+$/,'');
      return `${p.n}: ${description}. ${price}`;
    }
    for(const fact of benefitFacts){if(fact.re.test(q) && /benefit|healthy|health|good for|nutrition|vitamin|nutrient|hydration|what does|why/i.test(q)) return fact.text}
    if(/headache|migraine/i.test(q)) return 'For a mild headache, common contributors can include dehydration, missed meals, poor sleep, stress or caffeine changes. Rest, regular fluids and food if you have missed a meal may help, but sudden severe headache, weakness, confusion, fainting, stiff neck with fever, or a headache after a serious injury needs urgent medical assessment.';
    if(/sleep|insomnia|cannot sleep|can't sleep/i.test(q)) return 'For better sleep, a regular sleep/wake time, a darker quiet room, less late caffeine, and reducing bright screens close to bedtime can help. If poor sleep is persistent, severe, linked to breathing pauses, or affecting daytime safety, it is worth discussing with a clinician.';
    if(/stress|anxiety|panic|mental health/i.test(q)) return 'For everyday stress, slow breathing, movement, regular meals, sleep and talking with someone you trust can help. If anxiety is persistent or overwhelming, professional support can help; if you may harm yourself or someone else, seek urgent emergency help now.';
    if(/nausea|vomit|diarrh|stomach|abdomen|heartburn|reflux/i.test(q)) return 'For mild stomach upset, small regular sips of fluid and simple foods as tolerated can help. Severe or worsening abdominal pain, blood in vomit or stool, repeated vomiting, marked dehydration, fainting, or symptoms in a very young child, older adult or medically vulnerable person need medical assessment.';
    if(/cough|cold|flu|sore throat|fever/i.test(q)) return 'Many mild respiratory illnesses improve with rest and fluids. Trouble breathing, chest pain, confusion, blue/grey lips, severe dehydration, or rapidly worsening symptoms need urgent medical care; persistent or concerning symptoms should be assessed by a clinician.';
    if(/exercise|workout|fitness|muscle|recovery/i.test(q)) return 'For general exercise recovery, gradual training, sleep, regular meals, protein from your normal diet and fluids matched to heat and sweating are sensible basics. Stop exercising and seek urgent care for chest pain, severe breathlessness, fainting or sudden neurological symptoms.';
    if(/diabetes|blood sugar|pregnan|blood pressure|hypertension|kidney|heart condition|liver|medication|medicine|drug|medical|treat|cure|weight loss|detox|immune|immunity|disease/i.test(q)){
      return 'I can explain general health information and known Lovely ingredients, but I cannot diagnose you, prescribe treatment, change medication or decide whether a product is medically suitable for you. For pregnancy, chronic conditions, medication interactions or clinician-directed fluid/caffeine limits, use the exact label information and confirm personalized advice with a qualified clinician or pharmacist.';
    }
    if(/health drinks?|wellness drinks?|hydration drinks?|benefits? of (your|the) health|general wellness benefits/i.test(lower)) return localAnswers.health;
    if(isGeneralHealthSideQuestion(q)) return 'I can answer general health questions and explain common possibilities, simple low-risk self-care and warning signs. I cannot diagnose from symptoms or replace a clinician; if symptoms are severe, rapidly worsening, persistent, or you are worried, seek appropriate medical care.';
    if(/hydration|drink water|water intake|fluids?/i.test(lower)) return localAnswers.hydration;
    if(/caffeine|coffee.*alert|tea.*caffeine/i.test(lower)) return localAnswers.caffeine;
    if(/\bvat\b|value added tax|\btax\b/i.test(lower)) return VAT_ENABLED?'Menu prices are shown excluding VAT and 14% VAT is added in the cart. Final payment details are confirmed on WhatsApp.':'The current website checkout does not add VAT. Final payment details are confirmed on WhatsApp.';
    if(/strong|espresso/i.test(lower)) return 'For the strongest, most concentrated coffee on our menu, choose Espresso. If you want the espresso character in a longer drink, choose Americano.';
    if(/milky|milk.forward|smooth coffee|latte/i.test(lower)) return 'For a smooth, milk-forward coffee, Café Latte is the best fit. Cappuccino is also milk-based but has more foam.';
    if(/foam|froth|cappuccino/i.test(lower)) return 'For more foam, Cappuccino is the best fit.';
    if(/chocolate|mocha/i.test(lower)) return 'For a chocolate-style coffee, choose Mocha.';
    if(/coffee|americano|café|cafe|hot drink/i.test(lower)) return localAnswers.coffee;
    if(/smoothie|yoghurt|yogurt|ginger/i.test(lower)) return localAnswers.smoothies;
    if(/health|wellness|lemon|cucumber|yuzu|guava|berry|blackcurrant|acai|peach|elderflower|lychee|pomegranate|raspberry|benefit/i.test(lower)) return localAnswers.health;
    if(/mineral|alkaline|bottled water|water/i.test(lower)) return localAnswers.water;
    if(/\b(?:room|rooms|accommodation|standard room|executive room|book(?:ing)? a room|somewhere to stay|place to stay|night(?:s)? stay)\b/i.test(lower)) return 'Lovely Rooms is in Phakalane. Standard Rooms are P300 per night and the Executive Room is P450 per night, room-only. I can take you straight to the Rooms concierge to prepare an availability request.';
    if(/corporate|meeting|office|training|box|delivery/i.test(lower)) return localAnswers.corporate;
    if(/breakfast|muffin|brownie|cake|cookie|bake|boba|lemonade|iced tea/i.test(lower)){
      return 'I can give you the displayed ingredients or box ingredients, the current menu price where fixed, caffeine guidance where relevant, and upgrade rules. Name the item—for example “What is in the Continental Breakfast?” or “What comes in the 10-person Coffee Meeting Box?”';
    }
    return 'I can help with the complete menu, ingredients, nutrients, caffeine, general health and hydration questions, orders, delivery, checkout and Lovely Rooms. I can also keep your order open while we switch topics.';
  }


  function productIndexByName(name){
    const list=products;
    return list.findIndex(p=>p.n===name);
  }
  function clearExperience(){experience={mode:null,step:null,data:{}}}
  function experienceCard(title,text,choices=[]){
    const wrap=document.createElement('div');wrap.className='lovely-ai-experience';
    const h=document.createElement('h3');h.textContent=title;wrap.appendChild(h);
    if(text){const p=document.createElement('p');p.textContent=text;wrap.appendChild(p)}
    if(choices.length){
      const grid=document.createElement('div');grid.className='lovely-ai-choice-grid';
      choices.forEach(choice=>{const b=document.createElement('button');b.type='button';b.textContent=choice.label;b.dataset.expChoice=choice.value;grid.appendChild(b)});
      wrap.appendChild(grid);
    }
    const reset=document.createElement('button');reset.type='button';reset.className='lovely-ai-reset';reset.dataset.aiReset='true';reset.textContent='Ask something else';wrap.appendChild(reset);
    body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);
    if(voiceReplyEnabled&&!handsFreeConversation)speak(text||title)
    return wrap;
  }
  function resultCard({title,text,price='',productName='',quantity=1,whatsapp='',restartMode='',quote=false}){
    const wrap=document.createElement('div');wrap.className='lovely-ai-experience';
    const h=document.createElement('h3');h.textContent='Lovely recommends';wrap.appendChild(h);
    const result=document.createElement('div');result.className='lovely-ai-result';
    const strong=document.createElement('strong');strong.textContent=title;result.appendChild(strong);
    const p=document.createElement('p');p.textContent=text;result.appendChild(p);
    const resultProductIndex=productName?productIndexByName(productName):-1;const displayPrice=(quote||(resultProductIndex>=0&&products[resultProductIndex].quote))?'':price;
    if(displayPrice){const pr=document.createElement('span');pr.className='lovely-ai-result-price';pr.textContent=displayPrice;result.appendChild(pr)}
    const actions=document.createElement('div');actions.className='lovely-ai-result-actions';
    if(productName){
      const idx=resultProductIndex;
      if(idx>=0 && !products[idx].quote && products[idx].p!=null){
        lastProductIndex=idx;
        const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='primary';addBtn.textContent=quantity>1?'ADD RECOMMENDATION':'ADD TO ORDER';addBtn.dataset.expAdd=String(idx);addBtn.dataset.expQty=String(quantity||1);actions.appendChild(addBtn);
      }
    }
    if(restartMode){const again=document.createElement('button');again.type='button';again.className='secondary';again.textContent='TRY AGAIN';again.dataset.aiExperience=restartMode;actions.appendChild(again)}
    const wa=document.createElement('a');wa.className=actions.children.length?'secondary':'primary';wa.target='_blank';wa.rel='noopener';wa.textContent='CONFIRM ON WHATSAPP';
    wa.href='https://wa.me/26774583606?text='+encodeURIComponent(whatsapp||('Hello Lovely Coffee House, I would like help with '+title+'.'));
    actions.appendChild(wa);result.appendChild(actions);
    const note=document.createElement('p');note.className='lovely-ai-result-note';note.textContent='Final availability, delivery charge and payment are confirmed on WhatsApp.';result.appendChild(note);
    wrap.appendChild(result);body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);return wrap;
  }
  function startDrinkFinder(){
    clearExperience();experience.mode='drink';experience.step='temp';
    addMessage('Let’s find a drink that fits you.','bot');
    experienceCard('Find My Drink','Start with how you want it served.',[
      {label:'HOT',value:'hot'},{label:'COLD',value:'cold'}
    ]);
  }
  function drinkChoice(value){
    if(experience.mode!=='drink')return;
    if(experience.step==='temp'){
      experience.data.temp=value;experience.step='style';
      if(value==='hot') experienceCard('What sounds best?','Pick the style closest to what you feel like.',[
        {label:'STRONG & BOLD',value:'strong'},{label:'SMOOTH & MILKY',value:'smooth'},{label:'CHOCOLATE',value:'chocolate'},{label:'NO COFFEE',value:'no-coffee'}
      ]);
      else experienceCard('What sounds best?','Pick the style closest to what you feel like.',[
        {label:'ICED COFFEE',value:'iced-coffee'},{label:'FRUITY',value:'fruity'},{label:'HYDRATING',value:'hydrating'},{label:'CREAMY SMOOTHIE',value:'smoothie'}
      ]);
      return;
    }
    if(experience.step==='style'){
      experience.data.style=value;const temp=experience.data.temp;let rec;
      if(temp==='hot'&&value==='strong') rec={title:'Espresso',text:'Short and concentrated. Choose Americano instead if you want the espresso character in a longer drink.',price:'P25',productName:'Espresso'};
      else if(temp==='hot'&&value==='smooth') rec={title:'Café Latte',text:'The smoothest, most milk-forward coffee on the current menu.',price:'P38',productName:'Café Latte'};
      else if(temp==='hot'&&value==='chocolate') rec={title:'Mocha',text:'Ingredients: espresso + chocolate + steamed milk + milk foam. If you want no coffee, Hot Chocolate is P40.',price:'P45',productName:'Mocha'};
      else if(temp==='hot') rec={title:'Hot Chocolate',text:'A warm non-coffee option. Tea is also available at P20.',price:'P40',productName:'Hot Chocolate'};
      else if(value==='iced-coffee') rec={title:'Iced Coffee',text:'A chilled coffee option for warm days.',price:'P40',productName:'Iced Coffee'};
      else if(value==='fruity') rec={title:'Passion Fruit Lemonade',text:'A bright fruit-led refresher. Tropical Mango Cooler is another good option at P38.',price:'P35',productName:'Passion Fruit Lemonade'};
      else if(value==='smoothie') rec={title:'Mango-Yoghurt Smoothie',text:'Creamy mango and yoghurt. Yoghurt can provide protein and calcium; fruit contributes flavour and naturally occurring sugars.',price:'P48',productName:'Mango-Yoghurt Smoothie'};
      else rec={title:'Cucumber & Yuzu Hydration',text:'REFRESH profile with cucumber, yuzu & mint plus vitamins C and B12.',price:'P25',productName:'Cucumber & Yuzu Hydration'};
      resultCard({...rec,restartMode:'drink',whatsapp:'Hello Lovely Coffee House, Lovely AI recommended '+rec.title+'. Please confirm availability, final price where applicable, and fulfilment.'});
      clearExperience();
    }
  }
  function startMeetingPlanner(){
    clearExperience();experience.mode='meeting';experience.step='people';
    addMessage('I can build a quick meeting recommendation.','bot');
    experienceCard('AI Meeting Planner','How many people are you ordering for?',[
      {label:'1',value:'1'},{label:'2',value:'2'},{label:'3',value:'3'},{label:'4',value:'4'},{label:'5',value:'5'},{label:'6',value:'6'},{label:'10',value:'10'},{label:'20',value:'20'},{label:'OTHER',value:'other'}
    ]);
  }
  function meetingChoice(value){
    if(experience.mode!=='meeting')return;
    if(experience.step==='people'){
      if(value==='other'){experience.step='people-custom';addMessage('Type or say the exact number of people. I can plan for any group size; groups above 20 will be confirmed as a custom order.','bot');if(voiceReplyEnabled)speak('Tell me the exact number of people.');return;}
      experience.data.people=value;experience.step='style';
      experienceCard('What kind of meeting?','Choose the refreshment style.',[
        {label:'COFFEE + MUFFINS',value:'coffee'},{label:'BREAKFAST',value:'breakfast'},{label:'TRAINING',value:'training'},{label:'COLD / BOBA',value:'cold'}
      ]);return;
    }
    if(experience.step==='style'){
      experience.data.style=value;experience.step='timing';
      experienceCard('When is it?','This helps set the reliability note.',[
        {label:'TODAY',value:'today'},{label:'TOMORROW OR LATER',value:'later'}
      ]);return;
    }
    if(experience.step==='timing'){
      experience.data.timing=value;
      const people=experience.data.people,style=experience.data.style,timing=value;let rec;
      const lateNote=timing==='today'?'Same-day fulfilment depends on current capacity.':'Pre-ordering gives the team the best chance of reliable fulfilment.';
      const exactPeople=people==='large'?null:Number(people);
      if(style==='coffee'){
        if(people==='6') rec={title:'Small Coffee Meeting Box — 6',text:'6 Americanos or Cappuccinos + 6 Vanilla / Plain or Chocolate Muffins + 6 seasonal fruit portions (about 120 g each; mix varies with availability); upgrades cost extra. '+lateNote,price:'P360',productName:'Small Coffee Meeting Box — 6'};
        else if(people==='10') rec={title:'Coffee Meeting Box — 10',text:'10 Americanos or Cappuccinos + 10 Vanilla / Plain or Chocolate Muffins + 10 seasonal fruit portions (about 120 g each; mix varies with availability); upgrades cost extra. This is the recommended corporate meeting option. '+lateNote,price:'P590',productName:'Coffee Meeting Box — 10'};
        else if(people==='20') rec={title:'Large Coffee Meeting Box — 20',text:'20 Americanos or Cappuccinos + 20 Vanilla / Plain or Chocolate Muffins + 20 seasonal fruit portions (about 120 g each; mix varies with availability), with batch production and scheduled dispatch; upgrades cost extra. '+lateNote,price:'P1160',productName:'Large Coffee Meeting Box — 20'};
        else if(exactPeople&&exactPeople<=5) rec={title:'Coffee + Muffin bundles',text:'For this smaller meeting, one Coffee + Muffin bundle per person gives an Americano or Cappuccino plus a Vanilla / Plain or Chocolate Muffin; upgrades cost extra. '+lateNote,price:'P'+(49*exactPeople)+' ('+exactPeople+' × P49)',productName:'Coffee + Muffin',quantity:exactPeople};
        else if(exactPeople&&exactPeople<10) rec={title:'Coffee Meeting Box — 10',text:'For '+exactPeople+' people, the fixed 10-person box gives 10 Americanos or Cappuccinos + 10 Vanilla/Plain or Chocolate Muffins + 10 seasonal fruit portions, leaving some spare capacity; upgrades extra. '+lateNote,price:'P590',productName:'Coffee Meeting Box — 10'};
        else if(exactPeople&&exactPeople<20) rec={title:'Large Coffee Meeting Box — 20',text:'For '+exactPeople+' people, the fixed 20-person box gives 20 Americanos or Cappuccinos + 20 Vanilla/Plain or Chocolate Muffins + 20 seasonal fruit portions, leaving some spare capacity; upgrades extra. '+lateNote,price:'P1160',productName:'Large Coffee Meeting Box — 20'};
        else rec={title:'Custom large meeting order',text:'For more than 20 people, Lovely Coffee House should confirm quantities, production timing and delivery directly. '+lateNote,price:'CUSTOM QUOTE'};
      }else if(style==='breakfast'){
        if(exactPeople&&exactPeople<=5) rec={title:'Continental Breakfast',text:'A practical small-group breakfast with toast, cereal/yoghurt, fruit, plus tea or Americano; milk-coffee upgrades are confirmed at order. '+lateNote,price:'P'+(50*exactPeople)+' ('+exactPeople+' × P50)',productName:'Continental Breakfast',quantity:exactPeople};
        else if(exactPeople) rec={title:'Business Breakfast Box',text:'Per-person ingredients: 1 egg + 1 sausage + grilled tomato + toast + 1 seasonal fruit portion (about 120 g; mix varies with availability) + tea or Americano. Minimum 6; substitutions and upgrades are confirmed on WhatsApp. '+lateNote,price:'FROM P'+(75*exactPeople),quote:true};
        else rec={title:'Custom large breakfast order',text:'For more than 20 people, final breakfast quantities, presentation and timing should be confirmed directly. '+lateNote,price:'CUSTOM QUOTE'};
      }else if(style==='training'){
        if(exactPeople&&exactPeople>=10) rec={title:'Training Refreshments',text:'Half-Day P90/person: 1 Americano, Cappuccino or Tea + 1 standard muffin + 1 bottled water + 1 seasonal fruit portion (about 120 g; mix varies with availability). Full-Day P140/person: that morning service with fruit plus an afternoon Americano/Cappuccino/Tea + Brownie or Cookie. Minimum 10; upgrades extra. '+lateNote,price:'HALF-DAY FROM P'+(90*exactPeople),quote:true};
        else rec={title:'Custom training refreshments',text:'The standard training package has a minimum of 10 people. For this group size, Lovely can confirm a smaller custom coffee-and-bake setup on WhatsApp. '+lateNote,price:'CUSTOM QUOTE'};
      }else{
        if(people==='10') rec={title:'Boba / Summer Staff Treat Pack — 10',text:'Ingredients: 10 cold drinks total — 4 Classic Lemonades + 3 Peach Iced Teas + 3 Lemon-Mint Iced Teas. Boba and higher-priced drink upgrades are quoted. '+lateNote,price:'FROM P350',quote:true};
        else if(people==='6') rec={title:'Summer Meeting Box',text:'6 Classic Lemonades, Peach Iced Teas or Lemon-Mint Iced Teas + 6 Vanilla / Plain or Chocolate Muffins + 6 seasonal fruit portions (about 120 g each; mix varies with availability); boba and premium upgrades cost extra. '+lateNote,price:'P360',productName:'Summer Meeting Box'};
        else if(exactPeople&&exactPeople<=5) rec={title:'Boba + Muffin bundles',text:'For this smaller group, one Boba + Muffin bundle per person includes any fixed-price boba + a Vanilla / Plain or Chocolate Muffin; premium-muffin and extra-pearl upgrades cost extra. '+lateNote,price:'P'+(55*exactPeople)+' ('+exactPeople+' × P55)',productName:'Boba + Muffin',quantity:exactPeople};
        else if(people==='20') rec={title:'Boba / Summer Staff Treat Packs',text:'Two packs provide 20 cold drinks total. Base mix uses Classic Lemonade, Peach Iced Tea or Lemon-Mint Iced Tea; Boba and higher-priced upgrades are quoted. '+lateNote,price:'FROM P700',quote:true};
        else rec={title:'Custom cold-drink meeting order',text:'Lovely can scale boba, lemonade, iced tea and muffins to the group size. Final quantities and price are confirmed on WhatsApp. '+lateNote,price:'CUSTOM QUOTE'};
      }
      const pLabel=String(people);
      resultCard({...rec,restartMode:'meeting',whatsapp:'Hello Lovely Coffee House, I used the AI Meeting Planner for '+pLabel+' people and selected '+style+' refreshments. Lovely AI recommended '+rec.title+'. Please confirm final ingredients/configuration, availability, total, delivery charge and timing.'});
      clearExperience();
    }
  }

  function cleanSpokenUtterance(raw){
    let text=String(raw||'').trim();
    text=text.replace(/^\s*hey\s+lovely\b[\s,.:;!?-]*/i,'');
    text=text.replace(/\b(?:um+|uh+|erm+|hmm+|mm+hmm+|ah+)\b/gi,' ');
    let prev='';
    while(prev!==text){
      prev=text;
      text=text.replace(/\b([a-z0-9']+)(?:\s+\1\b)+/gi,'$1');
      text=text.replace(/\b([a-z0-9']+\s+[a-z0-9']+)(?:\s+\1\b)+/gi,'$1');
    }
    return text.replace(/\s+/g,' ').trim();
  }
  function voiceFingerprint(raw){let key=normalizedChoice(cleanSpokenUtterance(raw)).replace(/\bplease\b/g,'');for(const [word,num] of Object.entries({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}))key=key.replace(new RegExp('\\b'+word+'\\b','g'),String(num));return key.replace(/\s+/g,' ').trim()}
  function isRecentVoiceDuplicate(raw){
    const key=voiceFingerprint(raw),now=Date.now();if(!key)return true;
    if(key===lastVoiceFingerprint&&now-lastVoiceAt<5000)return true;
    lastVoiceFingerprint=key;lastVoiceAt=now;return false;
  }
  function isLikelySpeechEcho(raw){
    if(!lastSpokenReply||!(currentAudio||currentSpeech||panel.classList.contains('is-speaking')))return false;
    if(experience.mode&&isExpectedExperienceReply(raw))return false;
    const heard=normalizedChoice(raw),spoken=normalizedChoice(lastSpokenReply);if(!heard||!spoken)return false;
    const words=heard.split(' ').filter(Boolean);if(words.length<3)return false;
    if(spoken.includes(heard))return true;
    const set=new Set(spoken.split(' ').filter(Boolean));const overlap=words.filter(w=>set.has(w)).length/words.length;
    return words.length>=4&&overlap>=0.85;
  }
  function scheduleBargeInListening(delay=120){
    if(bargeInTimer){clearTimeout(bargeInTimer);bargeInTimer=null}
    if(!handsFreeConversation||!panel.classList.contains('open')||document.hidden||!recognition)return;
    bargeInTimer=setTimeout(()=>{bargeInTimer=null;startQuestionListening(true)},delay);
  }
  function normalizedChoice(q){return String(q||'').toLowerCase().replace(/[^a-z0-9+ ]/g,' ').replace(/\s+/g,' ').trim()}
  function routeExperienceSpeech(raw){
    const q=normalizedChoice(raw);
    if(!experience.mode)return false;
    if(experience.mode==='drink'){
      if(experience.step==='temp'){
        if(/\bhot\b/.test(q)){drinkChoice('hot');return true}
        if(/\bcold\b|iced|chilled/.test(q)){drinkChoice('cold');return true}
        addMessage('Say “hot” or “cold”, or tap one of the choices.','bot');if(voiceReplyEnabled)speak('Please say hot or cold.');return true;
      }
      if(experience.step==='style'){
        if(experience.data.temp==='hot'){
          if(/strong|bold|espresso/.test(q)){drinkChoice('strong');return true}
          if(/smooth|milky|milk|latte|cappuccino/.test(q)){drinkChoice('smooth');return true}
          if(/chocolate|mocha/.test(q)){drinkChoice('chocolate');return true}
          if(/no coffee|without coffee|tea|hot chocolate/.test(q)){drinkChoice('no-coffee');return true}
          addMessage('Say strong, smooth and milky, chocolate, or no coffee.','bot');if(voiceReplyEnabled)speak('Say strong and bold, smooth and milky, chocolate, or no coffee.');return true;
        }
        if(/iced coffee|coffee/.test(q)){drinkChoice('iced-coffee');return true}
        if(/fruit|fruity|lemonade|mango|passion/.test(q)){drinkChoice('fruity');return true}
        if(/hydrat|light|refresh|water|cucumber|lime/.test(q)){drinkChoice('hydrating');return true}
        if(/smoothie|creamy|yoghurt|yogurt/.test(q)){drinkChoice('smoothie');return true}
        addMessage('Say iced coffee, fruity, hydrating, or creamy smoothie.','bot');if(voiceReplyEnabled)speak('Say iced coffee, fruity, hydrating, or creamy smoothie.');return true;
      }
    }
    if(experience.mode==='meeting'){
      if(experience.step==='people'||experience.step==='people-custom'){
        const n=parseSpokenNumber(q,200);
        if(n!=null){experience.step='people';meetingChoice(String(n));return true}
        addMessage('Say or type the number of people, from 1 to 200.','bot');if(voiceReplyEnabled)speak('How many people? Say or type the number.');return true;
      }
      if(experience.step==='style'){
        if(/coffee|muffin/.test(q)){meetingChoice('coffee');return true}
        if(/breakfast|morning meal/.test(q)){meetingChoice('breakfast');return true}
        if(/training|workshop|seminar/.test(q)){meetingChoice('training');return true}
        if(/cold|boba|summer|lemonade|iced/.test(q)){meetingChoice('cold');return true}
        addMessage('Say coffee and muffins, breakfast, training, or cold / boba.','bot');if(voiceReplyEnabled)speak('Choose coffee and muffins, breakfast, training, or cold and boba.');return true;
      }
      if(experience.step==='timing'){
        if(/today|same day|now/.test(q)){meetingChoice('today');return true}
        if(/tomorrow|later|next|future/.test(q)){meetingChoice('later');return true}
        addMessage('Say “today” or “tomorrow or later”.','bot');if(voiceReplyEnabled)speak('Is the meeting today, or tomorrow or later?');return true;
      }
    }
    return false;
  }

  const ORDER_CATEGORIES=['Coffee','Boba','Summer','Health Drinks','Smoothies','Bakes','Breakfast','Bundles','Corporate'];
  const NUMBER_SMALL={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  const NUMBER_TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  function parseSpokenNumber(raw,max=200){
    const q=normalizedChoice(raw);if(!q)return null;
    const digit=q.match(/\b(\d{1,3})\b/);if(digit)return Math.max(1,Math.min(max,Number(digit[1])));
    const tokens=q.split(' ');
    for(let i=0;i<tokens.length;i++){
      const t=tokens[i];
      if(NUMBER_SMALL[t]!=null){
        let value=NUMBER_SMALL[t],j=i+1;
        if(tokens[j]==='hundred'){value*=100;j++;if(tokens[j]==='and')j++;if(NUMBER_TENS[tokens[j]]!=null){value+=NUMBER_TENS[tokens[j]];j++;if(NUMBER_SMALL[tokens[j]]>=1&&NUMBER_SMALL[tokens[j]]<=9)value+=NUMBER_SMALL[tokens[j]]}else if(NUMBER_SMALL[tokens[j]]>=1&&NUMBER_SMALL[tokens[j]]<=19)value+=NUMBER_SMALL[tokens[j]]}
        return Math.max(1,Math.min(max,value));
      }
      if(NUMBER_TENS[t]!=null){let value=NUMBER_TENS[t];if(NUMBER_SMALL[tokens[i+1]]>=1&&NUMBER_SMALL[tokens[i+1]]<=9)value+=NUMBER_SMALL[tokens[i+1]];return Math.max(1,Math.min(max,value))}
      if(t==='hundred')return Math.min(max,100);
    }
    return null;
  }
  function quantityTextWithoutProduct(raw,product){
    let q=normalizedChoice(raw);if(!product)return q;
    const name=canonicalProductText(product.n);if(name&&q.includes(name))q=q.split(name).join(' ');
    return q.replace(/\s+/g,' ').trim();
  }
  function aiOrderEntries(){return typeof entries==='function'?entries():Object.entries(cart||{}).filter(([,q])=>Number(q)>0)}
  function aiOrderTotal(){return typeof grandTotal==='function'?grandTotal():aiOrderEntries().reduce((sum,[i,q])=>sum+(Number(products[i]&&products[i].p)||0)*Number(q),0)}
  function parseOrderQuantity(raw,product=null){
    const q=quantityTextWithoutProduct(raw,product);
    const correction=q.match(/\b(?:make that|make it|actually|rather|sorry(?: i mean)?|no(?: i mean)?)\s+(.+)$/);
    if(correction){const corrected=parseSpokenNumber(correction[1],30);if(corrected!=null)return corrected}
    const n=parseSpokenNumber(q,30);return n==null?1:n;
  }
  function matchOrderProduct(raw){
    const q=String(raw||'');const direct=productMatch(q);if(direct)return direct;
    const n=normalizedChoice(q);
    const aliases=[
      [/\blattes?\b/,'Café Latte'],[/\bcappuccinos?\b/,'Cappuccino'],[/\bamericanos?\b/,'Americano'],[/\bespressos?\b/,'Espresso'],[/\bmochas?\b/,'Mocha'],
      [/hot chocolate/,'Hot Chocolate'],[/\biced coffee\b/,'Iced Coffee'],[/pink lemonade/,'Lovely Pink Lemonade'],[/classic lemonade/,'Classic Lemonade'],
      [/passion fruit lemonade/,'Passion Fruit Lemonade'],[/\bbrownies?\b/,'Brownie'],[/\bcookies?\b/,'Cookie'],[/chocolate muffins?/,'Chocolate Muffin'],
      [/(plain|vanilla) muffins?/,'Vanilla / Plain Muffin'],[/coffee.*muffin|muffin.*coffee/,'Coffee + Muffin'],[/morning for two/,'Morning for Two'],
      [/\bthrive\b|blackcurrant.*acai/,'Blackcurrant & Acai Hydration'],[/\bglow\b|peach hydration/,'Peach Hydration'],[/\bimmunity\b|fresh lemon hydration/,'Fresh Lemon Hydration'],
      [/\brefresh\b|cucumber.*yuzu/,'Cucumber & Yuzu Hydration'],[/\bbloom\b|elderflower.*lychee/,'Elderflower & Lychee Hydration'],[/\bfocus\b|red fruits?.*mint/,'Red Fruits & Mint Hydration'],
      [/\bunwind\b|mango.*guava/,'Mango & Guava Hydration'],[/\bbalance\b|raspberry.*pomegranate/,'Raspberry & Pomegranate Hydration'],[/mineral water/,'Mineral Water'],[/alkaline water/,'Alkaline Water']
    ];
    for(const [re,name] of aliases){if(re.test(n)){const p=products.find(x=>x.n===name);if(p)return p}}
    return null;
  }
  function setOrderFulfilment(value){
    if(!['collection','delivery','corporate'].includes(value))return false;
    fulfil=value;aiFulfilmentConfirmed=true;saveOrderSession();renderCart();return true;
  }
  // The shared cart defaults to collection for the manual UI, but Lovely AI must never
  // treat that default as the customer's choice. AI checkout requires an explicit
  // fulfilment confirmation before WhatsApp can open. Manual fulfilment buttons count
  // as an explicit choice too.
  document.querySelectorAll('[data-f]').forEach(btn=>btn.addEventListener('click',()=>{
    if(['collection','delivery','corporate'].includes(btn.dataset.f||''))aiFulfilmentConfirmed=true;
  }));
  function removeExistingAiOrderCards(){body.querySelectorAll('.lovely-ai-cart-card,.lovely-ai-checkout-card').forEach(el=>el.remove())}
  function aiCartCard({lead='Your live order is below.'}={}){
    removeExistingAiOrderCards();
    const wrap=document.createElement('div');wrap.className='lovely-ai-experience lovely-ai-cart-card';
    const h=document.createElement('h3');h.textContent='Your order';wrap.appendChild(h);
    const rows=aiOrderEntries();
    if(!rows.length){
      const p=document.createElement('p');p.textContent='Your order is empty. Choose a category or tell me what you want, for example “add 2 cappuccinos”.';wrap.appendChild(p);
      const actions=document.createElement('div');actions.className='lovely-ai-result-actions';
      const start=document.createElement('button');start.type='button';start.className='primary';start.dataset.aiExperience='order';start.textContent='START ORDER';actions.appendChild(start);wrap.appendChild(actions);
      body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);return wrap;
    }
    const intro=document.createElement('p');intro.textContent=lead;wrap.appendChild(intro);
    const list=document.createElement('div');list.className='lovely-ai-cart-lines';
    rows.slice(0,8).forEach(([i,q])=>{
      const p=products[i];if(!p)return;
      const line=document.createElement('div');line.className='lovely-ai-cart-line';
      const copy=document.createElement('div');copy.className='lovely-ai-cart-copy';
      const name=document.createElement('strong');name.textContent=p.n;copy.appendChild(name);
      const meta=document.createElement('span');meta.textContent=`${q} × P${p.p} · P${Number(p.p*q).toLocaleString()}`;copy.appendChild(meta);line.appendChild(copy);
      const qty=document.createElement('div');qty.className='lovely-ai-cart-qty';
      const dec=document.createElement('button');dec.type='button';dec.dataset.aiCartDec=String(i);dec.setAttribute('aria-label','Decrease '+p.n);dec.textContent='−';qty.appendChild(dec);
      const amount=document.createElement('span');amount.textContent=String(q);qty.appendChild(amount);
      const inc=document.createElement('button');inc.type='button';inc.dataset.aiCartInc=String(i);inc.setAttribute('aria-label','Increase '+p.n);inc.textContent='+';qty.appendChild(inc);
      const rem=document.createElement('button');rem.type='button';rem.className='remove';rem.dataset.aiCartRemove=String(i);rem.setAttribute('aria-label','Remove '+p.n);rem.textContent='×';qty.appendChild(rem);
      line.appendChild(qty);list.appendChild(line);
    });
    if(rows.length>8){const more=document.createElement('p');more.className='lovely-ai-cart-more';more.textContent=`+ ${rows.length-8} more item types in your order`;list.appendChild(more)}
    wrap.appendChild(list);
    const totalLine=document.createElement('div');totalLine.className='lovely-ai-cart-total';const totalLabel=document.createElement('span');totalLabel.textContent='ORDER TOTAL';const totalValue=document.createElement('strong');totalValue.textContent=money2(aiOrderTotal());totalLine.append(totalLabel,totalValue);wrap.appendChild(totalLine);
    const actions=document.createElement('div');actions.className='lovely-ai-result-actions';
    const addMore=document.createElement('button');addMore.type='button';addMore.className='secondary';addMore.dataset.aiExperience='order';addMore.textContent='ADD MORE';actions.appendChild(addMore);
    const checkoutBtn=document.createElement('button');checkoutBtn.type='button';checkoutBtn.className='primary';checkoutBtn.dataset.aiCheckout='start';checkoutBtn.textContent='CHECKOUT';actions.appendChild(checkoutBtn);
    wrap.appendChild(actions);body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);return wrap;
  }
  function startOrderBuilder(){
    clearExperience();experience.mode='order';experience.step='category';
    addMessage('I can build the order with you here. Choose a section, or type an item and quantity.','bot');
    experienceCard('Start an order','What would you like to browse?',ORDER_CATEGORIES.map(c=>({label:c.toUpperCase(),value:'cat:'+c})).concat([{label:'VIEW ORDER',value:'view'}]));
  }
  function orderBuilderChoice(value){
    if(experience.mode!=='order')return;
    if(value==='view'){clearExperience();aiCartCard();return}
    if(value==='back'){experience.step='category';experienceCard('Start an order','Choose a section.',ORDER_CATEGORIES.map(c=>({label:c.toUpperCase(),value:'cat:'+c})));return}
    if(value.startsWith('cat:')){
      const cat=value.slice(4);experience.step='product';experience.data.category=cat;
      const choices=products.map((p,i)=>({p,i})).filter(x=>x.p.c===cat&&x.p.p!=null&&!x.p.quote).map(x=>({label:`${x.p.n} · P${x.p.p}`,value:'product:'+x.i}));
      choices.push({label:'← CATEGORIES',value:'back'});
      experienceCard(cat,'Tap an item to add one. You can adjust quantity in the order summary.',choices);return;
    }
    if(value.startsWith('product:')){
      const idx=Number(value.slice(8));clearExperience();addRecommendedProduct(idx,products[idx]&&products[idx].min||1);return;
    }
  }
  function checkoutReadyCard(){
    removeExistingAiOrderCards();
    const wrap=document.createElement('div');wrap.className='lovely-ai-experience lovely-ai-checkout-card';
    const h=document.createElement('h3');h.textContent='Ready to checkout';wrap.appendChild(h);
    const label={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[fulfil]||'Collection';
    const p=document.createElement('p');p.textContent=`${label} · ${money2(aiOrderTotal())}. Availability, timing${fulfil==='collection'?'':', delivery charge'} and payment instructions are confirmed on WhatsApp.`;wrap.appendChild(p);
    const actions=document.createElement('div');actions.className='lovely-ai-result-actions';
    const change=document.createElement('button');change.type='button';change.className='secondary';change.dataset.aiCheckout='start';change.textContent='CHANGE';actions.appendChild(change);
    const send=document.createElement('button');send.type='button';send.className='primary';send.dataset.aiCheckout='send';send.textContent='CONTINUE TO WHATSAPP';actions.appendChild(send);
    wrap.appendChild(actions);body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);
  }
  function startAiCheckout(){
    orderFollowupPending=false;clearExperience();removeExistingAiOrderCards();
    if(!aiOrderEntries().length){addMessage('Your order is empty. Let’s add something first.','bot');startOrderBuilder();return}
    experience.mode='checkout';experience.step='fulfilment';
    experienceCard('Checkout',`Your current order total is ${money2(aiOrderTotal())}. How would you like to receive it?`,[
      {label:'COLLECTION',value:'collection'},{label:'LOCAL DELIVERY',value:'delivery'},{label:'CORPORATE DELIVERY',value:'corporate'}
    ]);
  }
  function checkoutChoice(value){
    if(experience.mode!=='checkout')return;
    if(value==='add-more'){clearExperience();startOrderBuilder();return}
    if(value==='collection'||value==='delivery'||value==='corporate'){
      setOrderFulfilment(value);const req=checkoutRequirement();
      if(req.state==='needs-more'){
        experience.step='minimum';
        experienceCard('Delivery minimum',`Add ${money(req.short)} more to reach the ${req.label} minimum, or switch this order to collection.`,[
          {label:'ADD MORE',value:'add-more'},{label:'SWITCH TO COLLECTION',value:'collection'}
        ]);return;
      }
      clearExperience();checkoutReadyCard();return;
    }
  }
  function changeAiCart(index,delta){
    const p=products[index];if(!p)return;const current=Number(cart[index]||0),min=p.min||1;
    if(delta>0){if(current>=MAX_ITEM_QTY){toast(`Maximum ${MAX_ITEM_QTY} per item.`);return}cart[index]=Math.min(MAX_ITEM_QTY,current+1)}
    else if(current-1<min){delete cart[index]}else cart[index]=current-1;
    saveOrderSession();clearOrderSessionIfEmpty();renderCart();aiCartCard({lead:'Order updated.'});
  }
  function hasExplicitOrderQuantity(raw,product=null){return parseSpokenNumber(quantityTextWithoutProduct(raw,product),30)!=null}
  function splitMultiOrder(raw){
    const parts=String(raw||'').split(/\s+(?:and|&)\s+|,/i).map(x=>x.trim()).filter(Boolean);
    if(parts.length<2)return[];
    const found=[];
    for(const part of parts){const p=matchOrderProduct(part);if(p&&p.p!=null&&!p.quote)found.push({p,qty:parseOrderQuantity(part,p)})}
    return found.length>=2?found:[];
  }
  function routeRecentOrderCorrection(raw){
    const q=normalizedChoice(raw);
    const m=q.match(/^(?:(?:no|actually|sorry|wait)(?: i mean)?\s+)?(?:make that|make it|change that to|i mean)\s+(.+)$/)||q.match(/^(?:actually|no(?: i mean)?|sorry(?: i mean)?|wait)\s+(.+)$/)||q.match(/^(.+?)\s+instead$/);
    if(!m||!lastOrderAction||Date.now()-lastOrderAction.at>120000||lastOrderAction.kind==='swap')return false;
    const corrected=parseSpokenNumber(m[1],30);if(corrected==null)return false;
    const idx=lastOrderAction.index,p=products[idx];if(!p||p.quote||p.p==null)return false;
    const before=lastOrderAction.before;
    const next=Math.min(MAX_ITEM_QTY,Math.max(before+(p.min||1),before+corrected));
    cart[idx]=next;lastOrderAction={index:idx,before,quantity:next-before,at:Date.now()};lastProductIndex=idx;
    saveOrderSession();renderCart();orderFollowupPending=true;
    addMessage(raw,'user');addMessage(`Changed to ${next-before} × ${p.n}.`,'bot');
    aiCartCard({lead:'Updated.'});return true;
  }
  function parseFulfilmentChoice(raw){
    const q=normalizedChoice(raw);
    const choices=[
      {value:'collection',terms:['collection','collect','pick up','pickup']},
      {value:'delivery',terms:['local delivery','delivery','deliver it','deliver','delivered','drop off','dropoff','bring it','bring my order']},
      {value:'corporate',terms:['corporate delivery','office delivery','meeting delivery']}
    ];
    let best=null;
    for(const choice of choices){
      for(const term of choice.terms){
        const start=q.lastIndexOf(term);if(start<0)continue;
        const end=start+term.length;
        if(!best||end>best.end||(end===best.end&&term.length>best.length))best={value:choice.value,end,length:term.length};
      }
    }
    return best?best.value:null;
  }
  function routeExplicitFulfilment(raw,{userAlreadyAdded=false}={}){
    const value=parseFulfilmentChoice(raw);
    if(!value||!aiOrderEntries().length)return false;
    if(!userAlreadyAdded)addMessage(raw,'user');
    clearExperience();experience.mode='checkout';experience.step='fulfilment';
    setOrderFulfilment(value);
    const req=checkoutRequirement();
    const label={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[value]||'Fulfilment';
    if(req.state==='needs-more'){
      orderFollowupPending=false;
      addMessage(`${label} selected. Your order is ${money(req.short)} below the ${req.label} minimum. I’m opening WhatsApp as an enquiry so the team can help you add items or switch to collection.`,'bot');
      stopSpeaking();closePanel();if(window.LovelyOrderEngine)window.LovelyOrderEngine.execute([{type:'ENQUIRE_WHATSAPP'}],{source:'ai',checkoutSameTab:true});return true;
    }
    if(req.state==='ready'){
      orderFollowupPending=false;
      addMessage(`${label} selected. Opening WhatsApp. Final availability, timing${value==='collection'?'':', delivery charge'} and payment will be confirmed there.`,'bot');
      stopSpeaking();closePanel();if(window.LovelyOrderEngine)window.LovelyOrderEngine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});else checkout({sameTab:true});return true;
    }
    return false;
  }
  function isCommerceIntent(raw){
    const q=normalizedChoice(raw);if(!q||isBroadCorporateInfoQuery(raw))return false;
    const action=/\b(?:add|order|i want|i would like|i d like|give me|i ll have|can i get|get me|remove|delete|take off|cancel|change|replace|swap|switch|checkout|check out|place order|finish order|complete order|send it|send order|open whats ?app|go to whats ?app|continue to whats ?app|deliver it|bring it|bring my order|drop off|i ll collect|i will collect)\b/.test(q);
    if(action)return true;
    if(/\b(?:deliver|delivery|delivered|drop off|dropoff|bring)\b/.test(q)&&(matchOrderProduct(raw)||aiOrderEntries().length)){
      if(!/\b(?:fee|charge|minimum|how much|cost|price|what is|what s)\b/.test(q))return true;
    }
    if(aiOrderEntries().length&&parseFulfilmentChoice(raw)){
      // Questions about fees/minimums remain informational; a plain fulfilment choice is transactional.
      if(/\b(?:fee|charge|minimum|how much|cost|price|what is|what s)\b/.test(q))return false;
      return true;
    }
    return false;
  }

  function routeStructuredCommerce(raw){
    const engine=window.LovelyOrderEngine;if(!engine||typeof engine.execute!=='function')return false;
    const q=normalizedChoice(raw);if(!q||isBroadCorporateInfoQuery(raw))return false;
    const requestedFulfilment=parseFulfilmentChoice(raw);
    const infoOnly=/\b(?:how much|price|cost|minimum|fee|charge|what is|what s|tell me|ingredients?|benefit|healthy|health|why|where|when)\b/.test(q);
    const explicitCommerceVerb=/\b(?:add|order|i want|i would like|i d like|give me|i ll have|can i get|get me|take|remove|delete|take off|cancel|change|replace|swap|switch|deliver it|bring it|bring my order|drop off|i ll collect|i will collect|checkout|check out|place order|finish order|complete order|send it|send order|whats ?app)\b/.test(q);
    if(infoOnly&&!explicitCommerceVerb)return false;

    const actions=[];let mutationSummary=[];let actionMeta=null;
    const wantsRemove=/\b(remove|delete|take off|cancel)\b/.test(q);
    let wantsAdd=/\b(add|order|want|i want|i would like|i d like|give me|i ll have|can i get|get me|take)\b/.test(q);
    const explicitProduct=matchOrderProduct(raw);
    const questionOnly=/\b(how much|price|cost|what is|what s|tell me|ingredient|benefit|healthy|health)\b/.test(q);
    if(!wantsAdd&&!wantsRemove&&!questionOnly&&explicitProduct&&(hasExplicitOrderQuantity(raw,explicitProduct)||orderFollowupPending||requestedFulfilment))wantsAdd=true;

    // Product substitution is interpreted here but executed only by the validated bridge.
    if(/\b(?:change|replace|swap|switch)\b/.test(q)){
      const pivotTerms=[' to ',' for ',' with ',' into '];let pivot=-1,pivotTerm='';
      for(const term of pivotTerms){const at=q.lastIndexOf(term);if(at>pivot){pivot=at;pivotTerm=term}}
      if(pivot>=0){
        const beforeText=q.slice(0,pivot),afterText=q.slice(pivot+pivotTerm.length);
        const target=matchOrderProduct(afterText)||matchOrderProduct(raw);let source=matchOrderProduct(beforeText);
        if(target&&target.p!=null&&!target.quote){
          const targetIndex=products.indexOf(target);if(source===target)source=null;
          if(source&&Number(cart[products.indexOf(source)]||0)<=0)source=null;
          if(!source&&lastProductIndex!=null&&lastProductIndex!==targetIndex&&Number(cart[lastProductIndex]||0)>0)source=products[lastProductIndex]||null;
          if(source){
            const sourceIndex=products.indexOf(source),sourceBefore=Number(cart[sourceIndex]||0),targetBefore=Number(cart[targetIndex]||0);
            const sourceQty=Math.max(1,Math.min(sourceBefore,parseSpokenNumber(quantityTextWithoutProduct(beforeText,source),30)||1));
            const targetExplicit=parseSpokenNumber(quantityTextWithoutProduct(afterText,target),30),targetQty=Math.max(target.min||1,Math.min(MAX_ITEM_QTY,targetExplicit==null?sourceQty:targetExplicit));
            actions.push({type:'SWAP_ITEM',fromIndex:sourceIndex,toIndex:targetIndex,fromQuantity:sourceQty,toQuantity:targetQty});
            mutationSummary.push(`Changed ${sourceQty} × ${source.n} to ${targetQty} × ${target.n}.`);
            actionMeta={kind:'swap',sourceIndex,targetIndex,sourceBefore,targetBefore,sourceQty,targetQty};lastProductIndex=targetIndex;
          }
        }
      }
    }

    if(!actions.length&&wantsAdd&&!wantsRemove){
      const multi=splitMultiOrder(raw);
      if(multi.length){
        for(const {p,qty} of multi){const idx=products.indexOf(p),amount=Math.max(p.min||1,qty);actions.push({type:'ADD_ITEM',index:idx,quantity:amount});mutationSummary.push(`${amount} × ${p.n}`);lastProductIndex=idx;actionMeta={kind:'add',index:idx,before:Number(cart[idx]||0),quantity:amount}}
      }else if(explicitProduct&&explicitProduct.p!=null&&!explicitProduct.quote){
        const idx=products.indexOf(explicitProduct),qty=Math.max(explicitProduct.min||1,parseOrderQuantity(raw,explicitProduct));actions.push({type:'ADD_ITEM',index:idx,quantity:qty});mutationSummary.push(`${qty} × ${explicitProduct.n}`);lastProductIndex=idx;actionMeta={kind:'add',index:idx,before:Number(cart[idx]||0),quantity:qty};
      }
    }
    if(!actions.length&&wantsRemove){
      let p=explicitProduct;if(!p&&lastProductIndex!=null&&/\b(it|that|one|same)\b/.test(q))p=products[lastProductIndex]||null;
      if(p&&Number(cart[products.indexOf(p)]||0)>0){const idx=products.indexOf(p),qty=hasExplicitOrderQuantity(raw,p)?parseOrderQuantity(raw,p):Number(cart[idx]||0);actions.push({type:'REMOVE_ITEM',index:idx,quantity:qty});mutationSummary.push(`Removed ${Math.min(qty,Number(cart[idx]||0))} × ${p.n}.`);lastProductIndex=idx}
    }

    if(requestedFulfilment)actions.push({type:'SET_FULFILMENT',value:requestedFulfilment});
    const checkoutWords=/\b(?:checkout|check out|place order|finish order|complete order|send it|send order|continue to whats ?app|open whats ?app|go to whats ?app)\b/.test(q);
    const explicitHandoff=Boolean(requestedFulfilment)||checkoutWords;
    if(!actions.length&&!explicitHandoff)return false;
    if(!aiOrderEntries().length&&!actions.some(a=>a.type==='ADD_ITEM')){
      if(requestedFulfilment||checkoutWords){addMessage(raw,'user');addMessage('Your order is empty. Tell me what you would like first.','bot');startOrderBuilder();return true}
      return false;
    }
    if(checkoutWords&&!requestedFulfilment&&!aiFulfilmentConfirmed){
      // Execute any item mutation first, then ask for fulfilment before handoff.
      if(actions.length){const mutationActions=actions.filter(a=>a.type!=='SET_FULFILMENT');if(mutationActions.length){addMessage(raw,'user');const r=engine.execute(mutationActions,{source:'ai'});if(!r.ok){addMessage('I could not safely apply that order change. Please try one item at a time.','bot');return true}}else addMessage(raw,'user')}
      else addMessage(raw,'user');
      orderFollowupPending=false;addMessage('Before I open WhatsApp, choose collection, local delivery or corporate delivery.','bot');startAiCheckout();return true;
    }

    addMessage(raw,'user');
    const mutationActions=actions.filter(a=>a.type!=='CHECKOUT_WHATSAPP');
    const result=mutationActions.length?engine.execute(mutationActions,{source:'ai'}):{ok:true,state:engine.snapshot(),requirement:engine.snapshot().requirement};
    if(!result.ok){
      const msg=result.error==='item_not_in_order'?'That item is not currently in your order.':result.error==='item_limit'?`That change would exceed the ${MAX_ITEM_QTY}-item limit.`:'I could not safely apply that order change. Please try one item at a time.';
      addMessage(msg,'bot');return true;
    }
    if(actionMeta){
      if(actionMeta.kind==='swap')lastOrderAction={kind:'swap',sourceIndex:actionMeta.sourceIndex,targetIndex:actionMeta.targetIndex,sourceBefore:actionMeta.sourceBefore,targetBefore:actionMeta.targetBefore,sourceQty:actionMeta.sourceQty,targetQty:actionMeta.targetQty,at:Date.now()};
      else if(actionMeta.kind==='add')lastOrderAction={index:actionMeta.index,before:actionMeta.before,quantity:actionMeta.quantity,at:Date.now()};
    }
    if(requestedFulfilment)aiFulfilmentConfirmed=true;
    const snapshot=engine.snapshot();orderFollowupPending=!explicitHandoff&&snapshot.items.length>0;

    if(explicitHandoff){
      if(!aiFulfilmentConfirmed&&!requestedFulfilment){addMessage('Before I open WhatsApp, choose collection, local delivery or corporate delivery.','bot');startAiCheckout();return true}
      const req=snapshot.requirement,label={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[snapshot.fulfil]||'Fulfilment';
      if(req.state==='needs-more'){
        orderFollowupPending=false;
        addMessage(`${label} selected. Your order is ${money(req.short)} below the ${req.label} minimum. I’m opening WhatsApp as an enquiry so the team can help you add items or switch to collection.`,'bot');
        stopSpeaking();closePanel();engine.execute([{type:'ENQUIRE_WHATSAPP'}],{source:'ai',checkoutSameTab:true});return true;
      }
      if(req.state==='ready'){
        addMessage(`${label} selected. Opening WhatsApp now.`,'bot');stopSpeaking();closePanel();
        // No timeout and no popup: same-tab handoff cannot be blocked by expired user activation.
        engine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});return true;
      }
    }
    const lead=mutationSummary.length?`${mutationSummary.join(' + ')} ${snapshot.total?`Total ${money2(snapshot.total)}.`:''}`:'Order updated.';
    addMessage(lead,'bot');aiCartCard({lead:'Order updated.'});return true;
  }

  function routeProductSubstitution(raw){
    const q=normalizedChoice(raw);
    if(!/\b(?:change|replace|swap|switch)\b/.test(q))return false;
    const pivotTerms=[' to ',' for ',' with ',' into '];
    let pivot=-1,pivotTerm='';
    for(const term of pivotTerms){const at=q.lastIndexOf(term);if(at>pivot){pivot=at;pivotTerm=term}}
    if(pivot<0)return false;
    const beforeText=q.slice(0,pivot),afterText=q.slice(pivot+pivotTerm.length);
    const target=matchOrderProduct(afterText)||matchOrderProduct(raw);
    if(!target||target.quote||target.p==null)return false;
    const targetIndex=products.indexOf(target);
    let source=matchOrderProduct(beforeText);
    if(source===target)source=null;
    if(source&&Number(cart[products.indexOf(source)]||0)<=0)source=null;
    if(!source&&lastProductIndex!=null&&lastProductIndex!==targetIndex&&Number(cart[lastProductIndex]||0)>0)source=products[lastProductIndex]||null;
    if(!source)return false;
    const sourceIndex=products.indexOf(source),sourceBefore=Number(cart[sourceIndex]||0),targetBefore=Number(cart[targetIndex]||0);
    const sourceQty=Math.max(1,Math.min(sourceBefore,parseSpokenNumber(quantityTextWithoutProduct(beforeText,source),30)||1));
    const targetExplicit=parseSpokenNumber(quantityTextWithoutProduct(afterText,target),30);
    const targetQty=Math.max(target.min||1,Math.min(MAX_ITEM_QTY,targetExplicit==null?sourceQty:targetExplicit));
    if(targetBefore+targetQty>MAX_ITEM_QTY){
      addMessage(raw,'user');addMessage(`I can’t make that change because ${target.n} would exceed the ${MAX_ITEM_QTY}-item limit. Reduce the target quantity and try again.`,'bot');return true;
    }
    const sourceAfter=sourceBefore-sourceQty,targetAfter=targetBefore+targetQty;
    if(sourceAfter>0)cart[sourceIndex]=sourceAfter;else delete cart[sourceIndex];
    cart[targetIndex]=targetAfter;
    lastOrderAction={kind:'swap',sourceIndex,targetIndex,sourceBefore,targetBefore,sourceQty,targetQty,at:Date.now()};
    lastProductIndex=targetIndex;saveOrderSession();clearOrderSessionIfEmpty();renderCart();orderFollowupPending=true;
    addMessage(raw,'user');addMessage(`Changed ${sourceQty} × ${source.n} to ${targetQty} × ${target.n}.`,'bot');aiCartCard({lead:'Order corrected.'});return true;
  }

  function routeOrderCommand(raw){
    const q=normalizedChoice(raw);if(!q)return false;
    const requestedFulfilment=parseFulfilmentChoice(raw);
    // Broad office/meeting questions are knowledge requests, not cart mutations.
    // Let them fall through to the corporate guide instead of fuzzy-matching a quote-only product.
    if(isBroadCorporateInfoQuery(raw))return false;
    if(routeStructuredCommerce(raw))return true;
    if(/^(?:clear|empty|cancel|reset)(?: my| the)? (?:order|cart)$|^(?:clear|empty) (?:everything|it all)$/.test(q)){
      addMessage(raw,'user');cart={};lastOrderAction=null;lastProductIndex=null;orderFollowupPending=false;aiFulfilmentConfirmed=false;clearExperience();saveOrderSession();clearOrderSessionIfEmpty();renderCart();addMessage('Order cleared.','bot');return true;
    }
    if(/^(?:undo|undo that|undo last|undo the last (?:change|item|addition)|take that back)$/.test(q)&&lastOrderAction){
      addMessage(raw,'user');const a=lastOrderAction;
      if(a.kind==='swap'){
        if(a.sourceBefore>0)cart[a.sourceIndex]=a.sourceBefore;else delete cart[a.sourceIndex];
        if(a.targetBefore>0)cart[a.targetIndex]=a.targetBefore;else delete cart[a.targetIndex];
        lastProductIndex=a.sourceIndex;
      }else{
        const p=products[a.index];if(a.before>0)cart[a.index]=a.before;else delete cart[a.index];lastProductIndex=a.index;
      }
      lastOrderAction=null;saveOrderSession();clearOrderSessionIfEmpty();renderCart();orderFollowupPending=aiOrderEntries().length>0;addMessage('Last order change undone.','bot');aiCartCard({lead:'Last change undone.'});return true;
    }
    if(/^(?:same again|another one|one more|repeat that|repeat the last one)$/.test(q)&&lastProductIndex!=null){
      const p=products[lastProductIndex];if(p&&p.p!=null&&!p.quote){addMessage(raw,'user');addRecommendedProduct(lastProductIndex,p.min||1);return true}
    }
    if(routeProductSubstitution(raw))return true;
    const setProduct=matchOrderProduct(raw);
    if(setProduct&&Number(cart[products.indexOf(setProduct)]||0)>0&&/\b(?:make|change|set)\b/.test(q)){
      const desired=parseSpokenNumber(quantityTextWithoutProduct(raw,setProduct),30);if(desired!=null){addMessage(raw,'user');const idx=products.indexOf(setProduct),before=Number(cart[idx]||0),next=Math.max(setProduct.min||1,Math.min(MAX_ITEM_QTY,desired));cart[idx]=next;lastOrderAction={index:idx,before,quantity:next-before,at:Date.now()};lastProductIndex=idx;saveOrderSession();renderCart();orderFollowupPending=true;addMessage(`${setProduct.n} is now ${next}.`,'bot');aiCartCard({lead:'Quantity corrected.'});return true}
    }
    if(routeRecentOrderCorrection(raw))return true;
    const readyCard=body.querySelector('.lovely-ai-checkout-card');
    if(readyCard&&aiOrderEntries().length&&/^(?:yes|yes please|sure|okay|ok|go ahead|continue|send it|send order|do it|proceed)$/.test(q)){
      addMessage(raw,'user');addMessage('Opening WhatsApp.','bot');stopSpeaking();closePanel();if(window.LovelyOrderEngine)window.LovelyOrderEngine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});else checkout({sameTab:true});return true;
    }
    if(orderFollowupPending&&aiOrderEntries().length&&/\b(?:that s all|thats all|that is all|that s it|thats it|nothing else|no more|done|finished|finish|checkout|check out|complete it|proceed)\b/.test(q)){
      orderFollowupPending=false;addMessage(raw,'user');startAiCheckout();return true;
    }
    if(/\b(continue|send|open|go)\b.*\bwhats ?app\b|\bwhats ?app\b.*\b(order|checkout)\b/.test(q)){
      if(aiOrderEntries().length&&!aiFulfilmentConfirmed){addMessage(raw,'user');addMessage('Before I open WhatsApp, choose collection, local delivery or corporate delivery.','bot');startAiCheckout();return true}
      const req=checkoutRequirement();
      if(aiOrderEntries().length&&req.state==='ready'){addMessage(raw,'user');addMessage('Opening WhatsApp.','bot');stopSpeaking();closePanel();if(window.LovelyOrderEngine)window.LovelyOrderEngine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});else checkout({sameTab:true});return true}
      if(aiOrderEntries().length){addMessage(raw,'user');startAiCheckout();return true}
    }
    if(/\b(check ?out|place order|finish order|complete order|proceed|pay now|payment)\b/.test(q)){
      addMessage(raw,'user');startAiCheckout();return true;
    }
    if(/\b(view|show|see|review|check)\b.*\b(order|cart)\b|\b(my order|my cart|order total|cart total)\b/.test(q)){
      addMessage(raw,'user');clearExperience();aiCartCard();return true;
    }
    if(aiOrderEntries().length&&/\b(collection|collect|pick ?up|pickup|local delivery|corporate delivery|office delivery|meeting delivery|delivery|deliver(?:ed)?|drop ?off|bring it|bring my order)\b/.test(q)){
      if(routeExplicitFulfilment(raw))return true;
      addMessage(raw,'user');addMessage('Choose collection, local delivery or corporate delivery.','bot');startAiCheckout();return true;
    }
    if(experience.mode==='order'){
      const cat=ORDER_CATEGORIES.find(c=>q.includes(c.toLowerCase()));if(cat){addMessage(raw,'user');orderBuilderChoice('cat:'+cat);return true}
      const picked=matchOrderProduct(raw);if(picked&&!picked.quote&&picked.p!=null){addMessage(raw,'user');const idx=products.indexOf(picked);clearExperience();addRecommendedProduct(idx,parseOrderQuantity(raw,picked));return true}
    }
    const wantsRemove=/\b(remove|delete|take off|cancel)\b/.test(q);
    let wantsAdd=/\b(add|order|want|i want|i would like|i d like|give me|i ll have|can i get|get me|take)\b/.test(q);
    const questionOnly=/\b(how much|price|cost|what is|what s|tell me|ingredient|benefit|healthy|health)\b/.test(q);
    const explicitProduct=matchOrderProduct(raw);if(!wantsAdd&&!wantsRemove&&!questionOnly&&explicitProduct&&(hasExplicitOrderQuantity(raw,explicitProduct)||orderFollowupPending))wantsAdd=true;
    if(wantsAdd&&!wantsRemove){
      const multi=splitMultiOrder(raw);
      if(multi.length){
        addMessage(raw,'user');const addedNames=[];
        multi.forEach(({p,qty})=>{const idx=products.indexOf(p),current=Number(cart[idx]||0),amount=Math.max(p.min||1,qty),next=Math.min(MAX_ITEM_QTY,current+amount);cart[idx]=next;lastProductIndex=idx;lastOrderAction={index:idx,before:current,quantity:next-current,at:Date.now()};addedNames.push(`${next-current} × ${p.n}`)});
        saveOrderSession();renderCart();orderFollowupPending=true;addMessage(`${addedNames.join(' + ')} added. Total ${money2(aiOrderTotal())}.`,'bot');
        if(requestedFulfilment&&routeExplicitFulfilment(raw,{userAlreadyAdded:true}))return true;
        aiCartCard({lead:'Order updated.'});return true;
      }
    }
    if(wantsRemove||wantsAdd){
      let p=explicitProduct||matchOrderProduct(raw);
      if(!p&&lastProductIndex!=null&&/\b(it|that|one|same)\b/.test(q))p=products[lastProductIndex]||null;
      if(!p){if(wantsAdd&&/\b(order|add|want|get)\b/.test(q)){addMessage(raw,'user');startOrderBuilder();return true}return false}
      addMessage(raw,'user');const idx=products.indexOf(p);lastProductIndex=idx;
      if(p.quote||p.p==null){addMessage(`${p.n} is confirmed on WhatsApp because its final price or configuration can vary. I can still help you with the rest of the order here.`,'bot');addOrderLink(body.lastElementChild);return true}
      if(wantsRemove){
        const current=Number(cart[idx]||0);if(current){const qty=hasExplicitOrderQuantity(raw,p)?parseOrderQuantity(raw,p):current;const next=current-qty;if(next>0){cart[idx]=next;addMessage(`${Math.min(qty,current)} × ${p.n} removed. ${next} remain in your order.`,'bot')}else{delete cart[idx];addMessage(`${p.n} removed from your order.`,'bot')}saveOrderSession();clearOrderSessionIfEmpty();renderCart()}else addMessage(`${p.n} is not currently in your order.`,'bot');aiCartCard();return true
      }
      const qty=Math.max(p.min||1,parseOrderQuantity(raw,p));const current=Number(cart[idx]||0);const next=Math.min(MAX_ITEM_QTY,current+qty);cart[idx]=next;lastOrderAction={index:idx,before:current,quantity:next-current,at:Date.now()};saveOrderSession();renderCart();
      orderFollowupPending=true;addMessage(`${next-current} × ${p.n} added. Total ${money2(aiOrderTotal())}.`,'bot');
      if(requestedFulfilment&&routeExplicitFulfilment(raw,{userAlreadyAdded:true}))return true;
      aiCartCard({lead:'Order updated.'});return true;
    }
    if(/^start (an )?order$|^order$|browse (the )?menu|show (me )?the menu/.test(q)){addMessage(raw,'user');startOrderBuilder();return true}
    return false;
  }

  function addRecommendedProduct(index,qty){
    const p=products[index];if(!p||p.quote||p.p==null)return;lastProductIndex=index;
    const amount=Math.max(1,Math.min(30,Number(qty)||1)),current=Number(cart[index]||0);if(current>=MAX_ITEM_QTY){toast(`Maximum ${MAX_ITEM_QTY} per item. Contact us for a larger order.`);return}const next=Math.min(MAX_ITEM_QTY,current+amount),added=next-current;cart[index]=next;lastOrderAction={index,before:current,quantity:added,at:Date.now()};saveOrderSession();renderCart();toast((added>1?added+' × ':'')+p.n+(added<amount?` added · capped at ${MAX_ITEM_QTY}`:' added'));
    orderFollowupPending=true;addMessage(`Added ${added} × ${p.n}. Total ${money2(aiOrderTotal())}.`,'bot');
    aiCartCard({lead:'Added.'});
  }

  function hydrationReminderEnabled(){try{return localStorage.getItem(HYDRATION_REMINDER_KEY)==='1'}catch(_){return false}}
  function hydrationReminderTime(){try{return localStorage.getItem(HYDRATION_REMINDER_TIME_KEY)||'10:00'}catch(_){return '10:00'}}
  function hydrationDayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function parseHydrationReminderTime(raw){
    const q=String(raw||'').toLowerCase();const m=q.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);if(!m)return null;
    let h=Number(m[1]),min=Number(m[2]||0);if(min>59)return null;if(m[3]){if(h<1||h>12)return null;if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0}else if(h>23)return null;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  async function enableHydrationReminder(raw=''){
    const requested=parseHydrationReminderTime(raw)||hydrationReminderTime()||'10:00';
    try{
      localStorage.setItem(HYDRATION_REMINDER_KEY,'1');localStorage.setItem(HYDRATION_REMINDER_TIME_KEY,requested);
      const now=new Date(),[rh,rm]=requested.split(':').map(Number),today=hydrationDayKey(now);
      if(now.getHours()*60+now.getMinutes()<rh*60+rm)localStorage.removeItem(HYDRATION_REMINDER_LAST_KEY);else localStorage.setItem(HYDRATION_REMINDER_LAST_KEY,today);
    }catch(_){}
    scheduleHydrationReminderCheck();
    let notificationNote='If you allow browser notifications, Lovely can show the reminder while the site or installed PWA is active; if it was closed, Lovely will catch up when you return.';
    if('Notification' in window&&Notification.permission==='default'){
      try{const result=await Notification.requestPermission();notificationNote=result==='granted'?'Browser notifications are allowed. Lovely can show the reminder while the site or installed PWA is active; if it was closed, Lovely will catch up when you return.':'No problem — the reminder will appear when Lovely is open or when you return.'}catch(_){notificationNote='The reminder will appear when Lovely is open or when you return.'}
    }else if(!('Notification' in window)||Notification.permission!=='granted') notificationNote='The reminder will appear when Lovely is open or when you return.';
    const msg=`Hydration reminder is on for about ${requested}. Drink water regularly and adjust for heat and activity; if a clinician has limited your fluids, follow that plan. ${notificationNote} Say “turn off hydration reminders” any time.`;
    addMessage(msg,'bot');if(voiceReplyEnabled)speak(`Hydration reminder on for about ${requested}.`);else setStatus('Daily hydration reminder is on.');return true;
  }
  function disableHydrationReminder(){
    try{localStorage.removeItem(HYDRATION_REMINDER_KEY);localStorage.removeItem(HYDRATION_REMINDER_TIME_KEY)}catch(_){}
    if(hydrationTimer){clearTimeout(hydrationTimer);hydrationTimer=null}
    const msg='Daily hydration reminders are off. You can turn them back on any time.';addMessage(msg,'bot');if(voiceReplyEnabled)speak(msg);else setStatus('Hydration reminders are off.');return true;
  }
  async function showHydrationNotification(text){
    if(!('Notification' in window)||Notification.permission!=='granted')return false;
    try{const reg=await navigator.serviceWorker?.ready;if(reg&&reg.showNotification){await reg.showNotification('Lovely hydration reminder',{body:text,icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:'lovely-hydration-daily',renotify:false,data:{url:'/'}});return true}}catch(_){}
    try{new Notification('Lovely hydration reminder',{body:text,icon:'/assets/icon-192.png',tag:'lovely-hydration-daily'});return true}catch(_){return false}
  }
  async function maybeDeliverHydrationReminder(){
    if(!hydrationReminderEnabled())return;const now=new Date(),today=hydrationDayKey(now),time=hydrationReminderTime(),[h,m]=time.split(':').map(Number);
    if(now.getHours()*60+now.getMinutes()<h*60+m)return;let last='';try{last=localStorage.getItem(HYDRATION_REMINDER_LAST_KEY)||''}catch(_){}if(last===today)return;
    try{localStorage.setItem(HYDRATION_REMINDER_LAST_KEY,today)}catch(_){}
    const text='A gentle hydration check-in: have some water when it suits you. Heat, activity and sweating can increase fluid needs; if a clinician has you on a fluid restriction, follow that plan.';
    if(panel.classList.contains('open'))addMessage(text,'bot');else if(!(await showHydrationNotification(text)))toast('Hydration check-in: remember water when it suits you.');
  }
  function scheduleHydrationReminderCheck(){if(hydrationTimer){clearTimeout(hydrationTimer);hydrationTimer=null}if(!hydrationReminderEnabled())return;maybeDeliverHydrationReminder();hydrationTimer=setTimeout(scheduleHydrationReminderCheck,5*60*1000)}
  function routeHydrationReminderCommand(raw){
    const q=normalizedChoice(raw);if(!q)return false;
    const explicitOn=/(?:turn|switch)\s+on\b.*(?:hydration|water).*reminder|\benable\b.*(?:hydration|water).*reminder/;
    const explicitOff=/(?:turn|switch)\s+off\b.*(?:hydration|water).*reminder|\b(?:disable|stop)\b.*(?:hydration|water).*reminder|(?:hydration|water).*reminder.*\b(?:off|stop|disable)\b|no more (?:hydration|water).*reminder/;
    const genericReminder=/(?:hydration|water) reminders?|daily hydration reminders?/;
    if(explicitOn.test(q)){addMessage(raw,'user');enableHydrationReminder(raw);return true}
    if(explicitOff.test(q)){addMessage(raw,'user');disableHydrationReminder();return true}
    if(genericReminder.test(q)||(/(?:remind me|daily reminder)/.test(q)&&/(?:water|hydrat|drink|daily|every day|reminder)/.test(q))){addMessage(raw,'user');enableHydrationReminder(raw);return true}
    return false;
  }

  const MAX_AI_TRANSCRIPT_ITEMS=28;
  function trimAiTranscript(){
    const items=[...body.querySelectorAll('.lovely-ai-message,.lovely-ai-experience')];
    const overflow=items.length-MAX_AI_TRANSCRIPT_ITEMS;
    if(overflow>0)items.slice(0,overflow).forEach(el=>el.remove());
  }
  function scrollTranscript(force=false){
    const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nearBottom=body.scrollHeight-body.scrollTop-body.clientHeight<120;
    if(force||nearBottom)requestAnimationFrame(()=>{try{body.scrollTo({top:body.scrollHeight,behavior:reduced?'auto':'smooth'})}catch(_){body.scrollTop=body.scrollHeight}});
  }
  function addMessage(content,type){
    const el=document.createElement('div');
    el.className='lovely-ai-message '+type;
    el.textContent=String(content??'');
    body.appendChild(el);trimAiTranscript();scrollTranscript(true);return el;
  }
  function addOrderLink(target){
    const last=target||body.lastElementChild;
    if(last && last.classList.contains('bot') && !last.querySelector('.lovely-ai-order')){
      const a=document.createElement('a');
      a.className='lovely-ai-order';a.href='https://wa.me/26774583606';a.target='_blank';a.rel='noopener';a.textContent='ORDER / ASK ON WHATSAPP';
      last.appendChild(document.createElement('br'));last.appendChild(a);
    }
  }
  function addAnswerActions(target,query){
    const p=productMatch(query);if(!p){addOrderLink(target);return}
    const idx=products.indexOf(p);if(idx<0||p.quote||p.p==null){addOrderLink(target);return}
    lastProductIndex=idx;
    const actions=document.createElement('div');actions.className='lovely-ai-result-actions lovely-ai-answer-actions';
    const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='primary';addBtn.dataset.expAdd=String(idx);addBtn.dataset.expQty='1';addBtn.textContent='ADD TO ORDER';actions.appendChild(addBtn);
    const checkoutBtn=document.createElement('button');checkoutBtn.type='button';checkoutBtn.className='secondary';checkoutBtn.dataset.aiCheckout='start';checkoutBtn.textContent='CHECKOUT';actions.appendChild(checkoutBtn);
    target.appendChild(actions);
  }
  function setStatus(text,state=''){
    voiceStatus.textContent=text;voiceStatus.className='lovely-ai-voice-status'+(state?' '+state:'');
  }

  function wantsDetailedReply(raw){return /\b(?:tell me more|more detail|details?|explain(?: more)?|go deeper|in depth|full answer|break it down|why exactly|how exactly)\b/i.test(String(raw||''))}
  function spokenReplyText(text,question=''){
    let clean=String(text||'').replace(/https?:\/\/\S+/g,'').replace(/[\*#_`>|~]+/g,' ').replace(/\s*[•▪◦]\s*/g,'. ').replace(/\s+/g,' ').trim().replace(/\bP(\d[\d,]*)\.00\b/g,'P$1');
    clean=clean.replace(/^(?:Coffee guide|Hydration guide|Caffeine guide|Smoothies|Water|Corporate orders)\s+/i,'').replace(/^(?:sure|of course|certainly|absolutely|no problem|great|perfect|okay|ok)[\s,!.—:-]+/i,'').trim();
    if(!clean)return'';
    const q=String(question||'');
    if(!wantsDetailedReply(q)&&/^Health & wellness drinks\b/i.test(clean))return 'Lovely has eight functional Health Drinks at P25, plus Mineral Water P15 and Alkaline Water P20.';
    const urgent=isUrgentHealthQuestion(q)||/\b(?:emergency|urgent|call emergency|seek urgent|self-harm|suicid|anaphyl|choking|stroke)\b/i.test(clean);
    const safety=/\b(?:pregnan|breastfeed|allerg|medication|medicine|clinician|pharmacist|fluid restriction|caffeine limit|severe|urgent)\b/i.test(q+' '+clean);
    if(wantsDetailedReply(q))return clean.slice(0,760);
    const sentences=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];
    const next=String(sentences[1]||'').trim();
    const nextRequired=Boolean(next)&&(/\?$/.test(next)||/^(?:say|choose|tell me|enter|select|give me|pick|confirm)\b/i.test(next));
    let chosen=sentences.slice(0,urgent?2:(safety?2:(nextRequired?2:1))).join(' ').trim();
    const maxWords=urgent?58:(safety?46:(nextRequired?38:30));
    const words=chosen.split(/\s+/);if(words.length>maxWords)chosen=words.slice(0,maxWords).join(' ').replace(/[,;:]?$/,'')+'.';
    return chosen.slice(0,urgent?520:360).trim();
  }
  function speakingNow(){return Boolean(currentAudio||currentSpeech||panel.classList.contains('is-speaking'))}
  function pauseSpeechForBargeIn(){
    if(!speakingNow()||bargePauseActive)return false;
    bargePauseActive=true;bargePausedAudio=null;bargePausedSynth=false;
    if(currentAudio&&!currentAudio.paused){try{currentAudio.pause();bargePausedAudio=currentAudio}catch(_){}}
    if(currentSpeech&&'speechSynthesis' in window&&window.speechSynthesis.speaking&&!window.speechSynthesis.paused){try{window.speechSynthesis.pause();bargePausedSynth=true}catch(_){}}
    panel.classList.remove('is-speaking');setStatus('Listening…','listening');return true;
  }
  function resumeSpeechAfterEcho(){
    if(!bargePauseActive)return;
    const audio=bargePausedAudio,synth=bargePausedSynth;bargePauseActive=false;bargePausedAudio=null;bargePausedSynth=false;
    if(audio&&currentAudio===audio){try{audio.play().catch(()=>{})}catch(_){}panel.classList.add('is-speaking');setStatus('Lovely is speaking — you can interrupt me.','speaking');return}
    if(synth&&currentSpeech&&'speechSynthesis' in window){try{window.speechSynthesis.resume()}catch(_){}panel.classList.add('is-speaking');setStatus('Lovely is speaking — you can interrupt me.','speaking')}
  }
  function isLikelyPartialSpeechEcho(raw){
    if(!lastSpokenReply||!speakingNow())return false;const heard=normalizedChoice(raw),spoken=normalizedChoice(lastSpokenReply);if(!heard||!spoken)return false;
    const hw=heard.split(' ').filter(Boolean),sw=spoken.split(' ').filter(Boolean);if(!hw.length)return false;
    if(hw.length===1){const w=hw[0];return Date.now()-lastSpeechStartedAt<700&&w.length>=5&&sw[0]===w&&!isSilenceCommand(w)&&!isStopListeningCommand(w)}
    if(spoken.startsWith(heard))return true;const probe=hw.slice(0,Math.min(5,hw.length)).join(' ');return spoken.includes(probe);
  }
  function voiceControlCore(raw){return normalizedChoice(raw).replace(/^(?:hey )?lovely /,'').replace(/\bplease\b/g,'').replace(/\s+/g,' ').trim()}
  function isSilenceCommand(raw){const q=voiceControlCore(raw);return /^(?:stop|stop now|stop it|stop talking|stop speaking|just stop|quiet|be quiet|shh|shush|enough|enough now|that s enough|thats enough|hold on|hang on|wait|wait a second|pause|mute|don t talk|dont talk|no more talking|stop the voice|shut up)$/.test(q)}
  function isStopListeningCommand(raw){const q=voiceControlCore(raw);return /^(?:bye|goodbye|stop listening|end conversation|end voice|turn off listening|turn voice off|stop voice)$/.test(q)}
  function handleVoiceControl(raw){
    if(isSilenceCommand(raw)){stopSpeaking();abortPendingAi();setStatus(handsFreeConversation?'Listening…':'Stopped.');if(handsFreeConversation)maybeResumeHandsFree();return true}
    if(isStopListeningCommand(raw)){stopSpeaking();abortPendingAi();handsFreeConversation=false;setStatus('Voice conversation stopped.');return true}
    return false;
  }
  function handleInterimVoiceControl(raw){
    if(!raw||(!isSilenceCommand(raw)&&!isStopListeningCommand(raw)))return false;
    stopSpeaking();abortPendingAi();input.value='';
    if(isStopListeningCommand(raw)){handsFreeConversation=false;setStatus('Voice conversation stopped.')}else setStatus(handsFreeConversation?'Listening…':'Stopped.');
    return true;
  }
  function stopSpeaking(){
    bargePauseActive=false;bargePausedAudio=null;bargePausedSynth=false;
    if(speechAbort){try{speechAbort.abort()}catch(_){ } speechAbort=null}
    if(currentAudio){try{currentAudio.pause();currentAudio.src=''}catch(_){ } currentAudio=null}
    if('speechSynthesis' in window){window.speechSynthesis.cancel()}
    currentSpeech=null;panel.classList.remove('is-speaking');
  }
  function selectFemaleFallbackVoice(){
    if(!('speechSynthesis' in window)) return null;
    const voices=window.speechSynthesis.getVoices();
    const ranked=[
      /google uk english female/i,/microsoft (sonia|libby|aria|jenny|zira|ava|emma)/i,
      /samantha/i,/serena/i,/victoria/i,/karen/i,/moira/i,/tessa/i,/female/i
    ];
    for(const re of ranked){const v=voices.find(v=>/^en(?:-|_)/i.test(v.lang||'')&&re.test(v.name||''));if(v)return v}
    return voices.find(v=>/^en-ZA$/i.test(v.lang||''))||voices.find(v=>/^en-GB$/i.test(v.lang||''))||voices.find(v=>/^en(?:-|_)/i.test(v.lang||''))||null;
  }
  function browserVoiceFallback(text){
    if(!('speechSynthesis' in window) || !text) return false;
    const clean=String(text).replace(/\s+/g,' ').trim();
    const utter=new SpeechSynthesisUtterance(clean);
    utter.rate=.96;utter.pitch=1.02;utter.volume=1;
    const preferred=selectFemaleFallbackVoice();if(preferred)utter.voice=preferred;
    utter.onstart=()=>{lastSpeechStartedAt=Date.now();panel.classList.add('is-speaking');setStatus('Lovely is speaking — you can interrupt me.','speaking');scheduleBargeInListening(80)};
    utter.onend=()=>{panel.classList.remove('is-speaking');currentSpeech=null;setStatus(handsFreeConversation?'I’m listening for your reply…':'Tap the microphone to talk. Lovely voice is on.');maybeResumeHandsFree()};
    utter.onerror=()=>{panel.classList.remove('is-speaking');currentSpeech=null;setStatus('Tap the microphone to talk. Lovely voice is on.')};
    lastSpokenReply=clean;currentSpeech=utter;window.speechSynthesis.speak(utter);return true;
  }
  async function speak(text,question=''){
    if(!voiceReplyEnabled || !text) return;
    stopSpeaking();
    const clean=spokenReplyText(text,question)
      .replace(/https?:\/\/\S+/g,'')
      .replace(/[\*#_`>|~]+/g,' ')
      .replace(/\s*[•▪◦]\s*/g,'. ')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,900);
    if(!clean)return;
    if(standaloneMode){browserVoiceFallback(clean);return}
    const controller=new AbortController();
    speechAbort=controller;
    let ttsTimedOut=false;
    const ttsTimer=setTimeout(()=>{ttsTimedOut=true;try{controller.abort()}catch(_){}},6500);
    try{
      setStatus('Preparing Lovely’s voice…','processing');
      const res=await fetch('/api/lovely-tts',{method:'POST',headers:apiHeaders({'Content-Type':'application/json','Accept':'audio/mpeg'}),body:JSON.stringify({text:clean}),signal:controller.signal});
      if(!res.ok) throw new Error('TTS unavailable');
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const audio=new Audio(url);currentAudio=audio;lastSpokenReply=clean;
      audio.preload='auto';
      audio.onplay=()=>{lastSpeechStartedAt=Date.now();panel.classList.add('is-speaking');setStatus('Lovely is speaking — you can interrupt me.','speaking');scheduleBargeInListening(80)};
      const done=()=>{panel.classList.remove('is-speaking');if(currentAudio===audio)currentAudio=null;URL.revokeObjectURL(url);setStatus(handsFreeConversation?'I’m listening for your reply…':'Tap the microphone to talk. Lovely voice is on.');maybeResumeHandsFree()};
      audio.onended=done;audio.onerror=done;
      await audio.play();
    }catch(err){
      if(err&&err.name==='AbortError'&&!ttsTimedOut)return;
      panel.classList.remove('is-speaking');
      browserVoiceFallback(clean);
    }finally{clearTimeout(ttsTimer);if(speechAbort===controller)speechAbort=null}
  }

  async function askAI(q,{spoken=false}={}){
    if(standaloneMode) throw new Error('Standalone menu guide');
    if(navigator.onLine===false){cloudAvailable=false;setConnection('basic','Offline menu guide');throw new Error('Offline')}
    if(cloudAvailable===false) throw new Error('Cloud AI unavailable');
    if(cloudAvailable===null) await checkCloud();
    if(!cloudAvailable) throw new Error('Cloud AI unavailable');
    const recent=conversation.slice(-10);
    const controller=new AbortController();
    aiAbortController=controller;
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const liveState={order:aiOrderEntries().map(([i,qty])=>({name:products[i]?.n,qty:Number(qty),price:products[i]?.p})),orderTotal:aiOrderTotal(),fulfilment:fulfil,lastProduct:lastProductIndex!=null?products[lastProductIndex]?.n:null,flow:experience.mode||null,flowStep:experience.step||null,hydrationReminder:hydrationReminderEnabled()?hydrationReminderTime():null};
      const res=await fetch('/api/lovely-ai',{method:'POST',headers:apiHeaders({'Content-Type':'application/json','Accept':'application/json'}),body:JSON.stringify({question:q,history:recent,context:'coffee',mode:spoken?'voice':'text',state:liveState}),signal:controller.signal});
      if(!res.ok){
        if(res.status===404||res.status===503){cloudAvailable=false;setConnection('basic','Menu guide mode')}
        throw new Error('AI unavailable');
      }
      const data=await res.json();
      const answer=String(data.answer||'').trim();
      if(!answer) throw new Error('Empty answer');
      return answer;
    }finally{clearTimeout(timer);if(aiAbortController===controller)aiAbortController=null}
  }


  function shouldTryStructuredPlanner(raw){
    const q=normalizedChoice(raw);if(!q||isBroadCorporateInfoQuery(raw))return false;
    if(isUrgentHealthQuestion(raw))return false;
    const p=matchOrderProduct(raw);
    if(p&&!isProductInfoQuery(raw))return true;
    if(p&&/\b(?:want|need|have|take|get|sort|send|bring|deliver|collect|pickup|pick up|order|buy|make|put|give|replace|swap|change|instead|please)\b/.test(q))return true;
    if(/\b(?:order|buy|purchase|cart|basket|checkout|check out|whats ?app|send it|send order|deliver|delivery|collect|collection|pickup|pick up|bring|drop off|takeaway|take away|to go)\b/.test(q))return true;
    if(aiOrderEntries().length&&/\b(?:done|ready|finish|finished|that s all|thats all|that is all|go ahead|continue|yes please|proceed)\b/.test(q))return true;
    return false;
  }
  function currentActionPlannerState(){
    return {order:aiOrderEntries().map(([i,qty])=>({name:products[i]?.n,qty:Number(qty),price:products[i]?.p})),orderTotal:aiOrderTotal(),fulfilment:aiFulfilmentConfirmed?fulfil:null,lastProduct:lastProductIndex!=null?products[lastProductIndex]?.n:null,flow:experience.mode||null,flowStep:experience.step||null,hydrationReminder:hydrationReminderEnabled()?hydrationReminderTime():null};
  }
  async function requestStructuredCommercePlan(q,{spoken=false}={}){
    if(standaloneMode||navigator.onLine===false||cloudAvailable===false)return null;
    if(cloudAvailable===null){try{await checkCloud()}catch(_){return null}}
    if(!cloudAvailable)return null;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5200);
    try{
      const res=await fetch('/api/lovely-actions',{method:'POST',headers:apiHeaders({'Content-Type':'application/json','Accept':'application/json'}),body:JSON.stringify({question:q,history:conversation.slice(-6),context:'coffee',mode:spoken?'voice':'text',state:currentActionPlannerState()}),signal:controller.signal});
      if(!res.ok)return null;
      const data=await res.json();
      if(!data||data.handled!==true||!Array.isArray(data.actions))return null;
      return {handled:true,actions:data.actions.slice(0,10),handoff:data.handoff===true,clarify:['product','quantity','fulfilment'].includes(data.clarify)?data.clarify:null};
    }catch(_){return null}finally{clearTimeout(timer)}
  }
  function executeStructuredCommercePlan(raw,plan){
    const engine=window.LovelyOrderEngine;if(!engine||!plan||plan.handled!==true)return false;
    addMessage(raw,'user');
    const actions=Array.isArray(plan.actions)?plan.actions:[];
    const hasFulfilment=actions.some(a=>a&&a.type==='SET_FULFILMENT');
    const result=actions.length?engine.execute(actions,{source:'ai'}):{ok:true,state:engine.snapshot(),requirement:engine.snapshot().requirement};
    if(!result.ok){addMessage('I could not safely apply that order change. Please try one item at a time.','bot');return true}
    if(hasFulfilment)aiFulfilmentConfirmed=true;
    const snapshot=engine.snapshot();
    if(plan.clarify==='product'&&!snapshot.items.length){addMessage('What would you like to order? You can name an item and quantity, for example “3 cappuccinos”.','bot');startOrderBuilder();return true}
    if(plan.clarify==='quantity'){addMessage('How many would you like?','bot');orderFollowupPending=true;return true}
    if(plan.clarify==='fulfilment'||(plan.handoff&&!aiFulfilmentConfirmed&&!hasFulfilment)){
      addMessage('Before I open WhatsApp, choose collection, local delivery or corporate delivery.','bot');startAiCheckout();return true;
    }
    if(plan.handoff){
      if(!snapshot.items.length){addMessage('Your order is empty. Tell me what you would like first.','bot');startOrderBuilder();return true}
      const req=snapshot.requirement,label={collection:'Collection',delivery:'Local delivery',corporate:'Corporate delivery'}[snapshot.fulfil]||'Fulfilment';
      orderFollowupPending=false;
      if(req.state==='needs-more'){
        addMessage(`${label} selected. Your order is ${money(req.short)} below the ${req.label} minimum. I’m opening WhatsApp as an enquiry so the team can help you complete it.`,'bot');
        stopSpeaking();closePanel();engine.execute([{type:'ENQUIRE_WHATSAPP'}],{source:'ai',checkoutSameTab:true});return true;
      }
      if(req.state==='ready'){
        addMessage(`${label} selected. Opening WhatsApp now.`,'bot');stopSpeaking();closePanel();engine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});return true;
      }
    }
    orderFollowupPending=snapshot.items.length>0;
    addMessage(snapshot.items.length?`Order updated. Total ${money2(snapshot.total)}.`:'Your order is now empty.','bot');
    aiCartCard({lead:'Order updated.'});return true;
  }

  function resumeInteractiveVoice(){
    if(!handsFreeConversation||!panel.classList.contains('open')||document.hidden)return;
    if(speechAbort||currentAudio||currentSpeech||panel.classList.contains('is-speaking'))return;
    let text='';
    if(body.querySelector('.lovely-ai-checkout-card')) text=`Total ${money2(aiOrderTotal())} — say “continue to WhatsApp” when ready.`;
    else if(experience.mode==='checkout'&&experience.step==='minimum'){const req=checkoutRequirement();text=req.state==='needs-more'?`You need ${money(req.short)} more to reach the ${req.label} minimum. You can say add more or switch to collection.`:'How would you like to receive your order?';}
    else if(experience.mode==='checkout') text=`Total ${money2(aiOrderTotal())} — collection, local delivery, or corporate delivery?`;
    else if(experience.mode==='order'&&experience.step==='category') text='What would you like?';
    else if(experience.mode==='order'&&experience.step==='product') text=`What would you like from ${experience.data.category||'this section'}?`;
    else if(experience.mode==='drink'&&experience.step==='temp') text='Would you like something hot or cold?';
    else if(experience.mode==='drink'&&experience.step==='style') text=experience.data.temp==='hot'?'Do you feel like strong and bold, smooth and milky, chocolate, or no coffee?':'Do you feel like iced coffee, fruity, hydrating, or a creamy smoothie?';
    else if(experience.mode==='meeting'&&(experience.step==='people'||experience.step==='people-custom')) text='How many people are you ordering for?';
    else if(experience.mode==='meeting'&&experience.step==='style') text='Would you like coffee and muffins, breakfast, training refreshments, or cold drinks and boba?';
    else if(experience.mode==='meeting'&&experience.step==='timing') text='Is the meeting today, or tomorrow or later?';
    if(!text){const latest=[...body.querySelectorAll('.lovely-ai-message.bot')].pop();if(latest)text=latest.textContent.trim();}
    if(text)speak(text);else maybeResumeHandsFree();
  }

  function releaseAiBusy(){
    aiRequestBusy=false;
    const submitBtn=form.querySelector('button[type="submit"]');
    if(submitBtn)submitBtn.removeAttribute('aria-busy');
  }
  function abortPendingAi(){
    aiRequestSerial++;
    if(aiAbortController){try{aiAbortController.abort()}catch(_){}aiAbortController=null}
    body.querySelectorAll('.lovely-ai-message.thinking').forEach(el=>el.remove());
    releaseAiBusy();
  }

  async function answerKnowledgeTurn(q,{spoken=false}={}){
    const requestSerial=++aiRequestSerial;aiRequestBusy=true;const submitBtn=form.querySelector('button[type="submit"]');if(submitBtn)submitBtn.setAttribute('aria-busy','true');
    const userBubble=addMessage(q,'user'),userTurn={role:'user',content:q};conversation.push(userTurn);
    const rollback=()=>{userBubble.remove();const i=conversation.lastIndexOf(userTurn);if(i>=0)conversation.splice(i,1)};
    const thinking=addMessage(navigator.onLine===false?'Checking…':'Thinking…','bot');thinking.classList.add('thinking');
    let answer='';
    try{answer=await askAI(q,{spoken})}catch(err){
      if(err&&err.name==='AbortError'&&(requestSerial!==aiRequestSerial||!panel.classList.contains('open'))){thinking.remove();rollback();if(requestSerial===aiRequestSerial)releaseAiBusy();return}
      cloudAvailable=false;setConnection('basic',navigator.onLine===false?'Offline menu guide':'Menu guide mode');answer=localAnswer(q);
    }
    thinking.remove();if(requestSerial!==aiRequestSerial||!panel.classList.contains('open')){rollback();if(requestSerial===aiRequestSerial)releaseAiBusy();return}
    const reply=addMessage(answer,'bot');addAnswerActions(reply,q);conversation.push({role:'assistant',content:answer});if(conversation.length>14)conversation=conversation.slice(-14);
    if(spoken)voiceReplyEnabled=true;voiceToggle.setAttribute('aria-pressed',String(voiceReplyEnabled));voiceToggle.setAttribute('aria-label',voiceReplyEnabled?'Turn spoken replies off':'Turn spoken replies on');releaseAiBusy();
    if(voiceReplyEnabled)speak(answer,q);else setStatus(experience.mode?'Your previous order or planner is still open — continue whenever you’re ready.':'Ask by text or mic.');
  }

  function isPassiveAcknowledgement(raw){return /^(?:ok|okay|alright|all right|right|got it|understood|makes sense)$/.test(normalizedChoice(raw))}
  async function ask(q,{spoken=false}={}){
    q=spoken?cleanSpokenUtterance(q):String(q||'').trim();if(!q)return;
    if(aiRequestBusy)abortPendingAi();
    if(handleVoiceControl(q))return;
    if(spoken){voiceReplyEnabled=true;voiceToggle.setAttribute('aria-pressed','true');voiceToggle.setAttribute('aria-label','Turn spoken replies off')}
    if(routeHydrationReminderCommand(q))return;
    if(isUrgentHealthQuestion(q)){
      addMessage(q,'user');const urgent=localAnswer(q);addMessage(urgent,'bot');conversation.push({role:'user',content:q},{role:'assistant',content:urgent});if(conversation.length>14)conversation=conversation.slice(-14);
      if(voiceReplyEnabled)speak(urgent,q);else setStatus(experience.mode?'Your order or planner is still open. Seek urgent medical help first.':'Seek urgent medical help now.');return;
    }
    // Explicit menu categories must win over fuzzy product/health matching even after a cart card
    // has temporarily cleared the order experience. This keeps “Health Drinks” browsable by voice/text.
    const categoryQuery=normalizedChoice(q);
    const explicitCategory=ORDER_CATEGORIES.find(c=>{
      const n=normalizedChoice(c),safe=n.replace(/[-/\^$*+?.()|[\]{}]/g,'\\$&');
      return categoryQuery===n
        ||new RegExp('^(?:show|browse|open|list|see)(?: me)?(?: the)? '+safe+'$').test(categoryQuery)
        ||new RegExp('^(?:what|which)(?: of the)? '+safe+' (?:do you have|are there|are available|can i get|can i order)$').test(categoryQuery)
        ||new RegExp('^(?:what|which) '+safe+'(?: options)? (?:do you have|are there|are available)$').test(categoryQuery);
    });
    if(explicitCategory){
      addMessage(q,'user');clearExperience();experience.mode='order';experience.step='product';experience.data.category=explicitCategory;orderBuilderChoice('cat:'+explicitCategory);resumeInteractiveVoice();return;
    }
    if(isPassiveAcknowledgement(q)){addMessage(q,'user');setStatus(handsFreeConversation?'Listening…':'Ask by text or mic.');if(handsFreeConversation)maybeResumeHandsFree();return}
    // Transactional intent always gets first refusal before general product/AI classification.
    // This prevents phrases such as “add 3 cappuccinos and deliver them” being answered as chat.
    if(isCommerceIntent(q)&&routeOrderCommand(q)){resumeInteractiveVoice();return}
    // R17 hybrid planner: unfamiliar transaction wording is interpreted by cloud AI,
    // but only whitelisted actions can reach the deterministic order engine.
    if(shouldTryStructuredPlanner(q)){
      const plan=await requestStructuredCommercePlan(q,{spoken});
      if(plan&&executeStructuredCommercePlan(q,plan)){resumeInteractiveVoice();return}
    }
    let infoProduct=productMatch(q);
    // Natural product-reference memory: after ordering/discussing an item, short follow-ups such as
    // “what’s in it?”, “how much is it?” or “does it have caffeine?” refer to that last item.
    if(!infoProduct&&lastProductIndex!=null&&isProductInfoQuery(q)&&/\b(?:it|that|this|one|same|caffeine|ingredients?|contain|inside|price|cost|how much|sugar|sweetener|vitamin|nutrient|allerg)\b/i.test(q)){
      infoProduct=products[lastProductIndex]||null;
    }
    if(infoProduct&&isProductInfoQuery(q)&&!isBroadProductHealthJudgement(q)){
      lastProductIndex=products.indexOf(infoProduct);
      const contextualQuery=productMatch(q)?q:`${q} ${infoProduct.n}`;
      addMessage(q,'user');const info=localAnswer(contextualQuery);const infoReply=addMessage(info,'bot');addAnswerActions(infoReply,contextualQuery);conversation.push({role:'user',content:q},{role:'assistant',content:info});if(conversation.length>14)conversation=conversation.slice(-14);
      if(voiceReplyEnabled)speak(info,q);else setStatus(experience.mode?'Your previous order or planner is still open — continue whenever you’re ready.':'Ask by text or mic.');
      return;
    }
    if(experience.mode&&(experience.mode==='order'||experience.mode==='checkout')&&routeOrderCommand(q)){resumeInteractiveVoice();return}
    // Valid answers to an active guided flow win before health/knowledge classification. For example,
    // “cold” in Find My Drink means a cold drink, not the respiratory illness.
    if(experience.mode&&(experience.mode==='drink'||experience.mode==='meeting')&&isExpectedExperienceReply(q)){addMessage(q,'user');routeExperienceSpeech(q);resumeInteractiveVoice();return}
    if(experience.mode&&(isGeneralHealthSideQuestion(q)||isKnowledgeSideTurn(q))){await answerKnowledgeTurn(q,{spoken});return}
    if(experience.mode){
      if(experience.mode==='drink'||experience.mode==='meeting'){
        // Unmatched free-form side topics are sent to Lovely AI while the guided flow remains intact.
        // This covers health terms that are not practical to enumerate in a client-side keyword list.
        if(String(q).trim().length>=6){await answerKnowledgeTurn(q,{spoken});return}
        addMessage(q,'user');routeExperienceSpeech(q);resumeInteractiveVoice();return
      }
      if(experience.mode==='rooms-handoff'){
        addMessage(q,'user');const handoff=normalizedChoice(q);
        if(/^(?:yes(?: please)?(?: take me there)?|sure|okay|ok|go ahead|please do|take me there|open rooms|open lovely rooms|book the room|book a room|continue)$/.test(handoff)){
          const msg='Opening Lovely Rooms.';addMessage(msg,'bot');
          if(voiceReplyEnabled&&handsFreeConversation){try{const u=new SpeechSynthesisUtterance(msg);u.rate=.98;u.pitch=1;u.onend=()=>{window.location.href='/rooms/?lovely=book'};speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(()=>{if(location.pathname.indexOf('/rooms')===-1)window.location.href='/rooms/?lovely=book'},1800)}catch(_){window.location.href='/rooms/?lovely=book'}}
          else window.setTimeout(()=>{window.location.href='/rooms/?lovely=book'},120);
          return;
        }
        if(/^(no|no thanks|not now|later|cancel)$/.test(handoff)){resetExperience({quiet:true});const msg='Okay.';addMessage(msg,'bot');if(voiceReplyEnabled)speak(msg);else setStatus('Ask by text or mic.');return}
        const msg='Would you like me to open Lovely Rooms? Say “yes, take me there” or tap Book a Room.';addMessage(msg,'bot');if(voiceReplyEnabled)speak(msg);else setStatus('Ask by text or mic.');return;
      }
      if(routeOrderCommand(q)){resumeInteractiveVoice();return}
      // Do not trap an unknown side-topic inside ordering/checkout. Ask the broad assistant and preserve state.
      await answerKnowledgeTurn(q,{spoken});return;
    }
    const command=normalizedChoice(q);
    if(/find my drink|help me choose (a )?drink|recommend (me )?(a )?drink|choose a drink/.test(command)){
      addMessage(q,'user');startDrinkFinder();resumeInteractiveVoice();return;
    }
    if(/^(?:rooms?|accommodation|book(?: me)? a room|need a room|want a room|i need accommodation|i need somewhere to stay|i want somewhere to stay|where can i stay|can i book a room|show me rooms|room rates?|standard room|executive room)$/.test(command)||/\b(?:book|reserve|need|want|show|view|check)\b.{0,28}\b(?:room|rooms|accommodation)\b/.test(command)){
      experience={mode:'rooms-handoff',step:'confirm'};
      addMessage(q,'user');const msg='Lovely Rooms can help with Standard rooms at P300/night and the Executive room at P450/night. Would you like me to take you to the Rooms concierge to choose dates and prepare the WhatsApp availability request?';addMessage(msg,'bot');const wrap=document.createElement('div');wrap.className='lovely-ai-experience';const actions=document.createElement('div');actions.className='lovely-ai-result-actions';const go=document.createElement('button');go.type='button';go.className='primary';go.dataset.aiRoomBook='true';go.textContent='BOOK A ROOM';actions.appendChild(go);wrap.appendChild(actions);body.appendChild(wrap);trimAiTranscript();scrollTranscript(true);if(voiceReplyEnabled)speak(msg);return;
    }
    if(/plan (a )?meeting|meeting planner|help (me )?(with )?(an )?(office )?meeting|meeting order/.test(command)){
      addMessage(q,'user');startMeetingPlanner();
      const n=parseSpokenNumber(command,200);if(n!=null&&experience.step==='people')meetingChoice(String(n));
      resumeInteractiveVoice();return;
    }
    if(routeOrderCommand(q)){resumeInteractiveVoice();return}
    await answerKnowledgeTurn(q,{spoken});
  }

  function openPanel(focusInput=true){stopWakeListener();panel.classList.add('open');panel.setAttribute('aria-hidden','false');launcher.setAttribute('aria-expanded','true');if(standaloneMode){cancelCloudCheck();cloudAvailable=false;setConnection('basic','Menu guide mode')}else if(navigator.onLine!==false){cloudAvailable=null;setConnection('checking','Checking assistant…');checkCloud(true)}else{cancelCloudCheck();cloudAvailable=false;setConnection('basic','Offline menu guide')}if(focusInput)setTimeout(()=>input.focus(),30)}
  function rememberWake(on=true){try{if(on){localStorage.setItem(WAKE_SESSION_KEY,'1');sessionStorage.setItem(WAKE_SESSION_KEY,'1')}else{localStorage.removeItem(WAKE_SESSION_KEY);sessionStorage.removeItem(WAKE_SESSION_KEY)}}catch(_){}}
  function armHandsFreeConversation(){
    if(!window.isSecureContext||!SpeechRecognition){setStatus('Voice needs the secure site and a supported browser. You can still type.');return false}
    handsFreeConversation=true;handsFreeIdleCycles=0;voiceReplyEnabled=true;wakeEnabled=true;
    voiceToggle.setAttribute('aria-pressed','true');voiceToggle.setAttribute('aria-label','Turn spoken replies off');
    wakeToggle.setAttribute('aria-pressed','true');wakeToggle.classList.add('wake-active');launcher.classList.add('wake-ready');wakeToggle.setAttribute('aria-label','Disable Hey Lovely wake phrase');
    rememberWake(true);setStatus('I’m listening… just speak naturally.','listening');setTimeout(startQuestionListening,220);return true;
  }
  function closePanel(){cancelCloudCheck();abortPendingAi();if(bargeInTimer){clearTimeout(bargeInTimer);bargeInTimer=null}stopSpeaking();lastSpokenReply='';handsFreeConversation=false;if(isListening&&recognition){try{recognition.abort()}catch(_){}}if(fallbackRecording)stopFallbackRecording(false);resetExperience({quiet:true});panel.classList.remove('open','is-listening');panel.setAttribute('aria-hidden','true');launcher.setAttribute('aria-expanded','false');launcher.classList.remove('is-listening');mic.classList.remove('is-listening');launcher.focus();if(wakeEnabled)scheduleWake()}
  launcher.addEventListener('click',()=>{if(panel.classList.contains('open')){closePanel();return}openPanel(false);if(!armHandsFreeConversation())setTimeout(()=>input.focus(),30)});
  closeBtn.addEventListener('click',closePanel);
  ['topOrder','cartPill','mobileQuickOrder'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',()=>{if(panel.classList.contains('open'))closePanel()})});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))closePanel()});
  body.addEventListener('click',e=>{
    const wakeQuick=e.target.closest('[data-ai-wake-enable]');if(wakeQuick){wakeToggle.click();return}
    const roomQuick=e.target.closest('[data-ai-room-book]');if(roomQuick){window.location.href='/rooms/?lovely=book';return}
    const reset=e.target.closest('[data-ai-reset]');if(reset){resetExperience();return}
    const exp=e.target.closest('[data-ai-experience]');if(exp){const mode=exp.dataset.aiExperience;if(mode==='drink')startDrinkFinder();else if(mode==='meeting')startMeetingPlanner();else startOrderBuilder();return}
    const choice=e.target.closest('[data-exp-choice]');if(choice){if(experience.mode==='drink')drinkChoice(choice.dataset.expChoice);else if(experience.mode==='meeting')meetingChoice(choice.dataset.expChoice);else if(experience.mode==='order')orderBuilderChoice(choice.dataset.expChoice);else if(experience.mode==='checkout')checkoutChoice(choice.dataset.expChoice);return}
    const addBtn=e.target.closest('[data-exp-add]');if(addBtn){addRecommendedProduct(Number(addBtn.dataset.expAdd),Number(addBtn.dataset.expQty||1));return}
    const summary=e.target.closest('[data-ai-cart-summary]');if(summary){clearExperience();aiCartCard();return}
    const inc=e.target.closest('[data-ai-cart-inc]');if(inc){changeAiCart(Number(inc.dataset.aiCartInc),1);return}
    const dec=e.target.closest('[data-ai-cart-dec]');if(dec){changeAiCart(Number(dec.dataset.aiCartDec),-1);return}
    const rem=e.target.closest('[data-ai-cart-remove]');if(rem){const idx=Number(rem.dataset.aiCartRemove);delete cart[idx];saveOrderSession();clearOrderSessionIfEmpty();renderCart();aiCartCard({lead:'Item removed.'});return}
    const checkoutBtn=e.target.closest('[data-ai-checkout]');if(checkoutBtn){if(checkoutBtn.dataset.aiCheckout==='send'){const req=checkoutRequirement();if(req.state!=='ready'){startAiCheckout();return}stopSpeaking();closePanel();if(window.LovelyOrderEngine)window.LovelyOrderEngine.execute([{type:'CHECKOUT_WHATSAPP'}],{source:'ai',checkoutSameTab:true});else checkout({sameTab:true})}else startAiCheckout();return}
    const b=e.target.closest('[data-ai-question]');if(!b)return;ask(b.dataset.aiQuestion)
  });
  input.addEventListener('input',()=>{if(currentAudio||currentSpeech||panel.classList.contains('is-speaking'))stopSpeaking();if(aiRequestBusy)abortPendingAi()});
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value;input.value='';stopSpeaking();if(aiRequestBusy)abortPendingAi();ask(q)});

  voiceToggle.addEventListener('click',()=>{
    voiceReplyEnabled=!voiceReplyEnabled;
    voiceToggle.setAttribute('aria-pressed',String(voiceReplyEnabled));
    voiceToggle.setAttribute('aria-label',voiceReplyEnabled?'Turn spoken replies off':'Turn spoken replies on');
    if(!voiceReplyEnabled) stopSpeaking();
    setStatus(voiceReplyEnabled?'Lovely voice is on.':'Spoken replies are off. Tap the microphone to talk.');
  });
  wakeToggle.addEventListener('click',()=>{
    if(!window.isSecureContext||!SpeechRecognition){wakeToggle.disabled=true;setStatus('Hey Lovely needs the secure site and browser speech recognition. The mic button still works.');return}
    if(wakeEnabled){disableWake();return}
    wakeEnabled=true;voiceReplyEnabled=true;voiceToggle.setAttribute('aria-pressed','true');voiceToggle.setAttribute('aria-label','Turn spoken replies off');wakeToggle.setAttribute('aria-pressed','true');wakeToggle.classList.add('wake-active');launcher.classList.add('wake-ready');wakeToggle.setAttribute('aria-label','Disable Hey Lovely wake phrase');rememberWake(true);setStatus('Hey Lovely is on. Close the panel, then say “Hey Lovely”.');startWakeListener();
  });

  function canonicalSttContentType(value){const t=String(value||'').toLowerCase().replace(/\s+/g,'');if(t.startsWith('audio/webm'))return t.includes('codecs=opus')?'audio/webm;codecs=opus':'audio/webm';if(t.startsWith('audio/ogg'))return t.includes('codecs=opus')?'audio/ogg;codecs=opus':'audio/ogg';if(t.startsWith('audio/mp4'))return'audio/mp4';return''}
  async function transcribeRecordedBlob(blob){
    if(!blob||!blob.size) throw new Error('No audio captured');
    if(standaloneMode) throw new Error('Cloud speech-to-text requires the secure live site');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
    try{
      const contentType=canonicalSttContentType(blob.type);if(!contentType)throw new Error('Unsupported audio format');
      setStatus('Turning your voice into text…','processing');
      const res=await fetch('/api/lovely-stt',{method:'POST',headers:apiHeaders({'Content-Type':contentType}),body:blob,signal:controller.signal});
      if(!res.ok) throw new Error('Speech service unavailable');
      const data=await res.json();const text=String(data.text||'').trim();
      if(!text) throw new Error('No speech detected');
      return text;
    }finally{clearTimeout(timer)}
  }
  function stopFallbackRecording(process=true){
    if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null}
    if(fallbackRecorder&&fallbackRecorder.state!=='inactive'){
      fallbackRecorder._processAfterStop=process;
      try{fallbackRecorder.stop()}catch(_){ }
    }
  }
  async function startFallbackRecording(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){
      setStatus('Voice input is not supported in this browser. You can still type your question.');return;
    }
    try{
      fallbackStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      const candidates=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'];
      const mime=candidates.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
      fallbackChunks=[];fallbackRecorder=new MediaRecorder(fallbackStream,mime?{mimeType:mime}:undefined);
      fallbackRecorder.ondataavailable=e=>{if(e.data&&e.data.size)fallbackChunks.push(e.data)};
      fallbackRecorder.onstart=()=>{fallbackRecording=true;mic.classList.add('is-listening');launcher.classList.add('is-listening');panel.classList.add('is-listening');setStatus('Listening… tap again when you’re done.','listening')};
      fallbackRecorder.onstop=async()=>{
        const shouldProcess=fallbackRecorder?fallbackRecorder._processAfterStop!==false:true;
        fallbackRecording=false;mic.classList.remove('is-listening');launcher.classList.remove('is-listening');panel.classList.remove('is-listening');
        if(fallbackStream){fallbackStream.getTracks().forEach(t=>t.stop());fallbackStream=null}
        const type=canonicalSttContentType((fallbackChunks[0]&&fallbackChunks[0].type)||mime);const blob=new Blob(fallbackChunks,{type:type||'audio/webm'});fallbackChunks=[];
        if(!shouldProcess)return;
        try{const q=cleanSpokenUtterance(await transcribeRecordedBlob(blob));input.value='';if(!q||isRecentVoiceDuplicate(q)){setStatus('Got it — I won’t add that twice.');return}ask(q,{spoken:true})}catch(_){setStatus('I could not hear that clearly. Try again or type your question.')}
      };
      fallbackRecorder.start();fallbackTimer=setTimeout(()=>stopFallbackRecording(true),12000);
    }catch(err){setStatus(err&&err.name==='NotAllowedError'?'Microphone permission was blocked. You can still type your question.':'I could not start the microphone. Try again or type your question.')}
  }

  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  function stopWakeListener(){
    if(wakeRestartTimer){clearTimeout(wakeRestartTimer);wakeRestartTimer=null}
    if(wakeRecognition&&wakeListening){try{wakeRecognition.abort()}catch(_){}}
    wakeListening=false;
  }
  function disableWake(message='Hey Lovely wake mode is off.'){
    wakeEnabled=false;stopWakeListener();wakeToggle.setAttribute('aria-pressed','false');wakeToggle.classList.remove('wake-active');launcher.classList.remove('wake-ready');wakeToggle.setAttribute('aria-label','Enable Hey Lovely wake phrase');rememberWake(false);if(panel.classList.contains('open'))setStatus(message)
  }
  function scheduleWake(){if(!wakeEnabled||panel.classList.contains('open')||document.hidden||!SpeechRecognition||!window.isSecureContext)return;if(wakeRestartTimer)clearTimeout(wakeRestartTimer);wakeRestartTimer=setTimeout(startWakeListener,650)}
  function handleWake(text){
    const m=String(text||'').match(/\bhey\s+lovely\b[\s,.:;!?-]*(.*)$/i);if(!m)return false;
    stopWakeListener();handsFreeConversation=true;handsFreeIdleCycles=0;voiceReplyEnabled=true;voiceToggle.setAttribute('aria-pressed','true');voiceToggle.setAttribute('aria-label','Turn spoken replies off');openPanel(false);const rest=String(m[1]||'').trim();
    if(rest)ask(rest,{spoken:true});else{addMessage('Hi. What can I help with?','bot');setStatus('I’m listening…','listening');setTimeout(startQuestionListening,450)}return true;
  }
  function createWakeRecognition(){
    if(!SpeechRecognition)return null;const r=new SpeechRecognition();r.lang=(navigator.language&&navigator.language.toLowerCase().startsWith('en'))?navigator.language:'en-GB';r.interimResults=true;r.continuous=true;r.maxAlternatives=1;
    r.onstart=()=>{wakeListening=true;launcher.classList.add('wake-ready')};
    r.onresult=e=>{let heard='';for(let i=e.resultIndex;i<e.results.length;i++)heard+=' '+e.results[i][0].transcript;handleWake(heard.trim())};
    r.onerror=e=>{wakeListening=false;if(e.error==='not-allowed'||e.error==='service-not-allowed')disableWake('Microphone permission was blocked. Hey Lovely is off.')};
    r.onend=()=>{wakeListening=false;if(wakeEnabled&&!panel.classList.contains('open'))scheduleWake()};return r;
  }
  function startWakeListener(){if(!wakeEnabled||panel.classList.contains('open')||document.hidden||!SpeechRecognition||!window.isSecureContext||wakeListening)return;if(!wakeRecognition)wakeRecognition=createWakeRecognition();try{wakeRecognition.start()}catch(_){scheduleWake()}}
  function startQuestionListening(bargeIn=false){if(!recognition||isListening||document.hidden||!panel.classList.contains('open'))return;if(!bargeIn)stopSpeaking();stopWakeListener();try{recognition.start()}catch(_){setStatus('Voice input is busy. Try again in a moment.')}}
  function maybeResumeHandsFree(){if(handsFreeConversation&&panel.classList.contains('open')&&!document.hidden&&!isListening&&!fallbackRecording)setTimeout(startQuestionListening,420)}

  if(!window.isSecureContext){
    mic.disabled=true;mic.setAttribute('aria-disabled','true');mic.title='Voice input requires the secure HTTPS website';wakeToggle.disabled=true;
    setStatus('Voice input needs the secure HTTPS site. You can still type questions.');
  }else if(SpeechRecognition){
    recognition=new SpeechRecognition();
    recognition.lang=(navigator.language&&navigator.language.toLowerCase().startsWith('en'))?navigator.language:'en-GB';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    recognition.onstart=()=>{isListening=true;mic.classList.add('is-listening');launcher.classList.add('is-listening');panel.classList.add('is-listening');const speaking=currentAudio||currentSpeech||panel.classList.contains('is-speaking');setStatus(speaking?'I’m listening too — interrupt me whenever you need.':(handsFreeConversation?'I’m listening… say “bye Lovely” to stop.':'Listening… speak naturally.'),'listening')};
    recognition.onspeechstart=()=>{if(speakingNow())pauseSpeechForBargeIn()};
    recognition.onresult=(event)=>{
      let transcript='';let finalText='';
      for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0].transcript;transcript+=' '+text;if(event.results[i].isFinal)finalText+=' '+text}
      const interim=cleanSpokenUtterance(transcript);input.value=interim;
      if(interim&&handleInterimVoiceControl(interim)){if(!finalText.trim())return}
      if(bargePauseActive&&interim&&!isLikelyPartialSpeechEcho(interim)){stopSpeaking();abortPendingAi()}
      if(finalText.trim()){
        const q=cleanSpokenUtterance(finalText);input.value='';if(!q)return;
        if(bargePauseActive&&isLikelySpeechEcho(q)){resumeSpeechAfterEcho();setStatus('Lovely is speaking — you can interrupt me.','speaking');scheduleBargeInListening(180);return}
        if(isLikelySpeechEcho(q)){setStatus('Lovely is speaking — you can interrupt me.','speaking');scheduleBargeInListening(180);return}
        if(isRecentVoiceDuplicate(q)){stopSpeaking();setStatus('Got it — I won’t add that twice.','listening');maybeResumeHandsFree();return}
        handsFreeIdleCycles=0;stopSpeaking();abortPendingAi();ask(q,{spoken:true});
      }
    };
    recognition.onerror=(event)=>{if(bargePauseActive&&event.error==='no-speech')resumeSpeechAfterEcho();const speaking=currentAudio||currentSpeech||panel.classList.contains('is-speaking');const turnPending=aiRequestBusy||Boolean(speechAbort);if(event.error==='no-speech'&&handsFreeConversation&&turnPending&&!speaking){setStatus('Listening…','listening');scheduleBargeInListening(180);return}if(event.error==='no-speech'&&handsFreeConversation&&speaking){setStatus('Lovely is speaking — you can interrupt me.','speaking');scheduleBargeInListening(180);return}if(event.error==='no-speech'&&handsFreeConversation){handsFreeIdleCycles++;if(handsFreeIdleCycles<3){setStatus('I’m listening.','listening');setTimeout(startQuestionListening,900)}else{handsFreeConversation=false;setStatus('Hands-free paused. Say “Hey Lovely” after closing me, or use the mic as a fallback.')}}else{const msg=event.error==='not-allowed'?'Microphone permission was blocked. You can still type your question.':'Voice input stopped. You can try again or type your question.';setStatus(msg)}};
    recognition.onend=()=>{isListening=false;mic.classList.remove('is-listening');launcher.classList.remove('is-listening');panel.classList.remove('is-listening');const speaking=currentAudio||currentSpeech||panel.classList.contains('is-speaking');const turnPending=aiRequestBusy||Boolean(speechAbort);if((speaking||turnPending)&&handsFreeConversation){scheduleBargeInListening(120);return}if(!voiceStatus.textContent.includes('blocked')&&!voiceStatus.textContent.includes('did not hear'))setStatus(handsFreeConversation?'Listening…':'Open Lovely and speak, or use the mic as a fallback.')};
    mic.addEventListener('click',()=>{openPanel();handsFreeConversation=false;stopWakeListener();stopSpeaking();if(isListening){try{recognition.stop()}catch(_){}}else startQuestionListening()});
  }else if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder){
    wakeToggle.disabled=true;setStatus('Tap the microphone to talk. “Hey Lovely” wake mode is not supported in this browser.');
    mic.addEventListener('click',()=>{openPanel();stopSpeaking();fallbackRecording?stopFallbackRecording(true):startFallbackRecording()});
  }else{
    mic.disabled=true;wakeToggle.disabled=true;mic.setAttribute('aria-disabled','true');mic.title='Voice input is not supported in this browser';
    setStatus('Voice input is not supported in this browser. You can still type questions, and Lovely can still speak replies.');
  }
  function stopVoiceActivityForPageLeave(){
    cancelCloudCheck();
    abortPendingAi();
    stopSpeaking();
    stopWakeListener();
    if(isListening&&recognition){try{recognition.abort()}catch(_){}}
    if(fallbackRecording)stopFallbackRecording(false);
    if(fallbackStream&&!fallbackRecording){try{fallbackStream.getTracks().forEach(t=>t.stop())}catch(_){}fallbackStream=null}
    mic.classList.remove('is-listening');launcher.classList.remove('is-listening');panel.classList.remove('is-listening','is-speaking');
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stopVoiceActivityForPageLeave();return}
    if(panel.classList.contains('open')){
      if(navigator.onLine===false){cloudAvailable=false;setConnection('basic','Offline menu guide')}
      else checkCloud(true);
      if(!isListening&&!fallbackRecording)setStatus(handsFreeConversation?'I’m listening for your reply…':'Ask by text or mic.');
    }else if(wakeEnabled){scheduleWake()}
  });
  window.addEventListener('pagehide',stopVoiceActivityForPageLeave,{capture:false});
  window.addEventListener('offline',()=>{cancelCloudCheck();cloudAvailable=false;setConnection('basic','Offline menu guide');if(panel.classList.contains('open'))setStatus('You’re offline. Menu guide answers still work.')});
  window.addEventListener('online',()=>{cancelCloudCheck();cloudAvailable=null;if(panel.classList.contains('open')){setConnection('checking','Checking assistant…');checkCloud(true)}});

  scheduleHydrationReminderCheck();
  try{
    if(window.isSecureContext&&SpeechRecognition&&(localStorage.getItem(WAKE_SESSION_KEY)==='1'||sessionStorage.getItem(WAKE_SESSION_KEY)==='1')){
      wakeEnabled=true;voiceReplyEnabled=true;voiceToggle.setAttribute('aria-pressed','true');voiceToggle.setAttribute('aria-label','Turn spoken replies off');wakeToggle.setAttribute('aria-pressed','true');wakeToggle.classList.add('wake-active');launcher.classList.add('wake-ready');wakeToggle.setAttribute('aria-label','Disable Hey Lovely wake phrase');setTimeout(()=>{if(!panel.classList.contains('open'))startWakeListener()},700);
    }
  }catch(_){}
})();
