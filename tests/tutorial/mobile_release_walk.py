"""Real mobile viewport regression on packaged output; trusted taps and CDP touch.

WebKit checks Safari layout and trusted button taps. Chromium additionally checks
native joystick touch events. Device emulation is not physical iPhone testing.
"""
import argparse, asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    reports=[]
    async with async_playwright() as p:
        for engine in args.engines.split(','):
            opts={}
            if engine=='chromium':opts['executable_path']='/usr/bin/chromium'
            elif os.environ.get('YH_WEBKIT_EXECUTABLE'):opts['executable_path']=os.environ['YH_WEBKIT_EXECUTABLE']
            if args.url.startswith('https:') and os.environ.get('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
            browser=await getattr(p,engine).launch(**opts)
            for width,height in [(390,664),(375,568),(390,600),(844,390)]:
                context=await browser.new_context(**{**p.devices['iPhone 13'],'viewport':{'width':width,'height':height}})
                page=await context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                await page.add_init_script('localStorage.clear()')
                await page.goto(args.url+'?nostats&mobile-release-check',wait_until='domcontentloaded')
                await page.locator('#btnQuick').wait_for(state='visible',timeout=60000)
                metrics=await page.evaluate('''()=>({width:innerWidth,scale:visualViewport.scale,mode:document.compatMode,
                    viewport:[...document.head.querySelectorAll('meta[name=viewport]')].map(e=>e.content)})''')
                assert abs(metrics['width']-width)<2,metrics
                assert abs(metrics['scale']-1)<.01,metrics
                assert metrics['mode']=='CSS1Compat' and len(metrics['viewport'])==1,metrics
                await page.tap('#btnQuick')
                assert await page.evaluate('__game.STAGE.id')=='p0'
                assert await page.evaluate('document.querySelector("#brief").scrollWidth<=innerWidth+1')
                assert await page.locator('#btnBrGo').evaluate('e=>e.getBoundingClientRect().height>=44')
                await page.screenshot(path=str(out/f'{engine}-{width}x{height}-brief.png'))
                await page.tap('#btnBrGo') # Trusted tap scrolls the button into view if needed.
                await page.locator('#hud').wait_for(state='visible')
                controls=['btnCrouch','btnAct','btnCarry','btnGrab','btnTool','btnToolNext']
                boxes=[]
                for name in controls:
                    element=page.locator('#'+name)
                    if not await element.is_visible():continue
                    box=await element.bounding_box();assert box
                    assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,(name,box)
                    boxes.append((name,box))
                for i,(name,a) in enumerate(boxes):
                    for other,b in boxes[i+1:]:
                        assert min(a['x']+a['width'],b['x']+b['width'])<=max(a['x'],b['x'])+1 or min(a['y']+a['height'],b['y']+b['height'])<=max(a['y'],b['y'])+1,(name,other,a,b)
                await page.tap('#btnCrouch');assert await page.evaluate('__game.input.sneakToggle')
                await page.tap('#btnCrouch');assert not await page.evaluate('__game.input.sneakToggle')
                movement=None
                if engine=='chromium':
                    cdp=await context.new_cdp_session(page);before=await page.evaluate('__game.S.player.x')
                    y=height-100
                    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':y}]})
                    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':95,'y':y}]})
                    await page.wait_for_timeout(650)
                    await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    after=await page.evaluate('__game.S.player.x');assert after>before+10,(before,after)
                    movement={'before':before,'after':after}
                # Rotation/browser chrome resizing must leave the HUD tappable.
                await page.set_viewport_size({'width':height,'height':width})
                await page.wait_for_timeout(150)
                await page.tap('#btnPause');assert await page.locator('#pause').is_visible()
                await page.tap('#btnResume');assert not await page.locator('#pause').is_visible()
                await page.set_viewport_size({'width':width,'height':height})
                await page.screenshot(path=str(out/f'{engine}-{width}x{height}-play.png'))
                assert not errors,errors
                row={'engine':engine,'size':[width,height],'metrics':metrics,'controls':boxes,'nativeMovement':movement,'errors':errors}
                reports.append(row);print('PASS',engine,width,height,metrics,'movement',movement,flush=True)
                await context.close()
            await browser.close()
    (out/'report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8032/public/');parser.add_argument('--out',default='build/mobile-v179');parser.add_argument('--engines',default='chromium,webkit')
    asyncio.run(main(parser.parse_args()))
