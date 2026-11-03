"""Capture unmodified old/new skill screens at identical sizes and starting progress."""
import argparse,asyncio,hashlib,io,json,subprocess,tarfile,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def capture(args):
 output=(R/args.output).resolve();output.mkdir(parents=True,exist_ok=True)
 before=R/'build/skills-v151/compare-v150';before.mkdir(parents=True,exist_ok=True)
 archive=subprocess.check_output(['git','archive','--format=tar',args.before_revision,'public/index.html','public/version.json','public/assets'],cwd=R)
 with tarfile.open(fileobj=io.BytesIO(archive))as t:t.extractall(before,filter='data')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}/';records=[]
 try:
  async with async_playwright()as p:
   browser=await p.chromium.launch()
   for label,folder in [('before',before/'public'),('after',R/'public')]:
    package=json.loads((folder/'version.json').read_text())
    for mode,width,height,mobile in [('pc',1440,900,False),('mobile',390,844,True)]:
     page=await browser.new_page(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await page.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
     await page.goto(base+folder.relative_to(R).as_posix()+'/',timeout=120000);await page.wait_for_function('!!window.__game',timeout=120000)
     await page.click('#btnLedger');await page.click('#btnSkillsLedger')
     if mobile:await page.locator('button[data-branch="assassin"]').click()
     await page.evaluate('()=>{__game.drawSkillLinks();return document.fonts.ready}');await page.wait_for_timeout(250)
     state=await page.evaluate('({version:window.__BUILD_VERSION__,points:__game.skillBudget()-__game.skillSpent(__game.loadSkillTree()),learned:__game.loadSkillTree().learned,nodes:document.querySelectorAll("[data-node]").length,inkTheme:document.documentElement.classList.contains("ink-study")})')
     assert state['version']==package['version']and state['points']==4 and not state['learned']and state['nodes']==27,state
     assert not errors,errors
     name=f'{label}-{mode}.png';await page.screenshot(path=str(output/name))
     records.append({'image':name,'viewport':[width,height],'branch':'assassin'if mobile else'all','state':state,'sourcePackageSha256':package['source_sha256'],'imageSha256':hashlib.sha256((output/name).read_bytes()).hexdigest(),'pageErrors':errors});print('CAPTURED',name,state['version'],flush=True);await page.close()
   await browser.close()
 finally:server.shutdown();server.server_close()
 (output/'captures.json').write_text(json.dumps({'beforeCommit':subprocess.check_output(['git','rev-parse',args.before_revision],cwd=R,text=True).strip(),'method':'Actual archived v150 and current v151 packages; same viewport, same 4P, no learned skills; original screenshots with no image alterations','captures':records},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--before-revision',default='2d5ae0a');parser.add_argument('--output',default='docs/skills-v151/compare');asyncio.run(capture(parser.parse_args()))
