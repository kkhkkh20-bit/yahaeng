"""Actual v157/v158 packages, original map-edge renders with identical camera and live actors."""
import asyncio,argparse,json,subprocess,tarfile,io,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/world-v158';O.mkdir(exist_ok=True)
async def main(label):
 before=O/'before-package'
 if label=='before':
  before.mkdir(exist_ok=True);blob=subprocess.check_output(['git','archive','--format=tar','6121a70','public/index.html','public/version.json','public/assets'],cwd=R)
  with tarfile.open(fileobj=io.BytesIO(blob))as t:t.extractall(before,filter='data')
 folder=before/'public'if label=='before'else R/'public';manifest=json.loads((folder/'version.json').read_text());records=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mode,w,h,touch in [('pc',1440,900,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto('http://127.0.0.1:8001/'+folder.relative_to(R).as_posix()+'/');await q.wait_for_function('!!__game');await q.evaluate('document.fonts.ready');cdp=await q.context.new_cdp_session(q)
   async def start(sid):
    await q.evaluate('''sid=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)if(!G.S.over)G.update(.01)};tick(2)}''',sid)
   async def move(dx,dy,s):
    if touch:
     x=55;y=H0= int(h*.62)if h>500 else int(h*.55)
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*28,'y':y+dy*28,'id':1}]})
    else:await q.keyboard.down(('ArrowRight'if dx>0 else'ArrowLeft')if dx else('ArrowDown'if dy>0 else'ArrowUp'))
    await q.evaluate('s=>tick(s)',s)
    if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up(('ArrowRight'if dx>0 else'ArrowLeft')if dx else('ArrowDown'if dy>0 else'ArrowUp'))
   async def shot(scene,fixture=False):
    await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(2)');await q.wait_for_timeout(100);name=f'{label}-{scene}-{mode}.png';await q.screenshot(path=str(O/name));state=await q.evaluate('''()=>{const G=__game,P=G.S.player;return{at:[P.x,P.y],mode:P.mode,cover:!!P.cover,env:G.envAction().k,attack:G.attackAction().label,goal:G.nextGoal()?.text,alert:G.S.alevel,npcDown:G.S.stats.npcDown||0,hidden:!!P.hidden,sneakToggle:G.input.sneakToggle,manual:!!G.S.goalManual}}''');records.append({'image':name,'viewport':[w,h],'version':manifest['version'],'sourcePackageSha256':manifest['source_sha256'],'imageSha256':hashlib.sha256((O/name).read_bytes()).hexdigest(),'errors':errors[:],'controlledEdgeFixture':fixture,'state':state});print('CAPTURED',name,flush=True)
   await start('m4');await move(1,0,4);await move(0,1,4);await shot('south-east')
   for scene,fx,fy,dx,dy in [('south-west',.5,.5,-1,1),('north-west',.5,.5,-1,-1),('north-east',-.5,.5,1,-1)]:
    await start('m4');await q.evaluate('p=>{const G=__game;Object.assign(G.S.player,{x:p[0]<0?(G.MW+p[0])*48:p[0]*48,y:p[1]*48,z:0,fl:0,hidden:false,mode:"walk"});}',[fx,(await q.evaluate('__game.MH'))-.5 if scene=='south-west'else fy]);await move(dx,0,.5);await move(0,dy,.5);await shot(scene,True)
   assert not errors,errors;await q.close()
  await b.close()
 (O/f'{label}-captures.json').write_text(json.dumps({'method':'Original production renders, fresh4P/seed42. South-east uses native right4/down4 from actual m4 start with liveAI. Other corners explicitly place the player near the edge then use native movement; controlled edge-framing fixtures, not playthroughs. Camera, viewport and game conditions match.','captures':records},ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('label',choices=['before','after']);asyncio.run(main(p.parse_args().label))
