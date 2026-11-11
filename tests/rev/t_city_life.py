"""Big-city study (?study=city-xl): street life.

Civilians far outnumber gang members. Gangs fight each other on sight and police step in.
A car at speed kills a pedestrian: the body is thrown and blood sprays. Police arrest you at low
wanted levels (you wake up at the police station with a fine) and draw pistols from two stars.
Gang members carry knives (a hit takes two hearts) and call a car when you get away from them.
The big city shows no action prompts or key bar.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.5);
  const S=G.S,P=S.player,ST=G.STAGE,out={},ls=()=>({x:P.x,y:P.y,fl:0,z:0});
  out.civ=S.guards.filter(g=>g.civ).length;out.gang=S.guards.filter(g=>!g.civ&&!g.police&&g.fac&&g.fac!=='P').length;
  out.keys=getComputedStyle(document.querySelector('#hud .keys')).display;
  // car hit
  const v=S.vehicles.find(v=>v.parked&&!v.dead);P.car=v;v.ai=false;v.parked=false;v.x=10*48;v.y=21*48+24;v.a=0;v.v=260;P.x=v.x;P.y=v.y;
  const c=S.guards.find(q=>q.civ&&q.state!=='DEAD');c.x=v.x+70;c.y=v.y;c.route=[{x:c.x,y:c.y,pause:999}];c.path=null;const d0=S.decals.length;
  for(let t=0;t<.6;t+=1/60){v.v=Math.max(v.v,240);G.update(1/60);}const corpse=S.corpses.find(o=>o.g===c);
  out.hit={state:c.state,ko:!!c.unconscious,blood:S.decals.length-d0,thrown:corpse?Math.hypot(corpse.x-70-10*48,corpse.y-21*48-24):0};
  P.car=null;v.parked=true;
  // arrest at one star
  S.cash=100;S.wanted=1;Object.assign(P,{x:30*48,y:21.5*48});const cop=S.guards.find(g=>g.police&&!g.off);cop.state='ALERT';cop.lastSeen=ls();cop.path=null;
  for(let t=0;t<1.6;t+=1/60){cop.x=P.x+18;cop.y=P.y;G.update(1/60);}
  out.arrest={wanted:S.wanted,cash:S.cash,station:Math.hypot(P.x-(ST.police[0]+.5)*48,P.y-(ST.police[1]+1.5)*48)};
  // gang knife
  Object.assign(P,{x:50*48,y:21.5*48});P.hp=P.hpMax;P.hurtT=0;const hp0=P.hp,gg=S.guards.find(g=>g.fac==='C'&&g.state!=='DEAD');gg.x=P.x+60;gg.y=P.y;gg.state='ALERT';gg.lastSeen=ls();gg.path=null;gg.seen=true;
  let lost=0;for(let t=0;t<6&&!lost;t+=1/60){G.update(1/60);lost=hp0-P.hp;}out.knife=lost;gg.x=-9000;gg.state='PATROL';
  // police pistol from two stars
  S.wanted=2;P.hp=P.hpMax;P.hurtT=0;Object.assign(P,{x:90*48,y:21.5*48});const c2=S.guards.find(g=>g.police);c2.off=false;c2.hp=null;  // the arrest sent every officer away
  c2.x=P.x-220;c2.y=P.y;c2.state='ALERT';c2.lastSeen=ls();c2.seen=true;c2.path=null;let shot=-1;for(let t=0;t<8&&shot<0;t+=1/60){G.update(1/60);if(P.hp<P.hpMax)shot=t;}out.shot=shot;
  // gang chase car
  S.wanted=0;for(const g of S.guards)if(g.police&&!g.off)g.x=-9000;P.hp=P.hpMax;const gb=S.guards.find(g=>g.fac==='B'&&g.state!=='DEAD');gb.lastSeen=ls();gb.x=P.x+900;gb.y=P.y;
  for(let t=0;t<5;t+=1/60){gb.state='ALERT';G.update(1/60);}out.gangCar=S.vehicles.filter(v=>v.gang==='B'&&v.chase).length;
  // gangs meet and fight; police step in (counted last: fights leave people dead)
  gb.state='RETURN';gb.path=null;Object.assign(P,{x:10*48,y:19*48});S.wanted=0;const f0=S.stats.fights||0;
  let copBrawl=0;for(let k=0;k<150*30;k++){G.update(1/30);if(k%15===0&&S.guards.some(g=>g.police&&g.brawl))copBrawl++;}
  out.fights=(S.stats.fights||0)-f0;out.copBrawl=copBrawl;
  return out;
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
    ok(s['civ'] >= 3 * s['gang'], 'civilians do not outnumber gangs: %s vs %s' % (s['civ'], s['gang']))
    ok(s['keys'] == 'none', 'key bar still shown in the big city')
    ok(s['fights'] >= 3, 'gangs do not fight each other')
    ok(s['copBrawl'] >= 1, 'police never step into a fight')
    ok(s['hit']['state'] == 'DEAD' and not s['hit']['ko'], 'a car at speed did not kill: %s' % s['hit'])
    ok(s['hit']['blood'] >= 6 and s['hit']['thrown'] > 30, 'no blood or the body was not thrown: %s' % s['hit'])
    ok(s['arrest']['wanted'] == 0 and s['arrest']['cash'] == 70 and s['arrest']['station'] < 60, 'arrest did not take me to the station: %s' % s['arrest'])
    ok(s['knife'] == 2, 'a gang knife hit did not take two hearts: %s' % s['knife'])
    ok(0 <= s['shot'] < 5, 'police did not shoot at two stars')
    ok(s['gangCar'] == 1, 'the gang did not send a car')
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
