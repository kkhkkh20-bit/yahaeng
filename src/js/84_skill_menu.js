let assassinMenu=null;
function openAssassinMenu(){
  if(DLG.modal||S?.keypad||!$('end').hidden)return;
  const from=!$('ledger').hidden?'ledger':!$('pause').hidden?'pause':'play';
  assassinMenu={from,practice:from!=='ledger'&&!!(STAGE?.skillPractice||STAGE?.toolPractice||STAGE?.trialSkills?.length),paused};
  clearPlayerInput();closeHudInspection();if(running)paused=true;
  if(from==='ledger')$('ledger').hidden=true;if(from==='pause')$('pause').hidden=true;
  if(assassinMenu.practice)skillBranch=STAGE.toolPractice||STAGE.trialSkills?.includes('electric')?'tools':'assassin';
  skillDetailMode=null;$('skillScreen').hidden=false;renderAssassinMenu();$('btnSkillsBack').focus();
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
let skillBranch='body',skillFocused='quietStep',skillDetailMode=null;
function skillViewState(d){
 const practice=!!assassinMenu?.practice,r=loadSkillTree(),owned=new Set(r.learned),known=practice?skillOn(d.id):owned.has(d.id),parents=d.req.every(id=>practice?skillOn(id):owned.has(id));
 let active=S?.selectedSkill||'dual';if(!S||assassinMenu?.from==='ledger')try{active=localStorage.getItem('yahaeng.assassinSkill')||active;}catch(e){}
 return{practice,known,parents,points:skillBudget()-skillSpent(r),active};
}
function closeSkillDetail(){skillDetailMode=null;syncSkillDetail();$('skillCards').querySelector('[data-select="'+skillFocused+'"]')?.focus({preventScroll:true});}
function syncSkillDetail(){
 const open=!!skillDetailMode;$('skillDetail').hidden=!open;$('skillDetailShade').hidden=!open;$('skillScreen').classList.toggle('detail-open',open);
 const route=new Set(open&&skillDetailMode==='skill'?skillPath(skillFocused):[]);
 for(const n of $('skillCards').querySelectorAll('[data-node]')){const selected=route.has(n.dataset.node)&&n.dataset.node===skillFocused;n.classList.toggle('selected',selected);n.classList.toggle('in-path',route.has(n.dataset.node));n.querySelector('button').setAttribute('aria-pressed',String(selected));}
 drawSkillLinks();requestAnimationFrame(drawSkillLinks);
}
function detailCloseButton(){const b=document.createElement('button');b.type='button';b.className='skill-detail-close';b.setAttribute('aria-label','기술 설명 닫기');b.textContent='닫기';b.onclick=closeSkillDetail;return b;}
function selectSkillNode(id,focus=false){
 const d=SKILL_BY_ID[id];if(!d)return;skillFocused=id;skillBranch=d.branch;skillDetailMode='skill';renderSkillDetail();syncSkillDetail();
 for(const b of $('skillBranches').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.branch===skillBranch));
 const button=$('skillCards').querySelector('[data-select="'+id+'"]');if(focus)button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',inline:'nearest'});
 if(innerWidth<1000&&!focus)$('skillDetail').querySelector('.skill-detail-close').focus({preventScroll:true});
}
function renderSkillDetail(){
 if(skillDetailMode==='rewards'){renderSkillRewards();return;}if(skillDetailMode!=='skill')return;
 const d=SKILL_BY_ID[skillFocused],v=skillViewState(d),pane=$('skillDetail');pane.replaceChildren();pane.scrollTop=0;pane.append(detailCloseButton());
 const head=document.createElement('div');head.className='skill-detail-head';head.innerHTML='<div>'+skillSigil(d.id,'skill-detail-emblem')+'<h3>'+d.name+'</h3></div>';
 const state=document.createElement('div');state.className='skill-detail-state';const label=v.known?(v.practice?'연습용 적용 중':'배운 기술'):!v.parents?'선행 기술 필요':!v.practice&&v.points<d.cost?'포인트 부족':'배울 수 있는 기술';state.innerHTML='<span class="'+(v.known?'known':'')+'">'+label+'</span><span>'+SKILL_BRANCHES[d.branch].name+' · '+d.cost+'P</span>';head.append(state);pane.append(head);
 const figure=document.createElement('figure');figure.className='skill-preview';figure.innerHTML='<canvas id="skillPreview" width="480" height="220" aria-label="'+d.name+' 사용 장면 안내"></canvas><figcaption>동작 안내</figcaption>';pane.append(figure);
 const body=document.createElement('div');body.className='skill-description';const benefit=skillBenefit(d);body.innerHTML='<dl class="skill-benefit"><div><dt>기본</dt><dd>'+benefit[0]+'</dd></div><div><dt>습득 후</dt><dd>'+benefit[1]+'</dd></div></dl><p>'+d.description+'</p><p class="skill-purpose">'+SKILL_UTILITY[d.id]+'</p><div class="skill-use">'+skillSigil(d.id)+'<span>'+skillUseText(d)+'</span></div>';pane.append(body);
 const req=document.createElement('div');req.className='skill-prereqs';const path=skillPath(d.id),missing=path.filter(id=>!skillViewState(SKILL_BY_ID[id]).known),cost=missing.reduce((n,id)=>n+SKILL_BY_ID[id].cost,0),note=document.createElement('p');note.textContent=v.known?'습득 경로':path.length===1?'이 기술부터 시작할 수 있다.':'습득 순서 · 여기까지 남은 비용 '+cost+'P';req.append(note);
 for(const[id,index]of path.map((id,i)=>[id,i])){const b=document.createElement('button');b.type='button';b.textContent=(index+1)+'. '+SKILL_BY_ID[id].name+' · '+(skillViewState(SKILL_BY_ID[id]).known?'배움':SKILL_BY_ID[id].cost+'P');b.dataset.path=id;b.setAttribute('aria-current',String(id===d.id));b.onclick=()=>selectSkillNode(id,true);req.append(b);}pane.insertBefore(req,figure);
 const actions=document.createElement('div');actions.className='skill-detail-actions';const learn=document.createElement('button');learn.type='button';learn.dataset.learn=d.id;learn.disabled=v.known||!v.parents||!v.practice&&v.points<d.cost;learn.textContent=v.known?'배움':!v.parents?'선행 기술 필요':!v.practice&&v.points<d.cost?d.cost+'P 필요 · 현재 '+v.points+'P':v.practice?'연습에 적용':d.cost+'P · 배우기';learn.setAttribute('aria-label',d.name+' · '+learn.textContent);learn.onclick=()=>learnTreeSkill(d.id);actions.append(learn);
 if(ASSASSIN_SKILLS[d.id]){const equip=document.createElement('button');equip.type='button';equip.id='btnSkillEquip';equip.className='skill-equip';equip.disabled=!v.known;equip.textContent=!v.known?'배워야 장착':v.active===d.id?'장착 중':'장착';equip.onclick=()=>chooseAssassinSkill(d.id);actions.append(equip);}pane.append(actions);drawSkillPreview(d.id);
}
function renderSkillRewards(){
 const pane=$('skillDetail');pane.replaceChildren();pane.scrollTop=0;pane.append(detailCloseButton());
 const head=document.createElement('div');head.className='skill-detail-head';head.innerHTML='<h3>미션 업적</h3><p class="skill-reward-note">첫 완료 2P · 주요 업적 2P · 나머지 업적 1P<br>각 보상은 한 번만 지급된다.</p>';pane.append(head);
 for(const stage of mainContracts()){
  const rows=skillRewardRows(stage).filter(r=>!r.retired||r.earned),section=document.createElement('section');section.className='skill-reward-mission';const earned=rows.filter(r=>r.earned).reduce((n,r)=>n+r.points,0);section.innerHTML='<h4>의뢰 '+contractNumber(stage)+' · '+stage.name.replace(/^의뢰 \d+ · /,'')+'</h4><p>'+earned+' / '+rows.reduce((n,r)=>n+r.points,0)+'P 획득</p><ul>'+rows.map(r=>'<li class="'+(r.earned?'earned':'')+'"><span>'+r.name+(r.signature?' <small>주요 업적</small>':'')+'</span><b>'+(r.earned?'완료 · ':'')+r.points+'P</b></li>').join('')+'</ul>';pane.append(section);
 }
 const record=loadSkillTree(),foot=document.createElement('p');foot.className='skill-reward-note';foot.textContent='시작 포인트 4P · 현재까지 미션 보상 '+missionSkillPoints()+'P'+(record.legacyPoints?' · 이전 연습 기록 이월 '+record.legacyPoints+'P':'')+' · 연습은 포인트를 지급하지 않는다. 이전 의뢰의 첫 완료·업적은 각각 1P.';pane.append(foot);
}
function handleSkillDetailKey(e){
 if(!skillDetailMode)return false;
 if(e.code==='Escape'){e.preventDefault();closeSkillDetail();return true;}
 if(e.code==='Tab'&&innerWidth<1000){const buttons=[...$('skillDetail').querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);if(i<0||e.shiftKey&&i===0||!e.shiftKey&&i===buttons.length-1){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0]?.focus();return true;}}return false;
}
function renderAssassinMenu(){
 const r=loadSkillTree(),practice=!!assassinMenu?.practice,points=skillBudget()-skillSpent(r),focus=document.activeElement?.dataset.select||document.activeElement?.dataset.learn,board=$('skillBoard'),scroll={top:board.scrollTop,left:board.scrollLeft};
 $('skillSummary').innerHTML=practice?'연습용 기술<br>본편 기록에 저장되지 않음':'<strong>'+points+'P</strong> 사용 가능<br>사용 '+skillSpent(r)+' / 총 '+skillBudget()+'P';
 $('skillTrainingNote').textContent='전체 기술이 펼쳐져 있다. 위에서 아래로 연결선을 따라 배우고, 선택하면 오른쪽에서 효과와 습득 순서를 확인한다.';
 $('btnSkillReset').hidden=assassinMenu.from!=='ledger'&&!practice;$('skillResetNote').textContent=assassinMenu.from==='ledger'?'재배분하면 포인트를 모두 돌려받는다.':practice?'이 연습에서만 적용된다.':'재배분은 의뢰 선택 화면에서 가능하다.';
 const list=$('skillCards'),tabs=$('skillBranches');list.replaceChildren();tabs.replaceChildren();
 for(const[branch,meta]of Object.entries(SKILL_BRANCHES)){
  const defs=SKILL_TREE.filter(d=>d.branch===branch),layout=skillTreeLayout(branch),count=defs.filter(d=>skillViewState(d).known).length;
  const tab=document.createElement('button');tab.type='button';tab.innerHTML=meta.name+'<span>'+count+' / '+defs.length+'</span>';tab.dataset.branch=branch;tab.setAttribute('aria-pressed',String(skillBranch===branch));tab.onclick=()=>{skillBranch=branch;if(skillDetailMode)closeSkillDetail();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b===tab));section.scrollIntoView({block:'nearest',inline:'center'});};tabs.append(tab);
  const section=document.createElement('section');section.className='skill-tree';section.dataset.branch=branch;section.style.setProperty('--leaves',layout.leaves);section.setAttribute('aria-label',meta.name+' 기술 트리');
  const heading=document.createElement('h3');heading.innerHTML=skillSigil(defs[0].id)+meta.name;const note=document.createElement('p');note.textContent=meta.note;section.append(heading,note);
  const graph=document.createElement('div');graph.className='skill-graph';section.append(graph);list.append(section);
  for(const d of defs){
   const at=layout.positions[d.id],v=skillViewState(d),article=document.createElement('div');article.className='skill-node'+(v.known?' learned':v.parents&&(v.practice||v.points>=d.cost)?' available':'');article.dataset.node=d.id;article.style.gridRow=String(at.row);article.style.gridColumn=at.col+' / span 2';
   const b=document.createElement('button');b.type='button';b.dataset.select=d.id;b.setAttribute('aria-pressed','false');b.setAttribute('aria-controls','skillDetail');b.setAttribute('aria-label',d.name+' · '+(v.known?'배움':d.cost+'P'+(!v.parents?' · 선행 기술 필요':'')));b.title=d.name;b.innerHTML=skillSigil(d.id)+'<span class="skill-cost">'+(v.known?'배움':d.cost+'P')+'</span>';b.onclick=()=>selectSkillNode(d.id);
   b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight',sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1,candidates=defs.filter(x=>x.id!==d.id).map(x=>({d:x,dx:layout.positions[x.id].col-at.col,dy:layout.positions[x.id].row-at.row})).filter(x=>(horizontal?x.dx:x.dy)*sign>0).sort((a,b)=>horizontal?Math.abs(a.dy)*4+Math.abs(a.dx)-(Math.abs(b.dy)*4+Math.abs(b.dx)):Math.abs(a.dy)*3+Math.abs(a.dx)-(Math.abs(b.dy)*3+Math.abs(b.dx)));if(candidates[0])selectSkillNode(candidates[0].d.id,true);};
   const label=document.createElement('span');label.className='skill-label';label.textContent=d.name;article.append(b,label);graph.append(article);
  }
 }
 const slots=$('skillLoadout');slots.innerHTML='<span>암살 기술 · B</span>';for(const id of ['dual','chain']){const d=SKILL_BY_ID[id],v=skillViewState(d),b=document.createElement('button');b.type='button';b.dataset.skill=id;b.disabled=!v.known;b.setAttribute('aria-pressed',String(v.known&&v.active===id));b.innerHTML=skillSigil(id)+'<span>'+d.name+'</span>';b.setAttribute('aria-label',d.name+' '+(!v.known?'미해금':v.active===id?'장착 중':'장착'));b.onclick=()=>chooseAssassinSkill(id);slots.append(b);}
 $('btnSkillRewards').onclick=()=>{skillDetailMode='rewards';renderSkillRewards();syncSkillDetail();if(innerWidth<1000)$('skillDetail').querySelector('button').focus();};$('skillDetailShade').onclick=closeSkillDetail;
 renderSkillDetail();syncSkillDetail();board.scrollTop=scroll.top;board.scrollLeft=scroll.left;
 if(focus&&innerWidth>=1000)$('skillCards').querySelector('[data-select="'+focus+'"]')?.focus({preventScroll:true});
}
function drawSkillLinks(){
 const ns='http://www.w3.org/2000/svg',route=new Set(skillDetailMode==='skill'?skillPath(skillFocused):[]);
 for(const graph of $('skillCards').querySelectorAll('.skill-graph')){
  graph.querySelector('.skill-links')?.remove();if(!graph.clientWidth)continue;
  const svg=document.createElementNS(ns,'svg');svg.classList.add('skill-links');svg.setAttribute('aria-hidden','true');svg.setAttribute('width',graph.clientWidth);svg.setAttribute('height',graph.scrollHeight);const bounds=graph.getBoundingClientRect();
  for(const node of graph.querySelectorAll('[data-node]'))for(const id of SKILL_BY_ID[node.dataset.node].req){
   const parent=graph.querySelector('[data-node="'+id+'"]');if(!parent)continue;
   const a=parent.querySelector('button').getBoundingClientRect(),b=node.querySelector('button').getBoundingClientRect(),x0=a.left+a.width/2-bounds.left,y0=a.bottom-bounds.top+4,x1=b.left+b.width/2-bounds.left,y1=b.top-bounds.top-7;
   const path=document.createElementNS(ns,'path');path.dataset.from=id;path.dataset.to=node.dataset.node;path.setAttribute('d',`M${x0} ${y0} V${y0+26} H${x1} V${y1} M${x1-3} ${y1-4} L${x1} ${y1} L${x1+3} ${y1-4}`);path.classList.toggle('learned',node.classList.contains('learned'));path.classList.toggle('in-path',route.has(id)&&route.has(node.dataset.node));svg.append(path);
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
  ctx.save();ctx.fillStyle='#ded2ad';ctx.font=uiFont(12);ctx.textAlign='center';
  h.ids.forEach((id,i)=>{const g=assassinAt(id);if(g)ctx.fillText(String(i+1),g.x,g.y-58);});ctx.restore();
}
function updateAssassinPractice(){
  if(!STAGE.skillPractice||S.over||S.player.assassinAnim||S.player.skillHold)return;
  const step=S.tutI||0,ids=step<2?[0,1]:step>=3&&step<5?[2,3]:[];
  if(ids.length&&!S.stats[step<2?'dualAssassinations':'chainAssassinations']&&ids.some(id=>assassinAt(id)?.state==='DEAD'))endGame(false,'암살 기술로 두 대상을 처리하는 연습이다. B 또는 기술 버튼을 길게 눌러 보자.');
}
