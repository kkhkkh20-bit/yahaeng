"""Controlled production UI scenes, no CSS injection or screenshot modification."""
import asyncio,sys,json,argparse
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];args=argparse.ArgumentParser();args.add_argument('label',choices=['before','after']);args.add_argument('--url',default='http://127.0.0.1:8001/public/');args.add_argument('--out',default='build/ink-v199');a=args.parse_args();label=a.label;O=R/a.out/label;O.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium');reports=[]
  for name,w,h in ([('pc',1440,900),('mobile',390,844)]if label=='before'else[('pc',1440,900),('mobile',390,844),('landscape',844,390),('small',320,568)]):
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=name!='pc',is_mobile=name!='pc');errs=[];q.on('pageerror',lambda e:errs.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await q.goto(a.url+'?nostats');await q.wait_for_function('!!__game',polling=100);await q.evaluate('document.fonts.ready')
   async def shot(scene):
    await q.screenshot(path=str(O/f'{name}-{scene}.png'));print(label,name,scene,flush=True)
   material=None
   if label=='after':material=await q.evaluate('''async()=>{const raw=getComputedStyle(document.documentElement).getPropertyValue('--ink-wash').trim(),i=new Image();i.src=raw.slice(4,-1).replace(/^['"]|['"]$/g,'');await i.decode();return{width:i.naturalWidth,height:i.naturalHeight}}''');assert material['width']>0 and material['height']>0
   await shot('title');await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="m2"),true)');await q.wait_for_function('!__game.warmStatus.pending',polling=100);await q.wait_for_timeout(250);await shot('brief')
   await q.click('#btnBrGo');await q.evaluate('''()=>{const G=__game;G.S.fade=0;G.updateDialog(3);G.moveCamera(1);G.updateHUD(true);G.benchDraw(2)}''');await shot('dialogue')
   await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();G.S.fade=0;Object.assign(G.S.player,{x:21.5*48,y:16.5*48,fl:0,z:0});G.setLayer(0);G.update(.02);G.updateHUD(true);G.moveCamera(1);G.benchDraw(2)}''');await shot('hud')
   await q.click('#btnPause');await shot('pause');await q.click('#btnSkillsPause');await shot('skills');cdp=await q.context.new_cdp_session(q);await cdp.send('DOM.enable');await cdp.send('CSS.enable');root=await cdp.send('DOM.getDocument');node=await cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':'#skillScreen h2'});font=await cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']});assert label=='before' or any(f['isCustomFont'] and f['familyName']=='East Sea Dokdo' for f in font['fonts']),font;await q.click('[data-select="ambush"]');await shot('skill-detail');await q.click('.skill-detail-close');await q.click('#btnSkillsBack');await q.click('#btnResume')
   if name=='pc':await q.keyboard.press('i')
   else:await q.click('#btnToolNext')
   await shot('equipment');await q.click('#btnLoadoutClose');await q.evaluate('__game.S.over=true;__game.showEnd(true)');await shot('training')
   reports.append({'device':name,'viewport':[w,h],'errors':errs,'inkMaterial':material,'headingFont':font,'version':await q.evaluate('__BUILD_VERSION__')});assert not errs,errs;await q.close()
  await b.close();(O/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
asyncio.run(main())
