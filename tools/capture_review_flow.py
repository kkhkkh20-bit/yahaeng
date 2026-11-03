"""v159/v160 same inputs; controlled entry, early crouch and result routing captures."""
import asyncio,hashlib,json,subprocess,sys,tarfile,io
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/review-v160';O.mkdir(exist_ok=True);SIDE=sys.argv[1]
async def main():
 folder=R/'public'
 if SIDE=='before':
  folder=O/'before-package';folder.mkdir(exist_ok=True)
  with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive','4ab2be9','public'],cwd=R)))as t:t.extractall(folder,filter='data')
  folder=folder/'public'
 manifest=json.loads((folder/'version.json').read_text());base='http://127.0.0.1:8001/'+str(folder.relative_to(R))+'/';rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for device,w,h in [('pc',1440,900),('mobile',390,844),('landscape',844,390),('small',320,568)]:
   for scene in ['earlyrun','m4','next','ledger']:
    q=await b.new_page(viewport={'width':w,'height':h},has_touch=device!='pc');errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(base);await q.wait_for_function('!!window.__game',polling=100);await q.wait_for_function('__game.prBench().n>0',polling=100)
    if scene=='ledger':await q.click('#btnLedger');await q.click('.ledger-tabs [data-filter="training"]')
    else:
     sid={'earlyrun':'tB','m4':'m4','next':'tL'}[scene];await q.evaluate('''id=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();for(let i=0;i<48;i++)G.update(1/60)}''',sid)
     if scene=='earlyrun':
      if device!='pc':await q.tap('#btnCrouch')
      else:await q.keyboard.press('Control')
      await q.keyboard.down('ArrowRight');await q.evaluate('for(let n=0;n<100;n++)__game.update(1/60)');await q.keyboard.up('ArrowRight');await q.evaluate('for(let n=0;n<10;n++)__game.update(1/60)')
     if scene=='next':await q.evaluate('__game.endGame(true)');await q.wait_for_timeout(650)
     else:await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(2)')
    await q.evaluate('document.fonts.ready');name=f'{SIDE}-{scene}-{device}.png';await q.screenshot(path=str(O/name));assert not errors,errors
    rows.append({'image':name,'viewport':[w,h],'version':manifest['version'],'sourcePackageSha256':manifest['source_sha256'],'imageSha256':hashlib.sha256((O/name).read_bytes()).hexdigest(),'errors':errors,'method':'Same seeded package/viewport. Earlyrun uses actual crouch and100right-input frames. m4/ledger are actual entry/menu. Next is an explicitly forced result solely to compare destination label, not a playthrough.'});await q.close();print('PASS',name,flush=True)
  await b.close()
 (O/f'{SIDE}-captures.json').write_text(json.dumps({'captures':rows},ensure_ascii=False,indent=2))
asyncio.run(main())
