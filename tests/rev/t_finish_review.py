"""Native attack inputs in controlled scenes; art/UI/search invariants, not campaign clears."""
import asyncio,ast,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/finish-v266';O.mkdir(exist_ok=True)
m=ast.parse((R/'tests/rev/t_recovery_buffer.py').read_text());SETUP=next(ast.literal_eval(n.value)for n in m.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP'for t in n.targets))
async def main():
 count=0
 for path in (R/'build/pr').glob('body_*EndMotion.webp'):
  im=Image.open(path).convert('RGBA');a=im.getchannel('A').point(lambda v:255 if v>40 else 0)
  for y in range(8):
   for x in range(im.width//64):
    box=a.crop((x*64,y*64,(x+1)*64,(y+1)*64)).getbbox();assert box and min(box[:2])>1 and max(box[2:])<63,(path.name,x,y,box);count+=1
 assert count==5640,count
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1240,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100);await q.evaluate('document.fonts.ready');cdp=await q.context.new_cdp_session(q)
   async def scene():
    await q.evaluate(SETUP);await q.evaluate('''async()=>{const G=__game;for(const key of [G.characterLook(G.S.player),G.characterLook(G.S.guards[0])]){const body=key.includes('@')?key.split('@')[1]:G.PR.looks[key]||'key';for(const name of Object.values(G.PR.fluidBodies[body]||{}))await G.prLoadBody(name);}}''')
   async def down():
    await q.evaluate('__game.updateHUD(true)')
    if mobile:
     r=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]})
    else:await q.keyboard.down('z')
   async def up():
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up('z')
   await scene();await down();await up();await q.evaluate('tick(.80)');assert await q.evaluate('__game.S.corpses[0].settled&&__game.corpseRestPose(__game.S.corpses[0]).anim==="rest"')
   await q.evaluate('''()=>{const G=__game,C=G.ctx,draw=C.drawImage;window.bodyDraws=[];C.drawImage=function(...a){bodyDraws.push(a.slice(-4));return draw.apply(C,a)};try{G.drawPlayer(G.S.player)}finally{C.drawImage=draw;}window.beforeRest=bodyDraws[0];}''')
   await q.evaluate('tick(.3)');assert await q.evaluate('!__game.S.player.killAnim&&!__game.S.stats.kills&&__game.S.stats.ko===1')
   await q.evaluate('''()=>{const G=__game,C=G.ctx,draw=C.drawImage;window.bodyDraws=[];C.drawImage=function(...a){bodyDraws.push(a.slice(-4));return draw.apply(C,a)};try{G.drawBody(G.S.corpses[0])}finally{C.drawImage=draw;}if(JSON.stringify(beforeRest)!==JSON.stringify(bodyDraws[0]))throw Error('body jumps when the pair releases');}''')
   await scene();await down();await q.evaluate('tick(.99)');assert await q.evaluate('!__game.S.stats.kills')
   await q.evaluate('tick(.04)');assert await q.evaluate('__game.S.stats.kills===1&&__game.S.player.killAnim.finishAt!=null&&!__game.pairRecoveryReady(__game.S.player)')
   await up();await q.evaluate('__game.S.keys.ArrowLeft=true;tick(.17)');assert await q.evaluate('!__game.S.player.killAnim&&__game.S.player.x<1584&&__game.S.stats.kills===1')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();const at={x:G.S.camRoom.x,y:G.S.camRoom.y,fl:G.S.camRoom.fl||0,z:0};G.startBuildingSearch(at,'A','radio');const inc=G.S.searchIncidents[0];if(!inc.jobs.some(j=>j.kind==='junction')||!inc.jobs.some(j=>j.kind==='entrance'))throw Error('no stair/entrance search');const claimed=inc.jobs.filter(j=>j.claim!=null);if(claimed.length<3||new Set(claimed.map(j=>j.kind)).size<3)throw Error('guards do not divide search roles');const blueprint=JSON.stringify(G.buildingSearchJobs(at,inc.b));G.S.player.x=120;G.S.player.y=120;G.S.player.hidden=true;if(blueprint!==JSON.stringify(G.buildingSearchJobs(at,inc.b)))throw Error('search uses hidden player position');window.searchRoles=claimed.map(j=>j.kind);}''')
   await q.click('#btnPause');await q.click('#btnSkillsPause');await q.evaluate('__game.fitSkillBoard();__game.drawSkillLinks()')
   geometry=await q.evaluate('''()=>{const board=document.getElementById('skillBoard').getBoundingClientRect(),visible=[...document.querySelectorAll('.skill-tree')].filter(t=>t.clientWidth),bad=[];for(const t of visible)for(const n of t.querySelectorAll('.skill-node')){const a=n.getBoundingClientRect(),b=n.querySelector('button').getBoundingClientRect(),label=n.querySelector('.skill-label').getBoundingClientRect();if(b.width<44||b.height<44||label.bottom>board.bottom+1||a.left<board.left-1||a.right>board.right+1)bad.push(n.dataset.node);}return{bad,roles:window.searchRoles};}''');assert not geometry['bad'],geometry
   await q.screenshot(path=str(O/f'skills-{mobile}.png'));assert not errors,errors;rows.append({'mobile':mobile,**geometry,'bodyEndpointStable':True,'distinctLethalFinish':True});print('PASS finish review',rows[-1],flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps({'frames':count,'rows':rows},ensure_ascii=False,indent=2))
asyncio.run(main())
