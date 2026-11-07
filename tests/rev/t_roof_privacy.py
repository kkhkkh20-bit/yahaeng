"""Render fixtures: missing roof textures remain opaque and security desks stay indoors."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/front-end-v210/physical';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1000,'height':850});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  rows=await q.evaluate('''()=>{const G=__game,out=[];
   for(const id of ['tB','p1','p2','e1','e2','e3','e4','e5','m2','m4','m6','m7','m5','n1']){
    G.start(G.STAGES.findIndex(s=>s.id===id),true);const S=G.S;
    for(const b of G.BLD){if(b.vacant)continue;const c=b.roofC,d=c.getContext('2d').getImageData(0,0,c.width,c.rh).data;for(let n=3;n<d.length;n+=4)if(d[n]!==255)throw Error(id+' transparent roof '+n);}
    if(S.camRoom){const c=S.camRoom,grid=G.GF[c.fl]||G.GF[0],tile=G.tileG(c.tx,c.ty);if(['e2','e4','e5','p2'].includes(id)){if(!G.STAGE.camRoom||G.zoneInfo(c.x,c.y,0,c.fl).name==='골목'||!(G.bldAt(c.tx,c.ty)>=0||['h','w','v'].includes(tile)))throw Error(id+' outdoor security '+tile);}}
    if(id==='p2'){const c=S.cams[0],it=S.items[0],at=G.cameraServicePoint(c);if(it.furn!=='desk'||G.cameraSees(c,it.x,it.y,1)<=0)throw Error('camera does not protect the actual document desk');Object.assign(S.player,at);if(!G.cameraCableReachable(c)||G.cameraSees(c,at.x,at.y,1)>0)throw Error('no safe reachable wall service point');}
    out.push({id,roofs:G.BLD.filter(b=>!b.vacant).length,terminal:S.camRoom&&[S.camRoom.tx,S.camRoom.ty,S.camRoom.fl]});
   }
   document.getElementById('brief').hidden=true;G.start(G.STAGES.findIndex(s=>s.id==='tB'));const S=G.S,b=G.BLD[1];S.fade=0;Object.assign(S.player,{x:(b.x0+b.x1+1)*24,y:(b.y0+b.y1+1)*24,z:b.h,fl:0});S.peek=null;G.moveCamera(1);G.benchDraw(2);if(S.openB!==-1||b.ra!==1)throw Error('roof deck opens the room');
   return out;
  }''')
  await q.screenshot(path=str(O/'opaque-depot-roof.png'))
  # Old saved terminal position is repaired without erasing evidence or clear state.
  migration=await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='e4'));G.S.cameraEvidence=true;G.S.camsOff=true;G.S.camRoom={x:216,y:840,tx:4,ty:17,fl:0};G.S.securityTerminalVersion=0;G.saveCheckpoint();if(!G.loadCheckpoint())throw Error('checkpoint');if(G.S.camRoom.ty===17||!G.S.cameraEvidence||!G.S.camsOff)throw Error('terminal migration loses evidence/state');return G.S.camRoom}''')
  assert not errors,errors;await b.close();(O/'results.json').write_text(json.dumps({'roofs':rows,'migration':migration,'errors':errors},indent=2));print('PASS roof opacity and indoor security',rows,migration)
asyncio.run(main())
