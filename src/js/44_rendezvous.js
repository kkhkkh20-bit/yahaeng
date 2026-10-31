// A recovered ledger is also leverage: summon its owner back into the office.
// The phone reuses an actual desk; the appointment reuses walkable room space.
function rendezvousState() {
  const d=STAGE.rendezvous;if(!d)return null;
  if(S.rendezvous)return S.rendezvous;
  const b=BLD[d.b],fl=d.fl||0,L0=CUR_F;setLayer(fl);
  try {
    const room=planPt(d.b,fl,'L');if(!b||!room)return null;
    const desk=FURN.filter(f=>(f.fl||0)===fl&&f.t==='desk'&&f.x>b.x0&&f.x<b.x1&&f.y>b.y0&&f.y<b.y1)
      .sort((a,c)=>Math.hypot(a.x-room[0],a.y-room[1])-Math.hypot(c.x-room[0],c.y-room[1]))[0];
    if(!desk||solidAt(room[0],room[1]))return null;
    const phone={x:tc(desk.x),y:tc(desk.y),tx:desk.x,ty:desk.y,fl,z:0};
    S.rendezvous={phase:'idle',phone,room:{x:tc(room[0]),y:tc(room[1]),fl,z:0},cooldown:0,calls:0};
    return S.rendezvous;
  }finally{setLayer(L0);}
}
function rendezvousTarget(){return STAGE.rendezvous?npc(STAGE.rendezvous.target):null;}
function rendezvousReady() {
  const r=rendezvousState(),g=rendezvousTarget();
  return !!(r&&g&&S.items.length&&S.items.every(it=>it.got)&&!targetEliminated(g)&&g.state==='PATROL'&&!g.climb&&!g.grabbed&&!g.doomed&&!g.brawl&&
    !['travelling','waiting'].includes(r.phase)&&r.cooldown<=0&&S.alevel<2&&S.vipPlan?.phase!=='sick'&&S.vipPlan?.phase!=='drinking');
}
function nearRendezvous() {
  const r=rendezvousState(),P=S.player;
  if(!r||ACT_SKIP.has(r.phone)||P.hide||P.under||P.vent||P.z||P.captive||P.carrying||!rendezvousReady()||!objectReachable(r.phone,60))return null;
  return {k:'callMeet',p:r.phone,label:'내선으로 실장 부르기'};
}
function callRendezvous() {
  const r=rendezvousState(),g=rendezvousTarget();
  if(!rendezvousReady()||!objectReachable(r.phone,60))return false;
  const at=r.room;
  detour(g,Math.floor(at.x/TILE),Math.floor(at.y/TILE),STAGE.rendezvous.stay||35,'사무동 거래방','장부 인수');
  const wp=g.route[g.ri];wp.rendezvous=true;
  g.glance=0;g.glanceT=4;
  r.phase='travelling';r.elapsed=0;r.waiting=0;r.calls++;r.waypoint=wp;
  S.goalManual=false;S.storyTrack=null;S.goalNavCache=null;
  play('click',.35);toast('실장이 사무동으로 온다',2.5,'good');return true;
}
function finishRendezvous(phase) {
  const r=S.rendezvous,g=rendezvousTarget();if(!r)return;
  // Cancel this appointment only; an alarm, other detour or remembered face survives.
  if(g&&r.waypoint){const i=g.route.indexOf(r.waypoint);if(i>=0){g.route.splice(i,1);if(g.sched){g.sched=g.sched.slice();g.sched.splice(i,1);}if(g.ri>i)g.ri--;g.ri=g.route.length?g.ri%g.route.length:0;if(g.state==='PATROL'){g.path=null;g.wait=0;}}}
  r.phase=phase;r.cooldown=12;r.waypoint=null;S.goalNavCache=null;
}
function updateRendezvous(dt) {
  const r=rendezvousState();if(!r)return;
  r.cooldown=Math.max(0,r.cooldown-dt);
  const g=rendezvousTarget();if(!['travelling','waiting'].includes(r.phase))return;
  if(!g||targetEliminated(g)){finishRendezvous('done');return;}
  if(g.state!=='PATROL'||S.alevel>=2||S.vipPlan?.phase==='sick'){finishRendezvous('interrupted');return;}
  r.elapsed+=dt;
  const here=flOf(g)===r.room.fl&&!g.z&&dist(g.x,g.y,r.room.x,r.room.y)<32;
  if(r.phase==='travelling'&&here&&!g.moving){r.phase='waiting';gsay(g,'장부는? 혼자 왔다.',2.5);}
  // Patrol marks a one-shot waypoint spent on arrival; keep its full waiting window.
  if(r.phase==='waiting'){
    if(here)r.waiting+=dt;
    if(!g.route.includes(r.waypoint)||(r.waypoint.spent&&g.wait<=0)||r.waiting>=(STAGE.rendezvous.stay||35)){finishRendezvous('left');}
  }else if(r.elapsed>100){finishRendezvous('unreachable');}
}
function rendezvousHurry(g){return S.rendezvous?.phase==='travelling'&&g===rendezvousTarget()&&g.state==='PATROL';}
function rendezvousPrivacy(g) {
  const r=S.rendezvous,d=STAGE.rendezvous;if(!d||!r||!['travelling','waiting'].includes(r.phase)||g.follow==null||S.guards[g.follow]!==rendezvousTarget())return null;
  const b=BLD[d.b];return{rect:[b.x0+1,b.y0+1,b.x1-1,b.y1-1,d.fl||0],at:[Math.round((b.x0+b.x1)/2),b.y1+2]};
}
function rendezvousGoal() {
  const r=rendezvousState(),g=rendezvousTarget();if(!r||!g||targetEliminated(g)||S.goalManual)return null;
  if(['travelling','waiting'].includes(r.phase))return{...r.room,text:r.phase==='waiting'?'실장 처치 · 거래방':'사무동 거래방에서 실장 기다리기',where:'사무동 1층',area:true,meeting:true};
  if(oppMode&&rendezvousReady()&&!r.calls)return{...r.phone,text:'내선으로 실장 부르기',where:'사무동 1층',optional:true};
  return null;
}
function drawRendezvousPhone() {
  const r=rendezvousState();if(!r||!fixtureVisible(r.phone,500))return;
  drawLitContainer({...r.phone,type:'phone'});
}
function drawRendezvousPhoneArt(p,ctx){
  const x=p.x,y=p.y-24;ctx.save();ctx.fillStyle='#131d1c';ctx.fillRect(x-10,y-4,20,11);ctx.strokeStyle='#767b6c';ctx.lineWidth=1;ctx.strokeRect(x-10,y-4,20,11);
  ctx.fillStyle='#46514a';ctx.fillRect(x-10,y-8,5,8);ctx.fillRect(x+5,y-8,5,8);ctx.fillRect(x-8,y-9,16,4);
  ctx.strokeStyle='#242e29';ctx.beginPath();ctx.moveTo(x+9,y+1);ctx.bezierCurveTo(x+19,y+8,x+3,y+13,x+15,y+16);ctx.stroke();
  ctx.fillStyle=rendezvousReady()?'#b4ad7b':'#656e60';for(let i=0;i<6;i++)ctx.fillRect(x-3+i%3*3,y+Math.floor(i/3)*3,1,1);ctx.restore();
}
// Ambient barks compete for one place; useful overheard dialogue keeps priority.
function visibleSpeechCandidates(P,chase=false,focus=false) {
  const L0=CUR_F;setLayer(flOf(P));
  try{return S.guards.filter(g=>g.say&&g.say!=='(소곤소곤…)'&&(!focus||g.state==='ALERT'||Object.values(S.intel||{}).some(it=>it.cur?.sp===g))&&!['DEAD','SLEEP'].includes(g.state)&&flOf(g)===flOf(P)&&(g.z||0)===(P.z||0)&&
    dist(g.x,g.y,P.x,P.y)<=(chase?300:360)&&(!chase||g.state==='ALERT'&&!g.civ)&&
    (g.chat||Object.values(S.intel||{}).some(it=>it.cur?.sp===g)||los(P.x,P.y,g.x,g.y,P.z||0)));}
  finally{setLayer(L0);}
}
// Preparation is an explicit choice: follow the useful lead without enabling every hint.
function missionApproachGoal() {
  if(STAGE.id!=='m2'||S.goalManual||!oppMode)return null;
  const g=npc('vip');if(!g||targetEliminated(g)||g.state==='DEAD')return null;
  const r=S.rendezvous;
  if(r&&['travelling','waiting'].includes(r.phase))return rendezvousGoal();
  let id=null;
  if(S.player.item?.id==='emetic'||['prepared','drinking','sick'].includes(S.vipPlan?.phase))id='emetic';
  else if(S.player.z&&S.traps.some(t=>t.k==='drop'&&t.text==='CLUB'&&!t.used&&canReleaseSign(t)))id='sign';
  const st=(S.stories||[]).find(s=>s.d.id===id&&s.found&&!s.done&&!s.moot),step=st&&storyStep(st);
  if(!step?.at)return null;
  const at=step.at,trap=id==='sign'&&st.step===0?S.traps.find(t=>t.k==='drop'&&t.text==='CLUB'):null;
  return{x:tc(at[0]),y:tc(at[1]),fl:at[2]||0,z:trap?signGeometry(trap).z:0,text:step.text,story:st.d.id,storyName:st.d.name,where:''};
}
function speechPriority(g,P) {
  return g===P?100:g.state==='ALERT'?80:Object.values(S.intel||{}).some(it=>it.cur?.sp===g)?70:g.chat?30:10;
}
