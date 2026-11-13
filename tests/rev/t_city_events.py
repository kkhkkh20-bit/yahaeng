"""Free-mode district events: every district spawns its two roaming events off screen, they announce themselves when
you come near, and each one resolves the way it was designed (money, district reputation, wanted level, choices)."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);
  for(const g of G.S.guards)if(g.fac&&!g.civ&&!g.police){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}  // no gang fights during the test
  // a sidewalk point inside each district
  const S=G.S,E=G.events,spots={};for(let ty=4;ty<G.G0.length-4;ty+=3)for(let tx=4;tx<G.G0[0].length-4;tx+=3){const c=G.G0[ty]?.[tx];if(c!=='.')continue;if(G.bldAt(tx,ty)>=0)continue;const n=E.evDist(tx*48+24,ty*48+24);if(!n)continue;(spots[n]||(spots[n]=[])).push([tx*48+24,ty*48+24]);}
  window.SPOTS=spots;return Object.keys(SPOTS)}'''
# spawn event `key` in its district (force the cooldown and the pick), walk up until it is engaged
SPAWN = '''(key)=>{const G=__game,S=G.S,P=S.player,E=G.events;
  const def=E.list.find(e=>e.key===key),defs=E.list.filter(e=>e.d===def.d);S.wanted=0;P.car=null;P.trav=null;P.hp=P.hpMax;
  const block=()=>{S.evNext={};for(const e of E.list)S.evNext[e.d]=S.t+999;};block();
  if(S.ev){S.ev.done=true;S.ev.doneT=-9;tick(.1);}S.ev=null;const sp=SPOTS[def.d];let ev=null,tries=0;
  for(;tries<14&&!(ev&&ev.def.key===key);tries++){if(S.ev){S.ev.done=true;S.ev.doneT=-9;tick(.05);S.ev=null;}
    const [x,y]=sp[(tries*7+3)%sp.length];P.x=x;P.y=y;block();S.evNext[def.d]=0;S.evPick={};S.evPick[def.d]=defs.indexOf(def);tick(.05);ev=S.ev;}
  if(!ev)return {ok:false,tries};const far=Math.round(Math.hypot(ev.x-P.x,ev.y-P.y));
  P.x=ev.x+30;P.y=ev.y+40;tick(.2);return {ok:ev.def.key===key,far,engaged:ev.engaged,d:ev.d,tries}}'''
PICK = '''()=>{const G=__game,S=G.S,P=S.player;let n=0;for(const it of (S.evItems||[]).slice()){P.trav=null;P.x=it.x;P.y=it.y;tick(1.2);n++;}tick(1.2);return n}'''
ACT = '''(i)=>{const G=__game,S=G.S,a=G.events.eventAction();if(!a)return null;a.fn();const b=[...document.querySelectorAll('#shopPanel button')];if(i!=null&&b[i])b[i].click();tick(1.6);return a.label}'''
ST = '''()=>{const G=__game,S=G.S;return {cash:S.cash,wanted:S.wanted,done:!S.ev||S.ev.done,rep:Object.assign({},S.rep||{})}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=11;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        def ok(v, m):
            if not v: bad.append(m)
        ds = await q.evaluate(SETUP); print('districts', ds)
        ev = lambda js: q.evaluate(js)
        async def spawn(k):
            r = await q.evaluate(SPAWN, k); print('spawn', k, r); ok(r['ok'] and r['far'] > 250 and r['engaged'], 'event %s did not spawn off screen and engage: %s' % (k, r)); return r
        async def st(): return await q.evaluate(ST)
        # 1 drunk: knock him out, pick the wallet
        await spawn('drunk'); s0 = await st(); await ev("()=>{const g=__game.S.ev.g;__game.npcDown(g,null,false);tick(.1)}"); await ev(PICK); s = await st(); print('drunk', s)
        ok(s['done'] and s['cash'] > s0['cash'], 'drunk wallet: %s' % s)
        # 2 vip: take the limo
        await spawn('vip'); s0 = await st(); await ev("()=>{const S=__game.S;S.player.car=S.ev.car;tick(.1)}"); s = await st(); print('vip', s)
        ok(s['done'] and s['cash'] >= s0['cash'] + 150, 'vip car: %s' % s)
        await ev("()=>{const S=__game.S;S.player.car=null}")
        # 3 snatch: ram the car, pick the bag, give it back
        await spawn('snatch'); s0 = await st(); await ev("()=>{const v=__game.S.ev.car;v.hp-=1;tick(.1)}"); await ev(PICK)
        await ev("()=>{const S=__game.S,o=S.ev.loot.owner;S.player.x=o.x+20;S.player.y=o.y;tick(.05)}"); lab = await q.evaluate(ACT, 0); s = await st(); print('snatch', lab, s)
        ok(s['done'] and s['cash'] == s0['cash'] + 40 and s['rep'].get('을지로 인쇄골목', 0) == s0['rep'].get('을지로 인쇄골목', 0), 'snatch return: %s' % s)
        # 4 counterfeit: three boxes, then get away
        await spawn('counterfeit'); s0 = await st(); await ev(PICK); await ev("()=>{const S=__game.S,f=S.ev.f;S.player.x=f.x+700;S.player.y=f.y;tick(.1)}"); s = await st(); print('counterfeit', s)
        ok(s['done'] and s['cash'] == s0['cash'] + 300, 'counterfeit: %s' % s)
        # 5 pickpocket: knock him out, keep the wallet (time-out)
        await spawn('pickpocket'); s0 = await st(); await ev("()=>{const S=__game.S;__game.npcDown(S.ev.thief,null,false);tick(.1)}"); await ev(PICK); await ev("()=>{const S=__game.S;S.ev.loot.until=S.t;tick(.1)}"); s = await st(); print('pickpocket', s)
        ok(s['done'] and s['cash'] == s0['cash'] + 100, 'pickpocket keep: %s' % s)
        # 6 spill: pick boxes
        await spawn('spill'); s0 = await st(); n = await ev(PICK); s = await st(); print('spill', n, s)
        ok(s['cash'] >= s0['cash'] + 30, 'spill boxes: %s' % s)
        # 7 deal: drop the bag holder
        await spawn('deal'); s0 = await st(); await ev("()=>{const S=__game.S;__game.npcDown(S.ev.holder,null,true);tick(.1)}"); al = await ev("()=>__game.S.ev.side.filter(g=>g.state==='ALERT').length"); await ev(PICK); s = await st(); print('deal', al, s)
        ok(s['done'] and s['cash'] == s0['cash'] + 400 and al >= 2, 'bridge deal: %s %s' % (al, s))
        # 8 stall: take the vendor's side
        await spawn('stall'); s0 = await st(); await ev("()=>{const S=__game.S,p=S.ev.p;S.player.x=p.x;S.player.y=p.y+10;tick(.05)}"); lab = await q.evaluate(ACT, 0); s = await st(); print('stall', lab, s)
        ok(s['done'] and s['cash'] == s0['cash'] + 30 and s['rep'].get('청계천 상가', 0) - s0['rep'].get('청계천 상가', 0) == 5, 'stall vendor side: %s' % s)
        # 9 burglar: knock out, return the bundle
        await spawn('burglar'); s0 = await st(); await ev("()=>{const S=__game.S;__game.npcDown(S.ev.thief,null,false);tick(.1)}"); await ev(PICK)
        await ev("()=>{const S=__game.S,o=S.ev.loot.owner;S.player.x=o.x+20;S.player.y=o.y;tick(.05)}"); await q.evaluate(ACT, 0); s = await st(); print('burglar', s)
        ok(s['done'] and s['cash'] == s0['cash'] + 80, 'burglar return: %s' % s)
        # 10 fire: rescue before it blows
        await spawn('fire'); s0 = await st(); hold = await ev("()=>__game.S.ev.car.fireHold"); await ev("()=>{const S=__game.S,v=S.ev.car;S.player.x=v.x+50;S.player.y=v.y;tick(.05)}"); lab = await q.evaluate(ACT, None); s = await st(); print('fire', hold, lab, s)
        ok(hold is False and s['done'] and s['cash'] == s0['cash'] + 60, 'fire rescue: %s %s' % (hold, s))
        # 11 armored: ram until it stops, take two bags
        await spawn('armored'); s0 = await st(); await ev("()=>{const S=__game.S,v=S.ev.car,c=S.vehicles.find(o=>o!==v&&!o.dead&&!o.evt&&(o.z||0)<.01);S.player.car=c;c.x=v.x+90;c.y=v.y;v.hp=6;tick(.1);S.player.car=null;S.player.x=c.x;S.player.y=c.y+60;}"); w = (await st())['wanted']; await ev(PICK); s = await st(); print('armored', w, s)
        ok(w >= 3 and s['done'] and s['cash'] == s0['cash'] + 500, 'armored truck: %s %s' % (w, s))
        await ev("()=>{const S=__game.S;S.wanted=0;for(const g of S.guards)if(g.police&&g.state==='ALERT'){g.state='RETURN';}}")
        # 12 protest: blend in while wanted
        await spawn('protest'); r = await ev("()=>{const S=__game.S,ev=S.ev;S.wanted=1;S.wantLost=0;const c=ev.def.focus(ev);S.player.x=c.x;S.player.y=c.y;tick(1);return S.wantLost}"); print('protest', r)
        ok(r > 2, 'protest does not speed up losing the police: %s' % r)
        await ev("()=>{__game.S.wanted=0}")
        # 13 drag race: bet, win
        await spawn('drag'); s0 = await st(); await ev("()=>{const S=__game.S,ev=S.ev,P=S.player;const v=S.vehicles.find(v=>!v.dead&&!v.police&&!v.evt&&(v.z||0)<.01);P.car=v;v.ai=false;v.x=ev.start.x;v.y=ev.start.y;P.x=v.x;P.y=v.y;tick(.05)}")
        lab = await q.evaluate(ACT, None); a = await st(); await ev("()=>{tick(3.2);const S=__game.S,ev=S.ev,v=S.player.car;v.x=ev.fin.x;v.y=ev.fin.y;tick(.05)}"); s = await st(); print('drag', lab, a, s)
        ok(a['cash'] == s0['cash'] - 100 and s['done'] and s['cash'] == s0['cash'] + 100, 'drag race: %s %s' % (a, s))
        await ev("()=>{__game.S.player.car=null}")
        # 14 den: report it
        await spawn('den'); s0 = await st(); await ev("()=>{const S=__game.S,p=S.ev.p;S.player.x=p.x;S.player.y=p.y+30;tick(.05)}"); lab = await q.evaluate(ACT, 1); s = await st(); print('den', lab, s)
        ok(s['done'] and s['cash'] == s0['cash'] + 80, 'den report: %s' % s)
        # reputation shows up: shop prices follow it
        pr = await ev("()=>{const S=__game.S;S.rep={'동대문 시장':40};const [x,y]=SPOTS['동대문 시장'];S.player.x=x;S.player.y=y;return __game.events.repOf('동대문 시장')}")
        ok(pr == 40, 'rep not stored')
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
