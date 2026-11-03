// Equipment is chosen deliberately while the world is stopped, then used by the tool control.
let loadoutOpen=false;
function closeLoadout(focus=false){
  if(!loadoutOpen)return;
  loadoutOpen=false;$('loadout').hidden=true;$('loadoutShade').hidden=true;
  $('btnToolNext').setAttribute('aria-expanded','false');document.body.classList.remove('loadout-open');
  document.body.classList.toggle('inspecting',hudInspecting());
  if(focus)(isTouch?$('btnToolNext'):canvas).focus({preventScroll:true});
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
  if(e.code==='Escape'||e.code==='KeyI'){e.preventDefault();closeLoadout(true);return;}
  if(e.code==='Tab'){
    e.preventDefault();const buttons=[...$('loadout').querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden&&b.getBoundingClientRect().width),i=buttons.indexOf(document.activeElement);
    buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});return;
  }
  // Preserve native Enter/Space activation inside the dialog, consume game shortcuts.
  if(!['Enter','Space'].includes(e.code))e.preventDefault();
}
function initLoadout(){
  $('loadout').querySelector('p').textContent=isTouch?'도구를 고른 뒤 화면의 도구 버튼으로 사용합니다.':'도구를 고른 뒤 F / V로 사용합니다. I로 장비 선택을 열고 닫습니다.';
  $('loadoutShade').addEventListener('click',()=>closeLoadout(true));
  $('btnLoadoutClose').addEventListener('click',()=>closeLoadout(true));
  $('btnWhistle').addEventListener('click',()=>{input.padWhistle=true;syncTools();closeLoadout(true);});
  $('btnToolNext').innerHTML=hudArt('equipment')+'<b>장비</b>';
  $('btnWhistle').insertAdjacentHTML('afterbegin',hudArt('whistle'));
  $('tools').querySelectorAll('.tool').forEach(b=>b.insertAdjacentHTML('afterbegin',hudArt(b.dataset.t==='kunai'?'dart':b.dataset.t)));
  $('btnToolNext').setAttribute('aria-label','장비 선택');$('btnToolNext').setAttribute('aria-haspopup','dialog');$('btnToolNext').setAttribute('aria-expanded','false');
}
