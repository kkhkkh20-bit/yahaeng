"""Controlled vehicle-ownership fixture, followed only by real driving input.
Captures the actual solver, damage and PixelFX on native keyboard/CDP touch.
"""
import argparse,asyncio,json,time,os
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
from browser_support import open_game
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']}if args.url.startswith('https:')and os.environ.get('HTTPS_PROXY')else None)
  for mobile in [False,True]:
   name='mobile'if mobile else'pc';record_start=time.monotonic();video_args={'record_video_dir':str(out/'video'),'record_video_size':{'width':390 if mobile else 1280,'height':844 if mobile else 800}}if args.record else{};q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile,**video_args);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await open_game(q,args.url+('&'if'?'in args.url else'?')+'study=agent-city&nostats');await q.click('#btnQuick');await q.click('#btnBrGo')
   for _ in range(8):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.keyboard.press('Space');await q.wait_for_timeout(100)
   # A selected owned car and a parked obstacle: not a full car-jacking journey.
   await q.evaluate('''()=>{const G=__game,T=G.traffic,S=G.S,a=T.makeVehicle({x:320,y:1152,a:0,d:0,v:0,c:0}),o=T.makeVehicle({x:590,y:1152,a:0,d:0,v:0,c:1,parked:true});S.vehicles=[a,o];S.player.car=a;S.player.x=a.x;S.player.y=a.y;G.moveCamera(2);}''');c=Controls(q,await q.context.new_cdp_session(q),mobile);await q.wait_for_timeout(200);await q.screenshot(path=str(out/(name+'-before.png')))
   drive_at=time.monotonic()-record_start
   await c.steer('x',1)
   try:await q.wait_for_function('!!__game.S.carImpact',timeout=8000,polling=10)
   finally:await c.steer()
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{impact:S.carImpact,cars:S.vehicles.map(v=>({id:v.id,x:v.x,y:v.y,hp:v.hp,v:v.v,overlap:!!G.traffic.carOverlap(v)})),effects:S.vfx?.map(f=>f.kind),time:S.t}}''');assert result['impact']['hit']>175,result;assert all(v['hp']==5 and not v['overlap']for v in result['cars']),result;assert 'impact'in result['effects'];assert not errors,errors
   await q.screenshot(path=str(out/(name+'-impact.png')));await q.wait_for_timeout(550);result['drive_at']=drive_at;(out/(name+'.json')).write_text(json.dumps(result,indent=2));print('PASS native driving impact',name,json.dumps(result),flush=True);video=q.video;await q.close();
   if video:result['video']=await video.path();(out/(name+'.json')).write_text(json.dumps(result,indent=2))
  await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--record',action='store_true');p.add_argument('--out',default='build/agent-city-collision');asyncio.run(main(p.parse_args()))
