// 실행 가능한 대인 행동과 동작 중에는 설명보다 플레이를 우선한다.
function playerActionFocus(ka,ga) {
  if(!S||!running||S.over)return false;
  const P=S.player;
  if(actionBusy(P)||P.captive||input.aiming)return true;
  ka=ka||attackAction();ga=ga||grabAction();
  return ka.k!=='none'&&!subduedAction(ka)||!!ka.stalk||ga.k==='grab'||!!ga.near;
}
// DOM 안내와 인물의 실제 자리를 월드 좌표로 예약한다.
let hudBlockFrame=null;
function hudTextBlocks() {
  if(hudBlockFrame)return hudBlockFrame;
  const cr=canvas.getBoundingClientRect();
  return hudBlockFrame=[...document.querySelectorAll('#mini,#stealth,#hud .top,#btnPause,#saveState:not([hidden]),#hud .joyhint,#quickItems>button:not([hidden]),#envPicker:not([hidden]),.pad > button:not([hidden]),.sysbtns button,#dlg:not([hidden]),#episodeRadio:not([hidden]),#toasts .toast')]
    .filter(e=>getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]'))
    .map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)
    .map(r=>[cam.x+(r.left-cr.left-W/2-5)/SCALE,cam.y+(r.top-cr.top-H/2-5)/SCALE,cam.x+(r.right-cr.left-W/2+5)/SCALE,cam.y+(r.bottom-cr.top-H/2+5)/SCALE]);
}
function actorTextBlocks() {
  const P=S.player;
  return [P,...S.guards.filter(g=>!['DEAD','SLEEP'].includes(g.state)&&flOf(g)===flOf(P)&&(g.z||0)===(P.z||0)&&dist(g.x,g.y,P.x,P.y)<560)]
    .map(g=>{const self=isTouch&&g===P,w=self?Math.max(17,20/SCALE):17;return[g.x-w,g.y-46,g.x+w,g.y+(self?10+14/SCALE:10)];});
}
// 화면의 설명은 목표 한 곳, 사람과의 선택 한 묶음, 실제로 본 위험 한 단계로 나눈다.
function goalMarkerCaption(g, meters) {
  const place=g.stored?'숨긴 표적':g.tut?'이동 지점':g.meeting?'거래방':g.shelter?'은신처':g.locked?'잠긴 문':g.via?'연결 입구':g.exit?'탈출':g.area?'활동 구역':g.lastSeen?'목격 지점':g.fl?`${g.fl+1}층`:'';
  const identity=!g.via&&!g.exit&&!g.shelter&&(g.g?.target?targetName(g.g).split(' · ')[0]+(g.area?' 활동 구역':g.lastSeen?' 목격 지점':''):g.marker||'');
  const d=g.destinationFloor||g,level=d.z?`${d.z}층 옥상`:d.fl?`${d.fl+1}층`:bldAt(Math.floor(g.x/TILE),Math.floor(g.y/TILE))>=0?'1층':'지상';
  const height=d.z||(d.fl||0),current=S.player.z||flOf(S.player);
  const floor=(identity||g.area||g.lastSeen||g.via||d.fl||d.z)?(height>current?'↑ ':height<current?'↓ ':'')+level:'';
  let label=identity||place;
  if(floor&&label.startsWith(level+' · '))label=label.slice(level.length+3);
  else if(floor&&label.startsWith(level+' '))label=label.slice(level.length+1);
  return [floor,label===level?'':label,meters+'m'].filter(Boolean).join(' · ');
}
function goalViewport(){
  const bottom=Math.max(80,isTouch?Math.min(H-24,touchPlayFrame().bottom-32):H-70);
  const desiredTop=Math.max((drawMini.tb||70)+40,($('stealth')?.getBoundingClientRect().bottom||0)+24);
  return{left:34,right:W-34,top:clamp(desiredTop,24,Math.max(24,bottom-48)),bottom};
}
function guardAwareness(g) {
  if (!g || ['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state) || g.doomed) return {phase:'quiet',color:'#aab8bf',progress:0,direct:false};
  const P=S.player,same=flOf(g)===flOf(P)&&(g.z||0)===(P.z||0);
  const witnessed=g.seen&&g.sightFl===flOf(P)&&g.sightZ===(P.z||0)&&S.t-g.sightAt>=0&&S.t-g.sightAt<=.12;
  const direct=!(P.hide||P.under||P.vent||P.ledge)&&!!((g.seen||g.eyeWatching)&&same||witnessed);
  const eye=direct?(g.eyeT||0)/identityTime(g):0, meter=clamp(g.meter||0,0,1);
  if(g.dispatchVisit&&g.why==='dispatch'&&g.state==='SUSPICIOUS'&&!direct&&meter<NOTICE_AT)return{phase:'quiet',color:'#aab8bf',progress:0,direct:false,label:'배차 확인'};
  if(g.state==='ALERT'&&direct) return {phase:'seen',color:'#ff4a3c',progress:1,direct:true,label:'발각'};
  if(!direct&&(g.state==='ALERT'||['SEARCH','CHECK','BODY','NOTICE','SUSPICIOUS'].includes(g.state))){
    const inc=g.searchJob&&(S.searchIncidents||[]).find(i=>i.id===g.searchJob.incident),job=inc?.jobs[g.searchJob.job],label=job?({entrance:'출입구 확인',junction:'계단 확인',escape:'바깥길 확인',hide:'은신처 확인',trail:'이동 흔적 확인',room:'방 수색',roof:'옥상 수색'}[job.kind]||'현장 확인'):'수색 중';
    return {phase:'search',color:'#d7b879',progress:.45,direct:false,label};
  }
  if(eye>0) return {phase:'check',color:'#ddd9c8',progress:clamp(eye,0,1),direct:true,label:'신원 확인'};
  if(direct&&meter>=NOTICE_AT) return {phase:'suspect',color:'#f2c46b',progress:meter,direct:true,label:'의심'};
  return {phase:meter>.02?'check':'quiet',color:'#ddd9c8',progress:direct?meter:0,direct,label:'주시'};
}
function activeObserver() {
  let best=null;
  for(const g of S.guards) {
    if(g.dog||(g.civ&&!g.eyeWatching)||dist(g.x,g.y,S.player.x,S.player.y)>700)continue;
    const a=guardAwareness(g);if(!a.direct||!a.progress)continue;
    if(!best||a.progress>best.progress)best={...a,g};
  }
  for(const c of S.cams||[]){
    if(c.cool>0||!c.meter||!cameraAssessment(c).detectable)continue;
    const progress=clamp(c.meter,0,1);if(!best||progress>best.progress)best={g:c,camera:true,phase:'check',color:'#f2b48f',progress,direct:true};
  }
  return best;
}
// Physical sight, permission and potential exposure are different. In particular,
// exposure() turns a hypothetical guard toward the player; it is not current sight.
function physicallyObserved(){
  return S.guards.some(g=>g.rawSeen&&g.rawSightAt!=null&&S.t-g.rawSightAt>=0&&S.t-g.rawSightAt<.15&&!g.doomed&&!['DEAD','CAPTIVE','TERROR','SLEEP'].includes(g.state))||
    S.cams.some(c=>cameraAssessment(c).visible>0);
}
function encounterRows(P, ka, ga, pa) {
  if(actionBusy(P))return [];
  const rows=[],key=k=>isTouch?{atk:'공격',grab:'붙잡기',env:'행동'}[k]:KK(k);
  const victim=ka&&(ka.c||ka.g||ka.kill||ka.list?.[0]||ka.stalk);
  if(P.captive) {
    if(canInterrogate())rows.push({key:key('grab'),text:'심문',detail:'',ready:true});
    rows.push({key:key('atk'),text:'기절',detail:'이후 운반·은닉 · 길게 처치',ready:true});
    return rows;
  }
  if(victim&&ka.k!=='none'&&!subduedAction(ka))rows.push({key:key('atk'),text:ka.k==='none'?(koTap(victim)?'기절':'처치'):(ka.label||'기절').replace(/^달려들어 /,''),detail:ka.holdOnly?'길게 누르기':ka.hold?'길게 '+ka.hold:ka.stalk?'더 가까이':'',ready:ka.k!=='none'});
  if(ga?.k==='grab'&&!['tB','t0','tC','tL','tR'].includes(STAGE.id))rows.push({key:key('grab'),text:'붙잡기',detail:ga.reason||'',ready:ga.k==='grab'});
  if(rows.length&&pa?.k==='steal')rows.push({key:key('env'),text:pa.label,detail:'',ready:true});
  return rows;
}
// 가능한 키와 동작만 나란히 놓는다. 글자 크기는 화면 배율과 관계없이 일정하다.
function encounterSize(rows) {
  const k=1/SCALE,limit=Math.min(280,W-24)*k,entries=[];let line=0,used=0,width=0;
  for(const r of rows.filter(r=>r.ready!==false)){
    const label=isTouch?(r.text==='심문'?'심문':r.key):r.text;
    ctx.font=uiFont(10*k);const keyWidth=isTouch?0:Math.max(16*k,ctx.measureText(r.key).width+6*k);
    ctx.font=uiFont(12*k);const w=Math.min(limit,keyWidth+(keyWidth?7*k:0)+ctx.measureText(label).width+4*k);
    if(used&&used+12*k+w>limit){line++;used=0;}
    const dx=used?used+12*k:0;entries.push({...r,label,keyWidth,dx,dy:line*18*k,w});used=dx+w;width=Math.max(width,used);
  }
  return {k,entries,width,height:entries.length?(line+1)*18*k:0};
}
function encounterRect(x,y,rows) { const s=encounterSize(rows);return [x-s.width/2,y-s.height/2,x+s.width/2,y+s.height/2]; }
function drawEncounter(x,y,rows) {
  const {k,entries,width:w,height:h}=encounterSize(rows);if(!entries.length)return;
  const left=x-w/2,top=y-h/2;
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
  entries.forEach(r=>{
    const yy=top+r.dy+13*k;let tx=left+r.dx+2*k;
    if(!isTouch){ctx.font=uiFont(10*k);const kw=r.keyWidth;
      ctx.fillStyle='#111820df';ctx.fillRect(tx,yy-12*k,kw,16*k);ctx.fillStyle='#dddccf';ctx.textAlign='center';ctx.fillText(r.key,tx+kw/2,yy);ctx.textAlign='left';tx+=kw+7*k;
    }
    const tw=r.w-(tx-left-r.dx);ctx.font=uiFont(12*k);ctx.strokeStyle='#080e13ee';ctx.lineWidth=1.5*k;ctx.strokeText(r.label,tx,yy,tw);ctx.fillStyle='#f0eddf';ctx.fillText(r.label,tx,yy,tw);
  });ctx.restore();
}
function queueEncounter(P,rows) {
  if(isTouch||!rows.length||!TAGQ||STAGE.noPrompts)return false;
  const s=encounterSize(rows);if(!s.entries.length)return false;
  TAGQ.push({x:P.x,y:P.y+Math.max(22*s.k,18)+s.height/2,rows:s.entries,text:s.entries.map(r=>r.text).join('|'),pri:4.2});return true;
}
function tagBounds(t,x,y) { return t.rows?encounterRect(x,y,t.rows):tagRect(x,y,t.text,t.key); }
// 실제 접촉 순간에만 짧은 빛을 놓는다. 입력 직후나 취소된 동작에는 나오지 않는다.
function contactFeedback(at,kind) {
  if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.y))return;
  const p=at.surface?surfacePoint(at):at;
  if(pixelFxEnabled()){
    const touch={x:p.x,y:p.y-(kind==='takedown'||kind==='grab'?20:0),fl:at.fl??flOf(S.player),z:at.z??S.player.z??0};
    if(kind==='pickup'||kind==='loot')spawnEffect('loot',touch,{scale:.75});
    else if(kind==='grab')spawnEffect('dust',touch,{scale:.24,alpha:.45});
    else if(kind==='takedown')spawnEffect('dust',touch,{scale:.20,alpha:.38});
  }
  S.contact={x:p.x,y:p.y,fl:at.fl??flOf(S.player),z:at.z??S.player.z??0,t:S.t,kind,surface:!!at.surface};
}
function drawContactFeedback() {
  if(pixelFxEnabled()&&fxAtlas?.complete&&fxAtlas.naturalWidth)return;
  const f=S.contact,P=S.player;if(!f||S.t-f.t>.24||flOf(f)!==flOf(P)||(f.z||0)!==(P.z||0))return;
  const t=clamp((S.t-f.t)/.24,0,1);ctx.save();ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#d8e2c7';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(f.x,f.y,f.surface?6+6*t:10+12*t,0,TAU);ctx.stroke();ctx.restore();
}
function drawAccessCues(P) { /* Physical doors and stairs identify their entrances. */ }
