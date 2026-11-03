"""Real attack inputs stay out of range until the approach skill is bought in the UI."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v152';BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);results=[]
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!__game',timeout=120000)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.child&&!g.dog);for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];S.vehicles=null;S.camRoom=null;S.facOn=false;S.t=10;Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0,mode:'walk',hidden:false});G.setLayer(0);window.guard={...base,id:111,x:P.x+96,y:P.y,fl:0,z:0,a:0,want:0,post:0,still:true,route:null,path:null,glance:0,wait:999,state:'PATROL',target:false,civ:false,dog:false,elite:false,child:false,climb:null,doomed:false,seen:false,meter:0};S.guards=[guard];S.exitOpen=false;window.tick=t=>{for(let n=0;n<t-1e-6;n+=.01)G.update(.01);G.updateHUD(true)};tick(.01);}''')
   async def attack():
    if mobile:await q.tap('#btnAct')
    else:await q.keyboard.press('z')
    await q.evaluate('tick(.9)')
   await attack();assert await q.evaluate('!__game.S.corpses.length&&!__game.S.player.lunge&&__game.S.player.x===33*48'),'Unlearned distant native attack succeeded'
   await q.keyboard.press('k');await q.click('[data-branch="assassin"]');await q.click('[data-select="silentHands"]');await q.click('[data-learn="silentHands"]')
   if mobile:await q.click('.skill-detail-close')
   await q.click('[data-select="reach"]');await q.click('[data-learn="reach"]')
   if mobile:await q.click('.skill-detail-close')
   await q.click('#btnSkillsBack');await q.evaluate('tick(.01)');await attack();await q.evaluate('tick(1.5)');assert await q.evaluate('__game.S.corpses.length===1&&__game.S.corpses[0].ko&&__game.S.player.x>33*48&&__game.S.stats.ko===1'),'Paid approach did not travel and KO';assert not errors,errors
   results.append({'mobile':mobile,'version':await q.evaluate('window.__BUILD_VERSION__'),'nativeInput':'touch attack'if mobile else'keyboard Z','unlearned96pxAttackBlocked':True,'purchases':['silentHands','reach'],'learnedApproachMovedAndKO':True,'fixture':'Isolated guard on a real mission floor; authored gameplay and actual purchase/attack controls','pageErrors':errors});print('PASS','touch'if mobile else'pc',flush=True);await q.close()
  (O/'reach-journey.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
asyncio.run(main())
