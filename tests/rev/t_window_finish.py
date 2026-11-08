"""Window state, room-owned light and recessed bought casements; no gameplay mutation."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 meta=json.loads((R/'src/art/office/interiors.json').read_text())
 for k in ['fluorescent','warmLamp']:
  _,_,w,h=meta['frames'][k]['rect'];assert w>=h*3,(k,w,h) # A lamp, not a square wall module.
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.wait_for_timeout(200)
  rows=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},rows=[];
   for(const id of G.LEARNING_ROUTE){
    G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,ws=[...S.windows,...S.fwindows];
    const snap=()=>JSON.stringify(ws.map(w=>[w.tx,w.ty,w.fl,w.st,w.out,w.inn,w.sealed]));const before=snap();
    for(const l of S.lamps)l.off=true;
    ok(ws.every(w=>!G.windowRoomLit(w)),id+' unlit window glows');
    for(const l of S.lamps.filter(l=>l.outdoor))l.off=false;
    ok(ws.every(w=>!G.windowRoomLit(w)),id+' streetlight pretends to be indoor light');
    let circuits=0,illuminated=new Set();
    for(const l of S.lamps.filter(l=>!l.outdoor&&l.circuit)){
     G.setLampCircuit(l,false);const lit=ws.filter(w=>G.windowRoomLit(w));
     ok(lit.every(w=>(w.fl||0)===(l.fl||0)),id+' room glow crosses floor');
     for(const w of lit)illuminated.add(w);if(lit.length)circuits++;
     G.setLampCircuit(l,true);ok(ws.every(w=>!G.windowRoomLit(w)),id+' switched off window keeps glowing');
    }
    ok(illuminated.size>0,id+' no windows respond to indoor circuit');
    const im=G.officeWindowImage({st:'lock'},false),same=G.officeWindowImage({st:'lock'},false),open=G.officeWindowImage({st:'open'},false),bar=G.officeWindowImage({st:'bar'},false),lit=G.officeWindowImage({st:'lock'},true);
    ok(im===same,'redraw allocates another casement');ok(new Set([im,open,bar,lit].map(c=>c.toDataURL())).size===4,'light / opening / bars not visible');
    const px=c=>c.getContext('2d').getImageData(28,12,1,1).data;
    ok(px(open)[0]+px(open)[1]+px(open)[2]<px(im)[0]+px(im)[1]+px(im)[2],'open aperture filled with glass');
    let rotations=0;const c=G.ctx,rotate=c.rotate;c.rotate=(...a)=>{rotations++;return rotate.apply(c,a)};
    try{G.paintOfficeSideWindow({st:'lock'},false,1);G.paintOfficeSideWindow({st:'open'},true,-1);}finally{c.rotate=rotate;}
    ok(rotations===0,'side casement rotates a flat front window');
    ok(snap()===before,id+' window painting changes traversal state');rows.push({id,windows:ws.length,respondingWindows:illuminated.size,circuitCases:circuits});
   }return rows;
  }''')
  assert not errors,errors;await b.close()
 out=R/'build/windows-v231';out.mkdir(exist_ok=True);(out/'checks.json').write_text(json.dumps({'episodes':rows,'errors':errors},indent=2));print('PASS room-owned window light, all window states, cached art, upright side planes and physical-state invariance:',rows,flush=True)
if __name__=='__main__':asyncio.run(main())
