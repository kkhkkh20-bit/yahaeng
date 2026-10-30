"""Selected opportunity, mission and escape guidance must agree with markers.

Controlled discovery states isolate these rules from NPC movement and combat.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
SKIP = '''()=>{const g=window.__game;for(let i=0;i<50&&g.DLG.modal;i++)g.advanceDialog()}'''
DISCOVER = '''()=>{const g=window.__game,S=g.S;
 S.player.keys.emetic=true;
 const st=S.stories.find(x=>x.d.id==='emetic');st.found=true;st.step=0;
 S.storyTrack='emetic';S.storyT=0;
}'''


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        pg = await browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto((ROOT / 'build/preview_city.html').as_uri() + '?nostats')
        await pg.evaluate("localStorage.setItem('yahaeng.opps','2')")
        await pg.reload()
        await pg.wait_for_function('!!window.__game')

        async def start(index):
            await pg.evaluate('(i)=>window.__game.start(i)', index)
            await pg.evaluate(SKIP)

        async def goal_contains(text):
            await pg.wait_for_function('(text)=>document.querySelector("#objective .goal")?.textContent.includes(text)', arg=text)

        await start(1)
        await pg.evaluate(DISCOVER)
        await goal_contains('약국 진열대')
        goal = await pg.evaluate('window.__game.nextGoal()')
        assert goal['story'] == 'emetic' and (goal['x'], goal['y']) == (16 * 48 + 24, 30 * 48 + 24), goal
        rows = await pg.locator('#objective').inner_text()
        assert rows.count('약국 진열대') == 1, rows

        # Finishing one preparation step changes both the text and marker.
        await pg.evaluate("()=>{const S=window.__game.S;S.player.item={id:'emetic',name:'배탈약'};S.storyT=0}")
        await goal_contains('직원 옷 구하기')
        goal = await pg.evaluate('window.__game.nextGoal()')
        assert (goal['x'], goal['y']) == (32 * 48 + 24, 3 * 48 + 24), goal

        # The last opportunity cycles to no tracking; mission guidance returns.
        await pg.evaluate('window.__game.trackNextStory()')
        await goal_contains('의뢰:')
        assert await pg.evaluate('window.__game.S.storyTrack') is None
        assert not (await pg.evaluate('window.__game.nextGoal()')).get('story')

        # Finishing via another method clears the old plan and completed rows.
        await pg.evaluate('''()=>{const g=window.__game,S=g.S;S.storyTrack='emetic';
          S.guards.filter(q=>q.target).forEach(q=>q.state='DEAD');S.usesDone[0]=true;S.storyT=0;}''')
        await pg.wait_for_function("window.__game.S.stories.find(x=>x.d.id==='emetic').done")
        await goal_contains('의뢰:')
        assert await pg.evaluate('window.__game.S.storyTrack') is None
        assert not await pg.locator('#objective .opp.done').count()

        # A different kill method ends the medicine plan before the ledger is taken.
        await start(1)
        await pg.evaluate(DISCOVER)
        await pg.evaluate('''()=>{const S=window.__game.S;S.guards.filter(q=>q.target).forEach(q=>q.state='DEAD');S.storyT=0;}''')
        await pg.wait_for_function("window.__game.S.stories.find(x=>x.d.id==='emetic').moot")
        await goal_contains('의뢰:')
        assert await pg.evaluate('window.__game.S.storyTrack') is None
        assert not await pg.evaluate("window.__game.S.stories.find(x=>x.d.id==='emetic').done")

        # Escape overrides even a stale tracked story from a saved checkpoint.
        await pg.evaluate('''()=>{const S=window.__game.S,st=S.stories.find(x=>x.d.id==='emetic');
          st.done=false;st.moot=false;st.step=0;S.storyTrack='emetic';S.exitOpen=true;}''')
        await goal_contains('탈출')
        assert (await pg.evaluate('window.__game.nextGoal()')).get('exit')

        # Minimal guidance respects its no-location setting and labels the two roles.
        await pg.evaluate("localStorage.setItem('yahaeng.opps','1m')")
        await pg.reload()
        await start(1)
        await pg.evaluate(DISCOVER)
        await goal_contains('의뢰:')
        await pg.locator('#hud .obj').click()
        await pg.wait_for_function("document.querySelector('#objective').innerText.includes('추적 중: 약한 배')")
        assert not (await pg.evaluate('window.__game.nextGoal()')).get('story')

        await pg.evaluate("localStorage.setItem('yahaeng.opps','2')")
        await pg.reload()
        await start(5)
        await goal_contains('감방에서 나가기')
        await pg.click('#btnPause')
        assert '감방에서 나가기' in await pg.locator('#pzTodo').inner_text()
        await pg.keyboard.press('Escape')

        # A non-positional story must not invent a distance, floor or map arrow.
        await pg.evaluate('''()=>{const g=window.__game,S=g.S,P=S.player;
          P.x=10*48+24;P.y=20*48+24;P.z=0;P.fl=0;P.trav=null;g.setLayer(0);
          S.stories.find(x=>x.d.id==='radio').found=true;S.storyTrack='radio';S.storyT=0;}''')
        await goal_contains('추적:')
        await pg.wait_for_function("window.__game.S.stories.find(x=>x.d.id==='cell').moot")
        goal = await pg.evaluate('window.__game.nextGoal()')
        assert goal['story'] == 'radio' and goal['x'] is None and goal['y'] is None, goal
        text = await pg.locator('#objective .goal').inner_text()
        assert 'NaN' not in text and not text.endswith('m'), text
        await pg.click('#btnPause')
        assert '감방에서 나가기' not in await pg.locator('#pzTodo').inner_text()
        assert not errors, errors
        await browser.close()
    print('guidance: selected steps/markers, untracking, completion, escape, minimal mode and pause completion passed')


asyncio.run(main())
