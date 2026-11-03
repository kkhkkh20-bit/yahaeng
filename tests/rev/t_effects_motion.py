"""Contact VFX follow real commits; chain ghosts and hacking respect cancellation."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v166';O.mkdir(exist_ok=True)
SKILL='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;Object.assign(P,{x:440,y:432,mode:'sneak'});G.input.sneakToggle=true;G.update(.02);S.vfx=[];window.tick=s=>{for(let t=0;t<s-1e-6;t+=.005)G.update(.005)};window.skillReady=()=>{for(let i=0;i<220&&!P.assassinAnim;i++)G.update(.005);if(!P.assassinAnim)throw Error('No prepared skill')};window.toBeat=t=>{while(S.t-P.assassinAnim.t0<t-1e-6)G.update(.005)};}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':960,'height':640});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game.effectAtlas.ready')
  await q.evaluate(SKILL);await q.keyboard.down('b');await q.evaluate('tick(.5)');await q.keyboard.up('b');await q.evaluate('tick(1)');assert await q.evaluate('!__game.S.stats.kills&&!__game.S.vfx.length')
  await q.evaluate(SKILL);await q.keyboard.down('b');await q.evaluate('skillReady();toBeat(.32)')
  assert await q.evaluate('!__game.S.stats.kills&&!__game.S.vfx.length&&__game.assassinAttackFrame(__game.S.player.assassinAnim,10)<3')
  await q.evaluate('toBeat(.35)')
  assert await q.evaluate('''()=>{const G=__game,S=G.S,A=S.player.assassinAnim;return S.stats.kills===1&&S.vfx.length===1&&S.vfx[0].kind==='strike'&&Math.abs(S.vfx[0].t0-A.hits[0])<1e-6&&S.hitStop>0&&G.assassinAttackFrame(A,10)===3}''')
  # Actual frame advancement slows the world and VFX together during contact.
  frozen=await q.evaluate('''()=>{const G=__game,t=G.S.t;G.advanceGameFrame(.016);return G.S.t-t}''');assert 0<frozen<.003,frozen
  await q.evaluate('__game.moveCamera(1);__game.S.fade=0;__game.benchDraw(1)');await q.screenshot(path=str(O/'assassin-contact.png'))
  await q.evaluate('toBeat(.43)');assert await q.evaluate('__game.S.stats.kills===2&&__game.S.vfx.length===2&&__game.S.vfx.every(f=>f.kind==="strike")'), 'each real contact needs exactly one effect'
  await q.evaluate('tick(1)');assert await q.evaluate('!__game.S.vfx.length')
  await q.keyboard.up('b')
  for reduce in [False,True]:
   await q.emulate_media(reduced_motion='reduce'if reduce else'no-preference');await q.evaluate(SKILL)
   await q.evaluate('Object.assign(__game.S,{selectedSkill:"chain",practiceSkill:"chain",tutI:4});Object.assign(__game.S.player,{x:906,y:456})');await q.keyboard.down('b');await q.evaluate('skillReady();toBeat(.75)')
   assert await q.evaluate('__game.S.player.assassinAnim.phase==="move"&&__game.S.stats.kills===1')
   ghosts=await q.evaluate('__game.S.player.assassinAnim.trail||[]');assert (len(ghosts)==0)if reduce else(0<len(ghosts)<=3),ghosts
   if not reduce:
    await q.evaluate('__game.moveCamera(1);__game.S.fade=0;__game.benchDraw(1)');await q.screenshot(path=str(O/'chain-trail.png'))
   await q.evaluate('tick(.4)');assert await q.evaluate('__game.S.player.assassinAnim.phase==="second"')
   await q.evaluate('tick(1)');await q.keyboard.up('b');assert await q.evaluate('__game.S.stats.chainAssassinations===1&&!__game.S.player.assassinAnim')
  await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tE'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,c=S.cams[0];Object.assign(P,{x:c.x-80,y:c.y,a:0});S.guards=[];S.vfx=[];window.hackCam=c;window.deviceTick=s=>{for(let t=0;t<s-1e-6;t+=.01){S.t+=.01;G.updatePlayer(.01);G.updateSkillDevices()}};}''')
  assert await q.evaluate('__game.actHack()');await q.evaluate('deviceTick(.7);__game.S.player.hurtT=.1;deviceTick(.01)');assert await q.evaluate('!hackCam.hackedUntil&&!__game.S.vfx.some(f=>f.kind==="hack")')
  await q.evaluate('__game.S.player.hurtT=0');assert await q.evaluate('__game.actHack()');await q.evaluate('deviceTick(1.51)')
  assert await q.evaluate('hackCam.hackedUntil>__game.S.t&&!__game.camOn(hackCam)&&__game.S.vfx.filter(f=>f.kind==="hack").length===1&&!__game.S.vfx.some(f=>f.kind==="dart")')
  await q.evaluate('__game.moveCamera(1);__game.S.fade=0;__game.benchDraw(1)');await q.screenshot(path=str(O/'hack-complete.png'))
  await q.evaluate('deviceTick(.5);__game.updateEffects()');assert await q.evaluate('!__game.S.vfx.some(f=>f.kind==="hack")')
  assert not errors,errors;(O/'effects-checks.json').write_text(json.dumps({'cancelledSkillHasNoVfx':True,'oneEffectPerContact':True,'sharedHitStop':True,'physicalChainGhosts':True,'reducedMotion':True,'cancelledHackHasNoVfx':True,'completedHackOnce':True,'errors':errors},indent=2));await b.close();print('PASS contact timing, shared freeze, bounded chain ghosts, reduced motion, cancelled/completed hack')
asyncio.run(main())
