"""Free mode phishing-ring chain: after main chapter 1, phone calls between main chapters walk up a voice-phishing ring
(collector -> recruiter -> manager -> launderer -> boss). Each call carries the previous step's debrief; finishing a
step advances the chain; a failure is retried; the chain waits two minutes between steps; progress is saved."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  S.story.ch=1;S.story.nextT=1e9;
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
        r = await q.evaluate('''()=>{const S=__game.S,l=CALL(),h=S.hit;return{lines:l,hit:h&&{name:h.name,phish:h.phish,ctr:h.ctr}}}''')
        print('step1', json.dumps(r, ensure_ascii=False)[:300])
        ok(r['hit'] and r['hit']['phish'] == 0 and r['hit']['name'] == '문광호' and any('상황실' in t for t in r['lines']), 'first phishing call: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S;KILL();return{ph:S.story.ph,hit:!!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('done1', r); ok(r['ph'] == 1 and not r['hit'] and '보이스피싱 사기단 1/5' in r['banner'], 'step 1 did not complete: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S;while(G.DLG.modal)G.advanceDialog();const l=CALL(),gap=!(S.hit&&S.hit.phish!=null);if(S.hit)G.events.contractFail(S.hit,'x');S.hit=null;S.job=null;while(G.DLG.modal)G.advanceDialog();
          S.story.phNextT=0;const l2=CALL(),h=S.hit;return{gap,lines:l2,hit:h&&{name:h.name,phish:h.phish,ctr:h.ctr}}}''')
        print('step2', json.dumps(r, ensure_ascii=False)[:300])
        ok(r['gap'], 'no break between phishing steps')
        ok(r['hit'] and r['hit']['phish'] == 1 and r['hit']['ctr'] == 'accident' and any('모집책' in t for t in r['lines']), 'step 2 lacks debrief or contract: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S;G.events.contractFail(S.hit,'x');S.story.phNextT=0;const l=CALL();const out={failed:S.story.phFailed,retry:l.some(t=>t.includes('다시 가')),phish:S.hit&&S.hit.phish};
          G.events.saveFreeProgress(true);const key=Object.keys(localStorage).find(k=>/free/i.test(k));out.saved=(JSON.parse(localStorage.getItem(key)||'{}').story||{}).ph;return out}''')
        print('retry', r); ok(r['failed'] and r['retry'] and r['phish'] == 1 and r['saved'] == 1, 'retry or save: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
