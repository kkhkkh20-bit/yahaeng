"""Controlled comparison photographs for v138; these are component fixtures, not a mission playthrough."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/feedback-v138';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   tag='touch'if mobile else'pc'
   for before in [True,False]:
    f=R/'build'/('refinement-before-v138.html'if before else'preview_city.html')
    if not f.exists():continue
    page=await b.new_page(viewport={'width':390 if mobile else 1100,'height':844 if mobile else 800},has_touch=mobile);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await page.goto(f.as_uri()+'?nostats&tone=ink');await page.wait_for_function('!!__game')
    await page.evaluate('''()=>{window.fresh=()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;window.base={...S.guards.find(g=>!g.elite&&!g.civ&&!g.target&&!g.dog)};S.guards=[];S.cams=[];S.facOn=false;S.corpses=[];S.decals=[];S.fade=0;G.setLayer(0);return S;};window.advance=t=>{for(let i=0;i<Math.ceil(t/.01);i++)__game.update(.01);};fresh();Object.assign(__game.S.player,{x:21*48+24,y:17*48+24,fl:0,z:0,a:-Math.PI/2});}''')
    async def snap(name):
     await page.evaluate('()=>{const G=__game;G.S.fade=0;G.updateHUD(.01);G.moveCamera(1);G.benchDraw(3)}');await page.wait_for_timeout(150);await page.evaluate('__game.benchDraw(2)');await page.screenshot(path=str(O/f'{name}-{tag}.png'))
    await snap('passage-before'if before else'passage-after')
    await page.evaluate('Object.assign(__game.S.player,{x:13*48+24,y:8*48+24})');await snap('planter-before'if before else'planter-after')
    if not before:
     await page.evaluate('''()=>{const S=fresh(),G=__game,P=S.player,h=S.hides.find(h=>h.type==='box'&&h.tx===22&&h.ty===17);window.bin=h;Object.assign(P,{x:h.x-48,y:h.y,a:0,outfit:'crew',fl:0,z:0});const g={...base,x:P.x+12,y:P.y,a:P.a,fl:0,z:0,state:'CAPTIVE',captT:0,seen:false,target:false,hasKey:null};S.guards=[g];P.captive=g;}''');await snap('captive-outside')
     await page.evaluate('__game.actEnv();advance(1.3)');assert await page.evaluate('!__game.S.player.hide&&!__game.S.corpses[0].stashed&&__game.S.corpses[0].ko');await snap('ko-outside')
     await page.evaluate('__game.actCarry({k:"carry",c:__game.S.corpses[0]});advance(.7)');await snap('body-carry')
     await page.evaluate('__game.actCarry({k:"carry",c:__game.S.player.carrying,h:bin});advance(.85)');await snap('body-storing')
     await page.evaluate('advance(2)');assert await page.evaluate('__game.S.corpses[0].stashed&&!__game.S.player.hide');await snap('body-stored')
     await page.evaluate('''()=>{const S=fresh(),G=__game,P=S.player,h=S.bushes.find(b=>!S.hides.some(h=>Math.hypot(h.x-b.x,h.y-b.y)<100));window.bush=h;Object.assign(P,{x:h.x,y:h.y,fl:0,z:0,a:0,outfit:'crew'});const c={x:P.x,y:P.y,fl:0,z:0,ch:'sam',ko:true,carried:true,stashed:false,light:1};S.corpses=[c];P.carrying=c;G.actCarry({k:'carry',c,h});advance(.5);}''');await snap('bush-storing')
     await page.evaluate('advance(.7)');assert await page.evaluate('__game.S.corpses[0].ko&&__game.S.corpses[0].hidden&&!__game.S.player.hide');await snap('bush-stored')
     await page.evaluate('''()=>{const S=fresh(),G=__game,P=S.player,l=S.lamps.filter(l=>!l.fl&&l.outdoor).reduce((a,b)=>Math.hypot(a.x-1944,a.y-504)<Math.hypot(b.x-1944,b.y-504)?a:b),at=G.lampControl(l);window.lamp=l;Object.assign(P,{x:at.x,y:at.y,fl:0,z:0,outfit:null,a:Math.PI/2});const g={...base,id:610,x:at.x+130,y:at.y,fl:0,z:0,a:Math.PI,want:Math.PI,route:[{x:at.x+130,y:at.y,pause:999}],ri:0,state:'PATROL',wait:999,post:Math.PI,seen:false,torch:false,radio:false,act:null,chat:null,relight:null,follow:null};S.guards=[g];G.actPrimary({k:'lamp',l,at,viaZ:true});for(let i=0;i<40;i++){G.update(.01);if(l.off&&g.relight?.witnessed)break;}if(!g.relight?.witnessed)throw Error('actual lamp witness missing');}''');await snap('light-objection');assert await page.evaluate('__game.SPEECH_R.some(b=>b.text.includes("불 끄지"))'),'visible objection bubble missing'
     await page.evaluate('for(let i=0;i<600&&lamp.off;i++)__game.update(.01)');assert await page.evaluate('!lamp.off');await snap('light-restored')
     await page.evaluate('''()=>{const S=fresh(),G=__game,P=S.player,h=S.hides.find(h=>h.furn&&h.type==='locker'&&!h.fl&&G.bldAt(h.tx,h.ty)===0&&G.searchStandNear(h)),at=G.searchStandNear(h);window.cabinet=h;Object.assign(P,{x:at.x,y:at.y+48,fl:0,z:0,outfit:'crew',a:-Math.PI/2});const g={...base,id:620,x:at.x,y:at.y,fl:0,z:0,state:'PATROL',route:[{x:at.x,y:at.y,pause:999}],ri:0,homeFl:0,wait:999,seen:false,radio:false,torch:false,act:null,chat:null,follow:null,a:-Math.PI/2};S.guards=[g];G.startCheck(g,h,1,1);for(let i=0;i<100;i++){G.update(.01);if(G.inspectionOpen(h)>.7)break;}if(!G.inspectionOpen(h))throw Error('cabinet inspection missing');}''');await snap('cabinet-inspection');assert await page.evaluate('__game.SPEECH_R.some(b=>b.text.includes("확인한다"))'),'visible inspection bubble missing'
    assert not errors,errors;await page.close()
   print('PASS screenshots',tag,flush=True)
  await b.close()
if __name__=='__main__':asyncio.run(main())
