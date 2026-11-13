"""Free mode regressions from the long review: a sold car can't be stolen back and sold again; shop items (picks, explosives, cigarettes)
survive a reload; going down while carrying a body leaves the body pick-up-able; a light car bump in front of police gives no stars."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events,out={};S.copT=1e9;
  // 1) 중고차: 팔고 → 도로 훔쳐 타면 다시 팔 수 없다
  const L=S.dealer.lot,x=(L[0]+L[2])/2,y=(L[1]+L[3])/2;const v=G.traffic.makeVehicle({type:'sedan',x,y,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);
  P.car=v;P.x=x;P.y=y;v.v=0;const a1=E.shopAction();out.offer1=a1&&a1.k;const c0=S.cash;E.sellCar(v);out.paid=S.cash-c0;
  P.car=v;tick(.1);v.v=0;const a2=E.shopAction();out.offer2=a2?a2.k:null;P.car=null;S.wanted=0;
  // 2) 산 물건이 저장된다
  P.picks=4;P.bombs=2;P.coins=7;E.saveFreeProgress(true);const sv=JSON.parse(localStorage.getItem('yahaeng.free1')||'{}');out.inv=sv.inv||null;
  // 3) 들고 있던 시신은 쓰러져도 다시 집을 수 있다
  const g=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.evt&&!o.off);g.x=P.x+30;g.y=P.y;G.npcDown(g,null,true);const c=S.corpses.find(k=>k.g===g);c.carried=true;P.carrying=c;
  E.cityRespawn('시험');out.carried=c.carried;out.held=!!P.carrying;
  // 4) 경찰 앞에서 살짝 스친 행인 → 별 없음
  S.wanted=0;const cop=S.guards.find(o=>o.police&&!o.off&&o.state!=='DEAD');const w=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.evt&&!o.off&&o!==g);
  if(cop&&w){cop.x=w.x+80;cop.y=w.y;cop.fl=0;w.fl=0;E.carHitReport(w,false);out.bumpStars=S.wanted;}
  // 5) 2층 창문 → 옆 1층 옥상으로 건너뛰기
  let hop=null;for(const w of S.fwindows||[]){if(hop||w.fl!==1||!w.out||!w.inn)continue;w.st='open';P.car=null;P.fl=1;P.z=0;G.setLayer(1);P.x=w.inn.x;P.y=w.inn.y;P.trav=null;P.jump=null;tick(.02);const a=G.primaryAction();if(a&&a.k==='winRoof'){G.actPrimary();tick(1.6);hop={fl:P.fl,z:P.z};}}
  out.roofHop=hop;
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
        ok(r['offer1'] == 'carSell' and r['paid'] > 0, 'car could not be sold: %s' % r)
        ok(r['offer2'] is None or r['offer2'] != 'carSell', 'sold car can be stolen back and sold again: %s' % r)
        ok(r['inv'] and r['inv'].get('picks') == 4 and r['inv'].get('bombs') == 2 and r['inv'].get('coins') == 7, 'shop items not saved: %s' % r)
        ok(r['carried'] is False and not r['held'], 'body stays "carried" after going down: %s' % r)
        ok(r.get('bumpStars', 0) == 0, 'light bump in front of police gave stars: %s' % r)
        ok(r['roofHop'] and r['roofHop']['z'] == 1 and r['roofHop']['fl'] == 0, 'cannot hop from a 2nd-floor window onto the next roof: %s' % r.get('roofHop'))
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
