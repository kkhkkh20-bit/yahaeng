"""Free mode groups: a 10-person running crew and an 8-bike club take over the road lane next to a block, two abreast; ramming them with a
car kills the ones hit and breaks the group (the rest panic and scatter); a broken group respawns elsewhere later."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,T=G.traffic,E=G.events,out={};S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;
  out.kinds=E.crews.map(c=>c.kind+':'+c.members.length);out.onRoad=E.crews.map(c=>c.members.filter(m=>G.tileG(Math.floor(m.x/48),Math.floor(m.y/48))==='.').length);
  const run=E.crews.find(c=>c.kind==='run'),L=run.members[0],x0=L.x,y0=L.y;tick(3);
  out.moved=Math.round(Math.hypot(L.x-x0,L.y-y0));
  const gaps=run.members.slice(2).map((m,i)=>Math.hypot(m.x-run.members[i].x,m.y-run.members[i].y));out.side=Math.round(Math.hypot(run.members[1].x-run.members[0].x,run.members[1].y-run.members[0].y));out.gap=[Math.round(Math.min(...gaps)),Math.round(Math.max(...gaps))];
  out.anim=G.guardAnim?G.guardAnim(L):null;
  // 차로 들이받기: 무리 정면에 차를 세우고 그 줄을 따라 달린다
  const at=run.members[2],a=at.a;
  const v=T.makeVehicle({type:'suv',x:at.x+Math.cos(a)*260,y:at.y+Math.sin(a)*260,a:a+Math.PI,parked:true});v.unlocked=true;S.vehicles.push(v);P.car=v;v.ai=false;P.x=v.x;P.y=v.y;v.v=300;
  for(let i=0;i<120;i++){T.updateDriving(P,0,-1,1,1/60);G.update(1/60);}
  out.dead=run.members.filter(m=>m.state==='DEAD').length;out.broken=run.broken;out.panic=run.members.filter(m=>m.state==='PANIC'||m.state==='FLEE').length;
  out.crewOnAlive=run.members.filter(m=>m.state!=='DEAD'&&m.crew).length;
  // 90초 뒤 새 러닝 크루
  P.car=null;P.x=200;P.y=200;tick(95);out.respawn=E.crews.filter(c=>c.kind==='run'&&!c.broken).length;
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(json.dumps(r))
        ok = lambda c, m: c or bad.append(m)
        ok(r['kinds'] == ['run:10', 'bike:8'], 'crews missing: %s' % r['kinds'])
        ok(r['onRoad'][0] >= 8 and r['onRoad'][1] >= 6, 'crews are not on the road: %s' % r['onRoad'])
        ok(30 <= r['side'] <= 40, 'not two abreast: %s' % r['side'])
        ok(r['moved'] > 300, 'crew does not run: %s' % r['moved'])
        ok(r['gap'][0] > 8 and r['gap'][1] < 60, 'crew not in single file at a steady gap: %s' % r['gap'])  # 모퉁이에선 직선 거리가 짧다
        ok(r['dead'] >= 1 and r['broken'] and r['crewOnAlive'] == 0, 'ramming does not kill or break the crew: %s' % r)
        ok(r['respawn'] == 1, 'broken crew does not respawn: %s' % r)
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
