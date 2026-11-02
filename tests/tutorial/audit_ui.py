"""Optional installed Impeccable audit of an active portrait tutorial screen."""
import asyncio,json,socket,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(exist_ok=True)
async def main():
 scene='captive'if '--captive'in sys.argv else'portrait'
 with socket.socket()as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=[f'--remote-debugging-port={port}','--remote-debugging-address=127.0.0.1'])
  page=await b.new_page(viewport={'width':390,'height':844},has_touch=True);await page.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await page.goto('http://127.0.0.1:8001/build/preview_city.html?nostats&tone=ink&audit='+scene);await page.wait_for_function('!!window.__game');await page.click('#btnQuick')
  # A controlled UI state, separate from the no-teleport full tutorial walkthrough.
  await page.evaluate('''()=>{const G=__game,S=G.S;S.tutI=5;S.fade=0;const l=S.lamps[3];l.off=true;Object.assign(S.player,{x:6.5*48,y:10.5*48});G.updateHUD(true);G.moveCamera(1);G.benchDraw(2);}''')
  if scene=='captive':
   await page.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,h=S.hides.find(h=>h.type==='box'&&h.tx===22&&h.ty===17),g=S.guards.find(g=>!g.target&&!g.civ&&!g.elite);S.guards=[g];S.cams=[];S.facOn=false;Object.assign(P,{x:h.x-48,y:h.y,a:0,captive:g,fl:0,z:0});Object.assign(g,{x:P.x+12,y:P.y,a:0,state:'CAPTIVE',captT:0,fl:0,z:0});S.fade=0;G.updateHUD(true);G.moveCamera(1);G.benchDraw(2);}''')
  await page.screenshot(path=str(O/f'impeccable-{scene}.png'))
  proc=await asyncio.create_subprocess_exec(str(R/'.agents/skills/impeccable/scripts/impeccable'),'detect','--cdp',str(port),'--target','audit='+scene,'--json',cwd=str(R),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
  stdout,stderr=await asyncio.wait_for(proc.communicate(),timeout=110)
  (O/('impeccable-captive.json'if scene=='captive'else'impeccable-detect.json')).write_bytes(stdout);(O/f'impeccable-{scene}.stderr.txt').write_bytes(stderr)
  print('Detector exit',proc.returncode,'stdout bytes',len(stdout),'stderr',stderr.decode()[:700],flush=True)
  if proc.returncode not in [0,2]:print(stdout.decode()[:1200],flush=True);raise AssertionError('detector did not complete')
  await b.close()
if __name__=='__main__':asyncio.run(main())
