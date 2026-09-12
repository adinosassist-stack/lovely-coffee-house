(function(){
  var quickOrder=document.getElementById('mobileQuickOrder');
  if(quickOrder){quickOrder.addEventListener('click',function(){var top=document.getElementById('topOrder');if(top)top.click();});}
  var cmm=document.getElementById('corpMobileMenu');if(cmm){cmm.addEventListener('click',function(){var cm=document.getElementById('corpMenu');if(cm)cm.click();});}

  // Full hands-free mobile barge-in.
  // Lovely keeps listening while she speaks. We do NOT interrupt on raw acoustic
  // speech-start because the phone can hear its own loudspeaker. Instead we wait for
  // an actual transcript, reject transcripts that match Lovely's current reply, and
  // only then deliver a real speech-start/result to the core assistant. This keeps
  // natural no-touch interruption available for accessibility, driving and jogging.
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
    for(var i=Math.max(0,nodes.length-8);i<nodes.length;i++)parts.push(nodes[i].textContent||'');
    return norm(parts.join(' '));
  }
  function isExplicitUserSpeech(text){
    var q=norm(text);
    if(/^hey lovely\b/.test(q))return true;
    var core=q.replace(/^(?:hey )?lovely /,'').replace(/\bplease\b/g,'').trim();
    if(/^(?:stop|stop now|stop it|stop talking|stop speaking|quiet|be quiet|shh|shush|enough|hold on|hang on|wait|pause|mute|bye|goodbye|stop listening|end conversation|end voice|turn off listening|turn voice off|stop voice)$/.test(core))return true;
    return /^(?:yes|no|okay|ok|sure|hot|cold|iced|coffee|tea|boba|smoothie|breakfast|training|collection|collect|pickup|delivery|corporate delivery|one|two|three|four|five|six|seven|eight|nine|ten|twenty|cappuccino|latte|americano|espresso|mocha)$/.test(core);
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
    var heard=norm(text);if(!heard||isExplicitUserSpeech(heard))return false;
    var corpus=assistantCorpus();if(!corpus)return false;
    var words=heard.split(' ').filter(Boolean);
    if(!words.length)return false;

    // Exact/contiguous matches are almost certainly the phone hearing Lovely.
    if(corpus.indexOf(heard)>=0)return true;
    var probe=words.slice(0,Math.min(7,words.length)).join(' ');
    if(probe.length>=7&&corpus.indexOf(probe)>=0)return true;

    // Compare word overlap against the current visible assistant reply. Loudspeaker
    // echo normally has very high overlap; genuine interruption usually diverges.
    if(words.length>=3){
      var corpusWords=new Set(corpus.split(' ').filter(Boolean));
      var overlap=0;
      words.forEach(function(w){if(corpusWords.has(w))overlap++;});
      if(overlap/words.length>=0.72)return true;
    }

    // A one/two-word fragment right at TTS start is often the first echoed word.
    // Do not suppress common user choices/commands handled above.
    if(words.length<=2&&Date.now()-speakerStartedAt<1200&&heard.length>=4&&corpus.indexOf(heard)>=0)return true;
    return false;
  }
  function setHandsFreeStatus(){
    if(!voiceStatus||!speakerActive())return;
    if(/lovely is speaking|interrupt me|tap the microphone/i.test(voiceStatus.textContent||'')){
      voiceStatus.textContent='Lovely is speaking — just speak to interrupt.';
      voiceStatus.className='lovely-ai-voice-status speaking';
    }
  }

  // Track Lovely's TTS so recognition results can be classified as speaker echo or
  // real customer speech. Recognition itself stays active.
  try{
    var mediaProto=window.HTMLMediaElement&&window.HTMLMediaElement.prototype;
    if(mediaProto&&typeof mediaProto.play==='function'&&!mediaProto.__lovelyFullDuplexV3){
      var nativePlay=mediaProto.play;
      mediaProto.play=function(){
        var el=this,src='';
        try{src=String(el.currentSrc||el.src||'');}catch(_){}
        var track=aiVoiceContext()&&/^blob:/i.test(src);
        if(track){
          activeMedia.add(el);markSpeakerStart();
          if(!el.__lovelyFullDuplexRelease){
            var release=function(){activeMedia.delete(el);};
            el.addEventListener('ended',release);el.addEventListener('pause',release);el.addEventListener('error',release);
            el.__lovelyFullDuplexRelease=true;
          }
          setTimeout(setHandsFreeStatus,0);
        }
        var result=nativePlay.apply(el,arguments);
        if(result&&typeof result.catch==='function')result.catch(function(){activeMedia.delete(el);});
        return result;
      };
      mediaProto.__lovelyFullDuplexV3=true;
    }
  }catch(_){}

  try{
    var synth=window.speechSynthesis;
    if(synth&&typeof synth.speak==='function'&&!synth.__lovelyFullDuplexV3){
      var nativeSpeak=synth.speak.bind(synth),nativeCancel=typeof synth.cancel==='function'?synth.cancel.bind(synth):null;
      synth.speak=function(utter){
        if(aiVoiceContext()){
          synthActive=true;markSpeakerStart();
          try{
            var release=function(){synthActive=false;};
            utter.addEventListener('end',release);utter.addEventListener('error',release);
          }catch(_){}
          setTimeout(setHandsFreeStatus,0);
        }
        return nativeSpeak(utter);
      };
      if(nativeCancel)synth.cancel=function(){synthActive=false;return nativeCancel();};
      synth.__lovelyFullDuplexV3=true;
    }
  }catch(_){}

  if(voiceStatus&&window.MutationObserver){
    new MutationObserver(function(){setTimeout(setHandsFreeStatus,0);}).observe(voiceStatus,{childList:true,characterData:true,subtree:true});
  }

  // Wrap SpeechRecognition before Lovely AI creates its recognizers. The core uses
  // onspeechstart to pause TTS immediately, which is what made the loudspeaker stop
  // itself. We intercept that property and only invoke it after a transcript proves
  // the sound is not Lovely's own reply. No tap is required.
  var NativeRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!NativeRecognition||NativeRecognition.__lovelyFullDuplexV3)return;

  function GuardedRecognition(){
    var recognition=new NativeRecognition();
    var coreSpeechStart=null;
    var coreResult=null;
    var deliveredSpeechStart=false;

    try{
      Object.defineProperty(recognition,'onspeechstart',{
        configurable:true,
        get:function(){return coreSpeechStart;},
        set:function(fn){coreSpeechStart=typeof fn==='function'?fn:null;}
      });
      Object.defineProperty(recognition,'onresult',{
        configurable:true,
        get:function(){return coreResult;},
        set:function(fn){coreResult=typeof fn==='function'?fn:null;}
      });

      recognition.addEventListener('start',function(){deliveredSpeechStart=false;});
      recognition.addEventListener('end',function(){deliveredSpeechStart=false;});

      // Do not forward raw speech-start while TTS is active. Speaker echo has no
      // transcript yet, so interrupting here is inherently unreliable.
      recognition.addEventListener('speechstart',function(event){
        if(speakerActive())return;
        deliveredSpeechStart=true;
        if(coreSpeechStart)coreSpeechStart.call(recognition,event);
      });

      recognition.addEventListener('result',function(event){
        var heard=resultText(event);
        var speaking=speakerActive();

        if(speaking&&heard){
          if(likelySpeakerEcho(heard,finalOnly(event))){
            setHandsFreeStatus();
            return;
          }
          // This is genuine barge-in. Now let the core pause/stop Lovely and process
          // the same recognition result normally.
          if(!deliveredSpeechStart&&coreSpeechStart){
            deliveredSpeechStart=true;
            try{coreSpeechStart.call(recognition,event);}catch(_){}
          }
        }

        if(coreResult)coreResult.call(recognition,event);
      });
    }catch(_){}
    return recognition;
  }

  GuardedRecognition.prototype=NativeRecognition.prototype;
  try{Object.setPrototypeOf(GuardedRecognition,NativeRecognition);}catch(_){}
  GuardedRecognition.__lovelyFullDuplexV3=true;
  if(window.SpeechRecognition===NativeRecognition)window.SpeechRecognition=GuardedRecognition;
  if(window.webkitSpeechRecognition===NativeRecognition)window.webkitSpeechRecognition=GuardedRecognition;
})();
