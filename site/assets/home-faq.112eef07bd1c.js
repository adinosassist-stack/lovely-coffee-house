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

  // Voice checkout hands off to WhatsApp with a prefilled message. WhatsApp requires
  // the customer to tap Send, so make that final step explicit before same-tab handoff.
  var engine=window.LovelyOrderEngine;
  var handoffPending=false;
  function showWhatsAppSendCue(){
    var text='WhatsApp is opening with your order ready. Tap Send to confirm it with Lovely Coffee House.';
    var body=document.getElementById('lovelyAiBody');
    if(body){
      var messages=body.querySelectorAll('.lovely-ai-message.bot');
      var last=messages[messages.length-1];
      if(last && /opening WhatsApp/i.test(last.textContent||'')) last.textContent=text;
    }
    var toast=document.getElementById('toast');
    if(toast){
      toast.textContent=text;
      toast.classList.add('show');
      clearTimeout(toast._lovelyWhatsAppCueTimer);
      toast._lovelyWhatsAppCueTimer=setTimeout(function(){toast.classList.remove('show');},2600);
    }
  }
  if(engine && typeof engine.execute==='function' && !engine.__lovelyWhatsAppSendCue){
    var originalExecute=engine.execute.bind(engine);
    engine.execute=function(actions,options){
      var opts=options||{};
      var aiCheckout=opts.source==='ai' && opts.checkoutSameTab===true &&
        Array.isArray(actions) && actions.some(function(action){return action && action.type==='CHECKOUT_WHATSAPP';});
      if(!aiCheckout) return originalExecute(actions,options);
      if(handoffPending){
        var current=typeof engine.snapshot==='function'?engine.snapshot():null;
        return {ok:true,checkout:'handoff-pending',state:current,requirement:current&&current.requirement};
      }
      handoffPending=true;
      showWhatsAppSendCue();
      var snapshot=typeof engine.snapshot==='function'?engine.snapshot():null;
      setTimeout(function(){
        handoffPending=false;
        originalExecute(actions,options);
      },1200);
      return {ok:true,checkout:'handoff-pending',state:snapshot,requirement:snapshot&&snapshot.requirement};
    };
    engine.__lovelyWhatsAppSendCue=true;
  }
})();
