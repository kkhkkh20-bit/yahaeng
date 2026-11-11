"""Open-city contracts (GTA-style study, ?study=city-xl): phone -> target in the city -> kill pays, knockout does not."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player;
  const p=S.phones.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];P.x=p.x+30;P.y=p.y+10;tick(.1);
  return G.envAction().k}'''
STATE = '''()=>{const G=__game,S=G.S,h=S.hit;G.updateHUD(true);return{cash:S.cash,n:S.hitN,wanted:S.wanted,hit:h?{name:h.name,state:h.g.state,ko:!!h.g.unconscious,escorts:h.escorts.length}:null,summary:document.querySelector('#objectiveSummary').textContent}}'''
BEHIND = '''()=>{const G=__game,S=G.S,P=S.player,g=S.hit.g;S.cams=[];g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.wait=99;for(const e of S.hit.escorts){e.follow=null;e.x=-9000;}
  Object.assign(P,{x:g.x-Math.cos(g.a)*40,y:g.y-Math.sin(g.a)*40,a:g.a,mode:'sneak'});G.input.sneakToggle=true;tick(.1);return G.attackAction().k}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        env = await q.evaluate(SETUP)
        def ok(v, m):
            if not v: bad.append(m)
        ok(env == 'hitPhone', 'phone does not offer a contract: %s' % env)
        await q.keyboard.press('x'); await q.evaluate('tick(.3)')
        s = await q.evaluate(STATE); print('taken', json.dumps(s, ensure_ascii=False))
        ok(s['hit'] and s['hit']['state'] != 'DEAD' and s['hit']['escorts'] >= 1, 'no target with escort spawned')
        ok(s['hit'] and s['hit']['name'] in s['summary'], 'objective panel does not name the target')
        # knockout only: tap attack -> not paid
        ok(await q.evaluate(BEHIND) == 'kill', 'cannot reach the target from behind')
        await q.keyboard.press('z'); await q.evaluate('tick(1.2)')
        s = await q.evaluate(STATE); print('knockout', json.dumps(s, ensure_ascii=False))
        ok(s['cash'] == 0 and s['hit'] and s['hit']['ko'], 'a knockout paid the contract')
        # finish the unconscious target with a long hold
        await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,c=S.corpses.find(c=>c.g===S.hit.g)||S.corpses[S.corpses.length-1];Object.assign(P,{x:c.x-30,y:c.y});tick(.1)}''')
        await q.keyboard.down('z'); await q.evaluate('tick(1.6)'); await q.keyboard.up('z'); await q.evaluate('tick(.6)')
        s = await q.evaluate(STATE); print('finished', json.dumps(s, ensure_ascii=False))
        ok(s['hit'] is None and s['n'] == 1 and s['cash'] == 80, 'quiet kill did not pay 50+30: %s' % s)
        ok('수입 80만' in s['summary'], 'objective panel does not show income')
        await b.close()
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
