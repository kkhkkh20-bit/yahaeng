"""Free-mode faction standing and faction/police missions: contacts stand in front of the four gang bases and the police
box, give three missions each, missions move standing (own side up, rivals/police down), friendly gangs stop attacking,
hostile gangs attack on sight, hostile contacts refuse work, and hurting a faction's member costs standing."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);const S=G.S;S.cash=0;S.stand={};
  S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;  // no roaming events in this test
  window.GO=f=>{const c=S.contacts[f].g;S.player.car=null;S.player.trav=null;S.player.x=c.x+30;S.player.y=c.y+10;tick(.05);};
  window.PICK=i=>{const b=[...document.querySelectorAll('#shopPanel button')];const t=b.map(x=>x.textContent);if(i!=null&&b[i])b[i].click();return t};
  return Object.keys(S.contacts)}'''
OPEN = '''(f)=>{GO(f);__game.S.wanted=0;const a=__game.events.factionAction();if(!a)return null;a.fn();return {label:a.label,rows:PICK(null)}}'''
ST = '''()=>{const S=__game.S;return {cash:S.cash,stand:Object.assign({},S.stand),job:S.job&&S.job.kind,hit:!!S.hit,wanted:S.wanted}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        def ok(v, m):
            if not v: bad.append(m)
        ev = lambda js, *a: q.evaluate(js, *a)
        c = await ev(SETUP); print('contacts', c); ok(sorted(c) == ['A', 'B', 'C', 'D', 'P'], 'contacts missing: %s' % c)
        # 1) gang D: hit a rival boss
        o = await ev(OPEN, 'D'); print('open D', o); ok(o and len(o['rows']) == 4, 'D contact panel: %s' % o)
        await ev("()=>PICK(0)"); h = await ev("()=>{const S=__game.S;return S.hit&&{fac:S.hit.g.fac,by:S.hit.by}}"); print('hit', h)
        ok(h and h['fac'] != 'D' and h['by'] == 'D', 'D rival hit not started: %s' % h)
        await ev("()=>{const S=__game.S;__game.npcDown(S.hit.g,null,true);tick(.6)}"); s = await ev(ST); print('after hit', s)
        ok(not s['hit'] and s['cash'] >= 250 and s['stand'].get('D') == 8 and s['stand'].get(h['fac']) == -12 and s['stand'].get('P') == -3, 'hit standing/pay: %s' % s)
        # 2) police: arrest (knock out) a gang member
        await ev("()=>{__game.S.wanted=0}"); cash0 = s['cash']; o = await ev(OPEN, 'P'); await ev("()=>PICK(0)")
        h = await ev("()=>{const S=__game.S;return S.hit&&{ko:S.hit.ko,fac:S.hit.g.fac}}"); print('arrest', h)
        await ev("()=>{const S=__game.S;__game.npcDown(S.hit.g,null,false);tick(.6)}"); s = await ev(ST); print('after arrest', s)
        ok(h and h['ko'] and not s['hit'] and s['cash'] == cash0 + 250 and s['stand'].get('P') == 5, 'arrest pay/standing: %s %s' % (h, s))
        # 3) police: stolen car back to the police box
        cash0 = s['cash']; await ev(OPEN, 'P'); await ev("()=>PICK(1)")
        r = await ev("()=>{const S=__game.S,j=S.job,v=j.v,P=S.player;P.trav=null;P.car=v;v.ai=false;v.x=j.drop.x;v.y=j.drop.y;v.v=0;tick(.4);return {done:!S.job,drop:j.drop.label}}"); s = await ev(ST); print('stolen car', r, s)
        ok(r['done'] and r['drop'] == '지구대' and s['cash'] == cash0 + 220 and s['stand'].get('P') == 11, 'stolen car: %s %s' % (r, s))
        await ev("()=>{const S=__game.S;S.player.car=null}")
        # 4) gang C: parcel from their office
        cash0 = s['cash']; c0 = s['stand'].get('C', 0); p0 = s['stand'].get('P', 0); await ev(OPEN, 'C'); await ev("()=>PICK(1)")
        r = await ev("()=>{const S=__game.S,j=S.job,P=S.player;P.trav=null;P.x=j.from.x;P.y=j.from.y;tick(.2);P.x=j.to.x;P.y=j.to.y;tick(.2);return {done:!S.job}}"); s = await ev(ST); print('parcel', r, s)
        ok(r['done'] and s['cash'] >= cash0 + 180 and s['stand'].get('C') - c0 == 5 and s['stand'].get('P') - p0 == -2, 'gang parcel: %s %s' % (r, s))
        # 5) hostile gang attacks on sight, friendly gang calms down
        r = await ev("""()=>{const S=__game.S,P=S.player;S.stand.B=-50;S.stand.C=50;const g=S.guards.find(g=>g.fac==='B'&&!g.civ&&!g.contact&&!g.police&&g.state!=='DEAD'&&g.x>0);
          const k=S.guards.find(g=>g.fac==='C'&&!g.civ&&!g.contact&&!g.police&&!g.hitEscort&&!g.hit&&g.state!=='DEAD'&&g.x>0);
          g.x=P.x+120;g.y=P.y;g.state='PATROL';g.route=[{x:g.x,y:g.y,pause:999}];k.x=P.x-120;k.y=P.y;k.state='ALERT';k.lastSeen={x:P.x,y:P.y,fl:0,z:0};S.facProvoked={};tick(.6);return {hostile:g.state,friendly:k.state}}""")
        print('reactions', r); ok(r['hostile'] == 'ALERT' and r['friendly'] != 'ALERT', 'standing reactions: %s' % r)
        # 6) a hostile contact refuses work
        r = await ev("()=>{const S=__game.S;S.stand.A=-40;return 1}"); o = await ev(OPEN, 'A'); await ev("()=>PICK(0)"); s = await ev(ST); print('refuse', o, s)
        ok(o and len(o['rows']) == 2 and s['job'] is None and not s['hit'], 'hostile contact still gives work: %s %s' % (o, s))
        await ev("()=>{const b=[...document.querySelectorAll('#shopPanel button')].pop();b&&b.click()}")
        # 7) hurting a faction member costs standing
        r = await ev("()=>{const S=__game.S;S.stand.D=8;const g=S.guards.find(g=>g.fac==='D'&&!g.civ&&!g.contact&&g.state!=='DEAD'&&g.x>0);__game.npcDown(g,null,true);const c=S.corpses[S.corpses.length-1];c.byNpc=false;tick(.6);return S.stand.D}"); print('provoke', r)
        ok(r == -2, 'killing a D member did not cost standing: %s' % r)
        # 8) saved with the free-mode progress
        r = await ev("()=>{tick(2.5);const d=JSON.parse(localStorage.getItem('yahaeng.free1')||'null');return d&&d.stand}"); print('saved', r)
        ok(r and r.get('C') == 50 and r.get('P') is not None, 'standing not saved: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
