"""Free mode melee: facing someone (or once spotted) [공격] punches — jab, hook, a heavy third hit; enough hits knock
them out. Passers-by mostly flee, tough ones and gang members fight back with their fists. With the knife selected the
swing leaves a slash arc and two cuts kill; a knife takedown from behind kills instead of knocking out."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.skNext=1e9;
  for(const g of S.guards)if((g.fac&&!g.civ)||g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  /* 행인 하나를 내 앞(정면, 나를 보고)에 세운다 */
  window.FACE=(body,fac)=>{const P=S.player,ST=G.STAGE;P.car=null;P.strikeT=0;P.brawling=false;P.brawlQueued=false;P.combo=0;window.FN=(window.FN||0)+1;P.x=(ST.roadsX[2]+6)*48+window.FN*160;P.y=(ST.roadsY[2]+2)*48+24;P.a=0;S.wanted=0;
    for(const o of S.guards)if(o.state!=='DEAD'&&!o.off&&Math.hypot(o.x-P.x,o.y-P.y)<700){o.x+=6000;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;}
    const g=S.guards.find(o=>o.civ&&!o.child&&!o.evt&&!o.crew&&o.state==='PATROL'&&!o.off&&!o.student&&o.x>3000);g.body=body||g.body;if(fac){g.fac=fac;g.civ=false;}g.x=P.x+34;g.y=P.y;g.a=Math.PI;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.bhp=null;g.bhpMax=null;g.fist=false;return g;};
  window.HIT=(n,g)=>{for(let i=0;i<n;i++){if(g&&g.state!=='DEAD'){const P=S.player;g.x=P.x+34;g.y=P.y;}G.actAttack();for(let k=0;k<30;k++)G.update(1/60);}};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        # 맨손: 정면의 행인 — 두 대면 기절 (죽지 않는다)
        r = await q.evaluate('''()=>{const G=__game,S=G.S;S.guns={};S.wpn=null;const g=FACE('fBob');HIT(1,g);const after1={bhp:g.bhp,state:g.state};HIT(2,g);const c=S.corpses.find(o=>o.g===g);
          return{after1,state:g.state,ko:!!(c&&c.ko),punches:G.events.fst.punches||0}}''')
        print('fist', json.dumps(r, ensure_ascii=False))
        ok(r['after1']['bhp'] == 1 and r['state'] == 'DEAD' and r['ko'] and r['punches'] >= 1, 'fist on passer-by: %s' % r)
        # 덩치 조직원: 맞서 싸운다 — 내 체력이 깎인다
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const g=FACE('big','D');P.hp=P.hpMax||3;P.hurtT=0;HIT(1,g);const fist=!!g.fist||g.state==='ALERT';const hp0=P.hp;for(let k=0;k<60*4&&P.hp===hp0;k++){G.update(1/60);}
          return{fist,hurt:hp0-P.hp,bhp:g.bhp}}''')
        print('fight back', json.dumps(r, ensure_ascii=False))
        ok(r['fist'] and r['hurt'] >= 1 and r['bhp'] is not None and r['bhp'] < 4, 'tough guy does not fight back: %s' % r)
        # 세 번째 주먹은 묵직하다 (2 깎음)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const g=FACE('big');g.bhpMax=9;P.combo=0;P.comboT=-9;const hp=[];for(let i=0;i<3;i++){G.actAttack();for(let k=0;k<26;k++)G.update(1/60);hp.push(g.bhp);g.x=P.x+34;g.y=P.y;g.stunT=S.t+5;}return{hp}}''')
        print('combo', json.dumps(r, ensure_ascii=False))
        ok(r['hp'] == [8, 7, 5], 'heavy third hit: %s' % r)
        # 칼: 한 번 휘두르면 궤적, 두 번 깎여 쓰러지고 죽는다
        r = await q.evaluate('''()=>{const G=__game,S=G.S;S.guns={knife:1};S.wpn='knife';const g=FACE('fBob');G.actAttack();const slash=(S.slashes||[]).length;for(let k=0;k<30;k++)G.update(1/60);const c=S.corpses.find(o=>o.g===g);
          return{slash,state:g.state,ko:!!(c&&c.ko),wanted:S.wanted}}''')
        print('knife', json.dumps(r, ensure_ascii=False))
        ok(r['slash'] >= 1 and r['state'] == 'DEAD' and not r['ko'], 'knife: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
