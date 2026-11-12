"""Free-mode disguise.
- Next to a downed gang member's body, the action list offers '옷 갈아입기'; doing it puts me in that gang's clothes.
- Members of that gang notice me very slowly at a distance (x0.07), still notice up close; other gangs are unaffected;
  the contract target knows my face up close.
- When wanted rises, the disguise is blown; going down / arrested also removes it."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.stand={};S.wanted=0;}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ST=G.STAGE;P.car=null;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;tick(.1);
          const g=S.guards.find(g=>g.fac==='C'&&!g.civ&&!g.contact&&g.state!=='DEAD'&&!g.evt);g.x=P.x+30;g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];G.npcDown(g,null,true);
          for(const o of S.guards)if(o!==g&&Math.abs(o.x-P.x)<600&&Math.abs(o.y-P.y)<600&&o.state!=='DEAD'){o.x+=3000;o.route=[{x:o.x,y:o.y,pause:999}];}tick(.2);
          const a=G.envChoices().find(a=>a.k==='dress');if(!a)return {offer:false};G.actCarry(a);const it=JSON.stringify(P.interact?{k:P.interact.k}:null);tick(4);return {offer:true,label:a.label,fac:P.disgFac,outfit:P.outfit,it,dis:P.disguise,st:S.stats.dressed}}''')
        print('dress', r); ok(r.get('offer') and r['fac'] == 'C' and r['outfit'] == 'gangC', 'change clothes: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,dm=G.disguiseMul||E.disguiseMul;
          const same=S.guards.find(g=>g.fac==='C'&&!g.civ&&g.state!=='DEAD'),other=S.guards.find(g=>g.fac==='B'&&!g.civ&&g.state!=='DEAD');
          const at=(g,d)=>{g.x=P.x+d;g.y=P.y;return dm(g)};const r={far:at(same,200),near:at(same,40),other:at(other,200)};
          const plan=E.planHit();plan.ctr='plain';E.startHit(plan);r.tgtFar=at(S.hit.g,400);r.tgtNear=at(S.hit.g,150);return r}''')
        print('mul', r); ok(r['far'] < 0.1 and r['near'] > 0.3 and r['other'] == 1 and r['tgtFar'] < 1 and r['tgtNear'] > 1, 'perception: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S,P=S.player;S.wanted=1;tick(.1);const blown=!P.disgFac&&!P.outfit;S.wanted=0;return {blown}}''')
        print('blown', r); ok(r['blown'], 'wanted blows the disguise: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
