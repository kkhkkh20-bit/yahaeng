"""Free mode lines book (47zt0, 47zt1): shop staff speak only when the situation fits. Walking into the pharmacy floor gets a greeting
(no 'you can't come in here'), standing next to the pharmacist gets job talk, leaving gets a goodbye, and standing at the
elevator door on a PC-room floor gets nothing (no '라면 드릴까요?' to someone just riding the lift). Small shops get a counter."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events,out={};S.copT=1e9;P.car=null;
  const said=g=>(g&&g.say)||'';const hush=g=>{if(g)g.say='';};
  const o=S.shops.find(o=>o.name==='약국');const A=G.PLANS[o.b][0].store;out.counter=!!G.PLANS[o.b][0].counter;
  P.fl=0;P.z=0;G.setLayer(0);P.x=o.x;P.y=o.y+40;tick(1);                       // 가게 앞 길
  P.x=(A.x0+2.5)*48;P.y=A.y1*48+24;tick(1.2);                                  // 매장 안으로
  const ph=S.guards.find(g=>g.staff==='pharm'&&!g.off);out.greet=said(ph);
  hush(ph);P.x=ph.x;P.y=ph.y+60;P.moving=false;tick(2.5);out.near=said(ph);tick(4);out.icon=ph.icon||'';out.meter=ph.meter;
  hush(ph);P.x=(A.x0+2.5)*48;P.y=(A.y1+1.5)*48;tick(.8);out.bye=said(ph);
  // PC방 층 엘리베이터 문 앞: 아무 말 없음
  const b=G.BLD.findIndex((b,i)=>(b.floorsUse||[]).includes('pc')&&G.PLANS[i]&&G.PLANS[i].some(p=>p&&p.store&&p.store.use==='pc'));const f=G.BLD[b].floorsUse.indexOf('pc');
  const L=S.ladders.find(l=>l.kind==='fstair'&&G.bldAt(l.tx,l.ty)===b);const D=E.elevDoorOf(E.elevStack(L.tx,L.ty));
  P.fl=f;G.setLayer(f);P.x=D.x;P.y=D.y;tick(1.2);for(const g of S.guards)hush(g);P.moving=false;tick(4);const pc=S.guards.filter(g=>g.staff&&!g.off&&g.shopF===f);out.pcStaff=pc.length;out.atLift=pc.map(said).join('|');
  return out}'''
# 행인: 부딪히면 · 무기를 보면 · 총소리 · 쓰러진 사람 · 바짝 붙어 달리는 차 — 그때만 대사집의 행인 대사
CIV = '''()=>{const G=__game,S=G.S,P=S.player,E=G.events,out={};const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};
  P.fl=0;P.z=0;G.setLayer(0);P.car=null;S.wanted=0;S.copT=1e9;const ST=G.STAGE;P.x=(ST.roadsX[2]+2)*48+20;P.y=(ST.roadsY[2]+2)*48+20;
  for(const o of S.guards)if(o.civ&&Math.hypot(o.x-P.x,o.y-P.y)<700)o.x+=3000;
  const pick=()=>S.guards.find(o=>o.civ&&!o.dog&&!o.child&&!o.evt&&!o.crew&&!o.staff&&!o.off&&o.state==='PATROL'&&!o.used);
  const put=(dx,dy)=>{const g=pick();g.used=1;g.x=P.x+dx;g.y=P.y+dy;g.fl=0;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.say='';g.talkT=0;S.civTalkT=0;return g};
  const L=E.LINES.civ,said=(g,k)=>L[k].includes(g.say)?k:(g.say||'-');
  let g=put(40,0);for(let k=0;k<36;k++){P.x+=0.6;G.update(1/60);}out.bump=said(g,'bump');g.x+=3000;
  S.guns.pistol=12;S.wpn='pistol';g=put(120,0);tick(.6);out.weapon=said(g,'weapon');g.x+=3000;
  g=put(-300,40);P.a=0;S.civTalkT=0;E.fireWeapon(false);tick(.6);out.gunshot=said(g,'gunshot');g.x+=3000;S.wpn=null;
  const v=put(60,60),w=put(140,60);G.npcDown?G.npcDown(v,null,true):G.killGuard(v);S.civTalkT=0;tick(.8);out.corpse=said(w,'corpse');w.x+=3000;
  const car=G.traffic.makeVehicle({type:'sedan',x:P.x,y:P.y,a:0,parked:true});S.vehicles.push(car);P.car=car;g=put(130,44);S.civTalkT=0;for(let k=0;k<36;k++){car.v=200;G.update(1/60);}out.car=said(g,'car');P.car=null;car.v=0;g.x+=3000;
  g=put(40,30);g.say='';P.moving=false;S.civTalkT=0;tick(1.2);out.quiet=g.say||'';
  // 악당 도발: 진상 손님 사건에서 가까이 가면 얄미운 한마디
  S.ev=null;let e=null;for(let k=0;k<10&&!e;k++){const sh=S.shops[(k*3)%S.shops.length];P.x=sh.x-500;P.y=sh.y;const def=E.list.find(d=>d.key==='gapjil');const ev={def,key:'gapjil:t',d:E.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(def.start(ev)){S.ev=ev;ev.engaged=true;e=ev;}}
  if(e){const v=e.def.focus(e);v.say='';P.x=v.x+60;P.y=v.y;tick(1.2);out.taunt=v.say||'';}else out.taunt='nostart';
  return out}'''

async def main():
    bad = []
    def ok(c, m):
        if not c: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(json.dumps(r, ensure_ascii=False))
        book = await q.evaluate("()=>__game.events.LINES")
        ok(r['counter'], 'small pharmacy has no counter')
        ok(r['greet'] in book['pharm']['greet'], 'no pharmacy greeting: %s' % r['greet'])
        ok(r['near'] in book['pharm']['near'], 'no pharmacist talk when standing by: %s' % r['near'])
        ok(r['icon'] != '!?' and r['meter'] < 0.5, 'pharmacist treats the customer as a trespasser: %s' % r)
        ok(r['bye'] in book['pharm']['bye'], 'no goodbye when leaving: %s' % r['bye'])
        ok(r['pcStaff'] >= 1 and r['atLift'].strip('|') == '', 'PC room staff talks to someone at the lift: %s' % r)
        c = await q.evaluate(CIV); print(json.dumps(c, ensure_ascii=False))
        for k in ['bump', 'weapon', 'gunshot', 'corpse', 'car']:
            ok(c[k] == k, 'passerby does not react (%s): %s' % (k, c[k]))
        ok(c['taunt'] in book['v_gapjil']['taunt'], 'villain does not taunt: %s' % c['taunt'])
        ok(c['quiet'] == '' or c['quiet'] in book['civ']['idle'], 'passerby talks for no reason: %s' % c['quiet'])
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
