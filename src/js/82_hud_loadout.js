// Equipment is chosen deliberately while the world is stopped, then used by the tool control.
let loadoutOpen=false;
function closeLoadout(focus=false){
  if(!loadoutOpen)return;
  loadoutOpen=false;$('loadout').hidden=true;$('loadoutShade').hidden=true;
  $('btnToolNext').setAttribute('aria-expanded','false');document.body.classList.remove('loadout-open');
  document.body.classList.toggle('inspecting',hudInspecting());
  if(focus)$('btnToolNext').focus({preventScroll:true});
}
function toggleLoadout(){
  if(loadoutOpen){closeLoadout(true);return;}
  if(!S||!running||paused||S.over||tactical||DLG.modal||S.keypad||actionBusy())return;
  clearPlayerInput();closeEnvPicker();setObjectiveOpen(false);syncTools();
  loadoutOpen=true;$('loadout').hidden=false;$('loadoutShade').hidden=false;
  document.body.classList.add('loadout-open','inspecting');$('btnToolNext').setAttribute('aria-expanded','true');
  const selected=$('tools').querySelector('.tool.on:not([hidden])');
  (input.padWhistle?$('btnWhistle'):selected||$('btnLoadoutClose')).focus({preventScroll:true});
}
function handleLoadoutKey(e){
  e.stopPropagation();
  if(e.code==='Escape'){e.preventDefault();closeLoadout(true);return;}
  if(e.code==='Tab'){
    e.preventDefault();const buttons=[...$('loadout').querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden&&b.getBoundingClientRect().width),i=buttons.indexOf(document.activeElement);
    buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});return;
  }
  // Preserve native Enter/Space activation inside the dialog, consume game shortcuts.
  if(!['Enter','Space'].includes(e.code))e.preventDefault();
}
function initLoadout(){
  $('loadoutShade').addEventListener('click',()=>closeLoadout(true));
  $('btnLoadoutClose').addEventListener('click',()=>closeLoadout(true));
  $('btnWhistle').addEventListener('click',()=>{input.padWhistle=true;syncTools();closeLoadout(true);});
  $('btnToolNext').innerHTML='<b>장비</b>';
  $('btnToolNext').setAttribute('aria-label','장비 선택');$('btnToolNext').setAttribute('aria-haspopup','dialog');$('btnToolNext').setAttribute('aria-expanded','false');
}
