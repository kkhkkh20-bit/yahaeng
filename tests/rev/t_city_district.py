"""Big-city study (?study=city-xl): the painted Euljiro / Cheonggyecheon district.

The district replaces blocks (1,0)-(2,1) and the roads between them. Its buildings and railings block,
the stream is water, the bridges and streets connect the north road to the south road, traffic never
drives on the covered roads, and its lamps light without adding extra posts on top of the picture.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,D=G.STAGE.district,at=(x,y)=>G.tileG(D.x+x,D.y+y);
  const gap=v=>{const tx=v.x/48,ty=v.y/48;return (tx>=40&&tx<44&&ty>=D.y&&ty<D.y+D.h)||(ty>=20&&ty<24&&tx>=D.x&&tx<D.x+D.w);};
  let onGap=0;for(let k=0;k<60;k++){tick(1);for(const v of S.vehicles)if(v.ai&&!v.dead&&!v.parked&&gap(v))onGap++;}
  // north sidewalk -> first street -> bridge -> south street -> south sidewalk; and across the second bridge
  const path1=G.astar(D.x+12,D.y,D.x+12,D.y+35),path2=G.astar(D.x+29,D.y+1,D.x+29,D.y+34);
  const inD=l=>l.x>=D.x*48&&l.x<(D.x+D.w)*48&&l.y>=D.y*48&&l.y<(D.y+D.h)*48;
  const lamps=S.lamps.filter(l=>l.outdoor&&inD(l));
  S.player.x=(D.x+12.5)*48;S.player.y=(D.y+8.5)*48;tick(.2);G.benchDraw(2);
  return {d:D,street:at(12,5),shop:at(5,5),water:at(5,18),rail:at(10,15),bridge:at(12,18),south:at(12,30),southShop:at(5,30),
    onGap,vehicles:S.vehicles.filter(v=>v.ai&&!v.parked).length,path1:path1.length,path2:path2.length,
    lamps:lamps.length,painted:lamps.filter(l=>l.mount&&l.mount.kind==='painted').length,
    civ:S.guards.filter(g=>g.kind==='civ'&&g.route&&g.route.some(p=>p.x>=D.x*48&&p.x<(D.x+D.w)*48&&p.y>=D.y*48&&p.y<(D.y+D.h)*48)).length};
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
    ok(s['d'] and s['d']['w'] == 36 and s['d']['h'] == 36, 'district missing')
    ok(s['street'] == '=' and s['bridge'] == '=' and s['south'] == '=', 'district streets are not walkable')
    ok(s['shop'] == '§' and s['southShop'] == '§', 'district shops are not solid')
    ok(s['water'] == '~' and s['rail'] == '¦', 'stream or railing missing')
    ok(s['onGap'] == 0, 'traffic drove on the covered roads: %s' % s['onGap'])
    ok(s['vehicles'] > 20, 'traffic missing')
    ok(s['path1'] > 30 and s['path2'] > 30, 'no walking route across the district')
    ok(s['lamps'] >= 20 and s['lamps'] == s['painted'], 'district lamps add posts or are missing')
    ok(s['civ'] >= 4, 'no pedestrians in the district')
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
