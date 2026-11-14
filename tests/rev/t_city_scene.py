"""Scene clean-up: a body left on the street draws an ambulance (siren, comes in along the road), a police line with a cop
who tells you to step back, and two paramedics who carry the body off on a stretcher; then the ambulance leaves and the tape
stays a while. Sleeping at a safehouse moves to the next night (night counter, saved)."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SCENE = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player;S.copT=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  const g=S.guards.find(o=>o.civ&&!o.evt&&!o.crew&&!o.child&&o.state==='PATROL'&&!o.off&&!(o.fl||0)&&G.bldAt(Math.floor(o.x/48),Math.floor(o.y/48))<0&&Math.hypot(o.x-P.x,o.y-P.y)>400&&Math.hypot(o.x-P.x,o.y-P.y)<1300);
  g.route=[{x:g.x,y:g.y,pause:999}];G.npcDown(g,null,true);const c=S.corpses.find(k=>k.g===g);c.seenAt=S.t-60;S.sceneNext=0;S.sceneScan=0;
  const seen={},t0=S.t;let tape=null,said='';for(let k=0;k<60*90;k++){G.update(1/60);const sc=S.scene;if(sc){seen[sc.st]=seen[sc.st]||Math.round(S.t-t0);if(sc.tape&&!tape)tape=sc.tape;
      if(sc.st==='keep'&&!said&&tape){P.x=(tape.x0+tape.x1)/2+40;P.y=(tape.y0+tape.y1)/2;} if(sc.cop&&sc.cop.say)said=sc.cop.say;}
    if(seen.keep&&!S.scene)break;}
  return{seen,tape:!!tape,gone:!S.corpses.includes(c),amb:S.vehicles.some(v=>v.sceneCar),said:String(said),end:!S.scene}}'''
NIGHT = '''()=>{const G=__game,S=G.S,P=S.player,E=G.events;const n0=S.night||1;const s=(S.safes||[])[0];if(!s)return{none:true};s.owned=true;E.safeLeave(s);
  const b=(document.getElementById('evBanner')||{}).textContent||'';E.saveFreeProgress(true);const d=JSON.parse(localStorage.getItem('yahaeng.free1')||'{}');return{n0,n1:S.night,b,saved:d.night}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        ok = lambda c, m: c or bad.append(m)
        r = await q.evaluate(SCENE); print('scene', json.dumps(r, ensure_ascii=False))
        ok(all(k in r['seen'] for k in ['drive', 'walk', 'lift', 'back', 'leave', 'keep']) and r['tape'] and r['gone'] and not r['amb'] and r['end'], 'scene clean-up: %s' % r)
        r = await q.evaluate(NIGHT); print('night', json.dumps(r, ensure_ascii=False))
        ok(r.get('n1') == r.get('n0', 0) + 1 and '일째 밤' in r.get('b', '') and r.get('saved') == r.get('n1'), 'next night after sleeping: %s' % r)
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
