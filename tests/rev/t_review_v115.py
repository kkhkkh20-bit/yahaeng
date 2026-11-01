"""Self-review regressions: empty meals, real surfaces, furniture visibility and deliberate reading."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100);await pg.evaluate('document.fonts.ready')
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.S.cams=[];G.S.facOn=false;G.update(.001);return G.S;},step=(n,dt=.02)=>{for(let i=0;i<n;i++){G.S.t+=dt;G.updatePlayer(dt);}};
    let S=fresh(),P=S.player;G.updateHUD(true);const top=document.querySelector('#hud .top').getBoundingClientRect(),state=document.querySelector('#stealth').getBoundingClientRect();check(state.top>=top.bottom+4,'first-frame status overlaps header');check(document.querySelector('#mini').width>1,'first-frame minimap blank');let med=S.props.find(p=>p.id==='laxative'),v=G.surfacePoint(med);S.guards=[];Object.assign(P,{x:med.x,y:med.y,fl:0,z:0});G.setLayer(0);
    let a=G.envChoices().find(a=>a.k==='pickup'&&a.p===med);G.actCarry(a);check(!S.contact&&!P.item,'pickup skips contact');step(14);check(P.item===med&&S.contact.surface&&Math.hypot(S.contact.x-v.x,S.contact.y-v.y)<.01,'pickup effect remains on floor');check(S.contact.y>P.y-90&&S.contact.y<P.y-20,'medicine not on a reachable shelf');step(12);
    S=fresh();P=S.player;const table=G.usePoint(G.STAGE.uses[1]);let visible=0;for(let y=28;y<=30;y++)for(let x=3;x<=6;x++){if(G.solidAt(x,y))continue;Object.assign(P,{x:x*48+24,y:y*48+24,fl:0,z:0});if(G.objectReachable(table,56)){visible++;check(G.fixtureVisible(table),'reachable tabletop vanishes at '+x+','+y);}}
    check(visible>=3,'table perimeter not exercised');Object.assign(P,{x:1.5*48,y:29.5*48});check(!G.fixtureVisible(table),'table visible through exterior wall');Object.assign(P,{x:table.x,y:table.y,fl:1});check(!G.fixtureVisible(table),'table visible on another floor');P.fl=0;P.z=1;check(!G.fixtureVisible(table),'table visible from another height');P.z=0;G.setLayer(0);
    // The plate can be empty: seasoning is a distinct, persistent physical target.
    S.dining.eaten=true;med=S.props.find(p=>p.id==='laxative');G.takeProp(med);Object.assign(P,{x:table.x+26,y:table.y+16});G.setOppMode(1);check(G.missionApproachGoal()?.text.includes('양념통'),'empty plate loses preparation lead');
    a=G.envChoices().find(a=>a.k==='use');check(a&&a.label.includes('양념통'),'empty meal blocks seasoning preparation');const guest=S.guards.find(g=>g.tag==='bouncer'),before={x:guest.x,y:guest.y,route:guest.route.length};G.selectEnvTarget(G.envToken(a));G.actEnv();step(20);check(S.mealDosed&&S.dining.eaten&&!P.item,'preparation creates/eats food');const at=G.surfacePoint(table);check(Math.hypot(S.contact.x-at.x,S.contact.y-at.y)<.01,'seasoning effect misses its bottle');check(guest.x===before.x&&guest.y===before.y&&guest.route.length===before.route,'preparation summons or teleports guest');step(20);
    // Render the actual scene, checking only the useful state label and no stale meal label.
    const capture=()=>{let labels=[];const proto=CanvasRenderingContext2D.prototype,old=proto.fillText;proto.fillText=function(t,...a){labels.push(String(t));return old.call(this,t,...a);};try{G.benchDraw(2);}finally{proto.fillText=old;}return labels;};
    S.guards=[];G.cam.x=P.x;G.cam.y=P.y-60;G.updateHUD(true);let labels=capture();check(labels.includes('약을 넣은 양념통')&&!labels.includes('문지기 식사'),'prepared seasoning has no clear state');S.mealDosed=false;labels=capture();check(labels.includes('빈 그릇')&&!labels.includes('문지기 식사'),'empty plate still labelled as food');
    // Existing preparation survives reload; the saved target moves to the authored bottle slot.
    table.surfaceU=.65;G.saveCheckpoint();check(G.loadCheckpoint(),'checkpoint failed');S=G.S;P=S.player;const restored=G.usePoint(G.STAGE.uses[1]);check(restored.surfaceU===.85&&S.usesDone[1],'legacy target slot/progress lost');
    S=fresh();P=S.player;const upstairs=S.notes[0],tx=Math.floor(upstairs.x/48),ty=Math.floor(upstairs.y/48),tile=G.G0[ty][tx];Object.assign(P,{x:upstairs.x,y:upstairs.y,fl:upstairs.fl,z:0});G.G0[ty][tx]='#';G.setLayer(0);check(G.fixtureVisible(upstairs),'upper-floor visibility uses ground grid');check(G.tileG(tx,ty)==='#','visibility leaks its active floor');G.G0[ty][tx]=tile;
    // Read only after the hand movement, once; cancellation cannot grant the code.
    S=fresh();P=S.player;S.guards=[];let note=S.notes[0];Object.assign(P,{x:note.x,y:note.y,fl:note.fl,z:0});G.setLayer(note.fl);a=G.envChoices().find(a=>a.k==='read');check(a,'note has no action');G.selectEnvTarget(G.envToken(a));G.actEnv();check(P.interact?.pose==='hands'&&!note.read&&!G.DLG.modal,'reading skips hand movement');step(10);G.actEnv();check(!note.read&&!G.DLG.modal,'repeated reading skips movement');step(14);check(note.read&&P.keys.code&&G.DLG.modal&&!P.interact,'read never completes or leaves busy state');while(G.DLG.modal)G.advanceDialog();
    S=fresh();P=S.player;S.guards=[];note=S.notes[0];Object.assign(P,{x:note.x,y:note.y,fl:note.fl,z:0});G.setLayer(note.fl);G.selectEnvTarget(G.envToken(G.envChoices().find(a=>a.k==='read')));G.actEnv();P.x+=80;step(30);check(!note.read&&!P.keys.code&&!G.DLG.modal,'cancelled reading grants code');
    // Completed clean meals cannot become an endless walking-to-the-table state after a shove.
    S=fresh();const g=S.guards.find(g=>g.tag==='bouncer');S.dining={phase:'eating',eaten:true,sick:false,eating:3,waypoint:{},elapsed:0};g.wait=0;g.moving=true;G.updateDining(.1);check(S.dining.phase==='returning','finished diner gets stuck after displacement');
    return{surfaceContact:true,visiblePerimeter:visible,wallAndFloorOcclusion:true,emptyPlatePreparation:true,clearStates:true,readingDelay:true,readingCancel:true,checkpoint:true};
   }''')
   assert not errors,errors;print('PASS','mobile'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
