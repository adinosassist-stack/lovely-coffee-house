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

  });
})();
