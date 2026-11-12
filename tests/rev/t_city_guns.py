"""Free-mode weapons.
- A gang contact (standing >= 0) offers '무기 거래'; buying a pistol arms it (chip shows ammo).
- With nobody in melee reach, [공격] fires: auto-aim at the person in front, one shot drops them, ammo goes down,
  two kills within 2 s count as a '더블'. Shotgun pellets damage a car.
- A grenade explodes after its fuse; a Molotov leaves a fire pool that sets people on fire.
- Guns and the chosen weapon are saved with free-mode progress."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]

async def main():
    bad = []
    def ok(v, m):
        if not v: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.cash=3000;S.stand={};
          for(const g of S.guards)if((g.fac&&!g.civ&&!g.contact)||g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];}
          window.CIV=(dx,dy)=>{const P=S.player,g=S.guards.find(g=>g.civ&&g.state!=='DEAD'&&!g.off&&!g.used);g.used=1;g.x=P.x+dx;g.y=P.y+dy;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;return g};}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,c=S.contacts.D;P.car=null;P.x=c.g.x+30;P.y=c.g.y+10;tick(.05);G.events.openContact('D');
          const rows=[...document.querySelectorAll('#shopPanel button')];const wb=rows.find(b=>b.textContent.includes('무기 거래'));if(!wb)return {offer:false};wb.click();
          const buy=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('권총'));buy.click();
          const chip=document.getElementById('wpnChip');document.querySelector('#shopPanel button:last-child').click();
          return {offer:true,ammo:S.guns.pistol,wpn:S.wpn,chip:chip&&!chip.hidden&&chip.textContent,cash:S.cash}}''')
        print('buy', r); ok(r['offer'] and r['ammo'] == 24 and r['wpn'] == 'pistol' and r['chip'], 'weapon shop: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ST=G.STAGE;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;P.a=0;tick(.05);const a=CIV(160,0),b=CIV(200,30);
          G.actAttack();tick(.35);const k1=JSON.stringify(S.kills),a1=a.state,b1=b.state;G.actAttack();tick(.35);return {a:a.state,b:b.state,ammo:S.guns.pistol,streak:S.kills.n,k1,a1,b1,gk:S.fst.gunKills}}''')
        print('shoot', r); ok(r['a'] == 'DEAD' and r['b'] == 'DEAD' and r['ammo'] == 22 and r['streak'] >= 2, 'pistol shots: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.guns.shotgun=4;S.wpn='shotgun';const v=G.traffic.makeVehicle({type:'sedan',x:P.x+120,y:P.y,parked:true});S.vehicles.push(v);const h0=v.hp;
          for(const g of S.guards)if(Math.abs(g.x-P.x)<400&&Math.abs(g.y-P.y)<400&&g.state!=='DEAD')g.x+=2000;P.a=0;G.actAttack();tick(.2);return {lost:h0-v.hp}}''')
        print('shotgun', r); ok(r['lost'] > 0, 'shotgun does not hit cars: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;tick(1);S.guns.grenade=1;S.wpn='grenade';const nb=(S.booms||[]).length;P.a=0;G.actAttack();tick(2);const boom=(S.booms||[]).length>nb;
          S.guns.molotov=1;S.wpn='molotov';P.x+=600;tick(1);P.a=0;G.actAttack();tick(.7);const pool=S.firePools.length;const g=CIV(0,0);const F=S.firePools[0];g.x=F.x;g.y=F.y;tick(.4);
          return {boom,pool,burning:!!g.burnT}}''')
        print('throw', r); ok(r['boom'] and r['pool'] == 1 and r['burning'], 'grenade/molotov: %s' % r)
        r = await q.evaluate('''()=>{const G=__game;G.events.cycleWeapon;const S=G.S;S.wpn='pistol';tick(2.5);const sv=JSON.parse(localStorage.getItem('yahaeng.free1')||'{}');
          G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();tick(.2);return {saved:sv.guns&&sv.guns.pistol,after:G.S.guns.pistol,wpn:G.S.wpn}}''')
        print('save', r); ok(r['saved'] == 22 and r['after'] == 22 and r['wpn'] == 'pistol', 'guns not saved: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
