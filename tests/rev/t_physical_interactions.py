"""Controlled full-engine scenes, native clothing/carry/pickup input and rendered evidence.
The separate first_steps_live journey uses authored maps, ordinary RAF and active AI.
"""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/physical-v190';O.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch)
   errors=[];q.on('pageerror',lambda err:errors.append(str(err)))
   # Detailed screen text: this test also checks the confirmation toast for stashing an unconscious body.
   await q.add_init_script("localStorage.clear();localStorage.setItem('yahaeng.guide','full');window.requestAnimationFrame=()=>0")
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
   await q.wait_for_function('__game.prBench().n>0',polling=100)
   await q.evaluate("""()=>{const G=__game;
    window.physicalFresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);
     const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);
     for(const key of ['props','corpses','hides','bushes','notes','lamps','bfuses','cams','items','windows','fwindows','doors','ladders','wires','traps'])S[key]=[];
     S.facOn=false;S.t=10;S.fade=0;S.guards=[g];let at; // Isolated player clock does not advance the global entry fade.
     for(let y=12;y<G.MH-3&&!at;y++)for(let x=3;x<G.MW-4;x++){
      if(G.bldAt(x,y)>=0||Math.hypot((x+.5)*48-S.exit.x,(y+.5)*48-S.exit.y)<180)continue;
      if([-1,0,1].every(dy=>[0,1,2].every(dx=>!G.solidAt(x+dx,y+dy)))){at={x:(x+.5)*48,y:(y+.5)*48};break;}
     }
     if(!at)throw Error('no open physical scene');
     Object.assign(P,{...at,fl:0,z:0,a:0,mode:'walk',hidden:false,outfit:null,disguise:null,carrying:null,interact:null,bodyAnim:null,strikeT:0});
     G.input.sneakToggle=false;Object.assign(g,{x:P.x+24,y:P.y,fl:0,z:0,a:0,state:'PATROL',outfit:'crew',stripped:false,strippedLook:null});
     return{S,P,g};
    };
    window.physicalTick=s=>{for(let t=0;t<s-1e-8;t+=.01){G.S.t+=.01;G.updatePlayer(.01);G.runTimers();}G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);};
    window.physicalChoose=k=>{const n=G.envChoices().length;for(let i=0;i<n;i++){if(G.envAction().k===k)return;G.cycleEnv();}throw Error('missing action '+k);};
    const {g}=physicalFresh();G.npcDown(g);physicalChoose('dress');G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);
   }""")
   async def press():
    if touch:await q.tap('#btnCarry')
    else:await q.keyboard.press('x')
   await press();await q.evaluate('physicalTick(2.9)')
   assert await q.evaluate('!__game.S.corpses[0].stripped&&!__game.S.player.outfit')
   await q.evaluate('physicalTick(.2)')
   assert await q.evaluate('__game.S.corpses[0].stripped&&__game.S.guards[0].stripped&&__game.S.player.outfit==="crew"')
   await q.evaluate('''()=>{const G=__game;G.wakeKO(G.S.corpses[0]);G.updateHUD(true);G.benchDraw(1);}''')
   assert await q.evaluate('__game.characterLook(__game.S.guards[0]).startsWith("strip")')
   await q.screenshot(path=str(O/f'{"mobile"if touch else"pc"}-wake.png'))
   await q.evaluate('''()=>{const G=__game;G.npcDown(G.S.guards[0]);if(!G.S.corpses[0].stripped||G.envChoices().some(a=>a.k==='dress'))throw Error('reusable stripped uniform');physicalChoose('carry');G.updateHUD(true);}''')
   await press();await q.evaluate('physicalTick(.35)')
   await q.screenshot(path=str(O/f'{"mobile"if touch else"pc"}-lift.png'))
   await q.evaluate('physicalTick(.2)');assert await q.evaluate('__game.actionBusy()')
   await q.evaluate('physicalTick(.2);physicalChoose("carry");__game.updateHUD(true)')
   assert not await q.evaluate('__game.envChoices().some(a=>a.k==="throwBody")')
   await press();await q.evaluate('physicalTick(.7)')
   assert await q.evaluate('!__game.S.player.carrying&&__game.S.corpses[0].ko&&__game.S.toasts.some(t=>t.text.includes("기절자"))')
   await q.evaluate('''()=>{const {S,P,g}=physicalFresh();g.x=g.y=-9999;window.pickupStart=P.x;window.pickupProp={id:'review',name:'검토 물건',x:P.x+56,y:P.y,fl:0};S.props=[pickupProp];physicalChoose('pickup');__game.updateHUD(true);}''')
   await press();await q.evaluate('physicalTick(.08)')
   assert await q.evaluate('__game.S.player.x>pickupStart&&__game.S.player.x<pickupStart+34&&!pickupProp.taken')
   await q.screenshot(path=str(O/f'{"mobile"if touch else"pc"}-approach.png'))
   await q.evaluate('physicalTick(1)')
   assert await q.evaluate('pickupProp.taken&&__game.S.player.item===pickupProp&&!__game.S.player.interact')
   assert not errors,errors
   print('PASS physical engine',touch,'native clothing, wake and second KO, weighted lift/drop, no body projectiles, physical pickup approach',flush=True)
   await q.close()
  await b.close()
asyncio.run(main())
