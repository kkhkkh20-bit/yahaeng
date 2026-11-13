"""Free mode: car trunk (load a carried body behind any car, drive off with it, unload elsewhere), passengers
(board a calm passer-by next to my car, drop them off later), and the serial-killer case
(three crime scenes give clues, four suspects roam an area, only one matches; killing the wrong one costs 2 stars,
the killer stalks a lone woman and kills again if left alone, finishing him pays 500)."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.skNext=1e9;
  for(const g of S.guards)if((g.fac&&!g.civ)||g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.ACT=lab=>{const L=G.events;for(const f of [L.trunkAction,L.rideAction]){const a=f();if(a&&a.label.includes(lab)){a.fn();return a.label;}}return null;};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        # 트렁크: 시체를 들쳐 메고 차 뒤에서 싣는다 → 차를 몰고 가서 → 꺼낸다
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ST=G.STAGE;const x=(ST.roadsX[2]+6)*48,y=(ST.roadsY[2]+2)*48+24;P.x=x;P.y=y;
          const v=G.traffic.makeVehicle({type:'sedan',x,y,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);
          const g=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.off&&!o.crew);g.x=x-80;g.y=y+40;G.killGuard(g);const c=S.corpses.find(o=>o.g===g);c.x=x-80;c.y=y+40;
          c.carried=true;P.carrying=c;const rear={x:v.x-Math.cos(v.a)*39,y:v.y-Math.sin(v.a)*39};P.x=rear.x-10;P.y=rear.y+8;S.wanted=0;tick(.1);
          const l1=ACT('트렁크에 싣기');tick(1.5);const inTrunk=(v.trunk||[]).length,stashed=!!c.stashed,carrying=!!P.carrying;
          v.x+=900;tick(.1);P.x=v.x-Math.cos(v.a)*39-10;P.y=v.y-Math.sin(v.a)*39+8;tick(.1);const l2=ACT('트렁크에서 꺼내기');tick(1.3);
          return{l1,inTrunk,stashed,carrying,l2,back:P.carrying===c,cx:Math.round(c.x-v.x)}}''')
        print('trunk', json.dumps(r, ensure_ascii=False))
        ok(r['l1'] and r['inTrunk'] == 1 and r['stashed'] and not r['carrying'] and r['l2'] and r['back'], 'trunk: %s' % r)
        # 태우기: 내 차 곁에서 행인을 태우고, 내려 준다
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;P.carrying=null;const v=S.vehicles[S.vehicles.length-1];P.lastCar=v;P.x=v.x;P.y=v.y+60;
          const g=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.off&&!o.crew&&!o.evt&&!o.dog);g.x=P.x+30;g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.wait=99;tick(.05);const dbg=[!!P.lastCar,Math.round(Math.hypot(P.x-v.x,P.y-v.y)),g.state,g.civ,g.fac,g.police,g.evt,G.actionBusy?G.actionBusy(P):'?',JSON.stringify(G.events.rideAction()&&G.events.rideAction().label),Math.round(Math.hypot(g.x-P.x,g.y-P.y))];
          const l1=ACT('차에 태우기');tick(1);const aboard=(v.riders||[]).length,off=!!g.off;v.x+=600;P.x=v.x+20;P.y=v.y+40;tick(.1);const l2=ACT('내려 주기');tick(.2);
          return{dbg,l1,aboard,off,l2,riders:(v.riders||[]).length,back:!g.off,near:Math.round(Math.hypot(g.x-v.x,g.y-v.y))}}''')
        print('ride', json.dumps(r, ensure_ascii=False))
        ok(r['l1'] and r['aboard'] == 1 and r['off'] and r['l2'] and r['riders'] == 0 and r['back'] and r['near'] < 120, 'ride: %s' % r)
        # 연쇄 살인마: 현장 셋 → 단서 셋 → 용의자 넷
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events;S.wanted=0;E.killerStart();const K=E.sk;const labs=[];
          for(let i=0;i<3;i++){for(let k=0;k<20&&!K.scene;k++)tick(.5);const s=K.scene;if(!s)return{scene:false,i};P.x=s.x+30;P.y=s.y;
            tick(.1);const a=E.killerAction();labs.push(a&&a.label);E.skClueNow();tick(3);}
          return{clues:K.clues,stage:K.stage,n:K.suspects.length,real:K.suspects.filter(g=>g.skReal).length,match:K.suspects.filter(g=>g.skBi===K.bi&&g.skSmoke).length,labs}}''')
        print('killer clues', json.dumps(r, ensure_ascii=False))
        ok(len(r.get('clues', [])) == 3 and r['stage'] == 'hunt' and r['n'] == 4 and r['real'] == 1 and r['match'] == 1, 'killer clues: %s' % r)
        # 엉뚱한 사람 → 수배 2 / 놈은 혼자 걷는 여자를 노린다 → 진범 처리 → 500만
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,K=E.sk;S.wanted=0;const wrong=K.suspects.find(g=>!g.skReal);G.killGuard(wrong);tick(.3);const wanted=S.wanted;S.wanted=0;
          const k=K.killer;const f=S.guards.find(o=>o.civ&&!o.evt&&!o.off&&o.state==='PATROL'&&['fLong','fBob','fTail','femaleCoat'].includes(o.body));k.x=k.route[0].x;k.y=k.route[0].y;f.x=k.route[1].x;f.y=k.route[1].y;f.route=[{x:f.x,y:f.y,pause:999}];f.path=null;
          K.stalkT=S.t;P.x=k.x+2000;P.y=k.y;const v0=K.victims;for(let i=0;i<60*80&&K.victims===v0;i++){P.x=k.x+2000;P.y=k.y;G.update(1/60);}const again=K.victims-v0;
          const KD=[!!K.prey,K.prey&&Math.round(Math.hypot(K.prey.x-k.x,K.prey.y-k.y)),k.state,k.off,Math.round(K.killT-S.t),k.route.length];const c0=S.cash;G.killGuard(K.killer);tick(1.6);return{KD,wanted,again,done:!!K.done,paid:S.cash-c0,stamp:(document.getElementById('justiceStamp')||{}).textContent||''}}''')
        print('killer end', json.dumps(r, ensure_ascii=False))
        ok(r['wanted'] >= 2 and r['again'] == 1 and r['done'] and r['paid'] >= 500 and '처리' in r['stamp'], 'killer end: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
