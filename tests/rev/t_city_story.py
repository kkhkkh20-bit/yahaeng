"""Free mode story: phone calls are the main story (chapters in order, retry on failure, debrief of the last chapter
in the next call); gang contacts carry three-step side stories; progress survives a save. The sign-drop contract
hangs a sign over the target's walk and a released sign kills as an accident."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  window.CALL=()=>{const P=S.player,p=S.phones.reduce((a,b)=>Math.hypot(b.x-P.x,b.y-P.y)<Math.hypot(a.x-P.x,a.y-P.y)?b:a);P.x=p.x-40;P.y=p.y+4;P.car=null;S.ringPhone=p;S.ringT0=S.t;tick(.05);G.events.enterBooth(p);tick(1.2);
    const lines=[];let k=0;while(G.DLG.modal&&k<30){lines.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();tick(.05);k++;}tick(1);return lines};
  window.KILL=()=>{const h=S.hit;h.g.shotT=null;G.killGuard(h.g);for(let k=0;k<60&&S.hit;k++)tick(1/30);};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        r = await q.evaluate('''()=>{const S=__game.S,l=CALL(),h=S.hit;return{ch:S.story.ch,lines:l,hit:h&&{name:h.name,story:h.story,ctr:h.ctr}}}''')
        print('ch1', json.dumps(r, ensure_ascii=False)[:400])
        ok(r['ch'] == 0 and r['hit'] and r['hit']['story'] == 0 and r['hit']['name'] == '문태식' and any('메인 이야기 1/6' in t for t in r['lines']), 'first call is not chapter 1: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S;KILL();return{ch:S.story.ch,hit:!!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('done1', r); ok(r['ch'] == 1 and not r['hit'] and '메인 이야기 1/6 완료' in r['banner'], 'chapter 1 did not complete: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S;while(__game.DLG.modal)__game.advanceDialog();const t0=S.story.nextT>S.t,nr=CALL(),norm=!!(S.hit||S.job)&&!(S.hit&&S.hit.story!=null);if(S.hit)__game.events.contractFail(S.hit,'x');S.hit=null;S.job=null;while(__game.DLG.modal)__game.advanceDialog();S.story.nextT=0;const l=CALL(),h=S.hit;return{gap:t0&&norm,lines:l,hit:h&&{name:h.name,story:h.story,ctr:h.ctr}}}''')
        print('ch2', json.dumps(r, ensure_ascii=False)[:400])
        ok(r['gap'], 'no ordinary call between chapters: %s' % r.get('gap'))
        ok(r['hit'] and r['hit']['story'] == 1 and r['hit']['ctr'] == 'roadkill' and any('검은 장미' in t for t in r['lines']), 'second call lacks debrief or roadkill: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S;G.events.contractFail(S.hit,'실패');S.story.nextT=0;const l=CALL();return{failed:S.story.failed,ch:S.story.ch,retry:l.some(t=>t.includes('한 번 더')),story:S.hit&&S.hit.story}}''')
        print('retry', r); ok(r['ch'] == 1 and r['retry'] and r['story'] == 1, 'failed chapter is not retried: %s' % r)
        # 조직 이야기
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events;if(S.hit){E.contractFail(S.hit,'x');}S.hit=null;S.job=null;while(G.DLG.modal)G.advanceDialog();
          const ms=E.contactMissions('A'),first=ms[0].name;const went=ms[0].go();while(G.DLG.modal)G.advanceDialog();const chain=S.job&&S.job.chain;E.endJob(true,'끝',100);tick(2);while(G.DLG.modal)G.advanceDialog();
          const next=E.contactMissions('A')[0].name;E.saveFreeProgress(true);const saved=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/free/i.test(k)))||'{}');
          return{first,went,chain,side:S.story.side.A,next,saved:saved.story&&saved.story.side}}''')
        print('side', json.dumps(r, ensure_ascii=False))
        ok(r['first'].startswith('[이야기 1/3]') and r['went'] and r['chain'] and r['side'] == 1 and r['next'].startswith('[이야기 2/3]') and r['saved'] and r['saved'].get('A') == 1, 'gang side story does not chain or save: %s' % r)
        # 간판 사고
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events,P=S.player;S.hit=null;S.job=null;S.wanted=0;const plan=E.planHit();plan.ctr='sign';E.startHit(plan);const h=S.hit;if(!h||!h.sign)return{sign:false,ctr:h&&h.ctr};
          const t=h.sign,gm=E.signGeometry(t);for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}
          P.z=gm.z;P.fl=0;P.x=gm.x;P.y=gm.y+6;tick(.1);const near=E.nearTrap();const label=near&&near.label;
          const g=h.g;g.x=(t.hit[0]+1.5)*48;g.y=(t.hit[1]+.5)*48;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.state='PATROL';
          const began=E.beginSignRelease(t);let k=0;while(S.hit&&k<240){tick(1/30);k++;}
          return{sign:true,label,began,done:!S.hit,dead:g.state==='DEAD',banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('sign', json.dumps(r, ensure_ascii=False))
        ok(r['sign'] and r['label'] and '간판' in r['label'] and r['began'] and r['dead'] and r['done'] and '간판 사고 성공' in r['banner'], 'sign drop contract: %s' % r)
        # 뺑소니: 차로 치면 성공
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events,T=G.traffic,P=S.player;S.hit=null;S.job=null;S.wanted=0;P.z=0;P.trav=null;const plan=E.planHit();plan.ctr='roadkill';E.startHit(plan);const h=S.hit,g=h.g;
          const ry=G.STAGE.roadsY[2],rx=G.STAGE.roadsX[2],y=(ry+3)*48,x=(rx+8)*48;for(const o of S.vehicles)if(Math.abs(o.x-x)<900&&Math.abs(o.y-y)<300){o.x=-9999;o.ai=false;}
          for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}g.x=x+220;g.y=y;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.state='PATROL';
          const me=T.makeVehicle({type:'sedan',x,y,a:0,parked:true});me.unlocked=true;S.vehicles.push(me);P.car=me;me.ai=false;P.x=x;P.y=y;
          for(let k=0;k<300&&S.hit;k++){T.updateDriving(P,0,-1,1,1/60);G.update(1/60);}
          return{dead:g.state==='DEAD',done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('roadkill', json.dumps(r, ensure_ascii=False))
        ok(r['dead'] and r['done'] and '뺑소니 성공' in r['banner'], 'roadkill contract: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
