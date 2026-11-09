"""Real-map controlled geometry/hearing matrix; native encounter is tested separately."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/perception-v252';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}));localStorage.setItem("yahaeng.skillTree.v1",JSON.stringify({schema:1,rewardVersion:152,legacyPoints:0,learned:["silentHands","ambush"]}))');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},corners=[];
   const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S;S.cams=[];S.facOn=false;S.corpses=[];return S;};
   let S=fresh('m2'),P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};let lastContact;S.guards=[];
   for(const fl of [0,1])for(const [nx,ny]of [[-1,0],[1,0],[0,-1],[0,1]]){
    G.setLayer(fl);let found=null;
    for(let y=2;y<G.MH-2&&!found;y++)for(let x=2;x<G.MW-2&&!found;x++){
     if(!G.solidAt(x,y)||G.solidAt(x+nx,y+ny))continue;const tx=-ny,ty=nx;
     Object.assign(P,{x:(x+.5)*48+nx*36+tx*12,y:(y+.5)*48+ny*36+ty*12,fl,z:0,cover:{x:nx,y:ny},hide:null,under:null,vent:null,trav:null,hidden:false,strikeT:0});
     const g={...base,id:991,x:(x+.5)*48-tx*48,y:(y+.5)*48-ty*48,fl,z:0,state:'PATROL',meter:0,seen:false,climb:null,doomed:false,radio:false,torch:false,chat:null,act:null};
     const route=G.coverPullRoute(g);if(route&&route.points.length===3&&!G.los(P.x,P.y,g.x,g.y)){found={g,route};}
    }
    ok(found,'missing actual corner direction/floor '+JSON.stringify([fl,nx,ny]));const {g,route}=found;S.guards=[g];ok(G.coverTarget()===g,'nearby corner not offered');
    lastContact={x:g.x,y:g.y};const original={x:P.x,y:P.y};G.actPrimary({k:'pull',g,viaZ:true});ok(S.pull?.g===g,'valid corner action does not start');let frames=0,previous={x:g.x,y:g.y};
    while(S.pull&&frames++<120){G.updatePull(.01);ok(!G.solidAt(Math.floor(g.x/48),Math.floor(g.y/48)),'pull crosses an actual wall');ok(Math.hypot(g.x-previous.x,g.y-previous.y)<8,'pull teleports around corner');previous={x:g.x,y:g.y};}
    ok(g.unconscious&&!S.pull&&P.x===original.x&&P.y===original.y,'pull fails KO or teleports player');corners.push({fl,normal:[nx,ny],length:route.length,frames});
   }
   // Locks remain deliberate even where the new corner contact is physically possible.
   const g=S.guards[0];g.state='PATROL';g.unconscious=false;g.doomed=false;Object.assign(g,lastContact);P.strikeT=0;S.corpses=[];G.storeSkillTree({schema:1,rewardVersion:152,learned:[]});G.syncRuntimeSkills();ok(!G.coverTarget(),'corner grants an unearned ability');ok(G.attackAction().skillLocked==='ambush','skill lock has no actionable caption '+JSON.stringify({action:G.attackAction(),route:G.coverPullRoute(g),p:[P.x,P.y,P.fl,P.z,P.cover],g:[g.x,g.y,g.fl,g.z,g.state]}));G.storeSkillTree({schema:1,rewardVersion:152,learned:['silentHands','ambush']});G.syncRuntimeSkills();
   g.fl=P.fl+1;ok(!G.coverPullRoute(g),'pull reaches another floor');g.fl=P.fl;g.z=1;ok(!G.coverPullRoute(g),'pull reaches another height');g.z=0;g.x=P.x+200;ok(!G.coverPullRoute(g),'pull reaches a distant guard');
   S=fresh('m6');P=S.player;const h=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[h];G.setLayer(0);let strip=null;
   for(let y=2;y<G.MH-2&&!strip;y++)for(let x=2;x<G.MW-9&&!strip;x++)if(Array.from({length:8},(_,i)=>!G.solidAt(x+i,y)&&G.bldAt(x+i,y)<0).every(Boolean))strip={x:(x+.5)*48,y:(y+.5)*48};ok(strip,'no real open hearing strip');
   Object.assign(P,{...strip,fl:0,z:0,hide:null,under:null,vent:null,cover:null,mode:'walk'});Object.assign(h,{x:strip.x+288,y:strip.y,fl:0,z:0,state:'PATROL',seen:false,meter:0,radio:false,torch:false,act:null,chat:null});G.whistle();let n=S.noises.at(-1);ok(n.r>=360&&n.heard&&n.investigators?.includes(h.id),'default whistle cannot reach a guard six tiles away');
   h.state='SUSPICIOUS';h.why='heard';h.poi={x:P.x-160,y:P.y,fl:0,z:0};h.reached=false;P.x+=96;S.whistleT=0;G.whistle();ok(h.poi.x===P.x&&h.poi.y===P.y,'fresh whistle ignored while following a stale sound');
   h.state='SEARCH';h.why='saw';h.poi={x:P.x-96,y:P.y,fl:0,z:0};const oldX=h.poi.x;S.whistleT=0;G.whistle();n=S.noises.at(-1);ok(h.poi.x===oldX&&n.busyListeners?.includes(h.id),'whistle erases stronger visual search or hides busy feedback');
   h.state='PATROL';h.fl=1;S.whistleT=0;G.whistle();ok(!S.noises.at(-1).heard,'whistle passes through a closed floor');
   return{corners,defaultRange:360,sixTileHearing:true,newSoundRetargets:true,realSearchPreserved:true,floorsSeparate:true,skillLockPreserved:true};
  }''');assert not errors,errors;(O/'corner-whistle.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS corner whistle',json.dumps(result),flush=True);await b.close()
asyncio.run(main())
