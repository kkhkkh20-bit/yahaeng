"""Original packaged entry/ledger captures. Controlled scene selection, not playthrough proof."""
import asyncio,hashlib,json,subprocess,sys,tarfile,io
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/lessons-v159';O.mkdir(exist_ok=True);SIDE=sys.argv[1]
async def main():
 folder=R/'public'
 if SIDE=='before':
  folder=O/'before-package';folder.mkdir(exist_ok=True)
  data=subprocess.check_output(['git','archive','26a4467','public'],cwd=R)
  with tarfile.open(fileobj=io.BytesIO(data))as t:t.extractall(folder,filter='data')
  folder=folder/'public'
 manifest=json.loads((folder/'version.json').read_text());base='http://127.0.0.1:8001/'+str(folder.relative_to(R))+'/';rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for device,w,h in [('pc',1440,900),('mobile',390,844),('landscape',844,390),('small',320,568)]:
   for sid in ['ledger','tB','t0','m6']:
    q=await b.new_page(viewport={'width':w,'height':h},has_touch=device!='pc');errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await q.goto(base);await q.wait_for_function('!!window.__game',polling=100);await q.wait_for_function('__game.prBench().n>0',polling=100)
    if sid=='ledger':await q.click('#btnLedger');await q.click('.ledger-tabs [data-filter="training"]')
    else:await q.evaluate('''id=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();for(let n=0;n<48;n++){G.update(1/60);G.updateDialog(1/60);}G.updateHUD(true);G.moveCamera(1);G.benchDraw(2)}''',sid)
    await q.evaluate('document.fonts.ready');name=f'{SIDE}-{sid}-{device}.png';await q.screenshot(path=str(O/name));assert not errors,errors;rows.append({'image':name,'viewport':[w,h],'version':manifest['version'],'sourcePackageSha256':manifest['source_sha256'],'imageSha256':hashlib.sha256((O/name).read_bytes()).hexdigest(),'errors':errors,'method':'Fresh seeded package, actual stage entry/menu, dialogues dismissed, then48native simulation frames let the real entry fade finish; no actor placement. Not a full playthrough.'});await q.close();print('PASS',name,flush=True)
  await b.close()
 (O/f'{SIDE}-captures.json').write_text(json.dumps({'method':'Unedited original packaged entry states, controlled selection, four viewports. Native gameplay completion is recorded separately.','captures':rows},ensure_ascii=False,indent=2))
asyncio.run(main())
