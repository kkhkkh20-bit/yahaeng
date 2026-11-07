"""Controlled HUD presentation fixtures; camera/actors are posed, not gameplay evidence."""
import asyncio,argparse,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
async def main(args):
 out=R/args.out;out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  sizes=[('portrait',390,844,True),('short',390,640,True),('small',320,568,True),('landscape',844,390,True),('compact',568,320,True),('desktop',1280,800,False)]
  for name,w,h,touch in sizes:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();(()=>{let q=[],t=1000;requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()''')
   await q.goto(args.url or (R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate('document.fonts.ready')
   for scene in ['walk','approach','wardrobe','danger']:
    await q.evaluate('''scene=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===(scene==='approach'?'p0':scene==='danger'?'p2':'p1')),false);while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.fade=0;
     if(scene==='walk'){Object.assign(P,{x:840,y:552,outfit:'crew',disguise:'sam',mode:'walk'});S.starterPass=true;}
     if(scene==='approach')Object.assign(P,{x:660,y:408,mode:'sneak'});
     if(scene==='wardrobe'){const g=S.guards.find(g=>g.tag==='uniformDonor');S.koNext=true;G.killGuard(g,null,null,true);Object.assign(P,{x:617,y:696,mode:'sneak'});}
     if(scene==='danger'){Object.assign(P,{x:744,y:360});const g=S.guards[0];Object.assign(g,{x:790,y:360,a:Math.PI,state:'ALERT',seen:true,rawSeen:true,eyeT:1,meter:.65,lastSeen:{x:P.x,y:P.y,fl:0,z:0}});}
     if(scene==='danger')S.expo=2;P.light=G.lightAt(P.x,P.y);G.moveCamera(1);G.updateHUD(true);if(scene!=='danger')window.__step(3);G.syncEpisodeRadio();G.benchDraw(2);
    }''',scene)
    for _ in range(7):await q.evaluate('__game.benchDraw(1)');await q.wait_for_timeout(80)
    await q.screenshot(path=str(out/f'{name}-{scene}.png'))
    geometry=await q.evaluate('''()=>{const box=e=>{const r=e.getBoundingClientRect();return{id:e.id||e.className,x:r.x,y:r.y,w:r.width,h:r.height,visible:!e.hidden&&getComputedStyle(e).visibility!=='hidden'&&r.width>0&&r.height>0}};return{header:box(document.querySelector('#hud .obj')),status:box(document.querySelector('#stealth')),buttons:[...document.querySelectorAll('#hud .pad>button,#btnCrouch,#btnPause,#mini')].map(box),summary:document.getElementById('objectiveSummary').textContent}}''')
    rows.append({'device':name,'scene':scene,'geometry':geometry,'errors':errors[:]})
    if scene=='walk':
     await q.click('#hud .obj');await q.screenshot(path=str(out/f'{name}-reading.png'));await q.click('#hud .obj')
     await q.click('#btnToolNext',force=True)if touch else await q.keyboard.press('i')
     await q.screenshot(path=str(out/f'{name}-equipment.png'));await q.click('#btnLoadoutClose')
   assert not errors,(name,errors);print('CAPTURED',name,flush=True);await q.close()
  await b.close()
 (out/'geometry.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url');a.add_argument('--out',default='build/field-hud-v211/after');asyncio.run(main(a.parse_args()))
