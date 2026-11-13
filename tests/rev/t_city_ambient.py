"""Free mode street life: two passers-by quarrel and trade punches until one runs; when a villain hurts a passer-by,
a police officer runs over, takes him down and hauls him off (the event ends as '경찰이 먼저 잡았다')."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.skNext=1e9;S.quarrelT=1e9;
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player,e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=false;return e;};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        # 주민끼리 시비 → 주먹다짐 → 한 사람이 도망
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const ST=G.STAGE;P.x=(ST.roadsX[2]+6)*48;P.y=(ST.roadsY[2]+2)*48+24;
          const L=S.guards.filter(o=>o.civ&&!o.child&&!o.evt&&!o.crew&&o.state==='PATROL'&&!o.off&&!o.student).slice(0,2);L[0].x=P.x+200;L[0].y=P.y;L[1].x=P.x+260;L[1].y=P.y+10;for(const o of L){o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;}
          for(const o of S.guards)if(o.police){o.x=-9000;o.route=[{x:-9000,y:-9000,pause:999}];}
          const started=G.events.quarrelStart();const a=L.find(o=>o.cfight)||L[0];const said=[];let fled=null;for(let k=0;k<60*20;k++){G.update(1/60);for(const o of L)if(o.say&&!said.includes(o.say))said.push(o.say);if(!L.some(o=>o.cfight)){fled=L.find(o=>o.state==='PANIC'||o.state==='FLEE');break;}}
          return{started,said,over:!L.some(o=>o.cfight),fled:!!fled}}''')
        print('quarrel', json.dumps(r, ensure_ascii=False))
        ok(r['started'] and len(r['said']) >= 2 and r['over'] and r['fled'], 'quarrel: %s' % r)
        # 묻지마 폭행범: 행인을 치면 신고 → 경찰이 와서 제압·연행 → 사건은 "경찰이 먼저"
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;S.wanted=0;const e=EV('assault');const g=e.g;P.x=g.x+900;P.y=g.y;
          const c=S.guards.find(o=>o.civ&&!o.child&&!o.evt&&!o.crew&&o.state==='PATROL'&&!o.off&&!o.student&&!o.cfight);c.x=g.x+40;c.y=g.y;c.route=[{x:c.x,y:c.y,pause:999}];c.path=null;
          const cop=S.guards.find(o=>o.police&&o.beat);cop.x=g.x+260;cop.y=g.y;cop.route=[{x:cop.x,y:cop.y,pause:999}];cop.path=null;cop.state='PATROL';cop.incident=null;cop.brawl=null;
          let hitT=null,downT=null;for(let k=0;k<60*40;k++){P.x=g.x+900;P.y=g.y;G.update(1/60);if(hitT==null&&e.hits)hitT=k;if(g.state==='DEAD'&&downT==null)downT=k;if(downT!=null&&g.off)break;}
          return{hits:e.hits,criminal:hitT!=null,down:g.state,gone:!!g.off,copTook:!!e.copTook,done:!!e.done,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('arrest', json.dumps(r, ensure_ascii=False))
        ok(r['hits'] >= 1 and r['down'] == 'DEAD' and r['gone'] and r['copTook'] and '경찰이 먼저' in r['banner'], 'police arrest: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
