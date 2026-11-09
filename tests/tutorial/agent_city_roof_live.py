"""Roof-position fixture followed by native bridge crossing and radial hatch descent."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
from compound_live import CompoundControls
async def main(url,out):
 OUT=Path(out);OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for mobile in [False,True]:
   name='mobile'if mobile else'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);await q.goto(url+('&'if'?'in url else'?')+'study=agent-city&nostats');await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}');c=Controls(q,await q.context.new_cdp_session(q),mobile);cc=CompoundControls(q,c,OUT,name)
   # Explicit roof-position fixture only. Real AI/time and native input thereafter.
   ends=await q.evaluate('''()=>{const G=__game,p=G.PLANKS[0],P=G.S.player;Object.assign(P,{x:p.a.x*48+24,y:p.a.y*48+24,z:p.z,fl:0});return{a:p.a,b:p.b,z:p.z}}''');await cc.shot('west-roof')
   await cc.walk(ends['b']['x']*48+24,ends['b']['y']*48+24);assert await q.evaluate('__game.S.player.z')==5;await cc.shot('east-roof')
   await cc.walk(ends['a']['x']*48+24,ends['a']['y']*48+24);assert await q.evaluate('__game.S.player.z')==5;await cc.shot('west-return')
   l=await q.evaluate('''()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==='stair'&&l.tz===5&&G.bldAt(l.tx,l.ty)===0);return{x:l.rx,y:l.ry,door:l.roofDoor}}''');await cc.walk(l['x'],l['y']+40);await c.steer('y',-1)
   await q.wait_for_function('__game.S.player.z===0&&__game.S.player.fl===4&&!__game.actionBusy()',timeout=8000);await c.steer();await cc.shot('roof-descent');(OUT/(name+'.json')).write_text(json.dumps(c.events,ensure_ascii=False,indent=2));print('PASS native bridge and descent',name,flush=True);await q.close()
  await b.close()
parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--out',default='build/agent-city-roof');args=parser.parse_args();asyncio.run(main(args.url,args.out))
