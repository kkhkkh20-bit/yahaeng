"""Presentation preserves physical openings, opaque roofs and actual locomotion.
Scene placements isolate rendering/navigation rules; full AI routes run separately.
"""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 meta=json.loads((ROOT/'src/art/quarter/meta.json').read_text())
 for key,a in meta.items():
  im=Image.open(ROOT/'src/art/quarter'/f'{key}.webp').convert('RGBA');b=im.getchannel('A').point(lambda a:255 if a>96 else 0).getbbox()
  assert im.size==(a['w'],a['h']) and b and b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,(key,im.size,b)
 print('PASS CC0 model bakes: complete silhouettes and transparent margins',len(meta),flush=True)
 async with async_playwright()as p:
  browser=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,b=G.BLD[1];G.setLayer(0);
    check(Object.values(G.quarterImages).every(a=>a.img.complete&&a.img.naturalWidth>0),'floor cache starts before art decode');
    const before=JSON.stringify({grid:G.G0,doors:S.doors.map(d=>[d.tx,d.ty,d.locked]),ladders:S.ladders.map(l=>[l.bx,l.by,l.rx,l.ry])});
    Object.assign(P,{x:25.5*48,y:16.5*48,a:-Math.PI/2,fl:0,z:0});G.benchDraw(1);check(S.openB===-1,'street reveals whole floor');check(b.quarterRoof?.width>0,'opaque roof missing');
    const pixel=b.quarterRoof.getContext('2d').getImageData(100,100,1,1).data;check(pixel[3]===255,'roof is transparent');
    const win=S.windows.find(w=>w.ty===b.y1&&w.tx>b.x0&&w.tx<b.x1);check(win,'actual front window missing');Object.assign(P,{x:win.x,y:win.y+48,a:-Math.PI/2});G.benchDraw(1);check(S.openB===-1,'window proximity removes roof');P.a=Math.PI/2;G.benchDraw(1);check(S.openB===-1,'looking away reveals room');
    Object.assign(P,{x:28.5*48,y:12.5*48,a:0});for(let n=0;n<20;n++)G.benchDraw(1);check(S.openB===1,'interior fails to open');
    check(before===JSON.stringify({grid:G.G0,doors:S.doors.map(d=>[d.tx,d.ty,d.locked]),ladders:S.ladders.map(l=>[l.bx,l.by,l.rx,l.ry])}),'art modifies collision/openings');
    G.saveCheckpoint();check(G.loadCheckpoint(),'sample save cannot restore');
    // Exercise ordinary movement, then release and press against a wall.
    const T=G.S,Q=T.player;T.guards=[];Object.assign(Q,{x:20.5*48,y:21.5*48,z:0,fl:0,hide:null,under:false,vent:false,cover:null,vx:0,vy:0});G.input.kset='arrow';T.keys.ArrowRight=true;
    for(let i=0;i<30;i++){T.t+=.02;G.updatePlayer(.02);}check(Q.x>21*48&&Q.gaitTime>0&&Q.travelSpeed>6,'ordinary walking has no measured gait');T.keys={};for(let i=0;i<20;i++){T.t+=.02;G.updatePlayer(.02);}const phase=Q.gaitTime;for(let i=0;i<50;i++){T.t+=.02;G.updatePlayer(.02);}check(Q.gaitTime===phase&&Q.travelSpeed===0,'idle keeps stepping');
    let cell=null;for(let y=2;y<G.MH-2&&!cell;y++)for(let x=2;x<G.MW-2;x++)if(!G.solidAt(x,y)&&G.solidAt(x+1,y)&&G.solidAt(x,y-1)&&G.solidAt(x,y+1)){cell=[x,y];break;}
    check(cell,'blocked corridor fixture');Object.assign(Q,{x:cell[0]*48+35,y:cell[1]*48+24,vx:0,vy:0,cover:null});T.keys.ArrowRight=true;for(let i=0;i<6;i++){T.t+=.02;G.updatePlayer(.02);}check(Q.travelSpeed<1,'blocked player slides through wall');const stopped=Q.gaitTime;for(let i=0;i<4;i++){T.t+=.02;G.updatePlayer(.02);}check(Math.abs(Q.gaitTime-stopped)<.001,'walking animation continues at a wall');T.keys={};
    return{loadedModels:Object.keys(G.quarterImages).length,windowApproach:true,opaqueRoof:true,physicalOpenings:true,save:true,distanceGait:true,blockedIdle:true};
   }''')
   assert not errors,errors;print('PASS sample', 'mobile'if mobile else'PC',r,flush=True);await pg.close()
  await browser.close()
asyncio.run(main())
