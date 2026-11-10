"""Direct wall-lamp interaction, shared circuits, local reactions and checkpoint migration."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game',polling=100)
  report=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},counts={lamps:0,rooms:0,shared:0,uncontrolled:0};
   const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();return G.S};
   for(const stage of G.STAGES){
    const S=fresh(stage.id),seen=new Set();
    for(const l of S.lamps){if(l.outdoor||l.hearth)continue;counts.lamps++;G.setLayer(l.fl||0);
     if(!l.control){counts.uncontrolled++;continue;}
     const at=l.control;ok(Number.isFinite(at.x)&&Number.isFinite(at.y),'nonfinite switch '+stage.id);
     if(!l.authoredControl){ok(!G.solidAt(at.tx,at.ty),'switch stand blocked '+stage.id);ok((at.nx===1||at.nx===-1||at.ny===1||at.ny===-1)&&((l.fl?G.GF[l.fl]:G.G0)[at.ty+at.ny]?.[at.tx+at.nx]==='#'),'switch has no real wall '+stage.id);}
     const group=G.lampCircuit(l);ok(group.every(o=>(o.fl||0)===(l.fl||0)&&!o.outdoor&&!o.hearth),'circuit crosses physical layers');
     ok(group.every(o=>o.control.x===at.x&&o.control.y===at.y),'one room has competing controls');
     if(!seen.has(l.circuit)){seen.add(l.circuit);counts.rooms++;if(group.length>1)counts.shared++;}
    }
   }
   ok(counts.shared>10,'lights still require individual switches');
   let S=fresh('m2'),P=S.player;S.guards=[];
   let l=S.lamps.find(l=>l.roomSwitch&&G.lampCircuit(l).length>=3&&!l.fl&&Math.hypot(l.x-G.lampControl(l).x,l.y-G.lampControl(l).y)>90),group=G.lampCircuit(l),at=G.lampControl(l);
   const fixture=group.find(o=>Math.hypot(o.x-G.lampControl(o).x,o.y-G.lampControl(o).y)>90);ok(fixture,'no separated fixture');
   Object.assign(P,{x:fixture.x,y:fixture.y,fl:0,z:0,hide:null,under:false,vent:false});G.setLayer(0);
   ok(!G.objectActionValid({k:'lamp',l:fixture,at:{x:P.x,y:P.y}},null),'light pool bypasses physical wall luminaire');
   Object.assign(P,{x:at.x,y:at.y});
   ok(!G.skillOn('electric')&&G.electricalActionAllowed({k:'lamp',l}),'ordinary switch requires training');
   const others=S.lamps.filter(o=>!group.includes(o)).map(o=>[o,o.off]);
   const toggle=()=>{P.interact=null;G.actPrimary({k:'lamp',l,at,viaZ:true});ok(P.interact,'switch work did not start');for(let i=0;i<60&&P.interact;i++){S.t+=.05;G.updatePlayer(.05);}};
   toggle();ok(group.every(o=>o.off),'one switch did not darken its room');ok(others.every(([o,off])=>o.off===off),'switch darkened another room');
   toggle();ok(group.every(o=>!o.off),'room did not turn back on');
   group[1].broken=true;toggle();G.saveCheckpoint();
   for(const o of G.CP.S.lamps)if(!o.outdoor&&!o.hearth){delete o.control;delete o.circuit;delete o.roomSwitch;}
   ok(G.loadCheckpoint(),'legacy checkpoint failed');S=G.S;P=S.player;
   l=S.lamps.find(o=>o.x===l.x&&o.y===l.y&&(o.fl||0)===(l.fl||0));group=G.lampCircuit(l);
   ok(group.length>=3&&group.every(o=>o.off||o.broken)&&group.some(o=>o.broken),'migration loses circuit state or broken bulbs');
   const reactions=[];
   for(const civilian of [false,true]){
    S=fresh('m2');P=S.player;l=S.lamps.find(l=>l.roomSwitch&&G.lampCircuit(l).length>=3&&!l.fl);group=G.lampCircuit(l);at=G.lampControl(l);
    const g=S.guards.find(g=>!g.dog&&!g.target&&!g.child&&!!g.civ===civilian);ok(g,'no actor fixture');
    // Map width belongs to the actual grid; select a reachable floor cell.
    const width=G.G0[0].length;
    const cell=S.lightRooms[l.circuit].cells.map(v=>({x:(v%width)*48+24,y:Math.floor(v/width)*48+24})).find(p=>!G.solidAt(Math.floor(p.x/48),Math.floor(p.y/48))&&Math.hypot(p.x-at.x,p.y-at.y)>65&&Math.hypot(p.x-at.x,p.y-at.y)<150);
    ok(cell,'no repair approach fixture');Object.assign(g,{...cell,fl:0,z:0,state:'PATROL',path:null,relight:null,climb:null,doomed:false,meter:0});
    const upstairs={...g,id:999,fl:1,relight:null};S.guards=[g,upstairs];Object.assign(P,{x:at.x,y:at.y,fl:0,z:0});G.setLayer(0);
    G.actPrimary({k:'lamp',l,at,viaZ:true});for(let i=0;i<60&&P.interact;i++){S.t+=.05;G.updatePlayer(.05);}
    ok(g.relight?.roomNotice&&!upstairs.relight,'room reaction missing or crosses floor');ok(group.every(o=>o.off),'instant remote restoration');
    const start={x:g.x,y:g.y};Object.assign(P,{x:-9999,y:-9999});
    for(let i=0;i<300&&l.off;i++){S.t+=.05;G.updateGuard(g,.05);}
    ok(!l.off&&group.every(o=>!o.off),'actor never restored the room '+civilian);
    ok(Math.hypot(g.x-start.x,g.y-start.y)>10&&Math.hypot(g.x-at.x,g.y-at.y)<36,'repair skipped physical switch approach');
    ok(S.stats.detected===0,'darkness reveals player location');reactions.push(civilian?'resident approaches and restores':'guard approaches and restores');
   }
   return{counts,reactions,basicSwitch:true,sharedPower:true,legacyState:true};
  }''')
  assert not errors,errors
  out=ROOT/'build/lights-v181';out.mkdir(exist_ok=True);(out/'room-switches.json').write_text(json.dumps(report,indent=2));print('PASS',report);await b.close()
asyncio.run(main())
