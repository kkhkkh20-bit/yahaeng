// Campaign entry, recovery guidance and skill use share real actors and persisted progress.
function initActionFlow(){
  if(STAGE.entryRoute&&!S.actionEntry)S.actionEntry={phase:S.t<1?'shade':'skipped'};
  S.skillNotices=S.skillNotices||{};delete S.bodyGoalCache;
}
function recoveryApproach(h){
  if(h.type!=='bush')return hideApproach(h);
  const P=S.player,previous=CUR_F;setLayer(flOf(P));
  try{
    const sx=Math.floor(P.x/TILE),sy=Math.floor(P.y/TILE);
    if(sx===h.tx&&sy===h.ty)return{length:0};
    const path=astar(sx,sy,h.tx,h.ty);if(!path.length)return null;
    let length=0,from=P;for(const p of path){length+=dist(from.x,from.y,p.x,p.y);from=p;}return{length};
  }finally{setLayer(previous);}
}
function bodyRecoveryGoal(){
  const P=S.player;if(!P.carrying||P.z||P.under||P.vent)return null;
  const key=Math.floor(P.x/TILE)+','+Math.floor(P.y/TILE)+','+flOf(P);
  let cached=S.bodyGoalCache;
  if(!cached||cached.key!==key||S.t-cached.t>.5||cached.h&&!hideSpace(cached.h,1)){
    const candidates=[...S.hides,...(S.bushes||[])].filter(h=>flOf(h)===flOf(P)&&(h.z||0)===(P.z||0)&&hideSpace(h,1)&&hideDistance(h)<480).sort((a,b)=>hideDistance(a)-hideDistance(b));
    let h=null;
    for(const candidate of candidates.slice(0,3)){const route=recoveryApproach(candidate);if(route&&route.length<650){h=candidate;break;}}
    cached=S.bodyGoalCache={key,t:S.t,h};
  }
  const h=cached.h;
  return h?{text:P.carrying.ko?'기절자 숨길 곳으로 이동':'몸을 숨길 곳으로 이동',where:hideName(h),x:h.x,y:h.y,fl:flOf(h),z:h.z||0,recovery:true}:null;
}
function actionFlowGoal(){
  // Choosing to carry a body needs recovery guidance. A living patrol, an
  // available uniform or an untouched body is never a mandatory contract goal.
  return bodyRecoveryGoal();
}
function fieldSkillNotice(id,text){
  if(S.skillNotices[id]||S.t-(S.skillNoticeAt??-20)<8)return false;
  S.skillNotices[id]=true;S.skillNoticeAt=S.t;toast(text,3,'good');return true;
}
function updateActionFlow(){
  if(STAGE.tutorial||STAGE.artSlice)return;
  const P=S.player,e=S.actionEntry,d=STAGE.entryRoute;
  if(e&&d&&!['done','skipped'].includes(e.phase)){
    const c=S.corpses.find(c=>c.guardId===d.guard);
    if(c?.hidden||c?.stashed){e.phase='done';S.cpWant=true;}
    else if(c){e.phase='body';if(!S.entryMeansNoticed){S.entryMeansNoticed=true;toast('경비는 의뢰 대상이 아니다 · 옷은 사무동 진입에 이용할 수 있다',4);}}
    else if(!P.carrying&&(P.x<tc(d.bounds[0])-TILE||P.x>tc(d.bounds[2])||P.y<tc(d.bounds[1])||P.y>tc(d.bounds[3])))e.phase='skipped';
    else if(P.hidden&&P.mode==='sneak'&&dist(P.x,P.y,tc(d.bush[0]),tc(d.bush[1]))<90)e.phase='approach';
  }
  if(!mainContract(STAGE)||S.alevel>=2||actionBusy(P)||P.carrying||P.captive||P.hide)return;
  S.skillNotices=S.skillNotices||{};
  if(e&&!['done','skipped'].includes(e.phase))return;
  if(S.t-(S.skillNoticeScan??-1)<.35)return;S.skillNoticeScan=S.t;
  for(const opportunity of STAGE.skillEncounters||[]){
    if(!skillOn(opportunity.skill)||S.skillNotices[opportunity.id]||['dual','chain'].includes(opportunity.skill)&&S.selectedSkill!==opportunity.skill)continue;
    const actors=(opportunity.guards||[]).map(id=>S.guards.find(g=>g.id===id));
    if(actors.some(g=>!g||g.doomed||['DEAD','CAPTIVE','ALERT'].includes(g.state)))continue;
    if(actors.length===2){const d=dist(actors[0].x,actors[0].y,actors[1].x,actors[1].y);if(opportunity.skill==='dual'&&d>54||opportunity.skill==='chain'&&(d<55||d>132))continue;}
    const at=actors[0]||{x:tc(opportunity.at[0]),y:tc(opportunity.at[1]),fl:0,z:0};
    if(flOf(at)!==flOf(P)||(at.z||0)!==(P.z||0)||dist(P.x,P.y,at.x,at.y)>240||!sightLine(P,at.x,at.y,at.z||0,false,flOf(at)))continue;
    if(fieldSkillNotice(opportunity.id,SKILL_BY_ID[opportunity.skill].name+' · '+opportunity.text))return;
  }
  const ready=assassinOpportunity();
  if(ready&&fieldSkillNotice('ready:'+ready.key,ASSASSIN_SKILLS[ready.key].name+' 가능 · 공격을 길게 누르면 사용'))return;
  if(P.moving&&(P.travelSpeed||0)>5){
    const active=P.mode==='sneak'?(skillOn('swiftCrouch')?'swiftCrouch':skillOn('quietCrouch')?'quietCrouch':null):P.mode==='walk'&&skillOn('quietStep')?'quietStep':null;
    if(active)fieldSkillNotice('move:'+active,SKILL_BY_ID[active].name+' 적용 · '+({swiftCrouch:'웅크린 이동 속도 20% 증가',quietCrouch:'웅크린 발소리 범위 35% 감소',quietStep:'걷기 발소리 범위 25% 감소'}[active]));
  }
}
