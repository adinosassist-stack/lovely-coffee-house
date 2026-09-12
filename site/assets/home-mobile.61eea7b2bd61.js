(function(){
  var quickOrder=document.getElementById('mobileQuickOrder');
  if(quickOrder){quickOrder.addEventListener('click',function(){var top=document.getElementById('topOrder');if(top)top.click();});}
  var cmm=document.getElementById('corpMobileMenu');if(cmm){cmm.addEventListener('click',function(){var cm=document.getElementById('corpMenu');if(cm)cm.click();});}

  // Reliable mobile voice turn-taking.
  // Phone loudspeakers can feed Lovely's own TTS back into Web Speech Recognition.
  // On handheld devices we therefore use half-duplex speech: while Lovely is speaking,
  // automatic recognition starts are ignored. The mic button still stops Lovely
  // immediately and starts listening, so the customer always has a reliable interrupt.
  var coarsePointer=false;
  try{coarsePointer=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;}catch(_){}
  var handheld=coarsePointer||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  if(!handheld)return;

  var panel=document.getElementById('lovelyAiPanel');
  var body=document.getElementById('lovelyAiBody');
  var voiceToggle=document.getElementById('lovelyAiVoiceToggle');
  var voiceStatus=document.getElementById('lovelyAiVoiceStatus');
  var activeMedia=new Set();
  var synthActive=false;
  var speakerStartedAt=0;

  function norm(value){
    return String(value||'').toLowerCase().normalize('NFKD').replace(/[’‘`]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function aiVoiceContext(){
    return Boolean(panel&&panel.classList.contains('open')&&voiceToggle&&voiceToggle.getAttribute('aria-pressed')==='true');
  }
  function speakerActive(){
    var synthSpeaking=false;
    try{synthSpeaking=Boolean(window.speechSynthesis&&window.speechSynthesis.speaking);}catch(_){}
    return Boolean((panel&&panel.classList.contains('is-speaking'))||activeMedia.size||(synthActive&&synthSpeaking));
  }
  function markSpeakerStart(){speakerStartedAt=Date.now();}
  function assistantCorpus(){
    if(!body)return'';
    var nodes=body.querySelectorAll('.lovely-ai-message.bot,.lovely-ai-experience');
    var parts=[];
    for(var i=Math.max(0,nodes.length-6);i<nodes.length;i++)parts.push(nodes[i].textContent||'');
    return norm(parts.join(' '));
  }
  function isExplicitVoiceControl(text){
    var q=norm(text).replace(/^(?:hey )?lovely /,'').replace(/\bplease\b/g,'').trim();
    return /^(?:stop|stop now|stop it|stop talking|stop speaking|quiet|be quiet|shh|shush|enough|hold on|hang on|wait|pause|mute|bye|goodbye|stop listening|end conversation|end voice|turn off listening|turn voice off|stop voice)$/.test(q);
  }
  function isShortUserIntent(text){
    var q=norm(text);
    return /^(?:yes|no|okay|ok|sure|hot|cold|iced|coffee|tea|boba|smoothie|breakfast|training|collection|collect|pickup|delivery|corporate delivery|one|two|three|four|five|six|seven|eight|nine|ten|twenty|cappuccino|latte|americano|espresso|mocha)$/.test(q);
  }
  function resultText(event){
    var out='';
    try{
      for(var i=event.resultIndex||0;i<event.results.length;i++)out+=' '+event.results[i][0].transcript;
    }catch(_){}
    return norm(out);
  }
  function finalOnly(event){
    try{
      var has=false;
      for(var i=event.resultIndex||0;i<event.results.length;i++)if(event.results[i].isFinal)has=true;
      return has;
    }catch(_){return false}
  }
  function likelySpeakerEcho(text,isFinal){
    if(!speakerActive())return false;
    var heard=norm(text);if(!heard||isExplicitVoiceControl(heard))return false;
    var corpus=assistantCorpus();if(!corpus)return false;
    var words=heard.split(' ').filter(Boolean);
    if(words.length>=3){
      if(corpus.indexOf(heard)>=0)return true;
      var probe=words.slice(0,Math.min(6,words.length)).join(' ');
      if(probe.length>=8&&corpus.indexOf(probe)>=0)return true;
      var corpusWords=new Set(corpus.split(' ').filter(Boolean));
      var overlap=words.filter(function(w){return corpusWords.has(w);}).length/words.length;
      if(words.length>=4&&overlap>=0.78)return true;
    }
    if(words.length<=2){
      if(isShortUserIntent(heard))return false;
      if(!isFinal&&heard.length>=4&&corpus.indexOf(heard)>=0)return true;
      if(isFinal&&Date.now()-speakerStartedAt<1600&&heard.length>=5&&corpus.indexOf(heard)===0)return true;
    }
    return false;
  }
  function setMobileSpeakingStatus(){
    if(!voiceStatus||!speakerActive())return;
    if(/lovely is speaking|interrupt me/i.test(voiceStatus.textContent||'')){
      voiceStatus.textContent='Lovely is speaking — tap the microphone to interrupt.';
      voiceStatus.className='lovely-ai-voice-status speaking';
    }
  }

  // Track Lovely's audio output so automatic speech recognition is locked out for
  // the complete loudspeaker interval.
  try{
    var mediaProto=window.HTMLMediaElement&&window.HTMLMediaElement.prototype;
    if(mediaProto&&typeof mediaProto.play==='function'&&!mediaProto.__lovelyHalfDuplexV2){
      var nativePlay=mediaProto.play;
      mediaProto.play=function(){
        var el=this,src='';
        try{src=String(el.currentSrc||el.src||'');}catch(_){}
        var track=aiVoiceContext()&&/^blob:/i.test(src);
        if(track){
          activeMedia.add(el);markSpeakerStart();
          if(!el.__lovelyHalfDuplexRelease){
            var release=function(){activeMedia.delete(el);};
            el.addEventListener('ended',release);el.addEventListener('pause',release);el.addEventListener('error',release);
            el.__lovelyHalfDuplexRelease=true;
          }
          setTimeout(setMobileSpeakingStatus,0);
        }
        var result=nativePlay.apply(el,arguments);
        if(result&&typeof result.catch==='function')result.catch(function(){activeMedia.delete(el);});
        return result;
      };
      mediaProto.__lovelyHalfDuplexV2=true;
    }
  }catch(_){}

  try{
    var synth=window.speechSynthesis;
    if(synth&&typeof synth.speak==='function'&&!synth.__lovelyHalfDuplexV2){
      var nativeSpeak=synth.speak.bind(synth),nativeCancel=typeof synth.cancel==='function'?synth.cancel.bind(synth):null;
      synth.speak=function(utter){
        if(aiVoiceContext()){
          synthActive=true;markSpeakerStart();
          try{
            var release=function(){synthActive=false;};
            utter.addEventListener('end',release);utter.addEventListener('error',release);
          }catch(_){}
          setTimeout(setMobileSpeakingStatus,0);
        }
        return nativeSpeak(utter);
      };
      if(nativeCancel)synth.cancel=function(){synthActive=false;return nativeCancel();};
      synth.__lovelyHalfDuplexV2=true;
    }
  }catch(_){}

  if(voiceStatus&&window.MutationObserver){
    new MutationObserver(function(){setTimeout(setMobileSpeakingStatus,0);}).observe(voiceStatus,{childList:true,characterData:true,subtree:true});
  }

  // Wrap SpeechRecognition before Lovely AI creates its recognizers.
  // The key fix is start(): automatic listening attempts while TTS is active are
  // refused. Lovely's own onended handler then resumes hands-free listening after
  // the speaker is silent. A user tap on the mic first stops TTS, so that start is
  // allowed immediately.
  var NativeRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!NativeRecognition||NativeRecognition.__lovelyHalfDuplexV2)return;
  function GuardedRecognition(){
    var recognition=new NativeRecognition();
    try{
      var nativeStart=recognition.start.bind(recognition);
      recognition.start=function(){
        if(speakerActive()){
          setMobileSpeakingStatus();
          return;
        }
        return nativeStart();
      };
      recognition.addEventListener('speechstart',function(event){
        if(speakerActive())event.stopImmediatePropagation();
      },true);
      recognition.addEventListener('result',function(event){
        if(!speakerActive())return;
        var heard=resultText(event);if(!heard)return;
        if(likelySpeakerEcho(heard,finalOnly(event)))event.stopImmediatePropagation();
      },true);
    }catch(_){}
    return recognition;
  }
  GuardedRecognition.prototype=NativeRecognition.prototype;
  try{Object.setPrototypeOf(GuardedRecognition,NativeRecognition);}catch(_){}
  GuardedRecognition.__lovelyHalfDuplexV2=true;
  if(window.SpeechRecognition===NativeRecognition)window.SpeechRecognition=GuardedRecognition;
  if(window.webkitSpeechRecognition===NativeRecognition)window.webkitSpeechRecognition=GuardedRecognition;
})();
