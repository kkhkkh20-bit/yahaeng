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
function updateDining(dt){
  const d=STAGE.dining,u=mealUse();if(!d||!u)return;
  const g=npc(d.guest),m=S.dining||(S.dining={phase:'idle',next:d.first,eating:0,eaten:false});
  if(!g||targetEliminated(g)){m.phase='done';return;}
  const calm=g.state==='PATROL'&&!g.climb&&!g.grabbed&&!g.doomed&&!g.brawl&&S.alevel<2;
  if(!calm){
    g.mealT=0;
    if(!['idle','done'].includes(m.phase)){clearMealTrip(g);m.phase='idle';m.eating=0;m.next=S.t+d.every;}
    return;
  }
  if(['walking','queue','returning'].includes(m.phase)||m.phase==='toilet'&&!m.arrived){g.glance=0;g.glanceT=8;}
  const table=usePoint(u),atTable=!flOf(g)&&!g.z&&dist(g.x,g.y,table.x,table.y)<18&&!g.moving;
  const wc={x:tc(d.toilet[0]),y:tc(d.toilet[1])};
  if(m.phase==='idle'){
    if(S.t<m.next||g.route.some(w=>w.once))return;
    m.waypoint=mealTrip(g,table,d.stay,'포차 식사');m.phase='walking';m.elapsed=0;m.eaten=false;m.eating=0;return;
  }
  if(m.phase==='done')return;
  m.elapsed+=dt;
  if(m.elapsed>180){clearMealTrip(g);m.phase='idle';m.next=S.t+d.every;return;}
  if(m.phase==='walking'||m.phase==='eating'){
    if(!atTable){g.mealT=0;if(m.phase==='eating'){m.eating=0;m.phase='walking';}return;}
    m.phase='eating';g.act=null;g.idleT=20;g.glance=0;g.glanceT=5;
    const visual=surfacePoint(table);g.a=g.want=Math.atan2(visual.y-g.y,visual.x-g.x);
    if(!m.eaten){m.eating+=dt;g.mealT=m.eating;
      if(m.eating>=3){m.eaten=true;g.mealT=0;m.sick=!!S.mealDosed;S.mealDosed=false;}
    }
    if(m.eaten&&m.sick){
      gsay(g,'잠깐… 배가…',2);m.phase='queue';m.elapsed=0;m.waypoint=mealTrip(g,{x:wc.x,y:tc(9)},3,'화장실 앞');return;
    }
    if(m.eaten&&(!g.route.includes(m.waypoint)||g.wait<=0)){m.phase='returning';m.elapsed=0;m.next=S.t+d.every;}
  }else if(m.phase==='queue'){
    const occupied=S.guards.some(o=>o!==g&&!targetEliminated(o)&&!flOf(o)&&!o.z&&dist(o.x,o.y,wc.x,wc.y)<48)||(npc('vip')&&!targetEliminated(npc('vip'))&&S.vipPlan?.phase==='sick'&&!S.vipPlan.reachedToilet);
    if(!occupied){m.waypoint=mealTrip(g,wc,d.toiletStay,'공중화장실');m.phase='toilet';m.elapsed=0;m.arrived=false;}
    else if(!g.route.includes(m.waypoint)){m.waypoint=mealTrip(g,{x:wc.x,y:tc(9)},3,'화장실 앞');}
  }else if(m.phase==='toilet'){
    const here=!flOf(g)&&!g.z&&dist(g.x,g.y,wc.x,wc.y)<24&&!g.moving;
    if(here){m.arrived=true;g.a=g.want=0;g.act=null;g.idleT=20;}
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
  if(!S.dining?.eaten){ctx.fillStyle='#c2b99c';ctx.beginPath();ctx.ellipse(-3,-2,7,4,0,0,TAU);ctx.fill();ctx.fillStyle='#696c43';ctx.fillRect(4,-4,4,5);ctx.fillStyle='#8c6247';ctx.fillRect(1,-4,3,3);}
  ctx.strokeStyle='#9d8869';ctx.lineWidth=1.5;for(const dx of [19,22]){ctx.beginPath();ctx.moveTo(dx,-9);ctx.lineTo(dx-3,9);ctx.stroke();}ctx.restore();
}
function drawDiningFixtures(){
  if(STAGE.id!=='m2'||S.player.fl||S.player.z)return;
  const u=mealUse(),p=u&&usePoint(u);
  if(p&&fixtureVisible(surfaceFixture(p),550)){const v=surfacePoint(p);drawLitContainer({...v,fl:0,type:'surface',art:'meal'});if(S.player.item?.id!=='laxative'&&dist(S.player.x,S.player.y,p.x,p.y)<110)tag(v.x,v.y-27,'문지기 식사','#c9c0a6',.75);}
  for(const sign of [{x:tc(40),y:tc(8),text:'WC'},{x:tc(6),y:tc(32),text:'식사'}])if(fixtureVisible(sign,450))drawLitContainer({...sign,type:'surface',art:'placeSign'});
}
function drawSurfaceArt(p,ctx){
  if(p.art==='meal'){drawMealArt(p,ctx);return;}
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
      const dx=x+col*TILE+10+j*10;ctx.fillStyle=['#b1af97','#858e7b','#9d9584'][(j+col)%3];ctx.fillRect(dx,y+row-3,7,14);
      ctx.fillStyle='#4c594d';ctx.fillRect(dx+1,y+row+2,5,2);
    }
  }
}
