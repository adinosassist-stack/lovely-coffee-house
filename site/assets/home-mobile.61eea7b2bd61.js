(function(){
  var quickOrder=document.getElementById('mobileQuickOrder');
  if(quickOrder){quickOrder.addEventListener('click',function(){var top=document.getElementById('topOrder');if(top)top.click();});}
  var cmm=document.getElementById('corpMobileMenu');if(cmm){cmm.addEventListener('click',function(){var cm=document.getElementById('corpMenu');if(cm)cm.click();});}
})();
