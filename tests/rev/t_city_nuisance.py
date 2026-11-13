"""Free mode nuisance events (any district): a random assailant knocks down passers-by until stopped; two teens on one
kick scooter tear down the sidewalk hitting people; delivery bikes block a shop's sidewalk (clear them by hand); a
road-rage SUV chases my car and its driver gets out when I stop. Stopping each pays and raises district standing."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player,e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=true;return e;};
  window.DONE=()=>{const e=S.ev;return{done:!!(e&&e.done)||!S.ev,banner:(document.getElementById('evBanner')||{}).textContent||''}};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,e=EV('assault');if(!e)return{start:false};const g=e.g;
          const c=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.evt&&!o.crew&&!o.off);g.x=c.x+120;g.y=c.y;P.x=g.x+600;P.y=g.y;
          for(let k=0;k<900&&!e.hits;k++)tick(1/30);const hits=e.hits,victim=c.state;const c0=S.cash;G.killGuard(g);tick(.5);const st=document.getElementById('justiceStamp');tick(1.2);const nt=document.getElementById('newsTicker');return{start:true,hits,victim,paid:S.cash-c0,stamp:!!st&&st.textContent.includes('참교육'),news:nt?nt.textContent:'',...DONE()}}''')
        print('assault', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['hits'] >= 1 and r['paid'] == 80 and r['done'], 'assault: %s' % r)
        ok(r['stamp'] and '속보' in r['news'] and '묻지마' in r['news'], 'justice beat (stamp/news) missing: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const e=EV('kick');if(!e)return{start:false};const L=e.crew.members[0],x0=L.x,y0=L.y;P.x=L.x+400;P.y=L.y+300;tick(2);P.x=L.x+400;P.y=L.y+300;const moved=Math.round(Math.hypot(L.x-x0,L.y-y0));
          const c=S.guards.find(o=>o.civ&&o.state==='PATROL'&&!o.evt&&!o.crew&&!o.off);c.x=L.x+Math.cos(L.a)*60;c.y=L.y+Math.sin(L.a)*60;c.route=[{x:c.x,y:c.y,pause:999}];c.path=null;tick(.6);const hits=e.hits;
          const c0=S.cash;G.npcDown?G.npcDown(L,null,false):G.killGuard(L);tick(.3);return{start:true,moved,hits,paid:S.cash-c0,...DONE()}}''')
        print('kick', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['moved'] > 300 and r['hits'] >= 1 and r['paid'] == 60 and r['done'], 'kick scooter: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;let e=null;for(let k=0;k<6&&!e;k++){P.x+=900;e=EV('delivery');}if(!e)return{start:false};const n=e.bikes.length;const c0=S.cash;let labels=0;
          for(const b of e.bikes){P.x=b.x-30;P.y=b.y;P.car=null;tick(.05);const a=e.def.action(e);if(a){labels++;a.fn();tick(1);}}tick(.5);return{start:true,n,labels,paid:S.cash-c0,...DONE()}}''')
        print('delivery', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['labels'] == r['n'] and r['paid'] >= 50 and r['done'], 'delivery bikes: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic;S.ev=null;const ST=G.STAGE,y=(ST.roadsY[2]+3)*48,x=(ST.roadsX[2]+8)*48;
          const me=T.makeVehicle({type:'sedan',x,y,a:0,parked:true});me.unlocked=true;S.vehicles.push(me);P.car=me;me.ai=false;P.x=x;P.y=y;me.v=200;
          const e=EV('rage');if(!e)return{start:false};for(let k=0;k<60;k++){T.updateDriving(P,0,-1,1,1/60);G.update(1/60);}me.v=0;
          let k=0;while(!e.out&&k<1800){T.updateDriving(P,0,0,0,1/60);G.update(1/60);k++;}const out=!!e.out,sec=Math.round(k/60);P.car=null;
          const c0=S.cash;if(e.out)G.killGuard(e.out);tick(.5);return{start:true,out,sec,paid:S.cash-c0,...DONE()}}''')
        print('rage', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['out'] and r['paid'] == 100 and r['done'], 'road rage: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
