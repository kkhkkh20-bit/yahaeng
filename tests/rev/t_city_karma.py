"""Free mode karma (47zt5): choices add up. Robbing and knocking out innocents lowers it, taking down a knife attacker raises it,
someone else's kill does not count, crossing a tier sends a banner and a text from detective Kang, an outlaw gets gang standing
and lower police standing, passers-by react to the player by tier (outlaws make people flee), witnesses report more for outlaws,
and heroes pay less in shops."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,E=G.events;S.copT=1e9;S.evNext={};for(const e of E.list)S.evNext[e.d]=1e9;window.O=E.outlaw();window.K=E.karma();
  window.plain=g=>g.civ&&!g.off&&!g.evt&&!g.staff&&!g.police&&!g.child&&!g.dog&&!g.crew&&!['big','vest','old'].includes(g.body)&&g.state==='PATROL'&&!g.fl&&!(g.z>0);
  window.lone=o=>plain(o)&&!S.guards.some(q=>q!==o&&q.civ&&!q.off&&q.state!=='DEAD'&&Math.hypot(q.x-o.x,q.y-o.y)<120);
  return {k:K.k,name:K.name(),tier:K.tier()}}'''
DEEDS = '''()=>{const G=__game,S=G.S,P=S.player;P.car=null;P.fl=0;P.z=0;G.setLayer(0);const out={};
  const g=S.guards.find(lone);P.x=g.x;P.y=g.y+30;P.a=-Math.PI/2;S.guns=S.guns||{};S.guns.knife=1;S.wpn='knife';const R=Math.random;Math.random=()=>0.01;O.mug(O.mugTarget());Math.random=R;out.mug=K.k;
  const h=S.guards.find(o=>plain(o)&&o!==g);O.down(h,false);K.update();out.ko=K.k;
  const v=S.guards.find(o=>plain(o)&&o!==g&&o!==h);const killer=S.guards.find(o=>o.fac==='B'&&o.state!=='DEAD')||S.guards.find(o=>o.police);K.downBy(v,{x:0,y:0},true);K.update();out.other=K.k;
  const w=S.guards.find(o=>plain(o)&&![g,h,v].includes(o));w.knifeman=true;O.down(w,true);K.update();out.knife=K.k;S.wanted=0;S.wpn=null;return out}'''
OUTLAW = '''()=>{const G=__game,S=G.S,P=S.player;const w0=K.repW(P.x,P.y),st0=Object.assign({},S.stand||{});const b0=document.body.innerText;K.add(-80);const tier=K.tier(),name=K.name();tick(6);
  const st1=Object.assign({},S.stand||{});const w1=K.repW(P.x,P.y);
  let said=null,fled=false;for(let i=0;i<20&&!said;i++){const g=S.guards.filter(lone)[i*3];if(!g)continue;P.x=g.x;P.y=g.y+80;K.sayT=0;K.update();const s=g.say&&(g.say.text||g.say);if(s){said=s;fled=g.state==='PANIC'}}
  return {tier,name,gangUp:(st1.A||0)>(st0.A||0),copDown:(st1.P||0)<(st0.P||0),w0,w1,said,fled}}'''
HERO = '''()=>{const G=__game,S=G.S;const p0=K.price(100);K.add(200);const tier=K.tier(),p1=K.price(100);tick(3);return {tier,name:K.name(),p0,p1,k:K.k}}'''

async def main():
    bad = []
    def ok(c, m):
        if not c: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(SETUP); print('setup', json.dumps(r, ensure_ascii=False)); ok(r['k'] == 0 and r['tier'] == 2, 'start: %s' % r)
        r = await q.evaluate(DEEDS); print('deeds', r)
        ok(r['mug'] == -4 and r['ko'] == -6 and r['other'] == -6 and r['knife'] == -3, 'deeds: %s' % r)
        r = await q.evaluate(OUTLAW); print('outlaw', json.dumps(r, ensure_ascii=False))
        ok(r['tier'] == 4 and r['gangUp'] and r['copDown'] and r['w1'] > r['w0'] and r['said'] and r['fled'], 'outlaw: %s' % r)
        r = await q.evaluate(HERO); print('hero', json.dumps(r, ensure_ascii=False))
        ok(r['tier'] == 0 and r['p1'] < r['p0'] and r['k'] == 100, 'hero: %s' % r)
        st = await q.evaluate("()=>{__game.events.freeStatsPanel();const t=document.getElementById('shopPanel').innerText;[...document.querySelectorAll('#shopPanel button')].pop().click();return t}")
        ok('성향' in st and '동네 영웅' in st, 'stats panel lacks karma: %s' % st[:200])
        ok(not errs, 'page errors: %s' % errs[:3])
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
