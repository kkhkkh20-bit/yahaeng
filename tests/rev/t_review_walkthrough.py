"""Walk the pharmacy, restaurant and upstairs code route using keyboard/joystick movement.
NPCs are fixed; live crowd and AI checks are in t_surfaces_dining.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FLOW=Path(__file__).with_name('mission_flow.js').read_text().split(' // Prioritize obtainable cards')[0]+'''
 const med=S.props.find(p=>p.id==='laxative');walk(at(med),'pharmacy shelf');let a=G.envChoices().find(a=>a.k==='pickup'&&a.p===med);check(a,'shelf pickup unavailable');G.actCarry(a);idle();check(P.item===med,'medicine not held');
 const table=G.usePoint(G.STAGE.uses[1]);walk(at(table),'restaurant table');S.dining=S.dining||{phase:'idle',next:24};S.dining.eaten=true;
 a=G.envChoices().find(a=>a.k==='use');check(a,'empty plate blocks preparation after walking');G.selectEnvTarget(G.envToken(a));G.actEnv();idle();check(S.mealDosed&&!P.item,'walked preparation never commits');trace.push('seasoning prepared');
 const note=S.notes[0];walk(at(note),'upstairs desk');a=G.envChoices().find(a=>a.k==='read'&&a.n===note);check(a,'desk note unreachable');G.selectEnvTarget(G.envToken(a));G.actEnv();for(let i=0;i<45;i++)tick();check(note.read&&P.keys.code&&G.DLG.modal&&!P.interact,'reading action fails at desk');while(G.DLG.modal)G.advanceDialog();trace.push('read code');
 stop();return{mobile,alt,seconds:Math.round(S.t),trace};
}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  for mobile in [False,True]:
   for alt in range(3):
    r=await pg.evaluate(FLOW,{'sid':'m2','alt':alt,'mobile':mobile});print('PASS physical route',json.dumps(r,ensure_ascii=False),flush=True)
  assert not errors,errors;await b.close()
asyncio.run(main())
