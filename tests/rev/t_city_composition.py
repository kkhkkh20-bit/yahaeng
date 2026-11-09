"""Fixed-position camera checks; native mission input is validated separately."""
import asyncio,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 rows=[];out=R/'build/agent-city-v237';out.mkdir(exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(320,568,True),(390,844,True),(844,390,True),(1280,800,False)]:
   q=await b.new_page(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script("requestAnimationFrame=()=>0;localStorage.setItem('yahaeng.zoom3','1.3')")
   await q.goto(f'http://127.0.0.1:{server.server_port}/build/preview_city.html?study=agent-city&nostats');await q.wait_for_function('!!window.__game')
   await q.click('#btnQuick');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}')
   row=await q.evaluate('''touch=>{const G=__game,P=G.S.player,ok=(v,m)=>{if(!v)throw Error(m)},rows=[];
    for(const [x,y,z]of [[12.5,19.5,0],[14.5,18.5,0],[20,10,5]]){
     Object.assign(P,{x:x*48,y:y*48,z,fl:0});G.moveCamera(2);G.updateHUD(true);G.benchDraw(2);
     const sx=(P.x-G.cam.x)*G.SCALE+innerWidth/2,sy=(P.y-G.cam.y)*G.SCALE+innerHeight/2;
     ok(sx>24&&sx<innerWidth-24&&sy>100&&sy<innerHeight-44,'player outside usable viewport');
     if(touch){ok(sy+48<G.touchPlayFrame().bottom,'buttons cover the player');
      if(innerHeight>innerWidth*1.3){ok(sy<innerHeight*.51,'facade displaces play area');ok(innerWidth/G.SCALE>=9.5*48,'too few street tiles visible');}}
     rows.push({position:[x,y,z],screen:[sx,sy],visibleTiles:innerWidth/G.SCALE/48});
    }
    G.setZoom(1.1);ok(localStorage.getItem('yahaeng.zoom3')==='1.3','study overwrote campaign camera');
    ok(localStorage.getItem('yahaeng.study.zoom')==='1.1','study camera preference lost');
    return{viewport:[innerWidth,innerHeight],touch,rows};}''',touch)
   assert not errors,errors;rows.append(row);print('PASS city composition',json.dumps(row),flush=True);await q.close()
  await b.close()
 server.shutdown();server.server_close()
 (out/'composition.json').write_text(json.dumps(rows,indent=2))
asyncio.run(main())
