"""Useful spaces, a physical code/card chain, conditional evidence and preserved saves."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
  await pg.locator('#btnLedger').click()
  assert await pg.locator('#stageList > button.stage:not(.tut)').count()==3
  assert await pg.locator('.lg-archive').first.locator('button.stage').count()==3
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.setLayer(0);G.S.player.x=G.S.player.y=-9999;return G.S},tick=n=>{for(let i=0;i<n;i++){G.S.t+=1/60;G.updatePlayer(1/60)}};
   check(G.mainContracts().map(s=>s.id).join()==='m2,m4,m6','main contract selection');check(G.mainContracts().map(G.contractNumber).join()==='01,02,03','main contract numbering');
   let rooms=0;
   for(const id of ['m2','m4','m6']){
    const S=fresh(id),P=S.player,cr=S.camRoom;check(cr&&G.STAGE.securityEvidence,'missing evidence terminal '+id);G.setLayer(cr.fl);check(!G.solidAt(cr.tx,cr.ty),'terminal inside wall '+id);G.setLayer(0);
    for(const g of S.guards.filter(g=>['vipEscort','camop','contact'].includes(g.tag))){G.setLayer(g.fl);check(!G.solidAt(Math.floor(g.x/48),Math.floor(g.y/48)),'special actor inside wall '+id+' '+g.tag)}G.setLayer(0);rooms++;
    S.guards=[];S.items.forEach(i=>i.got=true);S.corpses=[];G.checkObjective();check(S.exitOpen&&!G.evidencePending(),'clean route forced to erase evidence '+id);
    let at;for(let y=1;y<G.MH-1&&!at;y++)for(let x=1;x<G.MW-2&&!at;x++)if(!G.solidAt(x,y)&&!G.solidAt(x+1,y)&&G.los(x*48+24,y*48+24,x*48+72,y*48+24))at=[x*48+24,y*48+24];check(at,'camera fixture');
    Object.assign(P,{x:at[0]+48,y:at[1],fl:0,z:0,light:1,strikeT:.3,hide:null,under:false,vent:false,wire:null,outfit:'crew',disguise:'sam',disguiseBlown:false});
    const cam={x:at[0],y:at[1],tx:Math.floor(at[0]/48),ty:Math.floor(at[1]/48),fl:0,a:0,base:0,sweep:0,period:10,ph:0,meter:.85,cool:0,outdoor:true};S.cams=[cam];G.updateCams(.1);check(G.evidencePending()&&!S.exitOpen,'recording does not block evidence escape '+id);check(G.nextGoal().text.includes('CCTV')&&G.nextGoal().fl===cr.fl,'evidence objective has no physical destination '+id);
    G.saveCheckpoint();check(G.loadCheckpoint()&&G.evidencePending()&&!G.S.exitOpen,'recording lost on checkpoint '+id);
    const R=G.S.camRoom,Q=G.S.player;Object.assign(Q,{x:R.x,y:R.y,fl:R.fl,z:0,strikeT:0});G.setLayer(R.fl);G.doAct({k:'camroom',targetObject:R,at:{x:R.x,y:R.y},label:'CCTV 끄고 녹화 지우기'});check(Q.interact?.illegal,'security tampering is treated as authorized work');tick(60);check(!G.evidencePending()&&G.S.exitOpen&&G.S.camsOff,'terminal does not erase and reopen exit '+id);
   }
   {const S=fresh('m4'),P=S.player;check(G.BLD[0].vacant==='ruin'&&G.BLD[5].vacant==='lot','missing ruin and yard');for(const i of [0,5]){check(!G.BLD[i].kit&&!G.BLD[i].roofC,'vacant site retains old building art');check(G.zoneAt((G.BLD[i].x0+1.5)*48,(G.BLD[i].y0+1.5)*48,0)===(i===5?G.Z_PUB:G.Z_RES),'vacant site access rules')}
    Object.assign(P,{x:S.guards[16].x+10,y:S.guards[16].y,fl:0,z:0});for(let i=0;i<2400;i++){S.t+=1/60;G.updateIntel(1/60)}check(S.learned.some(s=>s.includes('폐사무소')),'pocha conversation does not reveal the physical lead');
    const contact=S.guards.find(g=>g.tag==='contact'),note=S.notes.find(n=>n.gives==='code'),green=S.keyItems.find(k=>k.key==='green');check(contact.hasKey==='code'&&note&&note.lines.some(l=>l.includes(G.STAGE.code)),'physical code sources missing');check(!G.coveredG(contact,-1),'contact in roofless ruin is hidden by phantom roof');
    Object.assign(P,{x:note.x,y:note.y,fl:0,z:0});G.doAct({k:'read',n:note});for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();check(P.keys.code,'reading real note does not teach password');check(S.doors.some(d=>d.keyLock==='code'&&G.bldAt(d.tx,d.ty)===2),'password has no matching office entrance');check(green.fl===1&&G.bldAt(Math.floor(green.x/48),Math.floor(green.y/48))===2&&S.items[1].fl===0&&S.items[1].b===2,'office is not reused for card then contract');check(S.exits.some(e=>e.name==='공터 하수구'),'yard has no escape purpose');check(G.rLv(18,21)===1&&G.rLv(17,20)===0,'yard container height or open ground wrong');
   }
   {const S=fresh('m4'),P=S.player,g=S.guards.find(g=>g.tag==='contact');S.guards=[g];Object.assign(P,{x:g.x-50,y:g.y,fl:0,z:0,mode:'walk',light:1,hidden:false,strikeT:0,outfit:null,disguise:null});Object.assign(g,{a:Math.PI,want:Math.PI,route:[{x:g.x,y:g.y,pause:999}],ri:0,wait:999,path:null});for(let n=0;n<120;n++){S.t+=1/60;G.updateGuard(g,1/60)}check(g.state==='WARN','contact does not guard the password source with a fair trespass warning');}
   // The privacy route remains an actual way to separate VIP and escort.
   {const S=fresh('m2'),g=S.guards.find(g=>g.tag==='vipEscort'),L=S.guards[g.follow];S.player.x=S.player.y=-9999;Object.assign(L,{x:40.5*48,y:6.5*48,fl:0,z:0});Object.assign(g,{x:40.5*48,y:10.5*48,fl:0,z:0,path:null});for(let i=0;i<360;i++){S.t+=1/60;G.followLeader(g,1/60,60)}check(g.waitingPrivacy&&g.y>8*48&&Math.hypot(g.x-40.5*48,g.y-9.5*48)<40,'escort follows into private toilet');L.x=29.5*48;L.y=10.5*48;G.followLeader(g,1/60,60);check(!g.waitingPrivacy&&g.path?.length,'escort does not resume after privacy');}
   // Model a v90 save inside the now removed upper floor, including a hidden KO target.
   {const S=fresh('m4'),P=S.player;P.hp=2;P.keys.red=true;S.items[0].got=true;G.saveCheckpoint();const cp=G.CP,Q=cp.S.player;cp.S.layoutVersion=0;Object.assign(Q,{x:16.5*48,y:20.5*48,fl:1,z:0});const old={x:Q.x,y:Q.y,tx:16,ty:20,fl:1,type:'bed',furn:true,bodies:1,cap:1};cp.S.hides.push(old);Q.hide=old;const v=cp.S.guards.find(g=>g.target&&g.tag==='vip');v.state='DEAD';v.unconscious=true;cp.S.corpses.push({g:v,target:true,ko:true,stashed:true,container:old,x:Q.x,y:Q.y,fl:1,z:0});for(let y=17;y<=24;y++)for(let x=14;x<=20;x++){cp.grids[0][y][x]='#';cp.grids[1][y][x]='w'}cp.S.guards=cp.S.guards.filter(g=>!['vipEscort','camop','contact'].includes(g.tag));cp.S.guards.forEach((g,i)=>g.id=i);cp.S.notes=[];cp.S.camRoom=null;check(G.loadCheckpoint(),'old save refused');const R=G.S,A=R.player,c=R.corpses.find(c=>c.target&&c.ko);check(A.hp===2&&A.keys.red&&R.items[0].got,'old save loses progress');check(A.fl===0&&A.hide?.type==='box'&&c.container===A.hide&&c.ko&&c.stashed,'hidden player/target not recovered into real yard container');G.setLayer(0);check(G.tileG(17,20)!=='#'&&G.tileG(17,20)!=='V','old invisible walls remain');check(R.ladders.some(l=>l.kind==='ladder'&&l.tx===19&&l.ty===21),'legacy save misses real yard container ladder');check(R.guards.some(g=>g.tag==='contact')&&R.notes.length&&R.camRoom,'old save misses new mission sources');}
   return{mainContracts:3,securityRooms:rooms,physicalCode:true,sameBuildingReuse:true,privacySeparation:true,oldSaveRecovery:true};
  }''')
  assert not errors,errors;print('PASS',result);await b.close()
asyncio.run(main())
