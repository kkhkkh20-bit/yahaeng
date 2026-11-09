"""Native input and normal RAF in one controlled authored-map corner encounter.
Player/one existing guard are positioned; other actors/cameras are removed to
isolate geometry. Skills are purchased through the real tree. Not a mission clear.
"""
import argparse,asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']}if args.url.startswith('https:')else None)
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}))');await q.goto(args.url);await q.wait_for_function('window.__game?.officeReady()',polling=100,timeout=90000)
   await q.click('#btnSkillsIntro');await q.click('#skillBranches [data-branch="assassin"]')
   for skill in ['silentHands','ambush']:
    await q.click(f'[data-select="{skill}"]');await q.click(f'[data-learn="{skill}"]');await q.click('.skill-detail-close')
   assert await q.evaluate('__game.skillBudget()===2&&__game.skillSpent(__game.loadSkillTree())===2');await q.click('#btnSkillsBack')
   setup='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[g];S.cams=[];S.facOn=false;S.corpses=[];S.fade=0;S.alevel=0;Object.assign(P,{x:516,y:204,fl:0,z:0,hide:null,under:null,vent:null,mode:'sneak',hidden:false,outfit:null,carrying:null,trav:null,cover:null});G.setLayer(0);G.enterCover({x:-1,y:0,d:12,kind:'wall'});Object.assign(g,{x:648,y:360,fl:0,z:0,a:0,want:0,state:'PATROL',meter:0,seen:false,post:0,wait:999,route:[{x:648,y:360,pause:999}],ri:0,radio:false,torch:false,act:null,chat:null,follow:null});window.__pullTrace=[];window.__pullTimer=setInterval(()=>{if(S.pull)__pullTrace.push({x:g.x,y:g.y,solid:G.solidAt(Math.floor(g.x/48),Math.floor(g.y/48))});},8);G.moveCamera(1);G.updateHUD(true);}'''
   for lethal in [False,True]:
    await q.evaluate(setup);await q.wait_for_timeout(300)
    if mobile:
     await q.tap('#btnToolNext');await q.tap('#btnWhistle');await q.tap('#btnTool')
    else:await q.keyboard.press('g')
    await q.wait_for_function('__game.S.noises.some(n=>n.src==="whistle"&&n.heard)',timeout=3000)
    await q.wait_for_function('__game.attackAction().k==="pull"',timeout=12000);await q.screenshot(path=str(out/f'{"touch"if mobile else"pc"}-ready-{lethal}.png'))
    before=await q.evaluate('''()=>{const G=__game,g=G.S.guards[0],P=G.S.player;return{x:g.x,y:g.y,seen:g.seen,straight:G.los(P.x,P.y,g.x,g.y),route:G.coverPullRoute(g),heard:G.S.noises.filter(n=>n.src==='whistle').at(-1),hp:P.hp};}''')
    assert not before['straight'] and before['route'] and len(before['route']['points'])==3,before
    if mobile:
     cdp=await q.context.new_cdp_session(q);r=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]});await q.wait_for_timeout(1900 if lethal else 70);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     await q.keyboard.down('z');await q.wait_for_timeout(1900 if lethal else 70);await q.keyboard.up('z')
    await q.wait_for_function('__game.S.guards[0].state==="DEAD"&&!__game.S.pull',timeout=4000);await q.wait_for_timeout(200)
    after=await q.evaluate('''()=>{clearInterval(__pullTimer);const S=__game.S,g=S.guards[0];return{unconscious:!!g.unconscious,hp:S.player.hp,cover:!!S.player.cover,detected:S.stats.detected,kills:S.stats.kills,ko:S.stats.ko,trace:__pullTrace};}''')
    assert after['unconscious']!=lethal and after['hp']==before['hp'] and not after['detected'] and after['cover'],after
    assert len(after['trace'])>3 and not any(t['solid']for t in after['trace']),after
    assert not errors,errors;await q.screenshot(path=str(out/f'{"touch"if mobile else"pc"}-end-{lethal}.png'));rows.append({'mobile':mobile,'lethalHold':lethal,'before':before,'after':after,'errors':errors,'method':__doc__});print('PASS native corner',mobile,'held kill'if lethal else'tap KO','bent pull, no wall clipping/damage/detection',flush=True)
   await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8053/build/preview_city.html');a.add_argument('--out',default='build/perception-v252/native-corner');asyncio.run(main(a.parse_args()))
