"""Big-city study (?study=city-xl): river, bridges, gangs and purchased building fronts.

A Cheonggyecheon-style river crosses the whole map between two riverside roads. Every north-south
road crosses it on a bridge that cars use; nobody drives into the water. Four gangs hold turf.
Every building has a purchased-pack front, can be entered, and shops carry Korean signboards.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,ST=G.STAGE,Rv=ST.river,W=ST.W,H=ST.H;
  const tile=(x,y)=>x>=0&&y>=0&&x<W&&y<H?G.tileG(x,y):'';
  // every column of the river: water unless it is a road (bridge) or a bridge parapet
  let gaps=0,bridges=0;for(let x=0;x<W;x++){const road=ST.roadsX.some(r=>x>=r&&x<r+4),water=[4,5,6].every(r=>tile(x,Rv.y+r)==='~');if(road){bridges++;if([0,5,10].some(r=>tile(x,Rv.y+r)!=='.'))gaps++;}else if(!water&&![4,5,6].every(r=>tile(x,Rv.y+r)==='¦'))gaps++;}
  let wet=0,onBridge=0;for(let k=0;k<60;k++){tick(1);for(const v of S.vehicles){if(v.dead||v.parked)continue;const tx=Math.floor(v.x/48),ty=Math.floor(v.y/48);if(tile(tx,ty)==='~')wet++;if(ty>=Rv.y&&ty<Rv.y+Rv.rows)onBridge++;}}
  const fac={};for(const g of S.guards)if(g.fac&&g.state!=='DEAD')fac[g.fac]=(fac[g.fac]||0)+1;
  const specs=ST.referenceBuildings||[],signed=specs.filter(s=>s.ad).length,doors=G.BLD.filter(b=>!b.vacant).length;
  const north=G.astar(30,ST.roadsY[3]+1,30,Rv.y+Rv.rows+1);
  S.player.x=30*48;S.player.y=(Rv.y+5)*48;tick(.2);G.benchDraw(2);
  return {gaps,bridges,wet,onBridge,fac,turf:Object.fromEntries(Object.entries(S.turf).map(([k,v])=>[k,v.length])),
    bld:G.BLD.length,specs:specs.length,signed,fh:G.BLD.filter(b=>b.fh>=2).length,shade:ST.nightShade,cross:north.length};
}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        s = await q.evaluate(CHECK); print(json.dumps(s, ensure_ascii=False))
        await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(s['gaps'] == 0, 'river is broken or a bridge is missing: %s' % s['gaps'])
    ok(s['bridges'] >= 32, 'not every north-south road crosses the river')
    ok(s['wet'] == 0, 'a car drove into the water')
    ok(s['onBridge'] > 0, 'no car crossed a bridge')
    ok(s['cross'] > 0, 'cannot walk across a bridge')
    ok(all(s['fac'].get(f, 0) >= 2 for f in 'ABCD'), 'four gangs are not all present: %s' % s['fac'])
    ok(all(s['turf'].get(f, 0) >= 1 for f in 'ABCD'), 'a gang has no turf: %s' % s['turf'])
    ok(s['specs'] == s['bld'] and s['bld'] > 100, 'buildings without a purchased front')
    ok(s['signed'] >= 40, 'too few Korean signboards: %s' % s['signed'])
    ok(s['fh'] >= 80, 'too few multi-storey fronts: %s' % s['fh'])
    ok(s['shade'] is not None and s['shade'] < 0.7, 'night is not brighter')
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
