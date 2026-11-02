"""Controlled real-map regressions for quiet KO, local reports, observed switches and hiding-place inspections."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/feedback-v138';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   page=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await page.goto((R/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await page.wait_for_function('!!__game')
   result=await page.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.facOn=false;G.S.cams=[];G.setLayer(0);return G.S;};
    let S=fresh(),P=S.player;const base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target)};
    check(G.G0[16][21]===','&&!G.solidAt(21,16),'club-side passage remains blocked');
    check(G.propGround('O',13,7)===',','planter has a different paving tile');
    G.G0[16][21]='O';S.stats.ko=2;G.saveCheckpoint();G.G0[16][21]=',';check(G.loadCheckpoint()&&G.G0[16][21]===','&&G.S.stats.ko===2,'old checkpoint restores the retired obstruction or loses mission progress');S=fresh();P=S.player;

    const strip={x:1800,y:504},guard=(id,dx)=>({...base,id,x:strip.x+dx,y:strip.y,fl:0,z:0,a:Math.PI,want:Math.PI,seen:false,meter:0,state:'PATROL',route:[{x:strip.x+dx,y:strip.y,pause:999}],ri:0,wait:999,post:Math.PI,glance:0,glanceT:999,path:null,poi:null,radio:false,torch:false,relight:null,chat:null,act:null,follow:null,homeFl:0,securityBuddy:null});
    S.guards=[];S.lamps=[];S.corpses=[];S.decals=[];P.under=true;
    const victim=guard(600,48),near=guard(601,112),far=guard(602,400),upper=guard(603,112);upper.fl=1;S.guards=[victim,near,far,upper];victim.takedownIntent={lethal:false};G.killGuard(victim,null,null,true);
    check(S.noises.at(-1).src==='ko'&&S.noises.at(-1).r<=12,'quiet KO emits a broad impact');check([near,far,upper].every(g=>g.state==='PATROL'),'unwitnessed KO calls distant guards');const koRadius=S.noises.at(-1).r;
    // Only the discovering guard and listeners within an audible report join the immediate search.
    const c=S.corpses[0];c.ko=false;c.light=1;c.discovered=false;near.x=c.x+10;near.state='BODY';near.body=c;near.path=null;const local=guard(604,144);S.guards=[victim,near,local,far,upper];S.t+=.02;G.updateGuard(near,.02);
    check(c.discovered&&near.searchJob,'body discovery did not start an actual search');check(local.searchJob,'nearby listener ignored body report');check(!far.searchJob&&!upper.searchJob,'body report telepathically recruits distant/other-floor guards');check(near.say?.includes('시체'),'body report has no spoken reason');
    const localReport={local:!!local.searchJob,distant:!!far.searchJob,otherFloor:!!upper.searchJob};
    // Actual public-space switch action: look toward the actor before the lamp is extinguished.
    S=fresh();P=S.player;S.corpses=[];S.decals=[];P.under=false;Object.assign(P,{x:strip.x+48,y:strip.y,z:0,fl:0,a:0,mode:'walk',hidden:false});
    const watcher=guard(610,192),lamp={x:P.x,y:P.y,fl:0,z:0,r:350,outdoor:false,off:false,control:{x:P.x,y:P.y,fl:0,z:0}};S.guards=[watcher];S.lamps=[lamp];G.actPrimary({k:'lamp',l:lamp,at:lamp.control,viaZ:true});
    let observed=false,said=false;for(let i=0;i<40;i++){G.update(.01);if(lamp.off&&watcher.relight?.witnessed){observed=true;said=watcher.say?.includes('불 끄지');break;}}
    check(observed&&said,'watching guard neither objects nor restores switched light');check(G.visibleSpeechCandidates(P,false,true).includes(watcher),'action focus suppresses the switch objection');const before=watcher.x;
    let elapsed=0,atSwitch=null;for(let i=0;i<600&&lamp.off;i++){G.update(.01);elapsed+=.01;if(!lamp.off)atSwitch=Math.hypot(watcher.x-lamp.control.x,watcher.y-lamp.control.y);}
    check(!lamp.off&&watcher.x<before-30&&atSwitch<=34.1,'observed light restore is remote or never completes');const light={spoke:said,elapsed,atSwitch};
    S=fresh();P=S.player;S.corpses=[];Object.assign(P,{x:strip.x+48,y:strip.y,z:0,fl:0,mode:'walk',hidden:false});const away=guard(611,192);away.a=away.want=0;S.guards=[away];const dark={...lamp,off:false,control:{...lamp.control}};S.lamps=[dark];G.actPrimary({k:'lamp',l:dark,at:dark.control,viaZ:true});for(let i=0;i<40;i++)G.update(.01);check(dark.off&&!away.relight?.witnessed,'guard reacts to an unseen switch operation');
    // A real solid cabinet must be approached from its front, opened and checked after a body report.
    S=fresh();P=S.player;P.under=true;S.cams=[];S.decals=[];S.corpses=[];const h=S.hides.find(h=>h.furn&&['locker','wardrobe','cab'].includes(h.type)&&!h.fl&&G.bldAt(h.tx,h.ty)===0&&G.searchStandNear(h));check(h,'missing real searchable cabinet');
    const stand=G.searchStandNear(h),inspector=guard(620,0);Object.assign(inspector,{x:stand.x,y:stand.y,fl:0,z:0,homeFl:0,route:[{x:stand.x,y:stand.y,pause:999}],state:'PATROL'});S.guards=[inspector];
    const hiddenBody={guardId:999,fl:0,z:0,ch:'sam',x:h.x,y:h.y,ko:true,stashed:true,container:h,hidden:false,discovered:false,light:0};h.bodies=1;S.corpses=[hiddenBody];
    const origin={x:stand.x,y:stand.y,fl:0,z:0};check(G.startBuildingSearch(origin,'A','body',inspector),'body search did not assign inspector');const incident=S.searchIncidents.at(-1),hideJob=incident.jobs.find(j=>j.hideIndex!=null&&S.hides[j.hideIndex]===h);check(hideJob&&hideJob.priority<2,'cabinet search is omitted or delayed behind every room');
    let opened=false;for(let i=0;i<6000&&!h.found;i++){S.t+=.01;G.setLayer(inspector.fl||0);G.updateGuard(inspector,.01);if(G.inspectionOpen(h)>.5){opened=true;check(!hiddenBody.discovered,'hidden body discovered before physical inspection completes');}}
    check(opened&&h.found&&hiddenBody.discovered,'search does not physically inspect hidden cabinet '+JSON.stringify({h,log:S.searchLog,state:inspector.state,job:inspector.searchJob}));
    // The simpler CHECK path must also reach solid containers instead of pathfinding into their blocked cell.
    h.found=false;h.bodies=0;S.corpses=[];Object.assign(inspector,{state:'PATROL',path:null,x:stand.x,y:stand.y});check(G.startCheck(inspector,h,1,1),'solid cabinet is excluded from CHECK');let checked=false;for(let i=0;i<300;i++){S.t+=.01;G.updateGuard(inspector,.01);if(inspector.inspect!=null)checked=true;}check(checked,'CHECK cannot reach cabinet front');
    check(!S.player.disguiseBlown&&S.stats.detected===0,'search knows hidden player identity without evidence');
    S=fresh();P=S.player;S.guards=[];S.corpses=[];const bush=S.bushes.find(b=>!S.hides.some(h=>Math.hypot(h.x-b.x,h.y-b.y)<100));check(bush,'no isolated real bush');Object.assign(P,{x:bush.x,y:bush.y,fl:0,z:0,a:0,mode:'walk',under:false,hide:null});const carried={x:P.x,y:P.y,fl:0,z:0,ch:'sam',g:base,ko:true,carried:true,stashed:false,hidden:false,light:1};P.carrying=carried;S.corpses=[carried];
    check(G.envChoices().some(a=>a.h===bush&&a.label.includes('숨기')),'bush storage action is missing');G.actCarry({k:'carry',c:carried,h:bush});check(P.trav?.hideFlow?.kind==='stash'&&!carried.hidden,'bush storage skips the lowering motion');for(let i=0;i<130;i++)G.update(.01);
    check(carried.ko&&carried.hidden&&!carried.carried&&!carried.stashed&&!P.carrying&&!P.hide&&carried.x===bush.x&&carried.y===bush.y,'body dropped outside the bush instead of hidden');
    return {controlled:true,mobile:('ontouchstart' in window),passageOpen:true,oldCheckpointPassageMigrated:true,matchingPropGround:true,bushBodyHiddenAfterLowering:true,quietKoRadius:koRadius,localReport,witnessedLight:light,unseenLightNoObjection:true,cabinetOpenedAndFound:true,blockedContainerCheck:true};
   }''')
   assert not errors,errors;(O/f'feedback-{"touch"if mobile else"pc"}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS feedback',mobile,result,flush=True);await page.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
