// Active assassination abilities use ownership from the shared skill tree.
const ASSASSIN_SKILLS={
  dual:{name:'쌍암살',cooldown:12,description:'붙어 있는 두 적의 등 뒤에서 함께 처리한다. 두 대상 모두 가까이 있어야 한다.'},
  chain:{name:'연속 암살',cooldown:16,description:'등 뒤의 적을 처리한 뒤 가까운 다음 적에게 직접 이동해 한 번 더 공격한다.'}
};
function initAssassinSkills(){
  syncRuntimeSkills();S.skillStars=totalStars();S.skillReadyAt=Number.isFinite(S.skillReadyAt)?S.skillReadyAt:0;
  let key='dual';try{key=localStorage.getItem('yahaeng.assassinSkill')||key;}catch(e){}
  S.selectedSkill=ASSASSIN_SKILLS[key]?key:'dual';
  if(!STAGE.skillPractice&&!skillOn(S.selectedSkill))S.selectedSkill='dual';
  if(STAGE.skillPractice)S.selectedSkill=S.practiceSkill||'dual';
  cancelAssassinSkill();
}
const assassinUnlocked=(key=S.selectedSkill)=>!!ASSASSIN_SKILLS[key]&&skillOn(key);
const assassinSupported=()=>!!S&&!STAGE.artSlice&&(!STAGE.tutorial||!!STAGE.skillPractice);
function assassinPath(a,b){
  if(flOf(a)!==flOf(b)||(a.z||0)!==(b.z||0))return false;
  const L0=CUR_F;setLayer(flOf(a));let ok=true;
  const n=Math.max(1,Math.ceil(dist(a.x,a.y,b.x,b.y)/8)),sol=solidFor(a.z||0);
  for(let i=0;i<=n&&ok;i++)for(const [dx,dy]of [[-10,-10],[10,-10],[-10,10],[10,10]]){
    const x=a.x+(b.x-a.x)*i/n+dx,y=a.y+(b.y-a.y)*i/n+dy;
    if(sol(Math.floor(x/TILE),Math.floor(y/TILE))){ok=false;break;}
  }
  setLayer(L0);return ok;
}
function assassinVictim(g,from,reach){
  if(!g||g.child||g.civ||g.dog||g.elite||g.doomed||g.climb||g.seen||g.meter>=NOTICE_AT||['DEAD','CAPTIVE','ALERT','TERROR','FLEE'].includes(g.state))return false;
  if(flOf(g)!==flOf(from)||(g.z||0)!==(from.z||0)||dist(from.x,from.y,g.x,g.y)>reach)return false;
  if(Math.abs(angDiff(g.a,Math.atan2(from.y-g.y,from.x-g.x)))<1.95)return false;
  return sightLine(from,g.x,g.y,g.z||0,false,flOf(g));
}
function assassinLanding(g,from){
  const d=Math.max(1,dist(from.x,from.y,g.x,g.y));
  return{x:g.x+(from.x-g.x)*40/d,y:g.y+(from.y-g.y)*40/d,fl:flOf(g),z:g.z||0};
}
function assassinOpportunity(key=S.selectedSkill){
  const P=S.player;
  if(!concealedMeleeAllowed(P)||!assassinSupported()||!assassinUnlocked(key)||S.t<S.skillReadyAt||P.z||P.wire||P.ledge||P.car||P.hurtT>0||P.hide||P.vent||P.under||P.carrying||P.captive||P.jump||P.trav||P.lunge||P.grabIn||P.interact||P.pick||P.strikeT>0||P.assassinAnim)return null;
  const first=S.guards.filter(g=>assassinVictim(g,P,Math.min(62,meleeReach(P)))).sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y));
  for(const a of first){
    const others=S.guards.filter(g=>g!==a&&assassinVictim(g,P,key==='dual'?62:195)&&dist(a.x,a.y,g.x,g.y)<=(key==='dual'?54:132)&&dist(a.x,a.y,g.x,g.y)>=(key==='dual'?10:55));
    const b=others.sort((b,c)=>dist(a.x,a.y,b.x,b.y)-dist(a.x,a.y,c.x,c.y))[0];if(!b)continue;
    const at=key==='chain'?assassinLanding(b,P):null;
    if(at&&!assassinPath(P,at))continue;
    return{key,ids:[a.id,b.id],at};
  }return null;
}
function assassinReason(){
  const P=S.player,k=S.selectedSkill;
  if(!assassinUnlocked(k))return 'K · 기술 트리에서 선행 기술과 포인트를 확인';
  if(!concealedMeleeAllowed(P))return abilityLockText('ambush');
  if(S.t<S.skillReadyAt)return `회복 ${Math.ceil(S.skillReadyAt-S.t)}초`;
  if(P.z||P.hide||P.vent||P.under||P.carrying||P.captive)return '빈손으로 같은 층의 등 뒤에서 접근';
  return k==='dual'?'붙어 있는 두 적의 등 뒤로 접근':'가까운 두 적의 등 뒤와 이동 경로 확보';
}

function assassinPreview(){
  const P=S.player,key=S.selectedSkill+'|'+P.x+'|'+P.y+'|'+flOf(P)+'|'+(P.z||0);
  let scan=hudCache.skillScan;
  if(!scan||scan.key!==key||S.t<scan.t||S.t-scan.t>=.1)scan=hudCache.skillScan={key,t:S.t,choice:assassinOpportunity()};
  return scan.choice;
}
