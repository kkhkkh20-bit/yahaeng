let assassinMenu=null;
function openAssassinMenu(){
  if(DLG.modal||S?.keypad||!$('end').hidden)return;
  const from=!$('ledger').hidden?'ledger':!$('pause').hidden?'pause':'play';
  assassinMenu={from,practice:from!=='ledger'&&!!(STAGE?.skillPractice||STAGE?.toolPractice||STAGE?.trialSkills?.length),paused};
  clearPlayerInput();closeHudInspection();if(running)paused=true;
  if(from==='ledger')$('ledger').hidden=true;if(from==='pause')$('pause').hidden=true;
  if(assassinMenu.practice)skillBranch=STAGE.toolPractice?'tools':'assassin';
  $('skillScreen').hidden=false;renderAssassinMenu();$('btnSkillsBack').focus();
}
function closeAssassinMenu(){
  const m=assassinMenu;if(!m)return;$('skillScreen').hidden=true;assassinMenu=null;clearPlayerInput();
  if(m.from==='ledger'){$('ledger').hidden=false;renderStageList();}
  else if(m.from==='pause')$('pause').hidden=false;
  if(running)paused=m.paused;
}
function chooseAssassinSkill(key){
  const d=ASSASSIN_SKILLS[key],practice=assassinMenu?.practice;if(!d)return;
  if(!practice&&!loadSkillTree().learned.includes(key))return;
  if(practice){S.practiceSkill=key;S.selectedSkill=key;S.skillReadyAt=S.t;}
  else{try{localStorage.setItem('yahaeng.assassinSkill',key);}catch(e){}if(S){S.selectedSkill=key;S.skillStars=totalStars();}}
  renderAssassinMenu();hudCache.skill=null;hudCache.skillScan=null;
}
let skillBranch='body';
function renderAssassinMenu(){
 const practice=!!assassinMenu?.practice,r=loadSkillTree(),owned=new Set(r.learned),points=skillBudget()-skillSpent(r);
 let selected=S?.selectedSkill||'dual';if(!S||assassinMenu?.from==='ledger')try{selected=localStorage.getItem('yahaeng.assassinSkill')||selected;}catch(e){}
 $('skillSummary').textContent=practice?'연습용 적용 · 포인트와 본편 기록은 바뀌지 않는다.':`사용 가능 ${points}P · 사용 ${skillSpent(r)} / 총 ${skillBudget()}P`;
 $('skillTrainingNote').textContent='처음 4P · 의뢰 별 1개마다 1P. 선행 기술부터 배운다. 신체 효과는 자동 적용되며 쌍암살·연속 암살은 하나를 장착한다.';
 $('btnSkillReset').hidden=assassinMenu.from!=='ledger'&&!practice;
 $('skillResetNote').textContent=assassinMenu.from==='ledger'?'다시 배우기를 누르면 배운 기술을 초기화하고 포인트를 돌려받는다.':practice?'연습에서 적용한 기술은 의뢰를 나가면 사라진다.':'포인트 재배분은 의뢰 선택 화면에서 할 수 있다.';
 const list=$('skillCards');list.replaceChildren();
 const tabs=$('skillBranches');tabs.replaceChildren();
 for(const[branch,meta]of Object.entries(SKILL_BRANCHES)){
  const tab=document.createElement('button');tab.type='button';tab.textContent=meta.name;tab.dataset.branch=branch;tab.setAttribute('aria-pressed',String(skillBranch===branch));tab.onclick=()=>{skillBranch=branch;renderAssassinMenu();};tabs.append(tab);
  const section=document.createElement('section');section.className='skill-tree';section.dataset.branch=branch;section.classList.toggle('current',branch===skillBranch);
  const heading=document.createElement('h3');heading.textContent=meta.name;const note=document.createElement('p');note.textContent=meta.note;section.append(heading,note);
  const graph=document.createElement('div');graph.className='skill-graph';section.append(graph);list.append(section);
  for(const d of SKILL_TREE.filter(d=>d.branch===branch)){
   const known=practice?skillOn(d.id):owned.has(d.id),parents=d.req.every(id=>practice?skillOn(id):owned.has(id));
   const article=document.createElement('article');article.className='skill-node'+(known?' learned':'');article.dataset.node=d.id;article.style.gridRow=String(d.row);article.style.gridColumn=d.col?String(d.col):'1 / -1';
   const title=document.createElement('h4');title.textContent=d.name;const cost=document.createElement('span');cost.className='skill-cost';cost.textContent=d.cost+'P';title.append(cost);const desc=document.createElement('p');desc.textContent=d.description;
   const req=document.createElement('small');req.textContent=d.req.length?'선행: '+d.req.map(id=>SKILL_BY_ID[id].name).join(' · '):'시작 기술';
   const learn=document.createElement('button');learn.type='button';learn.dataset.learn=d.id;learn.disabled=known||!parents||!practice&&points<d.cost;learn.textContent=known?'배움':!parents?d.cost+'P · 선행 필요':practice?'연습에 적용':`${d.cost}P 배우기`;learn.onclick=()=>learnTreeSkill(d.id);learn.setAttribute('aria-label',d.name+' · '+learn.textContent);
   article.append(title,desc,req,learn);
   if(ASSASSIN_SKILLS[d.id]){const equip=document.createElement('button');equip.type='button';equip.className='skill-equip';equip.dataset.skill=d.id;equip.disabled=!known;equip.textContent=known&&selected===d.id?'장착 중':'장착';equip.setAttribute('aria-pressed',String(known&&selected===d.id));equip.onclick=()=>chooseAssassinSkill(d.id);article.append(equip);}
   graph.append(article);
  }
 }
 requestAnimationFrame(drawSkillLinks);
}
function drawSkillLinks(){
 const ns='http://www.w3.org/2000/svg';
 for(const graph of $('skillCards').querySelectorAll('.skill-graph')){
  graph.querySelector('svg')?.remove();if(!graph.clientWidth)continue;
  const svg=document.createElementNS(ns,'svg');svg.classList.add('skill-links');svg.setAttribute('aria-hidden','true');svg.setAttribute('width',graph.clientWidth);svg.setAttribute('height',graph.scrollHeight);
  const bounds=graph.getBoundingClientRect();
  for(const node of graph.querySelectorAll('[data-node]'))for(const id of SKILL_BY_ID[node.dataset.node].req){
   const parent=graph.querySelector('[data-node="'+id+'"]');if(!parent)continue;
   const a=parent.getBoundingClientRect(),b=node.getBoundingClientRect(),x0=a.left+a.width/2-bounds.left,y0=a.bottom-bounds.top,x1=b.left+b.width/2-bounds.left,y1=b.top-bounds.top,mid=y1-14;
   const path=document.createElementNS(ns,'path');path.setAttribute('d',`M${x0} ${y0} V${mid} H${x1} V${y1}`);path.classList.toggle('learned',node.classList.contains('learned'));svg.append(path);
  }graph.prepend(svg);
 }
}
window.addEventListener('resize',()=>{if(!$('skillScreen').hidden)drawSkillLinks();});
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
  const state=P.assassinAnim?'동작 중':P.skillHold?`준비 ${Math.ceil(progress*100)}%`:!assassinUnlocked()?'기술 트리에서 배우기':!concealedMeleeAllowed(P)?'은신 기습 필요':S.t<S.skillReadyAt?`회복 ${Math.ceil(S.skillReadyAt-S.t)}초`:choice?'길게 · 살상':'등 뒤에서 준비';
  const key=d.name+'|'+state;if(hudCache.skill!==key){hudCache.skill=key;b.querySelector('b').textContent=(isTouch?'':'B · ')+d.name;b.querySelector('small').textContent=state;b.title=assassinReason()+' · K 기술 트리';b.setAttribute('aria-label',d.name+' · '+state);}
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
