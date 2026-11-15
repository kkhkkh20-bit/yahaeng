"""Free mode: talking to shop part-timers (47zt3). Near the pharmacist a '말 걸기' action opens a conversation in the shop panel:
a spoken line plus choices (잡담 · 동네 소문 · 물건 사기). Small talk changes the line, a rumour points at something that really
exists in the city and marks it on the map, talking three times makes you a regular (shop prices drop 10%), drawing a weapon
makes the clerk refuse in fear, and that grudge holds when you come back unarmed."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events;S.copT=1e9;S.evNext={};for(const e of E.list)S.evNext[e.d]=1e9;
  const o=S.shops.find(o=>o.name==='약국');const A=G.PLANS[o.b][0].store;P.fl=0;P.z=0;G.setLayer(0);P.car=null;P.x=(A.x0+2.5)*48;P.y=A.y1*48+24;tick(1.2);
  const g=S.guards.find(g=>g.staff==='pharm'&&!g.off);P.x=g.x;P.y=g.y+56;P.moving=false;tick(.2);window.SHOP=o;window.PH=g;
  const a=E.staffChatAction();return {act:a?a.label:null,role:g.staff}}'''
PANEL = '''()=>{const el=document.getElementById('shopPanel');if(!el)return null;const n=el.querySelector('.shopNote');
  return {note:n?n.textContent:'',btns:[...el.querySelectorAll('button')].map(b=>b.textContent),title:el.querySelector('b').textContent}}'''
CLICK = '''(name)=>{const b=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.startsWith(name));if(!b)return false;b.click();return true}'''
CLOSE = '''()=>{const b=[...document.querySelectorAll('#shopPanel button')].pop();if(b)b.click();return !document.getElementById('shopPanel')}'''

async def main():
    bad = []
    def ok(c, m):
        if not c: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(SETUP); print('setup', r)
        ok(r['act'] and r['act'].startswith('말 걸기'), 'no talk action next to the pharmacist: %s' % r)
        await q.evaluate("()=>__game.events.staffChatAction().fn()")
        p0 = await q.evaluate(PANEL); print('open', json.dumps(p0, ensure_ascii=False))
        ok(p0 and p0['note'] and all(any(x.startswith(k) for x in p0['btns']) for k in ['잡담', '동네 소문', '물건 사기', '나가기']), 'conversation panel incomplete: %s' % p0)
        await q.evaluate(CLICK, '잡담'); p1 = await q.evaluate(PANEL)
        ok(p1 and p1['note'] and p1['note'] != p0['note'], 'small talk did not change the line: %s / %s' % (p0 and p0['note'], p1 and p1['note']))
        await q.evaluate(CLICK, '동네 소문'); p2 = await q.evaluate(PANEL)
        rr = await q.evaluate('''()=>{const S=__game.S,r=S.lastRumor;if(!r)return null;const real=r.k==='phone'?(S.phones||[]).some(p=>p.x===r.x&&p.y===r.y):r.k==='dealer'?!!S.dealer2&&S.dealer2.x===r.x&&S.dealer2.y===r.y:r.k==='event'?!!S.ev:r.k==='turf'?(__game.STAGE.zones||[]).length>0:r.k==='landmark'?true:false;
          return {k:r.k,real,wp:!!S.wp&&S.wp.x===r.x&&S.wp.y===r.y}}''')
        print('rumour', json.dumps(p2 and p2['note'], ensure_ascii=False), rr)
        ok(rr and rr['real'] and rr['wp'] and p2['note'] == '“' + (await q.evaluate("()=>__game.S.lastRumor.t")) + '”', 'rumour does not point at something real: %s' % rr)
        ok(await q.evaluate(CLOSE), 'exit does not close the conversation')
        # 단골: 세 번 말 걸면 이 약국 물건이 10% 싸다
        for _ in range(2):
            await q.evaluate("()=>{__game.events.staffChatAction().fn()}"); await q.evaluate(CLOSE)
        d = await q.evaluate("()=>{const E=__game.events;const m=E.staffMem.get(SHOP.b+':0');return {disc:E.staffDiscount(SHOP),talk:m.talk}}")
        await q.evaluate("()=>__game.events.staffChatAction().fn()"); p3 = await q.evaluate(PANEL)
        await q.evaluate(CLICK, '물건 사기'); p4 = await q.evaluate(PANEL)
        print('regular', d, p3 and p3['note'], p4 and p4['title'])
        ok(d['disc'] == 0.9 and d['talk'] >= 3 and p4 and '단골 10%' in p4['title'], 'regular discount missing: %s %s' % (d, p4))
        await q.evaluate(CLOSE)
        # 총을 들고 말 걸면 겁먹고 거절, 총을 내려도 한동안 상대 안 함
        sc = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events;S.guns=S.guns||{};S.guns.pistol=12;S.wpn='pistol';E.staffChatAction().fn();const el=document.getElementById('shopPanel');
          const note=el.querySelector('.shopNote').textContent,btn=[...el.querySelectorAll('button')].map(b=>b.textContent);[...el.querySelectorAll('button')].pop().click();S.wpn=null;
          E.staffChatAction().fn();const el2=document.getElementById('shopPanel');const note2=el2.querySelector('.shopNote').textContent;[...el2.querySelectorAll('button')].pop().click();
          const m=E.staffMem.get(SHOP.b+':0');return {note,btn,note2,threat:m.threat,disc:E.staffDiscount(SHOP)}}''')
        print('scared', json.dumps(sc, ensure_ascii=False))
        ok(sc['threat'] == 1 and not any(x.startswith('잡담') for x in sc['btn']) and sc['note'] != sc['note2'] and sc['disc'] == 1, 'weapon threat not refused: %s' % sc)
        ok(not errs, 'page errors: %s' % errs[:3])
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
