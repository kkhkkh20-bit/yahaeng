"""Free mode outlaw freedom (47zt4): rob a passer-by (armed: they hand it over, then report 15 s later), go through a knocked-out
person's pockets, a rude passer-by who picks a fight can be beaten without witnesses calling it in and begs when nearly down
(forgive / take the wallet), shop tills can be robbed at gunpoint (CCTV: 2 stars), the police box has an evidence safe and an
arms locker that pay out and raise the alarm, its desk staff are police officers, and emptying a district of residents is noticed."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,E=G.events;S.copT=1e9;S.evNext={};for(const e of E.list)S.evNext[e.d]=1e9;window.O=E.outlaw();
  window.plain=g=>g.civ&&!g.off&&!g.evt&&!g.staff&&!g.police&&!g.child&&!g.dog&&!g.crew&&!['big','vest','old'].includes(g.body)&&g.state==='PATROL'&&!g.fl&&!(g.z>0);
  return {n:S.guards.length}}'''
MUG = '''()=>{const G=__game,S=G.S,P=S.player;P.car=null;P.fl=0;P.z=0;G.setLayer(0);const g=S.guards.find(o=>plain(o)&&!S.guards.some(q=>q!==o&&q.civ&&!q.off&&q.state!=='DEAD'&&Math.hypot(q.x-o.x,q.y-o.y)<120));P.x=g.x;P.y=g.y+30;P.a=-Math.PI/2;g.route=[{x:g.x,y:g.y,pause:999}];g.ri=0;
  S.guns=S.guns||{};S.guns.knife=1;S.wpn='knife';S.wanted=0;const c0=S.cash||0;const t=O.mugTarget();const R=Math.random;Math.random=()=>0.01;O.mug(t);Math.random=R;
  const got=(S.cash||0)-c0;tick(1);const w1=S.wanted;tick(16);return {same:t===g,got,robbed:!!g.robbed,w1,w2:S.wanted,again:O.mugTarget()===g}}'''
WALLET = '''()=>{const G=__game,S=G.S,P=S.player;S.wanted=0;S.wpn=null;const g=S.guards.find(o=>plain(o)&&!o.robbed&&Math.hypot(o.x-P.x,o.y-P.y)>200);O.down(g,false);const c=S.corpses[S.corpses.length-1];P.trav=null;P.x=c.x;P.y=c.y+20;
  const t=O.walletTarget(),acts=O.actions().map(a=>a.label);const c0=S.cash||0;O.wallet(t);tick(1.5);return {same:t===c,acts,got:(S.cash||0)-c0,again:!!O.walletTarget()}}'''
RUDE = '''()=>{const G=__game,S=G.S,P=S.player;S.wanted=0;P.trav=null;
  let g=null;for(let i=0;i<40&&!g;i++){const o=S.guards.filter(o=>plain(o)&&!o.robbed&&!o.rudeDone)[i*7];if(!o)continue;P.x=o.x;P.y=o.y+170;O.rudeNext=0;tick(1.2);g=O.rude}
  if(!g)return {none:true};let said=[];for(let i=0;i<140&&!(g.rude&&g.rude.ph==='talk'&&said.length);i++){tick(.1);if(g.say&&!said.includes(g.say.text||g.say))said.push(g.say.text||g.say)}
  const ph=g.rude&&g.rude.ph,d=Math.hypot(g.x-P.x,g.y-P.y);g.bhp=1;O.rudeHit(g);const beg=!!g.beg,acts=O.actions().map(a=>a.label);
  const r0=(S.fst.rudeTaught||0);O.forgive(g);tick(1);return {ph,d:Math.round(d),said,beg,acts,taught:(S.fst.rudeTaught||0)-r0,cleared:!g.rude&&O.rude!==g,wanted:S.wanted,evt:g.evt||null}}'''
TILL = '''()=>{const G=__game,S=G.S,E=G.events,P=S.player;S.wanted=0;const o=S.shops.find(o=>o.name==='약국');const A=G.PLANS[o.b][0].store;P.fl=0;P.z=0;G.setLayer(0);P.trav=null;P.x=(A.x0+2.5)*48;P.y=A.y1*48+24;tick(1.2);
  const g=S.guards.find(g=>g.staff==='pharm'&&!g.off);P.x=g.x;P.y=g.y+56;tick(.2);S.guns.pistol=12;S.wpn='pistol';E.staffChatAction().fn();
  const btn=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent);const b=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.startsWith('계산대'));const c0=S.cash||0;if(b)b.click();
  const got=(S.cash||0)-c0;S.wpn=null;E.staffChatAction().fn();const btn2=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent);[...document.querySelectorAll('#shopPanel button')].pop().click();
  return {btn,got,wanted:S.wanted,btn2}}'''
STATION = '''()=>{const G=__game,S=G.S,P=S.player;S.wanted=0;S.wpn=null;const bi=G.BLD.findIndex((b,i)=>O.stationOf(i)&&O.stationFurn(i,'safe'));if(bi<0)return {none:true,n:G.BLD.filter((b,i)=>O.stationOf(i)).length};
  const sf=O.stationFurn(bi,'safe'),lk=O.stationFurn(bi,'locker');P.trav=null;P.fl=0;P.z=0;G.setLayer(0);P.x=(sf.x+0.5)*48;P.y=(sf.y+0.5)*48;
  const fr=[[0,1],[-1,0],[1,0],[0,-1]].map(([dx,dy])=>[sf.x+dx,sf.y+dy]).find(([x,y])=>!G.solidAt(x,y));if(fr){P.x=(fr[0]+0.5)*48;P.y=(fr[1]+0.5)*48}tick(1.2);
  const staff=(S.staffB.get(bi)||[]).map(g=>({police:!!g.police,outfit:g.outfit,staff:g.staff}));
  for(const g of S.staffB.get(bi)||[])if(g.police)O.down(g,false);   // 근무자를 먼저 재운다 → 들키지 않고 털고, 경보만 울린다
  const a=O.stationAction();const c0=S.cash||0;if(a)a.fn();tick(3.8);const got=(S.cash||0)-c0;const w1=S.wanted;tick(7);const w2=S.wanted;
  const a2=O.stationAction();let arms=null;if(lk){P.trav=null;const fl=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>[lk.x+dx,lk.y+dy]).find(([x,y])=>!G.solidAt(x,y));if(fl){P.x=(fl[0]+0.5)*48;P.y=(fl[1]+0.5)*48}
    const b=O.stationAction();const p0=S.guns.pistol||0;if(b&&b.label.startsWith('무기'))b.fn();tick(2.6);arms={label:b&&b.label,ammo:(S.guns.pistol||0)-p0,gren:S.guns.grenade||0,armor:P.armor||0}}
  return {label:a&&a.label,got,w1,w2,again:a2&&a2.label,staff,arms}}'''
POP = '''()=>{const G=__game,S=G.S;S.wanted=1;O.popUpdate();const st=O.popStatus().filter(s=>s.total>=8).sort((a,b)=>a.total-b.total)[0];if(!st)return {none:true};
  const L=S.olPop.get(st.d);for(const g of L.slice(0,Math.ceil(L.length*0.9)))if(G.events.charOf&&g.state!=='DEAD')O.down(g,true);O.popUpdate();const s2=O.popStatus().find(s=>s.d===st.d);
  return {d:st.d,total:st.total,alive:s2.alive,empty:s2.empty,emptied:S.fst.emptied||0,wanted:S.wanted}}'''

async def main():
    bad = []
    def ok(c, m):
        if not c: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        print('setup', await q.evaluate(SETUP))
        r = await q.evaluate(MUG); print('mug', r)
        ok(r['same'] and r['got'] > 0 and r['robbed'] and not r['again'] and r['w2'] >= 1, 'mugging: %s' % r)
        r = await q.evaluate(WALLET); print('wallet', json.dumps(r, ensure_ascii=False))
        ok(r['same'] and r['got'] > 0 and not r['again'] and any('주머니' in a for a in r['acts']), 'pocket search: %s' % r)
        r = await q.evaluate(RUDE); print('rude', json.dumps(r, ensure_ascii=False))
        ok(not r.get('none') and r['ph'] == 'talk' and r['d'] < 70 and r['said'] and r['beg'] and any('시비꾼' in a for a in r['acts']) and r['taught'] == 1 and r['cleared'] and r['wanted'] == 0 and not r['evt'], 'rude passer-by: %s' % r)
        r = await q.evaluate(TILL); print('till', json.dumps(r, ensure_ascii=False))
        ok(any(x.startswith('계산대') for x in r['btn']) and r['got'] > 0 and r['wanted'] >= 2 and not any(x.startswith('계산대') for x in r['btn2']), 'till robbery: %s' % r)
        r = await q.evaluate(STATION); print('station', json.dumps(r, ensure_ascii=False))
        ok(not r.get('none') and r['label'] and r['label'].startswith('증거물 금고') and r['got'] >= 250 and r['w1'] == 0 and r['w2'] >= 2 and '비어' in (r['again'] or ''), 'police box safe: %s' % r)
        ok(not r.get('none') and r['staff'] and all(s['police'] and s['staff'] == 'cop' for s in r['staff']), 'police box staff are not officers: %s' % r)
        ok(not r.get('none') and r['arms'] and r['arms']['ammo'] >= 24 and r['arms']['gren'] >= 2, 'arms locker: %s' % r)
        r = await q.evaluate(POP); print('pop', json.dumps(r, ensure_ascii=False))
        ok(not r.get('none') and r['empty'] and r['emptied'] == 1 and r['wanted'] >= 4, 'emptied district: %s' % r)
        ok(not errs, 'page errors: %s' % errs[:3])
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
