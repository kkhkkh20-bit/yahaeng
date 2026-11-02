"""Optional installed Impeccable browser audit of the HUD and selection controls."""
import asyncio,json,socket
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v139';O.mkdir(exist_ok=True)
async def main():
 with socket.socket()as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=[f'--remote-debugging-port={port}','--remote-debugging-address=127.0.0.1']);reports={}
  for name,w,h,touch in [('pc',1280,800,False),('portrait',375,620,True),('landscape',844,390,True),('picker',390,844,True),('empty',390,844,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto('http://127.0.0.1:8001/build/preview_city.html?nostats&tone=ink&audit=hud-'+name);await q.wait_for_function('!!__game');await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.fade=0;G.update(.01);G.updateHUD(true);G.moveCamera(1);G.benchDraw(2);}''')
   if name=='empty':await q.evaluate('__game.S.player.kunai=0;__game.input.tool="kunai";__game.input.padWhistle=false;__game.updateHUD(true)')
   if name=='picker':await q.evaluate('''()=>{const G=__game,P=G.S.player,l=G.S.lamps.find(l=>l.mount?.kind==='pole'),at=G.lampControl(l);Object.assign(P,{x:at.x,y:at.y});G.updateHUD(true);G.toggleEnvPicker();G.updateHUD();}''')
   proc=await asyncio.create_subprocess_exec(str(R/'.agents/skills/impeccable/scripts/impeccable'),'detect','--cdp',str(port),'--target','audit=hud-'+name,'--json',cwd=str(R),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE);stdout,stderr=await asyncio.wait_for(proc.communicate(),timeout=110);assert proc.returncode in [0,2],stderr.decode();reports[name]=json.loads(stdout);await q.screenshot(path=str(O/f'audit-{name}.png'));print(name,proc.returncode,len(reports[name]),stderr.decode()[:150],flush=True);await q.close()
  (O/'impeccable.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));await b.close()
if __name__=='__main__':asyncio.run(main())
