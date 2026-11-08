"""Native running past the authored opening guard: observation cancels stale sound work.
No actor positions, AI states, simulation time or health are overridden.
"""
import argparse,asyncio,json,os,threading
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.async_api import async_playwright
async def main(args):
 O=Path(args.out);O.mkdir(parents=True,exist_ok=True)
 server=None
 if not args.url:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parents[2])))
  threading.Thread(target=server.serve_forever,daemon=True).start();args.url=f'http://127.0.0.1:{server.server_port}/public/'
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']}if args.url.startswith('https:')else None)
  for mobile in ([args.device=='mobile']if args.device else [False,True]):
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errs=[];q.on('pageerror',lambda e:errs.append(str(e)));await q.add_init_script('localStorage.clear()');await q.goto(args.url);await q.wait_for_function('!!__game');await q.click('#btnQuick');await q.wait_for_timeout(450);cdp=await q.context.new_cdp_session(q);rows=[]
   async def state():return await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,g=S.guards[0];return{t:S.t,p:[P.x,P.y],mode:P.mode,moving:P.moving,raw:g.rawSeen,seen:g.seen,state:g.state,why:g.why,hearT:g.hearT||0,poi:g.poi&&[g.poi.x,g.poi.y,g.poi.clue],over:S.over}}''')
   async def drive(dx,dy,axis,goal):
    if mobile:
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*60,'y':520+dy*60,'id':1}]})
    else:await q.keyboard.down('Shift');await q.keyboard.down('ArrowRight'if dx else'ArrowDown')
    try:
     for i in range(100):
      s=await state();rows.append(s)
      if s['p'][axis]>=goal or s['over']:break
      await q.wait_for_timeout(35)
     else:raise AssertionError(('native movement blocked',mobile,s))
    finally:
     if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     else:await q.keyboard.up('Shift');await q.keyboard.up('ArrowRight'if dx else'ArrowDown')
   await drive(0,1,1,584);await drive(1,0,0,615)
   for i in range(20):rows.append(await state());await q.wait_for_timeout(35)
   observed=[r for r in rows if r['raw']];assert observed,('run passed without a visible guard',mobile,rows[-1]);assert any(r['mode']=='run'and r['moving']for r in rows),'no native running'
   bad=[r for r in observed if r['hearT']>0 or r['why']=='heard'and r['poi']and r['poi'][2]=='step'];assert not bad,('seen runner retains stale footstep search',mobile,bad)
   assert not errs,errs
   name='mobile'if mobile else'pc';await q.screenshot(path=str(O/(name+'.png')));report={'device':name,'samples':len(rows),'visibleSamples':len(observed),'staleReactions':bad,'errors':errs,'rows':rows,'method':'normal RAF and authored actors, native keys/CDP touches; read-only state probes'};(O/(name+'.json')).write_text(json.dumps(report,indent=2));reports.append({'device':name,'visibleSamples':len(observed),'samples':len(rows)});print('PASS native run past',reports[-1],flush=True);await q.close()
  await b.close()
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--url');ap.add_argument('--out',default='build/hearing-v220/live');ap.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(ap.parse_args()))
