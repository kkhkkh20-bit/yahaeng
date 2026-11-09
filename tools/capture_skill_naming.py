"""Same production scene and progress; original v154/v155 skill-name screenshots."""
import asyncio,json,subprocess,tarfile,io,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/review-v155';O.mkdir(exist_ok=True)
async def main():
 before=O/'before-package';before.mkdir(exist_ok=True)
 blob=subprocess.check_output(['git','archive','--format=tar','82c201a','public/index.html','public/version.json','public/assets'],cwd=R)
 with tarfile.open(fileobj=io.BytesIO(blob))as t:t.extractall(before,filter='data')
 records=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for label,folder in [('before',before/'public'),('after',R/'public')]:
   manifest=json.loads((folder/'version.json').read_text())
   for mode,w,h,touch in [('pc',1440,900,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
    q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto('http://127.0.0.1:8001/'+folder.relative_to(R).as_posix()+'/');await q.wait_for_function('!!__game');await q.evaluate('document.fonts.ready');await q.click('#btnLedger');await q.click('#btnSkillsLedger');await q.click('[data-branch="assassin"]');await q.click('[data-select="dual"]');await q.wait_for_timeout(100);name=f'{label}-names-{mode}.png';await q.screenshot(path=str(O/name));assert not errors,errors
    records.append({'image':name,'viewport':[w,h],'version':manifest['version'],'sourcePackageSha256':manifest['source_sha256'],'imageSha256':hashlib.sha256((O/name).read_bytes()).hexdigest(),'errors':errors});await q.close();print('CAPTURED',name,flush=True)
  await b.close()
 (O/'naming-captures.json').write_text(json.dumps({'method':'Actual production packages, fresh 4P, same selected skill and viewport, original screenshots','captures':records},ensure_ascii=False,indent=2))
asyncio.run(main())
