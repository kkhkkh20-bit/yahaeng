"""Controlled original-map encounters with normal RAF and native PC/emulated touch.
Positions and objectives are fixtures; other actors/cameras are removed. Not mission clears.
Wall skills are purchased in the real pre-mission tree; no whistle is used.
"""
import argparse,asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if a.url.startswith('https:')else None)
  for mobile in [False,True]:
   name='touch'if mobile else'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}))');await q.goto(a.url);await q.wait_for_function('window.__game?.officeReady()',polling=100,timeout=90000)
   c=Controls(q,await q.context.new_cdp_session(q),mobile)
   await q.click('#btnSkillsIntro');await q.click('#skillBranches [data-branch="assassin"]')
   for skill in ['silentHands','ambush']:
    await q.click(f'[data-select="{skill}"]');await q.click(f'[data-learn="{skill}"]');await q.click('.skill-detail-close')
   await q.click('#btnSkillsBack')
   for lethal in [False,True]:
    await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[g];S.cams=[];S.facOn=false;S.corpses=[];S.fade=0;Object.assign(P,{x:516,y:204,fl:0,z:0,hide:null,under:null,vent:null,mode:'sneak',hidden:false,outfit:null,carrying:null,trav:null,cover:null});G.setLayer(0);G.enterCover({x:-1,y:0,d:12,kind:'wall'});Object.assign(g,{x:660,y:168,fl:0,z:0,a:Math.PI,want:Math.PI,state:'PATROL',meter:0,seen:false,post:null,wait:0,route:[{x:660,y:168,pause:0},{x:480,y:168,pause:999}],routeLine:null,ri:1,path:null,radio:false,torch:false,act:null,chat:null,follow:null});G.moveCamera(1);G.updateHUD(true);}''')
    await q.wait_for_function('__game.attackAction().k==="pull"',timeout=8000)
    before=await q.evaluate('({x:__game.S.guards[0].x,y:__game.S.guards[0].y,noWhistle:!__game.S.noises.some(n=>n.src==="whistle"),hp:__game.S.player.hp})');assert before['x']<650 and before['noWhistle'],before
    await q.screenshot(path=str(out/f'{name}-pass-ready-{lethal}.png'))
    if mobile:
     r=await q.locator('#btnAct').bounding_box();await c.touch('touchStart',2,r['x']+r['width']/2,r['y']+r['height']/2);await q.wait_for_timeout(1120 if lethal else 70);await c.touch('touchEnd',2)
    else:
     await q.keyboard.down('z');await q.wait_for_timeout(1120 if lethal else 70);await q.keyboard.up('z')
    await q.wait_for_function('__game.S.guards[0].state==="DEAD"&&!__game.S.pull',timeout=4000);await q.wait_for_timeout(150)
    after=await q.evaluate('({ko:!!__game.S.guards[0].unconscious,kills:__game.S.stats.kills,cover:!!__game.S.player.cover,hp:__game.S.player.hp,detected:__game.S.stats.detected})');assert after['ko']!=lethal and after['cover']and after['hp']==before['hp']and not after['detected'],after
    await q.screenshot(path=str(out/f'{name}-pass-end-{lethal}.png'));rows.append({'device':name,'lethal':lethal,'before':before,'after':after});print('PASS native passer',name,lethal,flush=True)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.items.forEach(i=>i.got=true);S.corpses=[];G.checkObjective();Object.assign(P,{x:840,y:1162,fl:0,z:0,under:false,hide:null,vent:null,cover:null,trav:null,mode:'walk'});G.moveCamera(1);G.updateHUD(true);}''')
   await q.wait_for_function('__game.envAction().k==="sewerIn"');assert not await q.evaluate('__game.S.over');await c.press('x','#btnCarry');await q.wait_for_function('__game.S.player.under&&!__game.S.player.trav',timeout=5000)
   assert await q.evaluate('__game.nextGoal().y===1272');await q.screenshot(path=str(out/f'{name}-drain.png'))
   await c.steer('y',1)
   for _ in range(100):
    if await q.evaluate('__game.S.player.y>=1254'):break
    await q.wait_for_timeout(35)
   await c.steer();assert await q.evaluate('__game.S.player.y>=1254&&!__game.S.over');await c.press('x','#btnCarry');await q.wait_for_function('__game.S.over&&__game.S.overWin',timeout=5000)
   await q.screenshot(path=str(out/f'{name}-drain-complete.png'));assert not errors,errors;rows.append({'device':name,'physicalDrainEscape':True,'errors':errors});print('PASS native drain',name,flush=True);await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps({'method':__doc__,'cases':rows},ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8055/build/preview_city.html');p.add_argument('--out',default='build/wall-v254/native');asyncio.run(main(p.parse_args()))
