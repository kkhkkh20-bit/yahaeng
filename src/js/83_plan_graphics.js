// 기존 좌표와 자산 위에 기능이 읽히는 작은 현물만 보강한다.
function fixtureVisible(p, radius = 500) {
  const support=p.surface;if(support)p=surfaceFixture(p);
  const P=S.player, f=flOf(p), z=p.z||0;
  if(f!==flOf(P) || (P.z||0)!==z || dist(P.x,P.y,p.x,p.y)>radius || P.under || P.vent) return false;
  const d=dist(P.x,P.y,p.x,p.y),a=Math.atan2(p.y-P.y,p.x-P.x);
  const prev=CUR_F;setLayer(f);const hit=castRay(P.x,P.y,a,d,P.z||0);setLayer(prev);if(hit>=d-27)return true;
  const b=support?{x0:support.x*TILE,y0:support.y*TILE,x1:(support.x+support.w)*TILE,y1:(support.y+support.h)*TILE}:p.furn?hideFootprint(p):null;
  const x=P.x+Math.cos(a)*(hit+.01),y=P.y+Math.sin(a)*(hit+.01);
  return !!(b&&x>=b.x0&&x<b.x1&&y>=b.y0&&y<b.y1);
}
function drawKnownTargets() {
  if(oppMode===2)return;
  for(const g of S.guards) if(g.target&&!targetEliminated(g)) {
    const a=targetKnowledge(g);if(a.live)continue;
    ctx.save();ctx.strokeStyle='#d59788';ctx.lineWidth=2;ctx.setLineDash(a.area?[9,7]:[3,4]);ctx.beginPath();ctx.arc(a.x,a.y,a.area?40:20,0,TAU);ctx.stroke();ctx.restore();
    infoTag(a.x,a.y-32,targetName(g)+' · '+(a.area?'활동 구역':'마지막 목격'),'#d5ad98');
  }
}
function trapPreview(t) {
  const visible=S.guards.filter(g=>g.state!=='DEAD' && !g.child && !flOf(g) && !g.z && inZone(g,t.hit||t.zone) && canObserveTarget(g));
  const other=visible.some(g=>!g.target),target=visible.some(g=>g.target);
  return {target,other,text:other?'다른 사람도 맞을 수 있음':target?'표적이 낙하 범위 안에 있음':'표적 확인 필요 · 낙하 범위'};
}
function drawPlanFixtures(P) {
  if (!mainContract(STAGE) || tactical || P.under || P.vent) return;
  ctx.save();
  if (!P.z) for(const d of S.doors) {
    if(!d.keyLock || !fixtureVisible(d,330)) continue;
    const x=d.x+14,y=d.y-13;
    ctx.fillStyle='#202a30';ctx.fillRect(x-2,y-8,10,16);ctx.strokeStyle='#899397';ctx.lineWidth=1;ctx.strokeRect(x-2,y-8,10,16);
    ctx.fillStyle=d.locked?keyCol(d.keyLock):'#91ad8b';ctx.fillRect(x,y-5,6,5);
    if(d.keyLock==='code'){ctx.fillStyle='#bbc3c0';for(let i=0;i<6;i++)ctx.fillRect(x+i%3*2,y+2+Math.floor(i/3)*3,1,1);}
    if(d.keyLock==='blue' && hasK('blue') && dist(P.x,P.y,d.x,d.y)<150) infoTag(x,y-20,'파란 카드키 · VIP룸 뒷문',keyCol('blue'),.8);
  }
  if(STAGE.id==='m2' && !P.fl && !P.z) {
    const physical=usePoint(STAGE.uses[0]),p={...surfacePoint(physical),fl:0};
    if(fixtureVisible(physical,260)) {
      drawLitContainer({...p,type:'surface',art:'bottle',dosed:S.usesDone[0]});
      if(S.vipPlan && dist(P.x,P.y,p.x,p.y)<120)infoTag(p.x,p.y-27,S.vipPlan.phase==='sick'?'음용 완료':'준비된 실장 술병','#c9bc91',.8);
    }
    const g=npc('vip');
    if(g && g.drinkT>0 && canObserveTarget(g)) {
      const rise=Math.min(1,g.drinkT/.6),x=g.x+Math.cos(g.a)*8,y=g.y-23-rise*8;
      ctx.fillStyle='#dfd6b5';ctx.fillRect(x-3,y-4,6,7);ctx.fillStyle='#826238';ctx.fillRect(x-2,y-1,4,3);
    }
  }
  if(P.z) {
    const nt=nearTrap(),t=nt&&nt.t;
    if(t && t.k==='drop') {
      const p=trapPreview(t),x=tc(t.at[0]),y=tc(t.at[1]);
      ctx.strokeStyle='#9c9d88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-18,y-10);ctx.lineTo(x-18,y+5);ctx.lineTo(x+18,y+5);ctx.lineTo(x+18,y-10);ctx.stroke();
      ctx.fillStyle='#b9b4a1';for(const dx of [-18,18])ctx.fillRect(x+dx-2,y-12,4,4);
      infoTag(x,y-30,p.text,p.other?'#e6a27e':'#d9c98e',.85);
      if(!guideFull()&&t.hit){  // 최소: 글 대신 바닥에 낙하 범위. 표적만 있으면 금색, 다른 사람도 있으면 주황, 비었으면 흐리게
        const [x0,y0,x1,y1]=t.hit,rx=x0*TILE,ry=y0*TILE,rw=(x1-x0+1)*TILE,rh=(y1-y0+1)*TILE,pu=.55+.25*Math.sin(S.t*5);
        const col=p.other?'230,162,126':p.target?'242,196,107':'200,200,190',a=p.other||p.target?pu:.35;
        ctx.fillStyle=`rgba(${col},${a*.22})`;ctx.fillRect(rx,ry,rw,rh);
        ctx.strokeStyle=`rgba(${col},${a})`;ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.strokeRect(rx+1,ry+1,rw-2,rh-2);ctx.setLineDash([]);
      }
    }
  }
  for(const g of S.guards) if(g.eyeWatching && (g.eyeT||0)>.05 && fixtureVisible(g,160)) {
    ctx.strokeStyle='#e7c276';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(g.x,g.y+4,17,9,0,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
