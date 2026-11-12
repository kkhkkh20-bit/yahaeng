"""Free-mode jobs from the ringing payphone besides the hit: steal a marked car and park it in the dealer lot (pay drops with
damage), carry a parcel from one shop to another before the clock runs out, and drive a checkpoint race in time.
Each job sets the objective line and the goal marker, pays on success and fails on time-out / a wrecked car."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);const S=G.S;S.cash=0;
  for(const g of S.guards)if(g.fac&&!g.civ&&!g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}  // no gang fights during the test
  return true}'''
# answer the ringing phone nearest to me and take whatever job the cycle hands out (S.jobN picks the kind)
TAKE = '''(n)=>{const G=__game,S=G.S,P=S.player;S.hit=null;S.job=null;S.jobN=n;S.wanted=0;P.car=null;P.trav=null;P.booth=null;
  const p=S.phones.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];P.x=p.x-44;P.y=p.y+6;S.ringPhone=p;S.ringT0=S.t;tick(.1);
  G.actEnv();tick(1.4);const lines=[];while(G.DLG.modal){lines.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();}tick(.8);
  G.updateHUD(true);const j=S.job;return {kind:j&&j.kind,lines:lines.length,goal:document.querySelector('#hud .obj')?.textContent||''}}'''
CAR = '''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic,j=S.job,v=j.v,D=S.dealer;
  const goal0=G.nextGoal?G.nextGoal():null;P.trav=null;P.car=v;v.ai=false;
  const cx=(D.lot[0]+D.lot[2])/2,cy=(D.lot[1]+D.lot[3])/2;v.x=cx;v.y=cy;v.v=0;v.hp=Math.max(1,(v.hpMax||6)-2);tick(.4);
  return {name:j.name,done:!S.job,cash:S.cash,carOut:!P.car}}'''
PARCEL = '''()=>{const G=__game,S=G.S,P=S.player,j=S.job;P.trav=null;P.x=j.from.x;P.y=j.from.y;tick(.2);const got=j.got,left=j.deadline-S.t;
  P.x=j.to.x;P.y=j.to.y;tick(.2);return {got,left:Math.round(left),done:!S.job,cash:S.cash}}'''
PARCEL_LATE = '''()=>{const G=__game,S=G.S,P=S.player,j=S.job;P.trav=null;P.x=j.from.x;P.y=j.from.y;tick(.2);S.t=j.deadline+1;tick(.1);return {failed:!S.job,cash:S.cash}}'''
RACE = '''()=>{const G=__game,S=G.S,P=S.player,j=S.job,T=G.traffic;
  const v=S.vehicles.find(v=>!v.dead&&!v.police&&(v.z||0)<.01);P.trav=null;P.car=v;v.ai=false;
  const walkStart=(()=>{const c=P.car;P.car=null;P.x=j.pts[0].x;P.y=j.pts[0].y;tick(.1);const s=!!j.started;P.car=c;return s})();  // on foot the race does not start
  const marks=[];for(const p of j.pts){v.x=p.x;v.y=p.y;v.v=0;tick(.1);marks.push(j.started?1:0);if(!S.job)break}
  return {walkStart,done:!S.job,cash:S.cash,n:j.pts.length,limit:j.limit}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        def ok(v, m):
            if not v: bad.append(m)
        await q.evaluate(SETUP)
        # 1) steal a car and park it at the dealer
        t = await q.evaluate(TAKE, 1); print('take car', t)
        ok(t['kind'] == 'car' and t['lines'] >= 3 and '훔치기' in t['goal'], 'car job not offered: %s' % t)
        r = await q.evaluate(CAR); print('car', r)
        ok(r['done'] and 0 < r['cash'] < 400 and r['carOut'], 'parking the stolen car did not pay a damage-reduced fee: %s' % r)
        # 2) parcel in time / too late
        t = await q.evaluate(TAKE, 2); print('take parcel', t)
        ok(t['kind'] == 'parcel' and '꾸러미' in t['goal'], 'parcel job not offered: %s' % t)
        cash0 = r['cash']; r = await q.evaluate(PARCEL); print('parcel', r)
        ok(r['got'] and r['left'] > 15 and r['done'] and r['cash'] >= cash0 + 150, 'parcel delivery failed: %s' % r)
        t = await q.evaluate(TAKE, 2); cash0 = r['cash']; r = await q.evaluate(PARCEL_LATE); print('parcel late', r)
        ok(r['failed'] and r['cash'] == cash0, 'a late parcel was not failed: %s' % r)
        # 3) race through the checkpoints in a car
        t = await q.evaluate(TAKE, 3); print('take race', t)
        ok(t['kind'] == 'race' and '출발' in t['goal'], 'race job not offered: %s' % t)
        cash0 = r['cash']; r = await q.evaluate(RACE); print('race', r)
        ok(not r['walkStart'] and r['done'] and r['cash'] == cash0 + 250 and r['n'] >= 4, 'race did not finish and pay: %s' % r)
        # 4) the cycle still begins with a hit
        t = await q.evaluate(TAKE, 0); print('take hit', t)
        ok(t['kind'] is None and '처치' in t['goal'], 'first job is no longer a hit: %s' % t)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
