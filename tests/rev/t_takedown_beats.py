"""Controlled native inputs: earlier recovery, stable paired poses, and complete roof doors.
This isolates timing/rendering; native live-AI journeys are reviewed separately.
"""
import asyncio,ast,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/rhythm-v265';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri()
m=ast.parse((R/'tests/rev/t_recovery_buffer.py').read_text());SETUP=next(ast.literal_eval(n.value)for n in m.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP'for t in n.targets))
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(**({'proxy':{'server':os.environ['HTTPS_PROXY']}}if BASE.startswith('https:')and os.environ.get('HTTPS_PROXY')else{}))
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto(BASE);await q.wait_for_function('!!window.__game&&__game.purchasedReady()&&__game.freeCityReady()',polling=100);await q.wait_for_function('__game.prBench().n>0',polling=100);cdp=await q.context.new_cdp_session(q)
   async def press(key='z',button='btnAct',release=True):
    await q.evaluate('__game.updateHUD(true)')
    if mobile:
     a=await q.locator('#'+button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':a['x']+a['width']/2,'y':a['y']+a['height']/2}]})
     if release:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     await q.keyboard.down(key)
     if release:await q.keyboard.up(key)
   await q.evaluate(SETUP);await press();await q.evaluate('tick(.40)');assert await q.evaluate('!__game.S.corpses.length'),'KO precedes compression'
   await q.evaluate('tick(.04)');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.stats.kills')
   await q.evaluate('tick(.24)');await press('x','btnCarry');assert await q.evaluate("__game.S.player.recoveryQueue?.kind==='dress'"),'lowering press lost the useful uniform'
   await q.evaluate('tick(.19)');assert await q.evaluate("__game.S.player.interact?.a.k==='dress'&&!__game.S.player.killAnim&&!__game.S.player.carrying"),'dress waits for the idle tail or picks another action'
   await q.evaluate(SETUP);await press();await q.evaluate('__game.S.keys.ArrowLeft=true;tick(.90)');moved=await q.evaluate('1584-__game.S.player.x');assert moved>0,'grounded movement still waits a full second'
   await q.evaluate(SETUP);await press(release=False);await q.evaluate('tick(.99)');assert await q.evaluate('!__game.S.stats.kills&&!!__game.S.player.killAnim'),'earlier movement release shortened the lethal guard'
   await q.evaluate('tick(.04)');assert await q.evaluate('__game.S.stats.kills===1'),'deliberate hold did not finish'
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await q.keyboard.up('z')
   await q.evaluate(SETUP);await press('c','btnGrab');await q.evaluate('tick(.6)');await press(release=False);await q.evaluate('tick(.90)');assert await q.evaluate('!!__game.S.player.killAnim&&__game.S.stats.kills===0&&__game.S.corpses[0].hideT>__game.S.t'),'captured hold draws two bodies or releases its pose early'
   await q.evaluate('tick(.14)');assert await q.evaluate('__game.S.stats.kills===1'),'captured hold no longer commits'
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await q.keyboard.up('z')
   visual=await q.evaluate('''()=>{const G=__game;for(const kind of ['choke','stab'])for(const from of [0,1]){let last=-1;for(let i=0;i<=500;i++){const f=G.killKT(kind,i/500,from);if(f+1e-8<last)throw Error('grip scrubs backwards');last=f;}const beat=G.takedownBeats(kind,from);if(Math.abs(G.killKT(kind,beat.contact/beat.dur,from)-1)>.04)throw Error('hands miss the contact beat');if(G.killKT(kind,beat.land/beat.dur,from)!==3)throw Error('landing misses the final lowered pose');}
    let count=0;const directions=new Set(),C=G.ctx,draw=C.drawImage;
    for(const id of ['p0','e2','m2','m4','m6','m7','m5','n1']){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();for(const b of G.BLD)for(const h of b.kitProps||[]){if(h.t!=='sh')continue;const calls=[],before=JSON.stringify(G.S.ladders);C.drawImage=function(...a){calls.push(a);return draw.apply(C,a)};try{if(!G.drawPurchasedRoofHouse(C,h))throw Error('hut missing');}finally{C.drawImage=draw;}if(before!==JSON.stringify(G.S.ladders))throw Error('art changes the stair route');const f=G.purchasedFrame('doorExterior');if(!calls.some(a=>a.length===9&&a[1]===f[0]&&a[2]===f[1]&&a[3]===f[2]&&a[4]===f[3]))throw Error('door source is cut off');const deck=G.purchasedFrame('bridgeDeck');if(calls.some(a=>a[1]===deck[0]&&a[2]===deck[1]))throw Error('bridge floor is still on the roof');directions.add(h.dir);count++;}}
    return{monotoneTracks:4,completeRoofDoors:count,directions:[...directions]};}''')
   assert not errors,errors;row={'mobile':mobile,'earlierStride':moved,**visual,'errors':errors};rows.append(row);print('PASS takedown beats',row,flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
