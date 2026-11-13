"""Free mode stage contract (story chapter 3 '그의 차'): one block, three hidden opportunities (car bomb, hanging sign,
smoking corner). Overhearing the target or his escort reveals each one; while he smokes the escort steps away; a poison
dart from behind finishes it as an accident, and the story records how the chapter was done."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  S.story.ch=2;S.story.nextT=0;const P=S.player,p=S.phones.reduce((a,b)=>Math.hypot(b.x-P.x,b.y-P.y)<Math.hypot(a.x-P.x,a.y-P.y)?b:a);P.x=p.x-40;P.y=p.y+4;S.ringPhone=p;S.ringT0=S.t;tick(.05);
  G.events.enterBooth(p);tick(1.2);let k=0;while(G.DLG.modal&&k<40){G.advanceDialog();tick(.05);k++;}tick(1);}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        goal = "(document.querySelector('#hud .obj')||document.getElementById('objective')||{}).textContent||''"
        r = await q.evaluate('''()=>{const S=__game.S,h=S.hit;return h&&{ctr:h.ctr,story:h.story,car:!!h.car,sign:!!h.sign,smoke:!!h.smoke,known:Object.values(h.opp).filter(o=>o.known).length,bombs:S.player.bombs}}''')
        print('start', r)
        ok(r and r['ctr'] == 'stage' and r['story'] == 2 and r['car'] and r['sign'] and r['smoke'] and r['known'] == 0 and r['bombs'] >= 1, 'stage chapter not set up: %s' % r)
        # 표적 곁에서 엿듣기 → 차
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=S.hit,g=h.g;for(const e of h.escorts){e.x=g.x+400;e.y=g.y;}P.x=g.x+60;P.y=g.y+10;tick(6.5);P.x=h.g.x+60;P.y=h.g.y+10;tick(.3);
          return{car:h.opp.car.known,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('car clue', r); ok(r['car'] and '엿들었다' in r['banner'], 'overhearing the target does not reveal the car: %s' % r)
        # 간판 밑을 지나는 경호원 → 간판
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=S.hit,E=G.events,gm=E.signGeometry(h.sign),e=h.escorts[0];e.x=gm.x;e.y=(h.sign.hit[1]+.5)*48;e.state='PATROL';P.x=e.x+80;P.y=e.y+30;tick(.2);return{sign:h.opp.sign.known}}''')
        print('sign clue', r); ok(r['sign'], 'escort under the sign does not reveal it: %s' % r)
        # 담배 자리 → 담배, 경호원 물러남, 등 뒤 독침
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=S.hit,g=h.g,E=G.events;
          const r=g.route,i=r.findIndex(w=>Math.hypot(w.x-h.smoke.x,w.y-h.smoke.y)<5);g.x=h.smoke.x;g.y=h.smoke.y;g.ri=i;g.wait=16;g.path=null;g.state='PATROL';
          for(const e of h.escorts){e.x=g.x+30;e.y=g.y+20;e.state='PATROL';}P.x=g.x-150;P.y=g.y+40;tick(.5);
          const smokeKnown=h.opp.smoke.known;tick(3);const escD=Math.min(...h.escorts.map(e=>Math.hypot(e.x-g.x,e.y-g.y)));
          const c0=(S.fst&&S.fst.ctrDone)||0;P.poison=1;g.a=0;P.x=g.x-30;P.y=g.y;tick(.05);const a=E.poisonAction();const label=a&&a.label;if(a)a.fn();
          let k=0;while(S.hit&&k<900){tick(1/30);k++;}
          return{smokeKnown,escD:Math.round(escD),label,done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||'',ch:S.story.ch,rec:E.STORY_REC,ctr:((S.fst&&S.fst.ctrDone)||0)-c0}}''')
        print('smoke', json.dumps(r, ensure_ascii=False))
        ok(r['smokeKnown'], 'smoking corner not revealed')
        ok(r['escD'] > 120, 'escort does not step away while he smokes: %s' % r['escD'])
        ok(r['label'] and '독침' in r['label'] and r['done'] and r['ch'] == 3, 'poison at the smoking corner did not finish chapter 3: %s' % r)
        ok(r['rec'] and '2' in {str(k) for k in r['rec']} and 'poison' in r['rec'][next(k for k in r['rec'] if str(k) == '2')]['ways'], 'chapter record missing poison: %s' % r['rec'])
        ok(r['ctr'] == 1, 'stage accident bonus not counted as a contract success: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
