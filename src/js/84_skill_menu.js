let assassinMenu=null;
function openAssassinMenu(){
  if(DLG.modal||S?.keypad||!$('end').hidden)return;
  const from=!$('ledger').hidden?'ledger':!$('pause').hidden?'pause':'play';
  assassinMenu={from,practice:from!=='ledger'&&!!STAGE?.skillPractice,paused};
  clearPlayerInput();closeHudInspection();if(running)paused=true;
  if(from==='ledger')$('ledger').hidden=true;if(from==='pause')$('pause').hidden=true;
  $('skillScreen').hidden=false;renderAssassinMenu();$('btnSkillsBack').focus();
}
function closeAssassinMenu(){
  const m=assassinMenu;if(!m)return;$('skillScreen').hidden=true;assassinMenu=null;clearPlayerInput();
  if(m.from==='ledger'){$('ledger').hidden=false;renderStageList();}
  else if(m.from==='pause')$('pause').hidden=false;
  if(running)paused=m.paused;
}
function chooseAssassinSkill(key){
  const d=ASSASSIN_SKILLS[key],practice=assassinMenu?.practice;if(!d||!practice&&totalStars()<d.stars)return;
  if(practice){S.practiceSkill=key;S.selectedSkill=key;S.skillReadyAt=S.t;}
  else {try{localStorage.setItem('yahaeng.assassinSkill',key);}catch(e){}if(S){S.selectedSkill=key;S.skillStars=totalStars();}}
  renderAssassinMenu();hudCache.skill=null;
}
function renderAssassinMenu(){
  const practice=!!assassinMenu?.practice,stars=totalStars();let selected=S?.selectedSkill||'dual';
  if(!S||assassinMenu?.from==='ledger')try{selected=localStorage.getItem('yahaeng.assassinSkill')||selected;}catch(e){}
  $('skillSummary').textContent=practice?'연습에서는 모든 기술을 사용할 수 있다. 해금 기록은 바뀌지 않는다.':`의뢰에서 모은 별 ${stars}개 · 기술은 별 개수에 따라 해금된다.`;
  const list=$('skillCards');list.replaceChildren();
  for(const [key,d]of Object.entries(ASSASSIN_SKILLS)){
    const unlocked=practice||stars>=d.stars,card=document.createElement('button');card.type='button';card.className='assassin-card';card.dataset.skill=key;card.disabled=!unlocked;card.setAttribute('aria-pressed',String(unlocked&&selected===key));
    const name=document.createElement('b');name.textContent=d.name;
    const note=document.createElement('span');note.textContent=d.description;
    const state=document.createElement('small');state.textContent=!unlocked?`별 ${d.stars}개 필요`:selected===key?'선택됨':practice?'연습에 선택':'사용 기술로 선택';
    card.append(name,note,state);card.addEventListener('click',()=>chooseAssassinSkill(key));list.append(card);
  }
  $('skillTrainingNote').textContent='살상 기술이다. 같은 층·등 뒤·가까운 거리에서만 발동하며, 주민과 정예에게는 사용할 수 없다.';
}
function syncAssassinHUD(){
  const b=$('btnSkill');if(!b||!S)return;
  b.hidden=!assassinSupported()||S.over;
  if(b.hidden)return;
  const P=S.player,d=ASSASSIN_SKILLS[S.selectedSkill];
  // Readiness may lag 0.1s; the actual input and both impacts always revalidate.
  let scan=hudCache.skillScan;
  if(!scan||scan.key!==S.selectedSkill||S.t<scan.t||S.t-scan.t>=.1)scan=hudCache.skillScan={key:S.selectedSkill,t:S.t,choice:assassinOpportunity()};
  const choice=P.assassinAnim?null:P.skillHold||scan.choice;
  const progress=P.skillHold?clamp((S.t-P.skillHold.t0)/LETHAL_HOLD,0,1):0;
  const state=P.assassinAnim?'동작 중':P.skillHold?`준비 ${Math.ceil(progress*100)}%`:!assassinUnlocked()?`별 ${d.stars}개 필요`:S.t<S.skillReadyAt?`회복 ${Math.ceil(S.skillReadyAt-S.t)}초`:choice?'길게 · 살상':'등 뒤에서 준비';
  const key=d.name+'|'+state;if(hudCache.skill!==key){hudCache.skill=key;b.querySelector('b').textContent=(isTouch?'':'B · ')+d.name;b.querySelector('small').textContent=state;b.title=assassinReason()+' · K 기술 목록';b.setAttribute('aria-label',d.name+' · '+state);}
  b.classList.toggle('ready',!!choice);b.style.setProperty('--skill-hold',Math.round(progress*100)+'%');
}
function drawAssassinTargets(){
  const h=S.player.skillHold;if(!h)return;
  ctx.save();ctx.fillStyle='#ded2ad';ctx.font='bold 12px Galmuri,sans-serif';ctx.textAlign='center';
  h.ids.forEach((id,i)=>{const g=assassinAt(id);if(g)ctx.fillText(String(i+1),g.x,g.y-58);});ctx.restore();
}
function updateAssassinPractice(){
  if(!STAGE.skillPractice||S.over||S.player.assassinAnim||S.player.skillHold)return;
  const step=S.tutI||0,ids=step<2?[0,1]:step>=3&&step<5?[2,3]:[];
  if(ids.length&&!S.stats[step<2?'dualAssassinations':'chainAssassinations']&&ids.some(id=>assassinAt(id)?.state==='DEAD'))endGame(false,'암살 기술로 두 대상을 처리하는 연습이다. B 또는 기술 버튼을 길게 눌러 보자.');
}
