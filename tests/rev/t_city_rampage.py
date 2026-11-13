"""Free-mode rampage, pickups and body armour.
- Rampage marks are off: guns are scarce in this city (no rampage play).
- A downed police officer at wanted >= 2 drops pistol ammo; walking over it picks it up.
- The weapon trade sells body armour; armour absorbs a hit instead of health; it is saved."""
import asyncio, sys, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]

async def main():
    bad = []
    def ok(v, m):
        if not v: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.cash=3000;S.stand={};
          for(const g of S.guards)if((g.fac&&!g.civ&&!g.contact)||g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];}}''')
        r = await q.evaluate('()=>(__game.S.rampSpots||[]).length')
        print('spots', r); ok(r == 0, 'rampage marks should be off (guns are scarce): %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;P.x+=400;tick(.1);S.wanted=2;S.guns.pistol=S.guns.pistol??0;/* 권총 주인에게만 떨군다 */const g=S.guards.find(g=>g.police&&!g.contact&&g.state!=='DEAD');if(!g)return {cop:false};g.x=P.x+80;g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];
          G.npcDown(g,null,true);tick(.5);const k=S.pickups.find(k=>k.kind==='ammo');if(!k)return {cop:true,drop:false};const a0=S.guns.pistol||0;P.x=k.x;P.y=k.y;tick(.2);return {cop:true,drop:true,got:(S.guns.pistol||0)-a0,left:S.pickups.length}}''')
        print('drop', r); ok(r.get('drop') and r['got'] > 0, 'police ammo drop: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,c=S.contacts.D;S.wanted=0;P.x=c.g.x+30;P.y=c.g.y+10;tick(.05);G.events.openContact('D');
          [...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('무기 거래')).click();
          const ab=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('방탄조끼'));if(!ab)return {row:false};const c0=S.cash;ab.click();
          document.querySelector('#shopPanel button:last-child').click();const arm=P.armor;P.hurtT=0;const hp=P.hp;G.events.hurtPlayer(null,'test');
          return {row:true,arm,paid:c0-S.cash,hp0:hp,hp1:P.hp,arm1:P.armor,chip:(document.querySelector('#wpnChip [title^="방탄조끼"]')||{}).title||''}}''')
        print('armor', r); ok(r.get('row') and r['arm'] == 3 and r['paid'] == 400 and r['hp1'] == r['hp0'] and r['arm1'] == 2 and r['chip'] == '방탄조끼 2', 'armour: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S;G.events.saveFreeProgress(true);const d=JSON.parse(localStorage.getItem('yahaeng.free1')||'{}');return {armor:d.armor,ramp:d.ramp,pistol:d.guns&&d.guns.pistol}}''')
        print('save', r); ok(r['armor'] == 2, 'save: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
