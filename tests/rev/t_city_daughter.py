"""Free mode revenge story 「사라진 딸」 (6 phone chapters, after main chapter 1 and alternating with the phishing chain):
the first call sends me after the karaoke manager to kidnap and interrogate in my basement; his confession is
story-specific; chapters advance, fail and retry like the phishing chain; the last one ends with my daughter found."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  S.story.ch=1;S.story.nextT=1e9;S.story.ph=6;
  window.CALL=()=>{S.wanted=0;const P=S.player,p=S.phones.reduce((a,b)=>Math.hypot(b.x-P.x,b.y-P.y)<Math.hypot(a.x-P.x,a.y-P.y)?b:a);P.x=p.x-40;P.y=p.y+4;P.car=null;S.ringPhone=p;S.ringT0=S.t;tick(.05);G.events.enterBooth(p);tick(1.2);
    const lines=[];let k=0;while(G.DLG.modal&&k<30){lines.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();tick(.05);k++;}tick(1);return lines};
  window.KILL=()=>{const h=S.hit;h.g.shotT=null;G.killGuard(h.g);for(let k=0;k<60&&S.hit;k++)tick(1/30);};}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate(SETUP)
        ok = lambda c, m: c or bad.append(m)
        # 1장: 노래방 실장 납치 → 지하실 → 압박 100% → 딸 이야기 자백
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events,T=G.traffic,P=S.player;const lines=CALL();const h=S.hit;if(!h)return{lines};const info={name:h.name,dtr:h.dtr,ctr:h.ctr};
          for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}const g=h.g;G.npcDown(g,null,false);tick(.3);const v=T.makeVehicle({type:'sedan',x:g.x+80,y:g.y,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);P.x=g.x+30;P.y=g.y;P.car=null;tick(.05);
          const a=E.captureAction();if(a)a.fn();tick(2.2);const home=S.safes[0];P.car=v;v.ai=false;v.x=home.x+60;v.y=home.y+60;v.v=0;P.x=v.x;P.y=v.y;tick(.3);
          const said=[];const opts=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent).join('|');let k=0;while(S.hit===h&&k<20){const b=[...document.querySelectorAll('#shopPanel button')].find(b=>!b.disabled&&b.textContent!=='나가기');if(b)b.click();let j=0;while(G.DLG.modal&&j<20){said.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();tick(.05);j++;}tick(1.6);k++;}
          return{lines,info,opts,said,done:!S.hit,dt:S.story.dt}}''')
        print('ch1', json.dumps(r, ensure_ascii=False)[:900])
        ok(r.get('info') and r['info']['dtr'] == 0 and r['info']['name'] == '마현철' and r['info']['ctr'] == 'capture' and any('사라진 딸' in t for t in r['lines']), 'first daughter call: %s' % r)
        ok('서연이 사진' in r.get('opts', ''), 'story-specific interrogation option missing: %s' % r.get('opts'))
        ok(any('표만식' in t for t in r.get('said', [])) and r.get('done') and r.get('dt') == 1, 'confession / chapter 1 done: %s' % r)
        # 2장: 사채업자 (무대형) — 실패하면 다시 / 마지막 장 끝나면 딸
        r = await q.evaluate('''()=>{const G=__game,S=G.S,E=G.events;while(G.DLG.modal)G.advanceDialog();S.story.dtNextT=0;S.hit=null;S.job=null;const l=CALL();const h=S.hit;const c2={dtr:h&&h.dtr,ctr:h&&h.ctr,debrief:l.some(t=>t.includes('표만식'))};
          E.contractFail(S.hit,'x');S.story.dtNextT=0;while(G.DLG.modal)G.advanceDialog();const l2=CALL();const retry=l2.some(t=>t.includes('다시 가'))&&S.hit&&S.hit.dtr===1;
          if(S.hit)E.contractFail(S.hit,'x');S.hit=null;while(G.DLG.modal)G.advanceDialog();S.story.dt=5;S.story.dtFailed=false;S.story.dtNextT=0;CALL();const h6=S.hit;const last={dtr:h6&&h6.dtr,ctr:h6&&h6.ctr,name:h6&&h6.name};
          E.dtrDone(h6,true);const end=[];for(let i=0;i<200&&!G.DLG.modal;i++)tick(.05);let k=0;while(G.DLG.modal&&k<20){end.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();tick(.05);k++;}
          return{c2,retry,last,end,dt:S.story.dt}}''')
        print('rest', json.dumps(r, ensure_ascii=False)[:900])
        ok(r['c2']['dtr'] == 1 and r['c2']['ctr'] == 'stage' and r['c2']['debrief'], 'chapter 2: %s' % r['c2'])
        ok(r['retry'], 'retry after failure missing')
        ok(r['last']['dtr'] == 5 and r['last']['ctr'] == 'snipe' and r['last']['name'] == '도경환' and r['dt'] == 6 and any('엄마' in t for t in r['end']), 'finale: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
