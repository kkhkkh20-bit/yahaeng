"""Free mode driving feel: traffic cruises clearly faster than running, my car shoves a car it keeps pressing on,
and pressing exit on a moving car jumps out (car coasts on, rolling hurts only when fast)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,T=G.traffic,ST=G.STAGE,out={};S.copT=1e9;S.warNext=1e9;
  // 순항 속도: 아무 방해 없이 달리는 차들의 최고 속도
  tick(8);out.cruise=Math.round(Math.max(...S.vehicles.filter(v=>v.ai&&!v.chase&&!v.dead).map(v=>v.v)));
  // 밀기: 동쪽으로 가는 차로, 블록 가운데. 앞 110px에 세워 둔 세단
  const ry=ST.roadsY[2],rx=ST.roadsX[2],y=(ry+3)*48,x=(rx+8)*48;
  const clear=()=>{for(const o of S.vehicles)if(Math.abs(o.x-x)<900&&Math.abs(o.y-y)<300){o.x=-9999;o.y=-9999;o.ai=false;o.v=0;}};clear();
  const me=T.makeVehicle({type:'sedan',x,y,a:0,parked:true});me.unlocked=true;S.vehicles.push(me);P.car=me;me.ai=false;P.x=x;P.y=y;
  const o=T.makeVehicle({type:'sedan',x:x+110,y,a:0,parked:true});S.vehicles.push(o);const ox=o.x;
  for(let i=0;i<240;i++){clear2();T.updateDriving(P,0,-1,1,1/60);G.update(1/60);}
  function clear2(){for(const q of S.vehicles)if(q!==me&&q!==o&&Math.abs(q.x-x)<900&&Math.abs(q.y-y)<300){q.x=-9999;q.y=-9999;q.ai=false;q.v=0;}}
  out.push={moved:Math.round(o.x-ox),gap:Math.round(o.x-me.x),meDead:!!me.dead,oDead:!!o.dead,mySpd:Math.round(me.v)};
  // 뛰어내리기: 200으로 달리다 내리면 구르고(안 다친다) 차는 더 굴러간다. 300이면 다친다
  const jump=spd=>{clear2();o.x=-9999;const v=T.makeVehicle({type:'sedan',x,y,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);P.car=v;v.ai=false;P.x=x;P.y=y;P.trav=null;P.hp=P.hpMax;P.hurtT=0;v.v=spd;
    const vx=v.x,hp=P.hp;T.carExit();const roll=P.trav&&P.trav.phases.some(p=>p.pose==='roll');tick(2);return{roll,carRolled:Math.round(v.x-vx),hurt:P.hp<hp,out:!P.car,ahead:Math.round(P.x-x)};};
  out.slow=jump(200);out.fast=jump(320);
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(r)
        ok = lambda c, m: c or bad.append(m)
        ok(r['cruise'] >= 240, 'traffic still cruises near running speed: %s' % r['cruise'])
        ok(r['push']['moved'] > 80 and not r['push']['meDead'] and not r['push']['oDead'], 'car is not pushed: %s' % r['push'])
        for k in ('slow', 'fast'): ok(r[k]['out'] and r[k]['roll'] and r[k]['carRolled'] > 80, 'no jump out at %s: %s' % (k, r[k]))
        ok(not r['slow']['hurt'] and r['fast']['hurt'], 'jump damage wrong: %s %s' % (r['slow'], r['fast']))
        ok(r['slow']['ahead'] > 20, 'jump has no forward momentum: %s' % r['slow'])
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
