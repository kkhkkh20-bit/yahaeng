"""Free mode cozy neighborhood events (any district, no fighting):
- the town has PC방 and a 119 안전센터 (spare shops renamed), plus 편의점, 지구대 and a 국밥/백반 place;
- snack: buy a rice ball at the convenience store (8) and hand it to the student;
- pcbang: fetch the son out of the PC방; he follows me back to his mom;
- puppy: find the lost dog (drawn as a dog), it follows me back to the kid at the 119 centre;
- lostgran: the grandma follows me slowly to the police box, an officer takes over;
- gukbap: carry a bowl from the restaurant to a house within 60s for a tip."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  for(const g of S.guards)if((g.fac&&!g.civ)||g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player,e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=true;return e;};
  window.ACT=e=>{const a=e.def.action&&e.def.action(e);if(a)a.fn();return a?a.label:null;};
  /* 따라오는 사람을 데리고 걷는다: 뒤처지면 기다린다 */
  window.WALK=(e,tx,ty,who,until)=>{const P=S.player,T=48;let path=G.astar(Math.floor(P.x/T),Math.floor(P.y/T),Math.floor(tx/T),Math.floor(ty/T));path.push({x:tx,y:ty});let i=0;
    for(let f=0;f<60*120&&!until();f++){const w=path[Math.min(i,path.length-1)],d=Math.hypot(w.x-P.x,w.y-P.y);if(d<4&&i<path.length-1)i++;else if(d>=4&&(!who||Math.hypot(who.x-P.x,who.y-P.y)<120)){P.a=Math.atan2(w.y-P.y,w.x-P.x);const st=Math.min(d,1.5);P.x+=Math.cos(P.a)*st;P.y+=Math.sin(P.a)*st;}G.update(1/60);}return !!until();};
  window.DONE=()=>{const e=S.ev;return{done:!!(e&&e.done)||!S.ev,banner:(document.getElementById('evBanner')||{}).textContent||''}};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        r = await q.evaluate('''()=>{const L=__game.events.signsOf(),n=k=>L.filter(s=>s.includes(k)).length;return{pc:n('PC방'),fire:n('119'),cvs:n('편의점'),cop:n('지구대'),food:n('국밥')+n('백반'),keys:__game.events.COZY.map(e=>e.key)}}''')
        print('places', json.dumps(r, ensure_ascii=False))
        ok(r['pc'] >= 1 and r['fire'] >= 1 and r['cvs'] >= 1 and r['cop'] >= 1 and r['food'] >= 1 and len(r['keys']) == 5, 'places: %s' % r)
        # 편의점 심부름
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.cash=100;const e=EV('snack');if(!e)return{start:false};const kid=e.kid;
          P.x=e.shop.x;P.y=e.shop.y+10;tick(.1);const l1=ACT(e);const got=!!e.got;P.x=kid.x+20;P.y=kid.y;tick(.1);const l2=ACT(e);tick(.3);
          return{start:true,l1,got,l2,cash:S.cash,body:kid.body,outfit:kid.outfit,...DONE()}}''')
        print('snack', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['got'] and r['cash'] == 92 and r['done'] and r['outfit'] == 'student', 'snack: %s' % r)
        # PC방 아들
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const c0=S.cash;const e=EV('pcbang');if(!e)return{start:false};P.x=e.shop.x;P.y=e.shop.y+10;tick(.1);const l1=ACT(e);tick(1.6);const son=e.son;if(!son)return{start:true,l1,son:false};
          const s0=[son.x-P.x|0,son.y-P.y|0,son.state];const ok=WALK(e,e.mom.x+40,e.mom.y,son,()=>e.done);return{s0,dbg:[P.x-e.mom.x|0,P.y-e.mom.y|0,son.x-P.x|0,son.y-P.y|0,son.state,son.route&&JSON.stringify(son.route).slice(0,80),!!son.path,S.ev===e],start:true,l1,son:son.outfit,ok,paid:S.cash-c0,...DONE()}}''')
        print('pcbang', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r.get('son') == 'gamer' and r.get('done') and r.get('paid') == 30, 'pcbang: %s' % r)
        # 강아지 찾기
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const c0=S.cash;const e=EV('puppy');if(!e)return{start:false};const d=e.dog;
          P.x=d.x+30;P.y=d.y;tick(.2);const found=!!e.found;const ch=G.events.charOf(d);const ok=WALK(e,e.kid.x+30,e.kid.y,d,()=>e.done);
          return{start:true,found,ch,ff:e.ff.outfit,ok,paid:S.cash-c0,...DONE()}}''')
        print('puppy', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['found'] and r['ff'] == 'firefighter' and r['done'] and r['paid'] == 20, 'puppy: %s' % r)
        ok(r.get('ch') == 'dog', 'dog drawn as a person: %s' % r)
        # 길 잃은 할머니
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const e=EV('lostgran');if(!e)return{start:false};const g=e.gran;P.x=g.x+30;P.y=g.y;tick(.2);const go=!!e.go;
          const ok=WALK(e,e.dest.x,e.dest.y,g,()=>e.done);return{start:true,go,ok,cop:!!(e.cop&&e.cop.police),...DONE()}}''')
        print('lostgran', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['go'] and r['done'] and r['cop'], 'lostgran: %s' % r)
        # 국밥 배달 (뜨끈할 때)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const c0=S.cash;const e=EV('gukbap');if(!e)return{start:false};P.x=e.shop.x;P.y=e.shop.y+10;tick(.1);const l1=ACT(e);if(!e.to)return{start:true,l1,to:false};
          const g0=e.def.goal(e);P.x=e.to.x;P.y=e.to.y+10;tick(.3);return{start:true,l1,boss:e.boss.outfit,g0,paid:S.cash-c0,...DONE()}}''')
        print('gukbap', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r.get('boss') == 'chef' and r.get('done') and r.get('paid') == 30 and '남은' in r.get('g0', ''), 'gukbap: %s' % r)
        # 화면: 119 안전센터 앞 (아이·소방관·강아지), PC방 앞 (엄마·게이머 아들)
        out = R / 'build/test_logs'; out.mkdir(parents=True, exist_ok=True)
        await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const e=EV('puppy');e.dog.x=e.kid.x+130;e.dog.y=e.kid.y+30;e.dog.route=[{x:e.dog.x,y:e.dog.y,pause:999}];P.x=e.kid.x-40;P.y=e.kid.y+100;tick(.3);G.moveCamera(2);G.updateHUD(true);G.benchDraw(2);}''')
        await asyncio.sleep(2); await q.evaluate('()=>{const G=__game;G.update(1/60);G.moveCamera(2);G.benchDraw(2);}')
        await q.screenshot(path=str(out / 'city_cozy_119.png'))
        await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const e=EV('pcbang');P.x=e.shop.x;P.y=e.shop.y+10;tick(.1);ACT(e);tick(1.6);e.mom.x=e.shop.x-70;e.mom.y=e.shop.y+30;e.mom.route=[{x:e.mom.x,y:e.mom.y,pause:999}];P.x=e.shop.x+40;P.y=e.shop.y+60;tick(.2);G.moveCamera(2);G.updateHUD(true);G.benchDraw(2);}''')
        await asyncio.sleep(2); await q.evaluate('()=>{const G=__game;G.update(1/60);G.moveCamera(2);G.benchDraw(2);}')
        await q.screenshot(path=str(out / 'city_cozy_pc.png'))
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
