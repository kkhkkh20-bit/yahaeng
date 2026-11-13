"""Free-mode drive-by and gang shootouts.
- In a car with a gun, [공격] shoots out of the window at the nearest person in any direction (no honk); without a gun it honks.
- A shootout spawns two rival gangs (3 each) off screen; their gunmen shoot each other until one side is down.
- If I only drop the losing side, the winner's standing goes up, the loser's down, and I get paid.
- Shooting a gang member with a gun now counts against that gang's standing (like a melee kill)."""
import asyncio, sys
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
        await q.add_init_script('window.__seed=11;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.cash=1000;S.stand={};S.warNext=1e9;
          for(const g of S.guards)if((g.fac&&!g.civ&&!g.contact)||g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];}
          window.CIV=(dx,dy)=>{const P=S.player,g=S.guards.find(g=>g.civ&&g.state!=='DEAD'&&!g.off&&!g.used);g.used=1;g.x=P.x+dx;g.y=P.y+dy;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;return g};}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ST=G.STAGE;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;
          const v=G.traffic.makeVehicle({type:'sedan',x:P.x,y:P.y,a:0,parked:true});S.vehicles.push(v);G.traffic.carEnter?G.traffic.carEnter(v):(P.car=v);tick(1.5);
          const inCar=!!P.car;const label0=G.attackAction?G.attackAction().label:null;S.guns={pistol:10};S.wpn='pistol';const label1=G.attackAction?G.attackAction().label:null;
          const g=CIV(-160,10);G.actAttack();tick(.4);return {inCar,label0,label1,dead:g.state,ammo:S.guns.pistol}}''')
        print('driveby', r); ok(r['inCar'] and r['dead'] == 'DEAD' and r['ammo'] == 9, 'drive-by: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const c=P.car;if(c){P.car=null;c.parked=true;c.x-=400;}tick(.3);
          const ok=G.events.warStart();const W=S.war;if(!ok||!W)return {start:false};const n=[W.sides[0].length,W.sides[1].length];
          let t=0;while(t<60&&!W.over){tick(.5);t+=.5;}const alive=W.sides.map(sd=>sd.filter(g=>g.state!=='DEAD').length);
          return {start:true,n,over:!!W.over,alive,shots:t}}''')
        print('war', r); ok(r.get('start') and r['n'] == [3, 3] and r['over'] and min(r['alive']) == 0, 'gang shootout: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;for(let k=0;k<200&&S.war;k++)tick(1);const cleared=!S.war;S.stand={};S.wanted=0;S.alevel=0;for(const g of S.guards)if(g.police&&!g.contact&&g.state!=='DEAD'){g.x=-9000;g.y=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;g.state='PATROL';}const ST=G.STAGE;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;const c0=S.cash;G.events.warStart();const W=S.war;
          // 내가 1편을 다 쓰러뜨린다: 0편과 떼어 놓고 (서로 못 쏘게) 내 앞에
          W.t0=S.t+60;/* 0편은 내 등 뒤 멀리(빗나간 총알이 닿지 않게) — 1편만 내 앞으로 */W.sides[0].forEach((g,i)=>{g.x=P.x-900-i*25;g.y=P.y+(i-1)*30;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;});W.sides[1].forEach((g,i)=>{g.x=P.x+120+i*25;g.y=P.y+(i-1)*12;g.route=[{x:g.x,y:g.y,pause:999}];});
          const side=new Set([...W.sides[0],...W.sides[1]]);for(const o of S.guards)if(!side.has(o)&&o.state!=='DEAD'&&Math.hypot(o.x-P.x,o.y-P.y)<900){o.x+=6000;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;o.crew=null;}  /* 곁의 행인·무리·밀매상이 조준을 가로채지 않게 */
          S.guns={pistol:60};S.wpn='pistol';P.a=0;const clearCars=()=>{S.vehicles=S.vehicles.filter(v=>Math.hypot(v.x-P.x,v.y-P.y)>700);};/* 지나가는 차가 총알을 막고 터지면 1편이 폭발로 죽는다 (내 처치로 안 잡힌다) */for(let k=0;k<30&&W.sides[1].some(g=>g.state!=='DEAD');k++){clearCars();S.gunT=0;G.actAttack();tick(.3);}
          tick(1.5);return {tr:S.fst.gunKills,ws:W.sides[1].map(g=>[g.state,(g.x-P.x)|0,(g.y-P.y)|0]),cleared,over:!!W.over,pk:W.pk,stand:S.stand,paid:S.cash-c0,F:W.F}}''')
        print('help', r); F = r['F']; ok(r['cleared'] and r['over'] and r['pk'][1] == 3 and r['stand'].get(F[0], 0) > 0 and r['stand'].get(F[1], 0) < 0 and r['paid'] >= 150, 'helping a side: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;for(let k=0;k<60&&S.war;k++)tick(1);S.stand={};S.wanted=0;S.alevel=0;for(const g of S.guards)if(g.police&&!g.contact&&g.state!=='DEAD'){g.x=-9000;g.y=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;g.state='PATROL';}const ST=G.STAGE;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;tick(.1);const g=S.guards.find(g=>g.fac==='B'&&!g.civ&&!g.contact&&g.state!=='DEAD'&&!g.evt);if(!g)return {g:false};
          g.x=P.x+120;g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];for(const o of S.guards)if(o!==g&&Math.abs(o.x-P.x)<600&&Math.abs(o.y-P.y)<600&&o.state!=='DEAD'){o.x+=4000;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;}S.guns={pistol:30};S.wpn='pistol';P.a=0;for(let k=0;k<12&&g.state!=='DEAD';k++){S.gunT=0;G.actAttack();tick(.3);}tick(1.2);return {g:true,dead:g.state,B:S.stand.B||0,st:JSON.stringify(S.stand)}}''')
        print('stand', r); ok(r.get('g') and r['dead'] == 'DEAD' and r['B'] < 0, 'gun kill standing: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
