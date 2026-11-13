"""Free mode: kill methods and the home basement.
- How a villain went down is recorded (gun, bare hands, car, ...); non-gun methods pay a bonus, new methods count up.
- Knock out a villain, load him into a trunk, drive home and drag him down to the basement; pressure him
  (talk, fists, water, tools) to 100% and he talks (hidden cash, or the real killer's description from an innocent suspect);
  then finish him in the basement (bonus), dump him blindfolded, or tie him up outside the police box."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.skNext=1e9;
  for(const g of S.guards)if((g.fac&&!g.civ)||g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player,e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=true;return e;};
  window.DLGX=()=>{for(let i=0;i<20&&G.DLG.modal;i++)G.advanceDialog();};
  window.PICK=n=>{const b=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes(n));if(b){b.click();return true;}return false;};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        # 처리 방식: 총으로 쏘면 '총'(보너스 0), 맨손이면 '맨손'(+20)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.wanted=0;const e=EV('animal');const g=e.g;e.dog.x+=900;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;const ST=G.STAGE;P.x=(ST.roadsX[2]+6)*48;P.y=(ST.roadsY[2]+2)*48+24;g.x=P.x+90;g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];P.a=0;S.vehicles=S.vehicles.filter(v=>Math.hypot(v.x-P.x,v.y-P.y)>400);for(const o of S.guards)if(o!==g&&o.state!=='DEAD'&&Math.hypot(o.x-P.x,o.y-P.y)<500){o.x+=5000;o.route=[{x:o.x,y:o.y,pause:999}];}S.guns={pistol:5};S.wpn='pistol';S.gunT=0;
          for(let k=0;k<5&&g.state!=='DEAD';k++){S.gunT=0;g.x=P.x+90;g.y=P.y-10;G.actAttack();tick(.4);}window.AMMO=S.guns.pistol;window.AA=JSON.stringify(G.attackAction().k);tick(1.5);const how1=G.events.killHowOf(g),dead1=g.state;S.ev=null;tick(2.5);
          const f=EV('animal');const c0=S.cash;G.killGuard(f.g);tick(3);return{ammo:window.AMMO,aa:window.AA,ammo2:S.guns.pistol,how1,dead1,how2:G.events.killHowOf(f.g),methods:G.events.methods,paid:S.cash-c0,banner:(document.getElementById('evBanner')||{}).textContent}}''')
        print('methods', json.dumps(r, ensure_ascii=False))
        ok(r['how1'] == 'gun' and r['how2'] == 'melee' and r['methods'].get('gun') == 1 and r['methods'].get('melee') == 1 and r['paid'] == 50, 'methods: %s' % r)
        # 지하실: 기절 → 트렁크 → 집 → 심문 → 돈 → 처리
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events;S.ev=null;S.wanted=0;const home=S.safes[0];const e=EV('gongal');const g=e.thugs[1];
          G.killGuard(g);tick(.3);const c=S.corpses.find(o=>o.g===g);const ko=!!(c&&c.ko);
          const v=G.traffic.makeVehicle({type:'sedan',x:home.x+60,y:home.y+40,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);v.trunk=[c];c.stashed=true;c.inTrunk=v;g.keep=true;
          P.x=v.x-Math.cos(v.a)*39-10;P.y=v.y-Math.sin(v.a)*39+8;tick(.1);const a=E.basementAction();const label=a&&a.label;if(a)a.fn();tick(1.8);
          return{ko,label,cellar:!!E.cellar,name:E.cellar&&E.cellar.name,panel:!!document.getElementById('shopPanel')}}''')
        print('cellar open', json.dumps(r, ensure_ascii=False))
        ok(r['ko'] and r['label'] == '지하실로 끌고 내려가기' and r['cellar'] and r['name'] == '공갈단' and r['panel'], 'cellar open: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events;const c0=S.cash;const steps=[];for(const n of ['말로','주먹','물 양동이','공구']){PICK(n);DLGX();steps.push(E.cellar&&E.cellar.press);}
          const told=!!(E.cellar&&E.cellar.told),got=S.cash-c0;const opts=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent).join('|');const c1=S.cash;PICK('처리한다');tick(3);
          return{steps,told,got,hasEnd:opts.includes('처리한다')&&opts.includes('버린다')&&opts.includes('경찰서'),end:!E.cellar,bonus:S.cash-c1,basement:E.methods.basement||0}}''')
        print('cellar end', json.dumps(r, ensure_ascii=False))
        ok(r['told'] and r['got'] >= 60 and r['hasEnd'] and r['end'] and r['bonus'] == 100 and r['basement'] == 1, 'cellar end: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
