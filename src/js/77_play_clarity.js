// 화면의 설명은 목표 한 곳, 사람과의 선택 한 묶음, 실제로 본 위험 한 단계로 나눈다.
function goalMarkerCaption(g, meters) {
  const place=g.shelter?'은신처':g.locked?'잠긴 문':g.via?(g.viaTo?.z?`${g.viaTo.z}층 옥상 입구`:`${(g.viaTo?.fl??g.fl??0)+1}층 입구`):g.exit?'탈출':g.area?'활동 구역':g.lastSeen?'목격 지점':g.fl?`${g.fl+1}층`:'';
  return [place, meters+'m'].filter(Boolean).join(' · ');
}
function guardAwareness(g) {
  if (!g || ['DEAD','CAPTIVE','SLEEP','TERROR'].includes(g.state) || g.doomed) return {phase:'quiet',color:'#aab8bf',progress:0,direct:false};
  const P=S.player,same=flOf(g)===flOf(P)&&(g.z||0)===(P.z||0);
  const witnessed=g.seen&&g.sightFl===flOf(P)&&g.sightZ===(P.z||0)&&S.t-g.sightAt>=0&&S.t-g.sightAt<=.12;
  const direct=!(P.hide||P.under||P.vent||P.ledge)&&!!((g.seen||g.eyeWatching)&&same||witnessed);
  const eye=direct?(g.eyeT||0)/EYE_T:0, meter=clamp(g.meter||0,0,1);
  if(g.state==='ALERT'&&direct) return {phase:'seen',color:'#ff4a3c',progress:1,direct:true,label:'발각'};
  if(!direct&&(g.state==='ALERT'||['SEARCH','CHECK','BODY','NOTICE','SUSPICIOUS'].includes(g.state))) return {phase:'search',color:'#d7b879',progress:.45,direct:false,label:'수색 중'};
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
  }return best;
}
function encounterRows(P, ka, ga, pa) {
  if(actionBusy(P))return [];
  const rows=[],key=k=>isTouch?{atk:'공격',grab:'붙잡기',env:'행동'}[k]:KK(k);
  const victim=ka&&(ka.c||ka.g||ka.kill||ka.list?.[0]||ka.stalk);
  if(P.captive) {
    rows.push({key:key('grab'),text:canInterrogate()?'심문':P.captive.questioned?'심문 완료':'심문 불가',detail:canInterrogate()?'정보 얻기':'추가 정보 없음',ready:canInterrogate()});
    rows.push({key:key('atk'),text:'기절',detail:'길게 처치',ready:true});
    const h=pa?.k==='drag'?pa.h:captiveDragPreview(),ready=pa?.k==='drag';
    rows.push({key:key('env'),text:ready?'끌고 가 기절':h?'끌고 가기':'은신처 찾기',detail:h?hideName(h)+(ready?' · 길게 처치':' · 더 가까이'):'이동하며 찾기',ready});
    return rows;
  }
  if(victim)rows.push({key:key('atk'),text:ka.k==='none'?(koTap(victim)?'기절':'처치'):(ka.label||'기절').replace(/^달려들어 /,''),detail:ka.holdOnly?'길게 누르기':ka.hold?'길게 처치':ka.stalk?'더 가까이':'',ready:ka.k!=='none'});
  if(ga?.k==='grab'||ga?.near)rows.push({key:key('grab'),text:'붙잡기',detail:ga.reason||'',ready:ga.k==='grab'});
  if(rows.length&&pa?.k==='steal')rows.push({key:key('env'),text:pa.label,detail:'',ready:true});
  return rows;
}
function encounterSize(rows) {
  const k=Math.max(1,.95/SCALE);let width=140*k;
  ctx.font=`600 ${12*k}px "IBM Plex Sans KR",sans-serif`;
  for(const r of rows)width=Math.max(width,ctx.measureText(r.text+'  '+r.detail).width+68*k);
  return {k,width:Math.min(width,Math.min(320,W-20)/SCALE),height:(rows.length*23+12)*k};
}
function encounterRect(x,y,rows) { const s=encounterSize(rows);return [x-s.width/2,y-s.height/2,x+s.width/2,y+s.height/2]; }
function drawEncounter(x,y,rows) {
  const {k,width:w,height:h}=encounterSize(rows),left=x-w/2,top=y-h/2;
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#101921f2';ctx.fillRect(left,top,w,h);ctx.strokeStyle='#63717a';ctx.lineWidth=k;ctx.strokeRect(left,top,w,h);
  rows.forEach((r,i)=>{const yy=top+(17+i*23)*k;
    ctx.globalAlpha=r.ready?1:.66;ctx.fillStyle=r.ready?'#c4d3cd':'#89959c';ctx.font=`600 ${11*k}px "IBM Plex Sans KR",sans-serif`;ctx.textAlign='center';ctx.fillText(r.key,left+24*k,yy);
    ctx.font=`600 ${12*k}px "IBM Plex Sans KR",sans-serif`;ctx.textAlign='left';ctx.fillStyle='#e8e8df';ctx.fillText(r.text,left+48*k,yy,w-56*k);
    const textW=ctx.measureText(r.text).width;ctx.font=`400 ${10*k}px "IBM Plex Sans KR",sans-serif`;ctx.fillStyle='#a8b5bc';
    if(r.detail)ctx.fillText(r.detail,left+56*k+textW,yy,Math.max(1,w-64*k-textW));
    if(i) {ctx.globalAlpha=.24;ctx.strokeStyle='#84929a';ctx.beginPath();ctx.moveTo(left+8*k,yy-16*k);ctx.lineTo(left+w-8*k,yy-16*k);ctx.stroke();}
  });ctx.restore();
}
function queueEncounter(P,rows) {
  if(!rows.length||!TAGQ)return false;
  const s=encounterSize(rows);TAGQ.push({x:P.x,y:P.y+30*s.k+s.height/2,rows,text:rows.map(r=>r.text).join('|'),pri:4.2});return true;
}
function tagBounds(t,x,y) { return t.rows?encounterRect(x,y,t.rows):tagRect(x,y,t.text,t.key); }
// 실제 접촉 순간에만 짧은 빛을 놓는다. 입력 직후나 취소된 동작에는 나오지 않는다.
function contactFeedback(at,kind) {
  if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.y))return;
  S.contact={x:at.x,y:at.y,fl:at.fl??flOf(S.player),z:at.z??S.player.z??0,t:S.t,kind};
}
function drawContactFeedback() {
  const f=S.contact,P=S.player;if(!f||S.t-f.t>.24||flOf(f)!==flOf(P)||(f.z||0)!==(P.z||0))return;
  const t=clamp((S.t-f.t)/.24,0,1);ctx.save();ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#d8e2c7';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(f.x,f.y,10+12*t,0,TAU);ctx.stroke();ctx.restore();
}
function drawAccessCues(P) {
  if(!mainContract(STAGE)||P.z||P.under||P.vent||tactical)return;
  const seen=new Set();ctx.save();
  for(const l of S.ladders) {
    if(l.kind!=='fstair')continue;
    const up=flOf(P)===(l.bfl||0),down=flOf(P)===l.tfl;if(!up&&!down)continue;
    const g=stairFloor(l.tx,l.ty,flOf(P)),m=up?g.up.marker:g.down.marker,token=`${m.x},${m.y},${up}`;
    if(seen.has(token)||!fixtureVisible({...m,fl:flOf(P)},220))continue;seen.add(token);
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(Math.atan2(g.d[1],g.d[0]));ctx.fillStyle='#222d32cc';ctx.fillRect(-12,-15,24,30);
    ctx.strokeStyle='#b8c4b6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(-8,11);ctx.moveTo(8,-11);ctx.lineTo(8,11);ctx.stroke();ctx.restore();
    ctx.fillStyle='#d4dccd';ctx.font='600 10px "IBM Plex Sans KR",sans-serif';ctx.textAlign='center';ctx.fillText((up?'↑':'↓')+((up?l.tfl:l.bfl||0)+1)+'F',m.x,m.y+3);
  }ctx.restore();
}
