"""Free mode revenge events (vigilante, a necessary evil): a fraud seller fleecing the elderly with two bodyguards,
an animal abuser kicking a dog, a staged-accident gang shaking down a new driver. Taking them down pays from their
wallets, stamps 처리, runs a news ticker where the police call it a crime, and bystanders whisper instead of cheering.
District standing never goes up."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  window.EV=k=>{const def=G.events.list.find(e=>e.key===k);const P=S.player;/* 장면마다 깨끗하게: 앞 장면의 부상·쓰러짐·수배·수갑을 지운다 */P.hp=P.hpMax||3;P.hurtT=0;S.downing=null;S.wanted=0;S.wantLost=0;S.cuffs=null;P.cuffed=false;P.car=null;const e={def,key:k+':t',d:G.events.evDist(P.x,P.y)||'종로 유흥가',t0:S.t,actors:[],cars:[],x:P.x,y:P.y};if(!def.start(e))return null;S.ev=e;e.engaged=true;return e;};
  window.REP=()=>JSON.stringify(S.rep||{});
  window.DONE=()=>{const e=S.ev;return{done:!!(e&&e.done)||!S.ev,banner:(document.getElementById('evBanner')||{}).textContent||'',stamp:(document.getElementById('justiceStamp')||{}).textContent||'',news:(document.getElementById('newsTicker')||{}).textContent||''}};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        rep0 = await q.evaluate('REP()')
        # 떴다방: 다가가면 덩치 둘이 덤빈다 → 사기꾼을 쓰러뜨리면 돈 가방
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const e=EV('tteot');if(!e)return{start:false};P.x=e.g.x;P.y=e.g.y+150;tick(.5);const hot=!!e.hot,chase=e.thugs.map(g=>g.state);
          G.killGuard(e.g);tick(1.6);const d=DONE();const it=(S.evItems||[]).find(i=>i.evt===e.key);if(it){P.x=it.x;P.y=it.y;tick(.4);}return{start:true,hot,chase,dropped:!!e.dropped,loot:!!e.loot,stamp:d.stamp,news:d.news}}''')
        print('tteot', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['hot'] and all(s == 'ALERT' for s in r['chase']) and r['dropped'] and '처리' in r['stamp'] and '경찰' in r['news'], 'tteot: %s' % r)
        # 동물 학대범
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;S.copT=1e9;S.wanted=0;const c0=S.cash;const e=EV('animal');if(!e)return{start:false};P.hp=P.hpMax||3;for(let k=0;k<5*60;k++){P.x=e.g.x+500;P.y=e.g.y;P.hurtT=1;G.update(1/60);}/* 앞 단계에서 다친 몸 · 근처 조직원에게 맞아 쓰러지지 않게 *//* 놈을 따라다닌다 (멀어지면 '내 일 아니야'로 끝난다) */const kicks=e.kicks;const ch=G.events.charOf(e.dog);
          G.killGuard(e.g);tick(1.6);const civ=[];return{start:true,kicks,ch,paid:S.cash-c0,...DONE()}}''')
        print('animal', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['kicks'] >= 2 and r['ch'] == 'dog' and r['paid'] >= 30 and r['done'] and '처리' in r['stamp'], 'animal: %s' % r)
        # 자해공갈단: 셋 다 쓰러뜨려야 끝
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;S.wanted=0;const c0=S.cash;const e=EV('gongal');if(!e)return{start:false};const n=e.thugs.length;P.x=e.x;P.y=e.y;P.x=e.thugs[1].x+120;P.y=e.thugs[1].y;tick(.4);const hot=!!e.hot;
          G.killGuard(e.thugs[0]);G.killGuard(e.thugs[1]);tick(.3);const mid=!!e.done;G.killGuard(e.thugs[2]);tick(1.6);return{start:true,n,hot,mid,paid:S.cash-c0,car:!!e.car,...DONE()}}''')
        print('gongal', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['n'] == 3 and r['hot'] and not r['mid'] and r['done'] and r['paid'] >= 120 and r['car'], 'gongal: %s' % r)
        rep1 = await q.evaluate('REP()')
        rep0, rep1 = json.loads(rep0), json.loads(rep1)
        ok(all(rep1.get(k, 0) <= rep0.get(k, 0) for k in rep1), 'standing rose: %s -> %s' % (rep0, rep1))
        # 박수 대신 수군거림 (고맙다는 사람 없음)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;const e=EV('animal');const L=[];for(const g of S.guards)if(g.civ&&!g.evt&&g.state!=='DEAD'&&!g.off&&L.length<4){g.x=e.g.x+60+L.length*30;g.y=e.g.y+40;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;L.push(g);}
          G.killGuard(e.g);const says=[];for(let k=0;k<180;k++){G.update(1/60);for(const g of L)if(g.say&&!says.includes(g.say))says.push(g.say);}return{says}}''')
        print('crowd', json.dumps(r, ensure_ascii=False))
        ok(r['says'] and not any(w in ''.join(r['says']) for w in ['고마', '박수', '잘했다']), 'crowd: %s' % r)
        # 흉기 난동: 행인을 찌르고, 출동한 경찰도 당한다. 가까이 가면 나도 찌른다
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;S.wanted=0;S.copT=1e9;const c0=S.cash;const e=EV('knife');if(!e)return{start:false};const g=e.g;P.x=g.x+1000;P.y=g.y;
          const L=[];for(const o of S.guards)if(o.civ&&!o.evt&&!o.crew&&o.state==='PATROL'&&!o.off&&L.length<3){o.x=g.x+60+L.length*40;o.y=g.y+10;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;L.push(o);}
          for(let k=0;k<60*40&&!(e.victims>=1&&e.copsDown>=1);k++){P.x=g.x+1000;P.y=g.y;G.update(1/60);}const vict=e.victims,cops=e.cops.length,copsDown=e.copsDown,goal=e.def.goal(e);
          const hp0=P.hp;P.hurtT=0;for(let k=0;k<60*4&&P.hp===hp0;k++){P.x=g.x+20;P.y=g.y;G.update(1/60);}const hurt=hp0-P.hp;P.hp=hp0;
          G.killGuard(g);tick(1.6);return{start:true,vict,cops,copsDown,goal,hurt,paid:S.cash-c0,...DONE()}}''')
        print('knife', json.dumps(r, ensure_ascii=False))
        ok(r['start'] and r['vict'] >= 1 and r['copsDown'] >= 1 and r['hurt'] >= 1 and r['paid'] >= 150 and r['done'] and '경찰관' in r['news'], 'knife: %s' % r)
        # 떴다방 덩치는 노인을 밀쳐 넘어뜨린다 / 공갈단은 운전자를 때린다
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;let e=null;for(let k=0;k<8&&!e;k++){P.x+=700;e=EV('tteot');}if(!e)return{down:-1};P.x=e.g.x+900;P.y=e.g.y;e.engaged=false;tick(10);const down=e.olds.filter(o=>o.state==='DEAD').length;
          S.ev=null;let f=null;for(let k=0;k<8&&!f;k++){P.y+=500;f=EV('gongal');}if(!f)return{down,slap:'nostart'};P.x=f.x+900;P.y=f.y;f.engaged=false;tick(9);return{down,slap:!!f.slap}}''')
        print('villainy', json.dumps(r, ensure_ascii=False))
        ok(r['down'] >= 1 and r['slap'], 'villainy before I arrive: %s' % r)
        # 다가가면 주인공이 한마디 (거슬려서 치운다)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.ev=null;let e=null;for(let k=0;k<8&&!e;k++){P.x=(G.STAGE.roadsX[2]+2)*48+k*400;P.y=(G.STAGE.roadsY[2]+2)*48;P.fl=0;P.z=0;e=EV('animal');}/* 앞 장면이 나를 지도 끝에 두고 갈 수 있다 — 거리 한복판에서 */if(!e)return{engaged:false,banner:'nostart'};e.engaged=false;P.x=e.g.x+60;P.y=e.g.y;tick(.3);return{engaged:!!e.engaged,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('engage', json.dumps(r, ensure_ascii=False))
        ok(r['engaged'] and '(' in r['banner'], 'engage line: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
