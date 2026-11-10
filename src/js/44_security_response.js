// Security learns about incidents through a report, never through the kill count.
const SECURITY_MEMORY = 100;
function securityEnabled(){return !!STAGE.zones&&!STAGE.tutorial&&!STAGE.city&&STAGE.securityResponse!==false;}
function securityLevel(){return securityEnabled()?(S.security?.level||0):0;}
function securityCrew(g){return isCrew(g)&&!g.police&&!g.child&&(!g.fac||g.fac==='A');}
function securityState(){return S.security||(S.security={reports:{},level:0,next:0});}
function securityBodyGuard(c){
  if(c.guardId!=null)return S.guards.find(g=>g.id===c.guardId);
  if(c.g)return c.g;
  return S.guards.find(g=>g.state==='DEAD'&&flOf(g)===flOf(c)&&(g.z||0)===(c.z||0)&&dist(g.x,g.y,c.x,c.y)<2&&charOf(g)===c.ch);
}
function securityReport(g,kind,at){
  if(!securityEnabled()||!securityCrew(g))return;
  const a=securityState(),key='guard:'+g.id,old=a.reports[key];
  if(old?.kind==='accident')return;
  if(old&&!old.resolved&&(old.kind==='body'||old.kind===kind))return;
  a.reports[key]={id:g.id,kind,at:S.t,x:at.x,y:at.y,fl:flOf(at),z:at.z||0};a.next=0;
}
function securityBodyFound(c,observer,at=c){
  if(!securityEnabled()||observer&&!securityCrew(observer))return;
  const g=securityBodyGuard(c);if(!securityCrew(g))return;const a=securityState(),key='guard:'+g.id;
  if(c.accident){g.rcMissed=true;a.reports[key]={id:g.id,kind:'accident',resolved:true,at:S.t};a.next=0;return;}
  securityReport(g,'body',at);
}
function securityRadioReports(missing){
  if(!securityEnabled())return;
  for(const r of Object.values(S.security?.reports||{}))if(r.kind!=='accident'&&!missing.some(g=>g.id===r.id))r.resolved=true;
  for(const g of missing){const home=g.route?.find(w=>!w.once)||g;securityReport(g,'radio',{x:home.x,y:home.y,fl:flOf(g),z:g.z||0});}
}
function clearSecurityPairs(){
  for(const g of S.guards)if(g.securityBuddy!=null){delete g.securityBuddy;delete g.securityLast;if(g.state==='PATROL'){g.path=null;g.repath=0;}}
}
function formSecurityPairs(){
  for(const g of S.guards)if(g.securityBuddy!=null&&(g.state==='DEAD'||g.state==='CAPTIVE'||g.doomed)){delete g.securityBuddy;delete g.securityLast;}
  const available=S.guards.filter(g=>securityCrew(g)&&!g.elite&&!g.still&&!g.doomed&&!g.climb&&!g.relight&&g.follow==null&&g.state==='PATROL'&&!g.route.some(w=>w.once)&&g.route.length>1);
  const existing=S.guards.filter(g=>g.securityBuddy!=null),used=new Set(existing.flatMap(g=>[g.id,g.securityBuddy]));let pairs=existing.length;
  for(const leader of available){
    if(used.has(leader.id)||pairs>=2)continue;
    const mate=available.filter(g=>g!==leader&&!used.has(g.id)&&flOf(g)===flOf(leader)&&(g.z||0)===(leader.z||0)&&g.fac===leader.fac&&dist(g.x,g.y,leader.x,leader.y)<480)
      .sort((a,b)=>dist(a.x,a.y,leader.x,leader.y)-dist(b.x,b.y,leader.x,leader.y))[0];
    if(!mate)continue;used.add(leader.id);used.add(mate.id);pairs++;
    endChat(leader);leader.act=null;endChat(mate);mate.act=null;mate.securityBuddy=leader.id;mate.securityLast={...gSpot(leader),at:S.t};mate.path=null;mate.repath=0;
  }
}
function securityTargetOrder(a){
  const g=STAGE.id==='m2'&&npc('vip');if(!g||targetEliminated(g)){a.pending=false;return;}
  if(g.state!=='PATROL'||g.doomed||g.climb||g.grabbed||['travelling','waiting'].includes(S.rendezvous?.phase)||['drinking','sick'].includes(S.vipPlan?.phase))return;
  if(!g.route.some(w=>w.securityRetreat)){
    const home=(STAGE.guards.find(d=>d.tag==='vip')?.sched||[])[0];
    if(home){endChat(g);detour(g,home.at[0],home.at[1],20,'VIP룸','보안 점검');g.route[g.ri].securityRetreat=true;g.glance=0;g.glanceT=4;}
  }
  a.pending=false;
}
function updateSecurityResponse(dt){
  if(!securityEnabled()||S.over)return;
  const a=securityState();if((a.next-=dt)>0)return;a.next=.25;
  const active=Object.values(a.reports).filter(r=>!r.resolved&&S.t-r.at<SECURITY_MEMORY);
  const level=active.length>=2?2:active.length?1:0;
  if(level!==a.level){
    const old=a.level;a.level=level;
    if(level>=2&&old<2){clearSecurityPairs();formSecurityPairs();a.pairAt=S.t+4;a.pending=true;toast('경비가 둘씩 순찰한다',2.5,'warn');}
    if(level<2){clearSecurityPairs();a.pending=false;}
  }
  if(level>=2&&a.pending)securityTargetOrder(a);
  if(level>=2&&S.t>=(a.pairAt||0)){formSecurityPairs();a.pairAt=S.t+4;}
  // Reports remain deduplicated after they expire; another observer cannot renew an old body forever.
}
function updateSecurityBuddy(g,dt,speed){
  if(g.securityBuddy==null)return false;
  const leader=S.guards.find(o=>o.id===g.securityBuddy);
  if(securityLevel()<2||!leader){delete g.securityBuddy;delete g.securityLast;g.path=null;return false;}
  const same=flOf(g)===flOf(leader)&&(g.z||0)===(leader.z||0);
  if(leader.state==='PATROL'&&!leader.doomed&&same&&dist(g.x,g.y,leader.x,leader.y)<320&&los(g.x,g.y,leader.x,leader.y,g.z||0))g.securityLast={...gSpot(leader),at:S.t};
  const known=g.securityLast;
  if(!known)return false;
  if(S.t-known.at>7){
    delete g.securityBuddy;delete g.securityLast;endChat(g);goSuspicious(g,known.x,known.y,5);g.why='colleague';gsay(g,'같이 돌던 사람 어디 갔지? 마지막으로 본 데부터 봐야겠네.',2.5);return true;
  }
  if(leader.state!=='PATROL'||!same)return false;
  const seen=S.t-known.at<.1,point=seen?securityEscortPoint(leader,leader.x-Math.cos(leader.a)*52,leader.y-Math.sin(leader.a)*52):known,x=point.x,y=point.y;
  if(dist(g.x,g.y,x,y)>30){if(!g.path||(g.repath-=dt)<=0){pathTo(g,x,y);g.repath=.6;}moveAlong(g,speed,dt);}
  else{g.path=null;lookAround(g,dt,leader.a+Math.PI/3,.7,[1,2]);}
  return true;
}
function securityPatrolPause(g,wp){
  const normal=wp.pause*(S.alevel||wp.once?1:1.8);
  return STAGE.id==='m2'&&g.tag==='vip'&&!wp.once&&Math.hypot(wp.x-tc(27),wp.y-tc(15))<30?Math.min(normal,securityLevel()?7:10):normal;
}
function securityEscortPoint(leader,x,y){
  const solid=leader.z?solidFor(leader.z):solidAt;
  if(!solid(Math.floor(x/TILE),Math.floor(y/TILE))&&los(leader.x,leader.y,x,y,leader.z||0))return{x,y};
  for(const offset of [Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,0]){
    const a=leader.a+offset,p={x:leader.x+Math.cos(a)*52,y:leader.y+Math.sin(a)*52};
    if(!solid(Math.floor(p.x/TILE),Math.floor(p.y/TILE))&&los(leader.x,leader.y,p.x,p.y,leader.z||0))return p;
  }
  return{x:leader.x,y:leader.y};
}
