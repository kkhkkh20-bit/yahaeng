// A meal creates an opening at the club entrance. Dosing never moves an NPC remotely.
function mealUse(){return (STAGE.uses||[]).find(u=>u.need==='laxative');}
function mealAvailable(){return !S.dining?.eaten;}
function clearMealTrip(g){
  if(!g)return;
  for(let i=g.route.length-1;i>=0;i--)if(g.route[i].mealTrip){g.route.splice(i,1);if(g.sched){g.sched=g.sched.slice();g.sched.splice(i,1);}if(g.ri>i)g.ri--;}
  if(g.route.length)g.ri%=g.route.length;
  g.mealT=0;if(g.state==='PATROL'){g.path=null;g.wait=0;}
}
function mealTrip(g,at,stay,name){
  clearMealTrip(g);detour(g,Math.floor(at.x/TILE),Math.floor(at.y/TILE),stay,name,name);
  const w=g.route[g.ri];w.mealTrip=true;g.glance=0;g.glanceT=8;return w;
}
function syncDiningLayout(){
  const m=S.dining,d=STAGE.dining,g=d&&npc(d.guest);if(!m||!g||m.layout===2)return;
  // A saved visit already under way keeps its destination and remaining wait.
  if(m.phase==='toilet'&&m.waypoint&&!m.toilet){m.toilet=[Math.floor(m.waypoint.x/TILE),Math.floor(m.waypoint.y/TILE)];m.queue=[m.toilet[0],m.toilet[1]+3];}
  if(['walking','eating'].includes(m.phase)&&!m.eaten&&g.state==='PATROL'){
    const p=usePoint(mealUse());m.waypoint=mealTrip(g,p,d.stay,'포차 식사');m.phase='walking';m.eating=0;m.elapsed=0;
  }
  m.layout=2;
}
function diningGoal(){
  const d=STAGE.dining,P=S.player,m=S.dining;if(!d||S.goalManual||!oppMode||(P.outfit==='crew'||P.blown?.crew))return null;
  const g=npc(d.guest);if(!g)return null;
  const wc=m?.toilet||d.toilet,c=S.corpses.find(c=>c.g===g&&!c.stripped&&!c.stashed);
  const body=g.state==='DEAD'&&c&&dist(c.x,c.y,tc(wc[0]),tc(wc[1]))<=90;
  if((targetEliminated(g)||g.state==='DEAD')&&!body)return null;
  if(S.mealDosed&&!body){const wait=d.waitAt||d.queue||d.toilet;return{x:tc(wait[0]),y:tc(wait[1]),fl:0,z:0,text:'경비 식사 지켜보기',where:'포차',dining:true};}
  if(body||m?.sick&&['queue','toilet'].includes(m.phase))return{x:body?c.x:tc(wc[0]),y:body?c.y:tc(wc[1]),fl:0,z:0,text:'경비복 확보',where:wc[0]===d.toilet[0]&&wc[1]===d.toilet[1]?'포차 화장실':'골목 공중화장실',dining:true};
  return null;
}
function updateDining(dt){
  const d=STAGE.dining,u=mealUse();if(!d||!u)return;
  const g=npc(d.guest),m=S.dining||(S.dining={phase:'idle',next:d.first,eating:0,eaten:false,layout:2});
  if(!g||targetEliminated(g)){m.phase='done';return;}
  const calm=g.state==='PATROL'&&!g.climb&&!g.grabbed&&!g.doomed&&!g.brawl&&S.alevel<2;
  if(!calm){
    g.mealT=0;
    if(!['idle','done'].includes(m.phase)){clearMealTrip(g);m.phase='idle';m.eating=0;m.next=S.t+d.every;}
    return;
  }
  if(['walking','queue','returning'].includes(m.phase)||m.phase==='toilet'&&!m.arrived){g.glance=0;g.glanceT=8;}
  const table=usePoint(u),atTable=!flOf(g)&&!g.z&&dist(g.x,g.y,table.x,table.y)<18&&!g.moving;
  const dest=m.toilet||d.toilet,waiting=m.queue||d.queue||[dest[0],dest[1]+3],wc={x:tc(dest[0]),y:tc(dest[1])};
  if(m.phase==='idle'){
    if(S.t<m.next||g.route.some(w=>w.once))return;
    m.waypoint=mealTrip(g,table,d.stay,'포차 식사');m.phase='walking';m.elapsed=0;m.eaten=false;m.eating=0;m.toilet=null;m.queue=null;return;
  }
  if(m.phase==='done')return;
  m.elapsed+=dt;
  if(m.elapsed>180){clearMealTrip(g);m.phase='idle';m.next=S.t+d.every;return;}
  if(m.phase==='walking'||m.phase==='eating'){
    // A completed meal remains completed if another person nudges the guest away.
    if(m.eaten&&!m.sick&&(!g.route.includes(m.waypoint)||g.wait<=0)){m.phase='returning';m.elapsed=0;m.next=S.t+d.every;g.mealT=0;return;}
    if(!atTable){g.mealT=0;if(m.phase==='eating'){m.eating=0;m.phase='walking';}return;}
    m.phase='eating';g.act=null;g.idleT=20;g.glance=0;g.glanceT=5;
    const visual=surfacePoint(table);g.a=g.want=Math.atan2(visual.y-g.y,visual.x-g.x);
    if(!m.eaten){m.eating+=dt;g.mealT=m.eating;
      if(m.eating>=3){m.eaten=true;g.mealT=0;m.sick=!!S.mealDosed;S.mealDosed=false;}
    }
    if(m.eaten&&m.sick){
      m.toilet=d.toilet.slice();m.queue=(d.queue||[d.toilet[0],d.toilet[1]+3]).slice();
      gsay(g,'잠깐… 배가…',2);m.phase='queue';m.elapsed=0;m.waypoint=mealTrip(g,{x:tc(m.queue[0]),y:tc(m.queue[1])},3,'화장실 앞');return;
    }
    if(m.eaten&&(!g.route.includes(m.waypoint)||g.wait<=0)){m.phase='returning';m.elapsed=0;m.next=S.t+d.every;}
  }else if(m.phase==='queue'){
    const sameWC=STAGE.vipDrink?.to?.[0]===dest[0]&&STAGE.vipDrink?.to?.[1]===dest[1];
    const occupied=S.guards.some(o=>o!==g&&!targetEliminated(o)&&!flOf(o)&&!o.z&&dist(o.x,o.y,wc.x,wc.y)<48)||(sameWC&&npc('vip')&&!targetEliminated(npc('vip'))&&S.vipPlan?.phase==='sick'&&!S.vipPlan.reachedToilet);
    if(!occupied){m.waypoint=mealTrip(g,wc,d.toiletStay,sameWC?'공중화장실':'포차 화장실');m.phase='toilet';m.elapsed=0;m.arrived=false;}
    else if(!g.route.includes(m.waypoint)){m.waypoint=mealTrip(g,{x:tc(waiting[0]),y:tc(waiting[1])},3,'화장실 앞');}
  }else if(m.phase==='toilet'){
    const here=!flOf(g)&&!g.z&&dist(g.x,g.y,wc.x,wc.y)<24&&!g.moving;
    if(here){m.arrived=true;g.a=g.want=dest[0]===d.toilet[0]&&dest[1]===d.toilet[1]?(d.toiletA||0):0;g.act=null;g.idleT=20;}
    if(m.arrived&&!here&&!g.route.includes(m.waypoint)){m.phase='returning';m.elapsed=0;m.next=S.t+d.every;}
  }else if(m.phase==='returning'&&!g.route.some(w=>w.mealTrip)){const home=g.route[0];if(home&&dist(g.x,g.y,home.x,home.y)<24&&!g.moving){m.phase='idle';m.next=S.t+d.every;}}
}
function drawMedicineArt(ctx,p){
  ctx.fillStyle='#252b25';ctx.fillRect(-6,-15,12,17);ctx.strokeStyle='#7f8977';ctx.lineWidth=1;ctx.strokeRect(-6,-15,12,17);
  ctx.fillStyle='#aaa895';ctx.fillRect(-5,-19,10,5);ctx.fillStyle=p.id==='laxative'?'#a3aa90':'#bab19b';ctx.fillRect(-5,-11,10,8);
  ctx.fillStyle='#444c43';ctx.fillRect(-3,-8,6,1);ctx.fillRect(-1,-10,2,5);
}
function drawMealArt(p,ctx){
  ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#17201b66';ctx.beginPath();ctx.ellipse(1,3,17,8,0,0,TAU);ctx.fill();
  ctx.fillStyle='#a9a492';ctx.beginPath();ctx.ellipse(0,0,15,8,0,0,TAU);ctx.fill();ctx.fillStyle='#4e584c';ctx.beginPath();ctx.ellipse(0,-1,12,5,0,0,TAU);ctx.fill();
  if(mealAvailable()){ctx.fillStyle='#c2b99c';ctx.beginPath();ctx.ellipse(-3,-2,7,4,0,0,TAU);ctx.fill();ctx.fillStyle='#696c43';ctx.fillRect(4,-4,4,5);ctx.fillStyle='#8c6247';ctx.fillRect(1,-4,3,3);}
  ctx.strokeStyle='#9d8869';ctx.lineWidth=1.5;for(const dx of [19,22]){ctx.beginPath();ctx.moveTo(dx,-9);ctx.lineTo(dx-3,9);ctx.stroke();}ctx.restore();
}
function drawCondimentArt(p,ctx){
  ctx.fillStyle='#15211a66';ctx.beginPath();ctx.ellipse(p.x+1,p.y+3,7,3,0,0,TAU);ctx.fill();
  ctx.fillStyle='#62563b';ctx.fillRect(p.x-5,p.y-13,10,15);ctx.strokeStyle='#a49a7c';ctx.lineWidth=1;ctx.strokeRect(p.x-5,p.y-13,10,15);
  ctx.fillStyle='#70564a';ctx.fillRect(p.x-5,p.y-17,10,5);ctx.fillStyle='#beb49b';ctx.fillRect(p.x-4,p.y-8,8,5);
  if(S.mealDosed){ctx.fillStyle='#dbcd9e';ctx.fillRect(p.x-2,p.y-16,4,2);}
}
function drawDiningFixtures(){
  if(STAGE.id!=='m2'||S.player.fl||S.player.z)return;
  const u=mealUse(),p=u&&usePoint(u);
  if(p&&fixtureVisible(p,550)){
    const v=surfacePoint(p),food=surfacePoint({...p,surfaceU:.45});
    drawLitContainer({...food,fl:0,type:'surface',art:'meal'});drawLitContainer({...v,fl:0,type:'surface',art:'condiment'});
    if(S.player.item?.id!=='laxative'&&dist(S.player.x,S.player.y,p.x,p.y)<110){const at=S.mealDosed?v:food;tag(at.x,at.y-27,S.mealDosed?'약을 넣은 양념통':S.dining?.eaten?'빈 그릇':'문지기 식사','#c9c0a6',.75);}
  }
  for(const sign of [{x:tc(40),y:tc(8),text:'WC'},{x:tc(7),y:tc(29),text:'WC'},{x:tc(6),y:tc(32),text:'식사'}])if((sign.x===tc(7)&&bldAt(Math.floor(S.player.x/TILE),Math.floor(S.player.y/TILE))===4)||fixtureVisible(sign,450))drawLitContainer({...sign,type:'surface',art:'placeSign'});
}
function drawSurfaceArt(p,ctx){
  if(p.art==='meal'){drawMealArt(p,ctx);return;}
  if(p.art==='condiment'){drawCondimentArt(p,ctx);return;}
  if(p.art==='bottle'){
    ctx.fillStyle='#34443a';ctx.fillRect(p.x-4,p.y-12,8,17);ctx.fillRect(p.x-2,p.y-17,4,6);
    ctx.fillStyle=p.dosed?'#c8ad76':'#d8d2b9';ctx.fillRect(p.x-3,p.y-6,6,6);return;
  }
  ctx.fillStyle='#182321';ctx.fillRect(p.x-25,p.y-34,50,20);ctx.strokeStyle='#7e8877';ctx.lineWidth=1;ctx.strokeRect(p.x-25,p.y-34,50,20);
  ctx.fillStyle='#c6c6b0';ctx.textAlign='center';ctx.font='700 12px "IBM Plex Sans KR",sans-serif';ctx.fillText(p.text,p.x,p.y-20);ctx.textAlign='left';
}
function drawPharmacyStock(ctx,f){
  const x=f.x*TILE,y=f.y*TILE;
  for(const row of [-31,10]){
    ctx.fillStyle='#716c58';ctx.fillRect(x+5,y+row+12,f.w*TILE-10,3);
    for(let col=0;col<f.w;col++)for(let j=0;j<3;j++){
      const dx=x+col*TILE+10+j*10;
      if(row===10&&S.props?.some(p=>p.surface?.x===f.x&&p.surface?.y===f.y&&Math.abs(surfacePoint(p).x-dx-3.5)<12))continue;
      ctx.fillStyle=['#b1af97','#858e7b','#9d9584'][(j+col)%3];ctx.fillRect(dx,y+row-3,7,14);
      ctx.fillStyle='#4c594d';ctx.fillRect(dx+1,y+row+2,5,2);
    }
  }
}
