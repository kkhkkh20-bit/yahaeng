// Permission, observation and illegal work are separate facts. These readouts
// query the same rules as perception; they never grant clearance or suppress AI.
function accessReadout(at=S.player){
  const zi=zoneInfo(at.x,at.y,at.z||0,flOf(at)),P=S.player,uniform=P.outfit?outfitName(P.outfit):'평상복';
  if(!STAGE.zones)return{zi,allowed:false,text:uniform+' · 잠입 구역'};
  if(zi.k===Z_PUB)return{zi,allowed:true,text:uniform+' · 공개 구역'};
  if(permitted(zi))return{zi,allowed:true,text:permitName(zi.allow)+' · 통행 허용'};
  return{zi,allowed:false,text:zi.secure||!zi.allow.length?'보안구역 · 복장으로 통행 불가':uniform+' · 통행 불가',need:zi.allow.map(outfitName).join(' / ')};
}
const ILLEGAL_WORK=new Set(['loot','pick','carry','dress','clean','camCable','camroom','window','vjump','ventIn']);
function workRiskReadout(action){
  const kind=action?.k==='pickup'&&action.p?.outfit?'dress':action?.k;
  if(!ILLEGAL_WORK.has(kind))return null;
  const verb=({loot:'훔치기',pick:'락픽',carry:'운반',dress:'갈아입기',clean:'흔적 지우기',camCable:'전선 분리',camroom:'기록 삭제',window:'창문 넘기',vjump:'창문 넘기',ventIn:'환풍구 진입'})[kind];
  const camera=S.cams.find(c=>!c.search&&cameraAssessment(c,true).detectable);
  if(camera)return{kind:'camera',camera,text:verb+' → CCTV 녹화 위험 · 시야 밖에서 작업'};
  const witness=S.guards.find(g=>g.rawSightAt!=null&&S.t-g.rawSightAt>=0&&S.t-g.rawSightAt<.15&&g.rawSeen&&!g.dog&&!g.doomed&&!['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state));
  if(witness)return{kind:'witness',text:verb+' → 경비 목격 위험 · 시야 밖에서 작업'};
  return{kind:'work',text:verb+'는 수상한 행동 · 복장과 별도 판정'};
}
function syncSecurityReadout(){
  const el=$('accessLbl'),risk=$('actionRiskLbl');if(!el||!risk)return;
  const active=!!STAGE.zones&&!STAGE.firstSteps;el.hidden=!active;risk.hidden=true;if(!active)return;
  const access=accessReadout();el.textContent=access.text;el.dataset.access=access.allowed?'allowed':'denied';el.title=access.need?'필요한 복장: '+access.need:access.allowed?'통행 권한이다. 훔치기와 신원 확인은 별도 판정한다.':'이 구역의 출입 권한이 없다.';
  const action=envAction(),work=workRiskReadout(action);
  if(work){risk.hidden=false;risk.textContent=work.text;risk.dataset.risk=work.kind;}
  else if(['up','fdown'].includes(action.k)&&action.l?.kind==='fstair'){
    const l=action.l,fl=action.k==='up'?l.tfl:l.bfl,entry=accessReadout({x:l.x,y:l.y,fl,z:0});
    risk.hidden=false;risk.textContent=(fl+1)+'층 진입 · '+(entry.allowed?'현재 복장 통행 허용':entry.zi.secure?'보안구역 · 복장 통행 불가':entry.need+' 필요');risk.dataset.risk=entry.allowed?'entry':'witness';
  }
}
