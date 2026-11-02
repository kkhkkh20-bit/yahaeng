"""Controlled hearing priorities, cautious repeat searches and physical light repair."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();page=await b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await page.goto((R/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await page.wait_for_function('!!window.__game')
  result=await page.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)};
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.elite&&!g.civ&&!g.target&&!g.dog);G.setLayer(0);
   let strip=null;for(let y=2;y<G.G0.length-3&&!strip;y++)for(let x=2;x<G.G0[0].length-7&&!strip;x++){let ok=true;for(let j=0;j<3;j++)for(let i=0;i<7;i++)if(G.solidAt(x+i,y+j)||G.bldAt(x+i,y+j)>=0)ok=false;if(ok)strip={x:(x+.5)*48,y:(y+1.5)*48};}
   check(strip,'no actual open street fixture');S.facOn=false;S.cams=[];S.lures=[];S.corpses=[];S.decals=[];S.lamps=[];P.under=true;P.hide=null;
   const guard=(id,dx,dy=0)=>({...base,id,x:strip.x+dx,y:strip.y+dy,z:0,fl:0,a:Math.PI/2,want:Math.PI/2,radio:false,torch:false,state:'PATROL',seen:false,meter:0,glance:0,glanceT:999,path:null,poi:null,reached:false,hearT:0,relight:null,route:[{x:strip.x+dx,y:strip.y+dy,pause:999}],ri:0,post:Math.PI/2,wait:999,act:null,chat:null,follow:null,securityBuddy:null,soundHistory:[],soundWatchUntil:0});
   const origin={x:strip.x+48,y:strip.y};S.guards=[guard(700,96),guard(701,144),guard(702,192)];
   G.noise(origin.x,origin.y,230,'whistle',0,0);let scouts=S.guards.filter(g=>g.state==='SUSPICIOUS');check(scouts.length===1,'everyone rushes a single sound');const scout=scouts[0];check(S.guards.filter(g=>g.state==='PATROL'&&g.soundWatchUntil>S.t).length===2,'colleagues do not cover the scout '+JSON.stringify({guards:S.guards.map(g=>[g.id,g.state,g.soundWatchUntil]),noise:S.noises.at(-1)}));
   S.t+=3;G.noise(origin.x,origin.y,230,'whistle',0,0);check(scout.soundHistory[0].hits===2&&scout.soundApproach&&Math.hypot(scout.soundApproach.x-origin.x,scout.soundApproach.y-origin.y)>=32,'repeated cue blindly enters same ambush');check(scout.poi.x===origin.x&&scout.poi.y===origin.y,'heard location is confused with cautious stopping point');
   S.t+=3;G.noise(origin.x,origin.y,230,'stone',0,0);check(scout.soundHistory[0].hits===3,'alternating lures erase location memory');
   check(S.guards.every(g=>!g.lastSeen&&!g.seen&&g.state!=='ALERT'),'sound creates a visual player location');
   const standoff=Math.hypot(scout.soundApproach.x-origin.x,scout.soundApproach.y-origin.y),bush={type:'bush',x:origin.x,y:origin.y,tx:Math.floor(origin.x/48),ty:Math.floor(origin.y/48),fl:0,z:0,bodies:0,cap:2},oldBushes=S.bushes;S.bushes=[bush];
   let checked=false;for(let i=0;i<450;i++){S.t+=.02;G.updateGuard(scout,.02);if(scout.state==='CHECK'){checked=scout.checks[0]===bush;break;}}check(checked,'repeated concealed sound never inspects its nearby hiding place');S.bushes=oldBushes;
   const watched=guard(710,148);watched.state='NOTICE';watched.why='saw';watched.seen=true;watched.poi={x:strip.x+120,y:strip.y+30};const original=watched.poi;
   const body=guard(711,196);body.state='BODY';body.poi={x:strip.x+180,y:strip.y};const search=guard(713,144);search.state='SEARCH';search.why='blood';search.poi={x:strip.x+130,y:strip.y};S.guards=[watched,body,search];G.noise(origin.x,origin.y,230,'whistle',0,0);check(watched.state==='NOTICE'&&watched.poi===original&&body.state==='BODY'&&search.state==='SEARCH'&&search.why==='blood','decoy overrides sight or body evidence');
   const otherFloor=guard(712,148);otherFloor.fl=1;S.guards=[otherFloor];G.noise(origin.x,origin.y,230,'whistle',0,0);check(otherFloor.state==='PATROL'&&!otherFloor.soundHistory.length,'another floor hears source telepathically');
   const repairer=guard(720,72),l={x:strip.x+95,y:strip.y,fl:0,z:0,r:160,outdoor:false,off:true,broken:false,control:{x:strip.x+160,y:strip.y,fl:0,z:0}};
   S.guards=[repairer];S.lamps=[l];repairer.relight={l,t:1.8};const before=repairer.x;let elapsed=0,turnedAt=null;
   for(let i=0;i<500&&l.off;i++){S.t+=.02;elapsed+=.02;G.updateGuard(repairer,.02);if(!l.off)turnedAt=Math.hypot(repairer.x-l.control.x,repairer.y-l.control.y);}
   check(!l.off&&repairer.x>before+20&&turnedAt<=34.1&&elapsed>1.8,'guard repairs light remotely '+JSON.stringify({turnedAt,elapsed,before,x:repairer.x}));
   const unavailable=guard(721,196),replacement=guard(722,72);unavailable.state='DEAD';unavailable.relight={l,t:1};l.off=true;S.guards=[unavailable,replacement];S.t+=.02;G.updateGuard(replacement,.02);check(replacement.relight?.l===l,'dead guard permanently reserves light repair');
   const blocked=guard(730,48);S.guards=[blocked];S.lamps=[];blocked.state='SUSPICIOUS';blocked.why='heard';const wall=G.G0.flatMap((row,y)=>row.map((v,x)=>v==='#'?{x:x*48+24,y:y*48+24}:null).filter(Boolean))[0];blocked.poi={...wall,fl:0,z:0};G.pathTo(blocked,wall.x,wall.y);S.t+=.02;G.updateGuard(blocked,.02);check(!blocked.reached,'failed path counted as arrival');
   return{controlled:true,strip,oneScout:true,coveringGuards:2,repeatStandOff:standoff,repeatChecksNearbyHide:true,prioritySightAndBody:true,floorIsolation:true,physicalRepair:{elapsed,turnedAt,moved:repairer.x-before},failedPathNotArrival:true,deadRepairClaimReleased:true};
  }''')
  assert not errors,errors;(O/'ai-decisions.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS AI decisions',result,flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
