"""Controlled actual-roof sample matrix. Rendering must use the real detection predicate."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/perception-v252';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(1280,800),(390,844)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w<1000,is_mobile=w<1000);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
   result=await q.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite),g={...base,x:21.5*48,y:8.5*48,fl:0,z:0,a:0,want:0,lookout:true,torch:false,state:'PATROL',path:null,chat:null,act:null,seen:false,radio:false,post:0,wait:999};S.guards=[g];S.fade=0;S.alevel=0;Object.assign(P,{x:22.2*48,y:g.y,fl:0,z:2,hide:null,under:null,vent:null,hidden:false,mode:'walk',light:1,trav:null,outfit:null});G.setLayer(0);
    const began=performance.now(),standing=G.heightSightField(g),ms=performance.now()-began;
    ok(G.selectVisionFocus()?.actor===g,'lower observer never becomes the roof vision focus');ok(standing.cells.length>0,'actual exposed roof edge has no projected field');
    for(const c of standing.cells){const x=c.x+standing.step/2,y=c.y+standing.step/2;ok(G.canSee(g,x,y,G.lightAt(x,y,true),false,false,2)>0,'painted roof cell cannot actually be seen');}
    const cache=G.heightSightField(g);ok(cache===standing,'unchanged field is rebuilt every frame');
    const at=standing.cells[0];Object.assign(P,{x:at.x+6,y:at.y+6,light:G.lightAt(at.x+6,at.y+6,true)});G.updateGuard(g,.05);ok(g.rawSeen,'painted sample is absent from actual AI sight');
    P.mode='sneak';const crouched=G.heightSightField(g);ok(crouched!==standing&&crouched.cells.length<=standing.cells.length,'stance does not update the actual field');
    P.mode='walk';Object.assign(g,{a:Math.PI,want:Math.PI,seen:false});const away=G.heightSightField(g);ok(!away.cells.length,'turning away leaves the old roof field');
    Object.assign(g,{a:0,want:0});Object.assign(P,{fl:1,z:0});ok(!G.heightSightEligible(g)&&!G.heightSightField(g).cells.length,'indoor 2F is treated like an exposed roof');
    Object.assign(P,{x:29.5*48,y:9.5*48,fl:0,z:2});ok(!G.canSee(g,P.x,P.y,1,false,false,2),'roof middle fixture must be physically hidden');const middle=G.heightSightField(g);ok(!middle.cells.some(c=>P.x>=c.x&&P.x<c.x+12&&P.y>=c.y&&P.y<c.y+12),'safe roof middle is painted exposed');
    Object.assign(g,{x:22.5*48,y:8.5*48,z:0});ok(!G.heightSightEligible(g),'a guard under a ceiling projects through their own roof');
    Object.assign(g,{x:21.5*48,y:8.5*48,z:0,a:0,want:0,meter:0,seen:false});Object.assign(P,{x:22.2*48,y:g.y,fl:0,z:2,mode:'walk'});P.light=G.lightAt(P.x,P.y,true);G.updateHUD(true);G.moveCamera(1);G.benchDraw(2);
    return{standing:standing.cells.length,crouched:crouched.cells.length,edges:standing.edges.length,coldMs:ms,samplesMatchAI:true,turnAndStanceRefresh:true,ceilingsOpaque:true,noSerializedCache:!('_heightField'in g)};
   }''');await q.screenshot(path=str(O/f'roof-field-{w}.png'));assert not errors,errors;rows.append({'viewport':[w,h],**result,'errors':errors});print('PASS roof sight field',w,result,flush=True);await q.close()
  await b.close()
 (O/'roof-field.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
