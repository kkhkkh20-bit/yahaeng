"""Actual side-facade window states at PC and portrait sizes; no traversal rules altered."""
import asyncio,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for before in [True,False]:
   if before and not (R/'build/sidewindow-before.html').exists():continue
   for mobile in [False,True]:
    page=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,device_scale_factor=2 if mobile else 1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');file='sidewindow-before.html'if before else'preview_city.html';await page.goto(f'http://127.0.0.1:{server.server_port}/build/{file}?nostats&tone=ink');await page.wait_for_function('!!__game')
    info=await page.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;S.guards=[];S.cams=[];S.facOn=false;G.update(.01);S.fade=0;const w=S.windows.find(w=>{const B=G.BLD[G.bldAt(w.tx,w.ty)];return B&&w.tx===B.x0&&G.winVert(w)&&!G.solidAt(w.tx-1,w.ty);});if(!w)throw Error('no actual west-facing window');window.winCase=w;Object.assign(S.player,{x:w.x-65,y:w.y+62,fl:0,z:0,a:Math.PI,mode:'walk',hidden:false,hide:null});G.setLayer(0);G.moveCamera(1);return{window:[w.tx,w.ty],building:G.bldAt(w.tx,w.ty),side:true};}''')
    for state in ['lock','open','bar']:
     await page.evaluate('(state)=>{winCase.st=state;__game.benchDraw(2)}',state);await page.screenshot(path=str(O/f'window-{"before"if before else"after"}-{"touch"if mobile else"pc"}-{state}.png'))
     clip=await page.evaluate('(()=>{const G=__game,w=winCase,x=(w.x-21-G.cam.x)*G.SCALE+innerWidth/2,y=(w.y-G.cam.y)*G.SCALE+innerHeight/2;return{x:Math.max(0,x-32),y:Math.max(0,y-38),width:64,height:76}})()');await page.screenshot(path=str(O/f'window-detail-{"before"if before else"after"}-{"touch"if mobile else"pc"}-{state}.png'),clip=clip)
    assert not errors,errors;results.append({'before':before,'mobile':mobile,**info,'states':['lock','open','bar']});await page.close()
  await b.close()
 (O/'side-windows.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS window states',results,flush=True);server.shutdown()
if __name__=='__main__':asyncio.run(main())
