"""Free-art pilot: physical light positions, circuit perception and save stability."""
import asyncio,json,math
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 art=ROOT/'src/art/room-finish';meta=json.loads((art/'meta.json').read_text())
 assert len(meta)==48
 for key,a in meta.items():
  with Image.open(art/(key+'.webp')) as im:
   assert im.size==(a['w'],a['h']) and im.getbbox(),key
  assert all(math.isfinite(a[k]) for k in ['ox','oy','w','h']),key
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
  await q.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game',polling=100)
  await q.wait_for_function('__game.roomFinishArtReady',polling=100)
  report=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;};
   let S=fresh('m2'),P=S.player;G.setLayer(1);let lamps=G.roomFinishLamps();
   ok(lamps.length===4&&new Set(lamps.map(l=>l.circuit)).size===1,'pilot room circuit');
   const checkPositions=()=>{for(const l of lamps){ok(Math.hypot(l.x-l.fixture.x-l.fixture.nx*8,l.y-l.fixture.y-l.fixture.ny*8)<.01,'emitter detached');ok(!G.solidAt(Math.floor(l.x/48),Math.floor(l.y/48)),'emitter inside wall');ok(l.poly.length===360,'missing occlusion polygon');for(let i=0;i<l.poly.length;i+=2)ok(Math.hypot(l.poly[i]-l.x,l.poly[i+1]-l.y)<=l.r+.01,'light beyond radius');}};
   checkPositions();const count=S.lamps.length,positions=lamps.map(l=>[l.x,l.y,l.finishOrigin.x,l.finishOrigin.y]);
   G.initRoomFinish();lamps=G.roomFinishLamps();checkPositions();ok(JSON.stringify(positions)===JSON.stringify(lamps.map(l=>[l.x,l.y,l.finishOrigin.x,l.finishOrigin.y])),'init drifts emitters');
   const w=S.fwindows.filter(w=>w.roomFinish);ok(w.length===4,'room windows not mapped');
   ok(w.every(w=>G.roomFinishWindowLit(w)),'lit room has dark window');
   const l=lamps[0],at=l.control,others=S.lamps.filter(o=>!lamps.includes(o)).map(o=>[o,o.off]);
   Object.assign(P,{x:at.tx*48+24,y:at.ty*48+24,fl:1,z:0});S.guards=[];
   const points=[[312,456],[216,360],[384,504]],sample=()=>points.map(([x,y])=>G.lightAtG(x,y,1));
   const lit=sample();
   const toggle=()=>{P.interact=null;G.actPrimary({k:'lamp',l,at,viaZ:true});ok(P.interact,'switch action absent');G.updateObjectAction(P,.4);S.t+=1;};
   ok(!G.skillOn('electric'),'fixture starts trained');toggle();const dark=sample();
   ok(lamps.every(o=>o.off),'one switch failed to turn room off');ok(w.every(w=>!G.roomFinishWindowLit(w)),'street lighting keeps room windows glowing');
   ok(others.every(([o,off])=>o.off===off),'adjacent room circuit changed');
   ok(lit.every((v,i)=>v>dark[i]+.15),'real perception unchanged: '+JSON.stringify({lit,dark}));
   // Across the solid east wall, a pilot lamp must not contribute to perception.
   lamps.forEach(o=>o.off=false);S.t+=1;const wallLit=G.lightAtG(456,504,1);lamps.forEach(o=>o.off=true);S.t+=1;const wallDark=G.lightAtG(456,504,1);
   ok(Math.abs(wallLit-wallDark)<.001,'pilot light crosses solid wall');
   lamps[1].broken=true;G.saveCheckpoint();ok(G.loadCheckpoint(),'checkpoint load failed');S=G.S;P=S.player;lamps=G.roomFinishLamps();G.setLayer(1);checkPositions();
   ok(S.lamps.length===count,'checkpoint generated duplicate work lights');ok(lamps.every(o=>o.off)&&lamps.some(o=>o.broken),'checkpoint lost switch/bulb state');
   ok(JSON.stringify(positions)===JSON.stringify(lamps.map(l=>[l.x,l.y,l.finishOrigin.x,l.finishOrigin.y])),'checkpoint moved fixture');
   for(let i=0;i<3;i++){G.saveCheckpoint();ok(G.loadCheckpoint(),'repeat load');}
   ok(G.S.lamps.length===count,'repeated saves duplicate lamps');
   const pilotCount=lamps.length;
   S=fresh('m2');P=S.player;S.fade=0;Object.assign(P,{x:648,y:744,fl:0,z:0});G.setLayer(0);G.setZoom(1);G.cam.x=340;G.cam.y=600;
   const paneSample=()=>{G.benchDraw(40);const dp=G.DPRinfo()[0],x=Math.round(((176-G.cam.x)*G.SCALE+innerWidth/2)*dp),y=Math.round(((600-G.cam.y)*G.SCALE+innerHeight/2)*dp),d=G.ctx.getImageData(x-3,y-3,6,6).data;let v=0;for(let i=0;i<d.length;i+=4)v+=d[i]+d[i+1]+d[i+2];return v/(36*3);};
   const facadeLit=paneSample();G.setLampCircuit(G.roomFinishLamps()[0],true);const facadeDark=paneSample();
   ok(facadeLit>facadeDark+10,'upper window facade ignores room switch: '+JSON.stringify({facadeLit,facadeDark}));
   for(const id of ['t0','e1','m1','m3','m4'])if(G.STAGES.some(s=>s.id===id)){S=fresh(id);ok(!S.roomFinish&&!G.roomFinishLamps().length,'pilot leaks to '+id);}
   return{sprites:48,pilotCount,windows:w.length,lit,dark,wallLit,wallDark,facadeLit,facadeDark,basicSwitch:true,checkpointStable:true,isolated:true};
  }''')
  assert not errors,errors
  out=ROOT/'build/light-room-v201';out.mkdir(parents=True,exist_ok=True);(out/'regression.json').write_text(json.dumps(report,indent=2))
  print('PASS',report);await b.close()
if __name__=='__main__':asyncio.run(main())
