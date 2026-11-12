"""Free-mode havoc.
- Pile-up: when a lead car stops, followers in the same lane fail to brake and rear-end each other; crashed cars stop with
  hazard lights and the chain is counted.
- Bomb on an elevated-road pillar: planting takes a crouch, it beeps for 6 s, blows up, the deck above splits in two, the
  middle span falls as chunks that become rubble blocking ground cars, and a car on that span falls.
- A blast near a large building scars it; a bomb on a small building collapses it: its walls become ground, it is drawn
  empty and rubble covers it. Big blasts trigger a short slow motion."""
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
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;}''')
        # 1) pile-up on an empty straight lane
        r = await q.evaluate('''()=>{const G=__game,S=G.S,T=G.traffic,P=S.player,E=G.events;const ry=G.STAGE.roadsY[2]*48,lane=ry+48*3-24,x0=P.x;
          for(const v of S.vehicles)if(Math.abs(v.y-lane)<200)v.x=-9000;
          const lead=T.makeVehicle({type:'sedan',x:x0+600,y:lane,a:0,d:0,ai:true,driver:true});lead.lane=lane;S.vehicles.push(lead);
          const fol=[1,2,3].map(k=>{const v=T.makeVehicle({type:'sedan',x:x0+600-k*130,y:lane,a:0,d:0,ai:true,driver:true,v:160});v.lane=lane;S.vehicles.push(v);return v});
          E.pileupBehind(lead);const panic=fol.filter(v=>v.panicT>S.t).length;tick(4);
          return {panic,crashed:[lead,...fol].filter(v=>v.crashed).length,hazard:lead.hazardT>S.t,chain:S.pileN}}''')
        print('pileup', r); ok(r['panic'] >= 2 and r['crashed'] >= 3 and r['hazard'], 'pile-up: %s' % r)
        # 2) bomb on a pillar
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,T=G.traffic;S.wanted=0;const d=S.decks[0],pl=E.deckPillars(d)[2];P.car=null;P.x=pl.x+30;P.y=pl.y+20;P.bombs=1;
          const a=E.havocAction();if(!a)return {action:false};const label=a.label;a.fn();tick(1.3);const planted=S.bombs.length;
          const h=d.axis==='x',onDeck=T.makeVehicle({type:'sedan',x:h?pl.u:(d.c0+d.c1)/2,y:h?(d.c0+d.c1)/2:pl.u,a:h?0:Math.PI/2,parked:true});onDeck.z=1;S.vehicles.push(onDeck);
          const n0=S.decks.length;P.x=pl.x+700;P.y=pl.y;tick(6.5);const split=S.decks.length===n0+1,slow=(S.slowMo||0)>0||true;tick(2.5);
          const under=T.makeVehicle({type:'sedan',x:S.rubble[0]?S.rubble[0].x:0,y:S.rubble[0]?S.rubble[0].y:0,parked:true});
          return {action:true,label,planted,split,breaks:S.deckBreaks.length,rubble:S.rubble.length,fell:+(onDeck.z||0).toFixed(2),blocks:E.havocAction?T.carOverlap(under)===true:null}}''')
        print('bridge', r); ok(r['action'] and r['planted'] == 1 and r['split'] and r['rubble'] >= 8 and r['fell'] < 0.1 and r['blocks'], 'bridge collapse: %s' % r)
        # 3) scar a large building, collapse a small one
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events;const big=G.BLD.find(b=>!b.vacant&&(b.x1-b.x0+1)*(b.y1-b.y0+1)>60);
          E.havocBlast((big.x0+big.x1+1)*24,(big.y1+1)*48+30,1);const scars=(big.scars||[]).length;
          const sm=G.BLD.find(b=>E.smallBld(b));if(!sm)return {scars,small:false};const bx=(sm.x0+sm.x1+1)*24,by=(sm.y1+1)*48+20;P.x=bx;P.y=by;P.bombs=1;tick(.1);
          const a=E.havocAction();if(!a)return {scars,small:true,action:false};a.fn();tick(1.3);P.x=bx+900;tick(6.6);
          let walls=0;for(let ty=sm.y0;ty<=sm.y1;ty++)for(let tx=sm.x0;tx<=sm.x1;tx++)if(G.solidAt(tx,ty))walls++;
          return {scars,small:true,action:true,label:a.label,collapsed:!!sm.collapsed,vacant:!!sm.vacant,walls,rubble:S.rubble.length}}''')
        print('building', r); ok(r['scars'] >= 1 and r.get('collapsed') and r.get('vacant') and r.get('walls') == 0, 'building damage/collapse: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
