"""Regression fixtures for location-aware radio, contact clarity and narrow screens.
Scene positions below are inspection fixtures, never native completion claims.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/clarity-v229';O.mkdir(exist_ok=True)
FRESH="""id=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.S.toasts=[];G.update(.001);}"""
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in[False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':680 if mobile else 800},is_mobile=mobile,has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.click('#btnSkillsIntro')
   for branch in['body','assassin','tools']:
    await q.click('#skillBranches [data-branch="'+branch+'"]')
    layout=await q.evaluate("""()=>{const b=document.getElementById('skillBoard');return{visible:[...document.querySelectorAll('.skill-tree')].filter(e=>e.getBoundingClientRect().width).map(e=>e.dataset.branch),overflow:b.scrollWidth-b.clientWidth,nodes:[...document.querySelectorAll('.branch-active .skill-node button')].map(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})}}""")
    assert layout['visible']==([branch]if mobile else['body','assassin','tools']),layout
    if mobile:assert layout['overflow']<=1 and all(layout['nodes']),layout
    assert await q.locator('[data-node]').count()==27
   await q.screenshot(path=str(O/('mobile-skills.png'if mobile else'pc-skills.png')));await q.click('#btnSkillsBack')
   await q.evaluate(FRESH,'e2');await q.wait_for_function('__game.officeReady()')
   phases=[{'name':'wire','x':120,'y':936,'fl':0,'z':0},
    {'name':'pick','x':216,'y':600,'fl':0,'z':0,'pin':True},
    {'name':'enter','x':216,'y':600,'fl':0,'z':0,'open':True},
    {'name':'up:0:2','x':360,'y':600,'fl':0,'z':0},
    {'name':'up:1:2','x':360,'y':600,'fl':1,'z':0},
    {'name':'roofUp','x':360,'y':600,'fl':2,'z':0,'third':True},
    {'name':'gap','x':792,'y':408,'fl':0,'z':3},
    {'name':'roofDown','x':888,'y':408,'fl':0,'z':3,'jumped':True}]
   cues=[]
   for phase in phases:
    await q.wait_for_timeout(800)
    m=await q.evaluate("""p=>{const G=__game,S=G.S,P=S.player;Object.assign(P,{x:p.x,y:p.y,fl:p.fl,z:p.z,moving:false,jump:null,trav:null});if(p.pin){P.got={pin:true};P.picks=1;}if(p.open)S.windows.find(w=>w.tx===5&&w.ty===12).st='open';if(p.third)S.compoundThirdFloor=true;if(p.jumped)S.compoundJumpUsed=true;G.setLayer(p.fl);G.moveCamera(2);G.updateHUD(true);G.syncEpisodeRadio();const g=G.nextGoal();return{step:g.routeStep,message:G.episodeRadioMessage(),shown:document.getElementById('episodeRadioText').textContent,visible:!document.getElementById('episodeRadio').hidden};}""",phase)
    assert m['step']==phase['name'],(phase,m)
    assert m['visible']and m['shown']==m['message']['text'],(phase,m)
    cues.append(m['message']['cue'])
   assert len(set(cues))==len(cues),cues
   assert '옥상문' in m['shown']and '공격'not in m['shown'],m
   await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(O/('mobile-roof.png'if mobile else'pc-roof.png')))
   transient=await q.evaluate("""()=>{const G=__game;G.S.player.jump={};const m=G.episodeRadioMessage();G.syncEpisodeRadio();G.S.player.jump=null;return{message:m,visible:!document.getElementById('episodeRadio').hidden}}""");assert transient=={'message':None,'visible':False},transient
   await q.evaluate(FRESH,'tB');marker=await q.evaluate("""()=>{const G=__game,S=G.S,P=S.player,g={x:P.x+30,y:P.y,fl:0,tut:true,moveCue:true};const movement=G.goalMarkerVisible(P,g);P.bodyAnim={t0:S.t,dur:1};const during=G.goalMarkerVisible(P,g);P.bodyAnim=null;G.feedbackEvent('ko',P);G.feedbackEvent('arrival',P);const settling=G.goalMarkerVisible(P,g);S.t+=.6;const after=G.goalMarkerVisible(P,g),ready=G.goalMarkerVisible(P,{...g,moveCue:false});return{movement,during,settling,after,ready}}""");assert marker=={'movement':True,'during':False,'settling':False,'after':True,'ready':False},marker
   # Reconstruct old furniture cells in a checkpoint. Shared room patches must
   # repair them and move an occupant out of the newly authored solid table.
   for id,old,new in [('m4',[39,5],[39,7]),('m5',[17,5],[17,8])]:
    await q.evaluate(FRESH,id)
    migrated=await q.evaluate("""({old,new:to})=>{const G=__game;G.setLayer(1);const S=G.S,P=S.player,grid=G.GF[1],f=G.FURN.find(f=>f.fl===1&&f.t==='desk2'&&f.x===to[0]&&f.y===to[1]);if(!f)throw Error('missing authored table');for(const g of S.guards.filter(g=>g.fl===1))for(const p of g.route||[])if(G.solidAt(Math.floor(p.x/48),Math.floor(p.y/48)))throw Error('patrol station blocked');grid[to[1]][to[0]]='w';grid[to[1]][to[0]+1]='w';grid[old[1]][old[0]]='K';grid[old[1]][old[0]+1]='K';Object.assign(P,{x:(to[0]+.5)*48,y:(to[1]+.5)*48,fl:1,z:0});G.saveCheckpoint();if(!G.loadCheckpoint())throw Error('checkpoint rejected');G.setLayer(1);return{oldOpen:!G.solidAt(...old),newSolid:G.solidAt(...to),playerClear:!G.solidAt(Math.floor(G.S.player.x/48),Math.floor(G.S.player.y/48)),hp:G.S.player.hp};}""",{'old':old,'new':new})
    assert migrated=={'oldOpen':True,'newSolid':True,'playerClear':True,'hp':3},migrated
   await q.evaluate(FRESH,'p0');finish=await q.evaluate("""()=>{const G=__game,S=G.S,P=S.player,g=S.guards.find(g=>g.tag==='uniformDonor');Object.assign(P,{x:g.x-30,y:g.y,fl:0,z:0});S.koNext=true;G.killGuard(g,'grab');S.t+=2;P.bodyAnim=null;P.strikeT=0;P.killAnim=null;S.koHold=null;const c=S.corpses.find(c=>c.g===g);c.hidden=true;Object.assign(P,{x:c.x-30,y:c.y});const a=G.attackAction(),quiet=G.subduedAction(a),rows=G.encounterRows(P,a,G.grabAction(),G.envAction());G.updateHUD(true);const red=document.getElementById('btnAct').classList.contains('kill');S.keys.KeyZ=true;G.combatPress('KeyZ');const intentional=G.subduedAction(G.attackAction());delete S.keys.KeyZ;G.combatRelease('KeyZ');return{action:a.k,quiet,rows,red,intentional,ko:c.ko}}""")
   assert finish['action']=='finish'and finish['quiet']and not finish['rows']and not finish['red']and not finish['intentional']and finish['ko'],finish
   if mobile:
    await q.evaluate(FRESH,'tB');await q.wait_for_timeout(800);await q.evaluate('__game.syncEpisodeRadio();__game.updateHUD(true);__game.benchDraw(1)');await q.locator('#episodeRadio').wait_for(state='visible')
    layout=await q.locator('#episodeRadio').evaluate('e=>{const r=e.getBoundingClientRect();return{height:r.height,bottom:r.bottom}}');assert layout['height']<85 and layout['bottom']<205,layout
    await q.wait_for_timeout(200);await q.screenshot(path=str(O/'mobile-opening.png'));await q.wait_for_timeout(4300);await q.evaluate('__game.S.player.moving=true;__game.syncEpisodeRadio()');assert await q.locator('#episodeRadio').is_hidden();await q.evaluate('__game.S.player.moving=false');await q.click('#btnRadio');assert await q.locator('#episodeRadio').is_visible(),'radio cannot be replayed'
   assert not errors,errors;rows.append({'mobile':mobile,'radioPhases':len(cues),'marker':marker,'finish':finish,'errors':errors});await q.close()
  await b.close()
 (O/'proof.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS 8 location-aware radio phases, jump interruption, contact/settle markers, subdued intent, mobile branch tabs and folding/replay',flush=True)
asyncio.run(main())
