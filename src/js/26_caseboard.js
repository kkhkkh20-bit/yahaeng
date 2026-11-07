// Case knowledge survives a retry; an officer's death never outruns the world save.
const CASE_STORE='yahaeng.case.v1';
let volatileCaseFile=null,caseModalState=null,caseSelected=null;
const casePoll=new WeakMap();
function loadCaseFile(){
 let raw=volatileCaseFile;if(!raw)try{raw=JSON.parse(localStorage.getItem(CASE_STORE));}catch(e){}
 const valid=new Set(CASE_SOURCES.map(s=>s.id));
 return{schema:1,sources:[...new Set(Array.isArray(raw?.sources)?raw.sources.filter(id=>valid.has(id)):[])]};
}
function caseAllSources(){
 const ids=new Set(loadCaseFile().sources),cleared=loadCh();
 for(const s of CASE_SOURCES)if(cleared[s.stage]?._clear)ids.add(s.id);
 return CASE_SOURCES.filter(s=>ids.has(s.id));
}
function syncCaseProgress(force=false){
 if(!S||!running||!force&&(paused||S.over)||!LEARNING_ROUTE.includes(STAGE.id))return;
 const last=casePoll.get(S);if(!force&&last!==undefined&&S.t>=last&&S.t-last<.25)return;casePoll.set(S,S.t);
 const record=loadCaseFile(),known=new Set(caseAllSources().map(s=>s.id)),fresh=CASE_SOURCES.filter(s=>s.stage===STAGE.id&&!known.has(s.id)&&
  (!s.targets||s.targets.every(tag=>S.guards.some(g=>g.target&&g.tag===tag&&targetEliminated(g))))&&
  (!s.items||s.items.every(i=>S.items[i]?.got)));
 if(!fresh.length)return;
 record.sources=[...new Set([...record.sources,...fresh.map(s=>s.id)])];volatileCaseFile=record;
 try{localStorage.setItem(CASE_STORE,JSON.stringify(record));}catch(e){}
 S.caseDiscoveries=[...new Set([...(S.caseDiscoveries||[]),...fresh.map(s=>s.id)])];
 toast('새 단서 · '+fresh.map(s=>s.title).join(' / ')+' — 조직도에 기록했다',4);
}
function caseView(){
 const sources=caseAllSources(),cleared=loadCh();
 return CASE_NODES.map(n=>{
  let level=0;for(const s of sources)level=Math.max(level,s.grants[n.id]||0);
  const active=running&&S&&STAGE.id===n.stage,st=STAGES.find(s=>s.id===n.stage),profile=st?.targetCast?.[n.tag];
  if(active)level=3; // A current briefing already identifies its actual target.
  const eliminated=!!cleared[n.stage]?._clear||!!(active&&S.guards.some(g=>g.target&&g.tag===n.tag&&targetEliminated(g)));
  // Legacy campaigns can skip the new introductory jobs. Never invent their kills.
  const severed=!eliminated&&['runner','contact','broker'].includes(n.id)&&['m2','m4','m7','m5','n1'].some(id=>cleared[id]?._clear);
  return{...n,level:eliminated?Math.max(level,2):level,eliminated,severed,profile};
 });
}
function caseElement(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function caseStatus(n){return n.eliminated?'처치 확인':n.severed?'보고선 차단':n.level>=3?'동선 확보':n.level>=2?'신원 확인':n.level?'가명 확인':'신원 미상';}
function renderCaseEntry(id,allowed=true){
 const el=$(id);if(!el)return;el.hidden=!allowed||!LEARNING_ROUTE.includes(STAGE.id);if(el.hidden)return;
 const receipt=(S?.caseDiscoveries||[]).map(id=>CASE_SOURCES.find(s=>s.id===id)).filter(Boolean),all=caseView();
 el.replaceChildren(caseElement('span','case-entry-copy',receipt.length?'새 단서 · '+receipt.at(-1).title:'금성회 추적 · '+all.filter(n=>n.eliminated).length+'명 처치 확인'));
 const b=caseElement('button','ghost','조직도 보기');b.type='button';b.dataset.caseOpen='';el.append(b);
}
function renderCaseDetail(id){
 const nodes=caseView(),n=nodes.find(n=>n.id===id);if(!n)return;caseSelected=id;
 for(const b of $('caseHierarchy').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.caseNode===id));
 const panel=$('caseDetail');panel.replaceChildren();
 panel.append(caseElement('small','case-kicker',caseStatus(n)),caseElement('h3','',n.level>=2?n.profile.name:n.level?n.alias:'아직 밝혀지지 않은 인물'));
 if(n.level>=2){panel.append(caseElement('p','',n.profile.appearance));if(n.profile.temperament)panel.append(caseElement('p','',n.profile.temperament));}
 panel.append(caseElement('p','case-area',n.level>=2?n.area:n.level?'정확한 신원과 거점은 다음 단서로 확인한다.':'하부 간부의 연락과 회수한 문서에서 보고선을 찾는다.'));
 if(n.level>=3){panel.append(caseElement('p','case-routine',n.routine));if(n.profile.habit)panel.append(caseElement('p','',n.profile.habit));}
 if(n.severed)panel.append(caseElement('p','','하부 연락선은 끊겼다. 직접 처치가 확인된 인물은 아니다.'));
 const links=CASE_LINKS.filter(([a,b])=>[a,b].includes(id)&&nodes.find(n=>n.id===a).level&&nodes.find(n=>n.id===b).level);
 if(links.length){panel.append(caseElement('h4','','확인된 보고선'));for(const[a,b]of links){const label=id=>{const v=nodes.find(n=>n.id===id);return v.level>=2?v.profile.name:v.alias;};panel.append(caseElement('p','case-link',label(a)+' → '+label(b)));}}
 const evidence=caseAllSources().filter(s=>s.grants[id]||s.stage===n.stage&&s.targets?.includes(n.tag));
 panel.append(caseElement('h4','','수집한 단서'));
 if(!evidence.length)panel.append(caseElement('p','case-empty',n.level?'이번 의뢰에서 현장 증거를 확보한다.':'아직 연결된 증거가 없다.'));
 for(const s of evidence){const e=caseElement('article','case-evidence');e.append(caseElement('strong','',s.title),caseElement('p','',s.text));panel.append(e);}
}
function renderCaseBoard(){
 const nodes=caseView(),hierarchy=$('caseHierarchy');hierarchy.replaceChildren();
 const eliminated=nodes.filter(n=>n.eliminated).length,severed=nodes.filter(n=>n.severed).length;
 $('casePressure').textContent=nodes.find(n=>n.id==='chair').eliminated?'마지막 명령선까지 끊었다. 금성회의 지휘망이 무너졌다.':'간부를 처치하고 증거를 대조해, 그 위에서 명령하는 자를 찾는다.';
 $('caseProgress').textContent='처치 확인 '+eliminated+' / '+nodes.length+(severed?' · 보고선 차단 '+severed:'');
 const tiers=['운반·연락','중개·유흥','자금·운송','총책','최종 명령선'];
 for(let tier=4;tier>=0;tier--){
  const members=nodes.filter(n=>n.tier===tier&&(tier<4||n.level));if(!members.length)continue;
  const group=caseElement('section','case-tier');group.append(caseElement('h3','',tiers[tier]));const row=caseElement('div','case-tier-row');
  for(const n of members){
   const b=caseElement('button','case-node'+(n.eliminated?' eliminated':'')+(!n.level?' unknown':''));b.type='button';b.dataset.caseNode=n.id;
   const face=caseElement('span','case-face');
   if(n.level>=2){const cv=caseElement('canvas');cv.width=cv.height=76;cv.setAttribute('aria-hidden','true');face.append(cv);drawFace(cv,{key:n.profile.key,col:'#c2cbd2'});}else face.append(caseElement('span','','?'));
   const copy=caseElement('span','case-node-copy');copy.append(caseElement('strong','',n.level>=2?n.profile.name:n.level?n.alias:'신원 미상'),caseElement('small','',caseStatus(n)));b.append(face,copy);row.append(b);
  }group.append(row);hierarchy.append(group);
 }
 const selected=nodes.find(n=>n.id===caseSelected&&(n.tier<4||n.level))||nodes.find(n=>n.stage===STAGE.id&&running)||nodes.filter(n=>n.level&&!n.eliminated).at(-1)||nodes[0];
 renderCaseDetail(selected.id);
}
function openCaseBoard(){
 const d=$('caseBoard');if(d.open)return;
 caseModalState={paused,focus:document.activeElement};if(running){clearPlayerInput();paused=true;}
 renderCaseBoard();d.showModal();$('btnCaseClose').focus({preventScroll:true});
}
function closeCaseBoard(){if($('caseBoard').open)$('caseBoard').close();}
function resetCaseBoard(){caseModalState=null;caseSelected=null;closeCaseBoard();}
function installCaseBoard(){
$('caseBoard').addEventListener('close',()=>{
 const state=caseModalState;caseModalState=null;if(!state)return;
 paused=state.paused;if(state.focus?.isConnected)state.focus.focus({preventScroll:true});
});
$('btnCaseClose').addEventListener('click',closeCaseBoard);
$('caseHierarchy').addEventListener('click',e=>{const b=e.target.closest('[data-case-node]');if(b){renderCaseDetail(b.dataset.caseNode);if(innerWidth<=650)$('caseDetail').scrollIntoView({block:'start',behavior:'smooth'});}});
document.addEventListener('click',e=>{if(e.target.closest('[data-case-open]'))openCaseBoard();});
for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
 if(!$('caseBoard').open)return;e.stopImmediatePropagation();
 if(e.code==='Tab'&&type==='keydown'){
  e.preventDefault();const buttons=[...$('caseBoard').querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(b=>b.getClientRects().length),i=buttons.indexOf(document.activeElement);
  if(buttons.length)buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
 }
 if(e.code==='Escape'){e.preventDefault();if(type==='keydown')closeCaseBoard();}
},{capture:true});

}
