"""Cancelled gestures and unrelated pointers cannot commit a player's action."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 390, "height": 844}, has_touch=True)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
        await page.goto((ROOT/'build/preview_city.html').as_uri())
        await page.wait_for_function('!!window.__game')
        await page.evaluate('''()=>{
            const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));
            while(G.DLG.modal)G.advanceDialog();
            Object.assign(G.S.player,{x:440,y:432,mode:'sneak'});
            G.input.sneakToggle=true;G.update(.02);
            window.pointer=(type,id,button=0)=>document.getElementById('btnAct').dispatchEvent(
                new PointerEvent(type,{pointerId:id,button,bubbles:true,cancelable:true}));
        }''')
        await page.evaluate("pointer('pointerdown',1,2)")
        assert await page.evaluate('!__game.S.player.skillHold&&!__game.input.pressIds.btnAct')
        await page.evaluate("pointer('pointerdown',1)")
        assert await page.evaluate('!!__game.S.player.skillHold')
        serial = await page.evaluate('__game.input.pressIds.btnAct')
        await page.evaluate("pointer('pointerdown',2);pointer('pointerup',2);pointer('pointerleave',2)")
        assert await page.evaluate('__game.input.pressIds.btnAct') == serial
        assert await page.evaluate('!!__game.S.player.skillHold')
        await page.evaluate("pointer('pointercancel',1)")
        assert await page.evaluate('!__game.S.player.skillHold&&__game.S.corpses.length===0')
        # Clearing for menus/app switching must allow a fresh pointer to own the button.
        await page.evaluate("pointer('pointerdown',3);__game.clearPlayerInput();pointer('pointerdown',4)")
        assert await page.evaluate('!!__game.S.player.skillHold')
        await page.evaluate("pointer('pointerup',3)")
        assert await page.evaluate('!!__game.S.player.skillHold')
        await page.evaluate("pointer('pointercancel',4)")
        # Place a guard at the camera center: normal tap marks it, cancellation does not.
        await page.evaluate('''()=>{
            const G=__game,g=G.S.guards[0];G.S.guards=[g];
            Object.assign(g,{x:G.cam.x,y:G.cam.y+14,fl:0,z:0,state:'PATROL'});
            G.S.player.fl=0;G.S.marked=null;
            window.touch=type=>{
                const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
                const t=new Touch({identifier:91,target:canvas,clientX:r.left+innerWidth/2,clientY:r.top+innerHeight/2});
                canvas.dispatchEvent(new TouchEvent(type,{changedTouches:[t],touches:type==='touchstart'?[t]:[],bubbles:true,cancelable:true}));
            };
            touch('touchstart');touch('touchcancel');
        }''')
        assert await page.evaluate('__game.S.marked===null&&__game.input.joy===null')
        await page.evaluate("touch('touchstart');touch('touchend')")
        assert await page.evaluate('__game.S.marked===__game.S.guards[0]')
        await page.keyboard.press('Escape')
        await page.evaluate("touch('touchstart')")
        assert await page.evaluate('__game.input.joy===null&&document.getElementById("joy").hidden')
        await page.evaluate("touch('touchcancel')")
        assert not errors, errors
        await browser.close()
        print('PASS input boundaries: secondary button, pointer ownership, cancellation, fresh press, tap marking, paused joystick')

asyncio.run(main())
