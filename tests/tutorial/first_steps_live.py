"""Fresh linear tutorial → first assassination → next episode: native input and rendered markers, no stepped clock/state overrides.
Ends with a selected optional rehearsal using the actually purchased build. Known-map developer playback, not a novice usability study.
"""
import argparse, asyncio, json, os, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points

async def main(args):
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    server=None
    if not args.url:
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parents[2])))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        args.url=f'http://127.0.0.1:{server.server_port}/build/preview_city.html'
    reports=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']} if args.url.startswith('https:') else None)
        for mobile in ([args.device=='mobile']if args.device else[False]if args.probe_only else[False,True]):
            name='mobile' if mobile else 'pc'
            video_options={'record_video_dir':str(out/'video'),'record_video_size':{'width':390 if mobile else 1419,'height':844 if mobile else 911}}if os.environ.get('YH_RECORD_VIDEO')=='1'else{}
            video_started=time.monotonic()
            page=await browser.new_page(viewport={'width':390 if mobile else 1419,'height':844 if mobile else 911},has_touch=mobile,is_mobile=mobile,**video_options)
            errors=[];rows=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.add_init_script('localStorage.clear()')
            await open_game(page,args.url+'?nostats&review=first-steps')
            await page.click('#btnQuick')
            cdp=await page.context.new_cdp_session(page)
            await page.evaluate('''()=>{
                window.__goalProbe=null;window.__goalPaint=null;
                const c=__game.ctx,arc=c.arc;
                c.arc=function(x,y,r,...rest){const p=window.__goalProbe;
                    if(p&&__game.S.tutI===p.step&&Math.abs(x-p.x)<.01&&Math.abs(y-p.y)<.01&&r>5&&r<80)
                        window.__goalPaint={step:p.step,at:performance.now(),x,y,r};
                    return arc.call(this,x,y,r,...rest);
                };
            }''')
            async def state():
                return await page.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{stage:G.STAGE.id,step:S.tutI||0,x:P.x,y:P.y,goal:(()=>{const g=G.nextGoal();return g&&Object.fromEntries(['text','where','x','y','fl','tut','moveCue'].map(k=>[k,g[k]]))})(),radio:document.getElementById('episodeRadio').innerText,mode:P.mode,hidden:P.hidden,over:S.over,t:S.t,hp:P.hp,whistle:S.lessonWhistle,uniformPass:!!S.openingPass,stats:S.stats}}''')
            async def snapshot(label,marker=False):
                s=await state()
                if marker:
                    await page.evaluate('s=>{window.__goalProbe={...s.goal,step:s.step};window.__goalPaint=null}',s)
                    await page.wait_for_timeout(130)
                    painted=await page.evaluate('window.__goalPaint')
                    await page.screenshot(path=str(out/f'{name}-{label}.png'))
                    assert painted and painted['step']==s['step'],('movement goal invisible before completion',name,label,s)
                else:
                    await page.screenshot(path=str(out/f'{name}-{label}.png'))
                rows.append({'label':label,'videoSeconds':time.monotonic()-video_started,**s});print('LIVE',name,label,json.dumps(s,ensure_ascii=False),flush=True)
                return s
            async def key(name,on):
                if on:await page.keyboard.down(name)
                else:await page.keyboard.up(name)
            async def joystick(dx=None,dy=None):
                if dx is None:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});return
                await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
                await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+dx,'y':520+dy}]})
            async def move(x=None,y=None):
                for axis,target,pos,neg in [('x',x,'ArrowRight','ArrowLeft'),('y',y,'ArrowDown','ArrowUp')]:
                    if target is None:continue
                    active=None;start=asyncio.get_running_loop().time()
                    try:
                        while True:
                            s=await state();delta=target-s[axis]
                            if abs(delta)<4 or s['over']:break
                            assert asyncio.get_running_loop().time()-start<14,('movement blocked',axis,target,s)
                            direction=1 if delta>0 else -1
                            wanted=pos if direction>0 else neg
                            if active!=wanted:
                                if active:
                                    if mobile:await joystick()
                                    else:await key(active,False)
                                if mobile:await joystick(direction*24 if axis=='x' else 0,direction*24 if axis=='y' else 0)
                                else:await key(wanted,True)
                                active=wanted
                            if mobile and abs(delta)<20:
                                # Short native thumb pulses brake before contact; do
                                # not overshoot the guard while the renderer records.
                                await page.wait_for_timeout(18);await joystick();active=None;await page.wait_for_timeout(60)
                            else:await page.wait_for_timeout(30)
                    finally:
                        if active:
                            if mobile:await joystick()
                            else:await key(active,False)
                    await page.wait_for_timeout(50)
            async def press(key_name,button,lethal=False):
                if key_name=='z':print('ATTACK INPUT',name,await page.evaluate('({p:{x:__game.S.player.x,y:__game.S.player.y,a:__game.S.player.a,mode:__game.S.player.mode,hidden:__game.S.player.hidden},g:{x:__game.S.guards[0].x,y:__game.S.guards[0].y,a:__game.S.guards[0].a,state:__game.S.guards[0].state},action:__game.attackAction().k,pointer:document.querySelector("#btnAct").dataset.pressPointer})'),flush=True)
                if lethal:
                    if mobile:
                        rect=await page.locator(button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]});await page.wait_for_function('__game.targetEliminated(__game.S.guards[0])',timeout=10000,polling=50);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    else:await page.keyboard.down(key_name);await page.wait_for_function('__game.targetEliminated(__game.S.guards[0])',timeout=10000,polling=50);await page.keyboard.up(key_name)
                elif mobile:await page.tap(button)
                else:await page.keyboard.press(key_name)
                await page.wait_for_timeout(90)
            async def route(x,y):
                points=await page.evaluate('''({x,y})=>{const G=__game,P=G.S.player,doors=new Set(G.S.doors.filter(d=>!d.keyLock&&(d.fl||0)===(P.fl||0)).map(d=>d.ty*G.MW+d.tx)),end=Math.floor(y/48)*G.MW+Math.floor(x/48),shafts=new Set(G.S.ladders.filter(l=>(l.bfl||0)===(P.fl||0)).map(l=>l.ty*G.MW+l.tx));return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48),(tx,ty)=>G.solidAt(tx,ty)&&!doors.has(ty*G.MW+tx)||shafts.has(ty*G.MW+tx)&&ty*G.MW+tx!==end).concat([{x,y}])}''',{'x':x,'y':y})
                assert points
                floor=await page.evaluate('__game.S.player.fl||0')
                for point in points:
                    if await page.evaluate('(()=>{const a=__game.envAction();return a.k==="door"&&a.d.locked})()'):await press('x','#btnCarry');await page.wait_for_function('!__game.actionBusy()')
                    await move(x=point['x'],y=point['y'])
                    if await page.evaluate('!!__game.S.openingPass') and not any(r['label']=='uniform-accepted' for r in rows):await snapshot('uniform-accepted')
                    if await page.evaluate('__game.S.player.fl||0')!=floor:break
            async def wait_step(target):
                await page.wait_for_function('n=>__game.S.tutI>=n',arg=target,timeout=6000,polling=50)
            passed=False
            try:
                await snapshot('start',True)
                await move(x=150)
                assert (await state())['step']==0
                await snapshot('near-first-marker',True)
                if args.probe_only:
                    passed=True
                    continue
                # Optional early interaction must retain the actual movement goal.
                lamp=await page.evaluate('''()=>{const l=__game.S.lamps.find(l=>l.outdoor&&!l.pole),p=__game.lampControl(l);return{x:p.x,y:p.y};}''')
                await move(x=lamp['x'],y=lamp['y'])
                if await page.evaluate('__game.envAction().k')!='lamp':
                    await press('Shift+Tab','#btnCycle');await page.locator('[data-env-token^="lamp:"]').first.click()
                await press('x','#btnCarry');await page.wait_for_function('__game.S.lamps.some(l=>l.off)&&!__game.actionBusy()')
                assert (await state())['step']==0,('lamp detour advanced lesson',await state())
                await snapshot('early-lamp-guide');assert '오른쪽 표시' in await page.locator('#objective').inner_text();assert '까마귀' in await page.locator('#episodeRadio').inner_text() and '오른쪽' in await page.locator('#episodeRadioAction').inner_text()
                await move(y=504);await move(x=216);await wait_step(1)
                await press('Control','#btnCrouch');await move(x=360,y=504);await wait_step(2)
                await snapshot('concealed')
                await move(x=464,y=504);await wait_step(3);await snapshot('rear-approach')
                await press('z','#btnAct');await page.wait_for_function('__game.S.guards[0].state==="DEAD"&&!__game.actionBusy()',timeout=6000)
                await wait_step(4);await press('x','#btnCarry');await page.wait_for_function('__game.S.player.outfit==="crew"&&!__game.actionBusy()',timeout=7000);await snapshot('stolen-uniform');await wait_step(5);await press('x','#btnCarry');await page.wait_for_function('!!__game.S.player.carrying&&!__game.actionBusy()',timeout=6000)
                await move(x=360,y=504);await press('x','#btnCarry');await page.wait_for_function('__game.S.corpses[0].hidden&&!__game.actionBusy()',timeout=6000)
                await wait_step(6);await snapshot('body-hidden')
                await press('Control','#btnCrouch')  # Ordinary permitted walking must work in front of the clerk.
                stairs=await page.evaluate('__game.S.lessonLayout')
                await route(stairs['up']['x'],stairs['up']['y'])
                if not await page.evaluate('__game.S.player.fl||0'):await press('x','#btnCarry')
                await page.wait_for_function('__game.S.player.fl===1&&!__game.actionBusy()',timeout=6000);await wait_step(7);await snapshot('dispatch-upstairs')
                if await page.evaluate('!!__game.openingArchiveGuard?.()'):
                    await snapshot('archive-observer')  # Off-screen goals correctly use an edge arrow on portrait screens.
                    await press('Control','#btnCrouch')
                    for _ in range(3):
                        approach=await page.evaluate('__game.openingArchiveApproach()')
                        if not approach.get('via'):break
                        await route(approach['x'],approach['y'])
                    rear=await page.evaluate('__game.openingArchiveRear()');await route(rear['x'],rear['y'])
                    await page.wait_for_function('__game.openingArchiveReady()',timeout=6000)
                    await snapshot('archive-rear')
                    await press('z','#btnAct');await page.wait_for_function('!__game.openingArchiveGuard()&&!__game.actionBusy()',timeout=6000)
                    await snapshot('archive-cleared');assert (await state())['stats']['ko']==2
                    await press('Control','#btnCrouch')
                at=await page.evaluate('__game.S.items[0]');await route(at['x'],at['y']);await press('x','#btnCarry')
                await page.wait_for_function('__game.S.items[0].got&&!__game.actionBusy()',timeout=6000);await wait_step(8)
                await snapshot('dossier-recovered');await route(stairs['down']['x'],stairs['down']['y'])
                if await page.evaluate('__game.S.player.fl||0'):await press('x','#btnCarry')
                await page.wait_for_function('!__game.S.player.fl&&!__game.actionBusy()',timeout=6000);await wait_step(9)
                await route(1416,744)
                await page.locator('#end[data-win="1"]').wait_for(state='visible',timeout=6000)
                assert '첫 에피소드 완료' in await page.locator('#endSkills').inner_text() and '1P' in await page.locator('#endSkills').inner_text()
                s=await snapshot('clear');assert s['hp']==3 and s['stats']['detected']==0 and s['uniformPass'],s
                assert await page.evaluate('__game.skillSpent(__game.loadSkillTree())===0'),'first stage forces a purchase'
                await continue_episode(page)
                await page.wait_for_function('__game.STAGE.id==="p0"')
                # The five cumulative jobs have their own ordinary-RAF PC/touch journey.
                assert await page.locator('#btnBrGo').is_visible()
                assert not errors,errors
                passed=True
            finally:
                if not passed:
                    print('LIVE FAILURE',name,await state(),await page.evaluate('({overlays:[...document.querySelectorAll(".screen:not([hidden])")].map(e=>e.id),keys:__game.S.keys,autoPaused:__game.S.autoPaused,skills:__game.S.skills,exit:__game.S.exit,open:__game.S.exitOpen})'),flush=True)
                    await page.screenshot(path=str(out/f'{name}-failure.png'))
                (out/f'{name}.json').write_text(json.dumps({'passed':passed,'url':args.url,'rows':rows,'errors':errors,'method':__doc__},ensure_ascii=False,indent=2))
                await page.close()
                if video_options:await page.video.save_as(str(out/f'{name}.webm'))
        await browser.close()
    if server:server.shutdown()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--out',default='build/tutorial-v178/live');parser.add_argument('--probe-only',action='store_true');parser.add_argument('--device',choices=['pc','mobile'])
    asyncio.run(main(parser.parse_args()))
