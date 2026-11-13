"""Free mode environmental takedowns: holding a grabbed villain next to a phone booth, a parked car, a wall or the
stream offers a one-press finisher that matches the object; each counts as its own kill method with its own bonus."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.skNext=1e9;
  for(const g of S.guards)if((g.fac&&!g.civ)||g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player,e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=true;return e;};
  /* 악당 하나를 붙잡은 채 (x,y)에 선다 */
  window.HOLD=(x,y)=>{const P=S.player;S.ev=null;const e=EV('animal');const g=e.g;P.car=null;P.x=x;P.y=y;g.x=x+14;g.y=y;g.state='CAPTIVE';g.captT=0;P.captive=g;
    for(const o of S.guards)if(o!==g&&o.state!=='DEAD'&&!o.off&&Math.hypot(o.x-x,o.y-y)<400){o.x+=6000;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;}return g;};
  window.FIN=g=>{const a=G.events.envKillAction();const label=a&&a.label;if(a)a.fn();tick(2);return{label,dead:g.state,how:G.events.killHowOf(g)};};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        out = {}
        out['booth'] = await q.evaluate('''()=>{const S=__game.S;const p=S.phones[0];S.wanted=0;const g=HOLD(p.x+30,p.y+20);return FIN(g)}''')
        out['cardoor'] = await q.evaluate('''()=>{const G=__game,S=G.S,ST=G.STAGE;S.wanted=0;const x=(ST.roadsX[3]+6)*48,y=(ST.roadsY[3]+2)*48+24;S.vehicles=S.vehicles.filter(v=>Math.hypot(v.x-x,v.y-y)>500);
          const v=G.traffic.makeVehicle({type:'sedan',x,y:y,a:0,parked:true});S.vehicles.push(v);const g=HOLD(x,y+40);return FIN(g)}''')
        out['river'] = await q.evaluate('''()=>{const G=__game,S=G.S,R=G.STAGE.river;if(!R)return{label:null,skip:true};S.wanted=0;const g=HOLD((G.STAGE.roadsX[2]+2)*48,(R.y-0.6)*48);const r=FIN(g);
          const c=S.corpses.find(o=>o.g===g);r.sunk=!!(c&&c.stashed);return r}''')
        out['methods'] = await q.evaluate('()=>__game.events.methods')
        print(json.dumps(out, ensure_ascii=False))
        for k, want in [('booth', 'env_booth'), ('cardoor', 'env_cardoor')]:
            r = out[k]; ok(r['label'] and '(처리)' in r['label'] and r['dead'] == 'DEAD' and r['how'] == want, '%s: %s' % (k, r))
        r = out['river']; ok(r.get('skip') or (r['how'] == 'env_river' and r['dead'] == 'DEAD' and r['sunk']), 'river: %s' % r)
        ok(out['methods'] and out['methods'].get('env_booth') == 1, 'methods: %s' % out['methods'])
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
