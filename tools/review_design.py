"""Visual fixtures for every registered map and walkable building floor. Not playthrough evidence."""
import asyncio,json,base64,argparse
from pathlib import Path
from playwright.async_api import async_playwright
a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8043/build/preview_city.html');a.add_argument('--out',default='build/design-review');args=a.parse_args();O=Path(args.out);O.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto(args.url);await q.wait_for_function('!!__game');await q.evaluate('document.fonts.ready');await q.screenshot(path=str(O/'title-pc.png'))
  qm=await b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);qm.on('pageerror',lambda e:errors.append(str(e)));await qm.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await qm.goto(args.url);await qm.wait_for_function('!!__game')
  stages=await q.evaluate('__game.STAGES.map(s=>({id:s.id,name:s.name}))');records=[]
  for st in stages:
   sid=st['id'];folder=O/sid;folder.mkdir(exist_ok=True)
   row=await q.evaluate('''id=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.setZoom(1);G.moveCamera(2);G.updateHUD(true);G.benchDraw(3);return {id,name:G.STAGE.name,currentRoute:G.LEARNING_ROUTE.includes(id),buildings:G.BLD.map((b,i)=>({i,name:b.name||b.plateName,h:b.h,vacant:b.vacant})),lamps:G.S.lamps.length,objects:G.FURN.length,start:{x:G.S.player.x,y:G.S.player.y},W:G.MW,H:G.MH}}''',sid)
   await q.wait_for_timeout(180);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(folder/'start-pc.png'))
   data=await q.evaluate('__game.stageMap(960,false).toDataURL()');(folder/'plan.png').write_bytes(base64.b64decode(data.split(',')[1]))
   for bi in row['buildings']:
    if bi.get('vacant'):continue
    for fl in range(max(1,min(bi['h'],5))):
     spot=await q.evaluate('''v=>{const G=__game,b=G.BLD[v.bi];G.setLayer(v.fl);const options=[],cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2;for(let y=b.y0+1;y<b.y1;y++)for(let x=b.x0+1;x<b.x1;x++)if(!G.solidAt(x,y))options.push({x,y,score:Math.hypot(x-cx,y-cy)});options.sort((a,b)=>a.score-b.score);if(!options.length)return null;const at=options[0];Object.assign(G.S.player,{x:at.x*48+24,y:at.y*48+24,fl:v.fl,z:0});G.moveCamera(2);G.updateHUD(true);G.benchDraw(3);return {x:at.x,y:at.y}}''',{'bi':bi['i'],'fl':fl})
     if spot:await q.screenshot(path=str(folder/f'room-{bi["i"]}-{fl}.png'))
   # Actual portrait HUD and world at this stage's default spawn.
   await qm.evaluate("id=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.moveCamera(2);G.updateHUD(true);G.benchDraw(3)}",sid);await qm.screenshot(path=str(folder/'start-mobile.png'));records.append(row);print('AUDITED',sid,len(row['buildings']),flush=True)
  (O/'audit.json').write_text(json.dumps({'stages':records,'errors':errors},ensure_ascii=False,indent=2));assert not errors,errors;await b.close()
asyncio.run(main())
