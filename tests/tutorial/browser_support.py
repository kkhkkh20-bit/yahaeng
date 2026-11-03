"""Readiness uses wall time even when a journey deliberately freezes RAF.
Retry only observed transient HTTP/transport failures before any gameplay input.
JavaScript errors, wrong assets and gameplay assertions remain failures.
"""
import asyncio
from playwright.async_api import TimeoutError as BrowserTimeout
async def open_game(page,url):
 for attempt in range(3):
  bad=[];failed=[]
  def response(r):
   if r.status>=500 and('/assets/'in r.url or r.url.rstrip('/')==url.rstrip('/')):bad.append((r.status,r.url))
  def failure(r):
   if '/assets/'in r.url or r.url.rstrip('/')==url.rstrip('/'):failed.append((r.url,r.failure))
  page.on('response',response);page.on('requestfailed',failure)
  try:
   result=await page.goto(url,timeout=120000)
   if result and result.status>=500:bad.append((result.status,url))
   if not bad:
    try:
     await page.wait_for_function('!!window.__game&&(!window.__boot||window.__boot.state.ready)',timeout=35000,polling=100)
     return result
    except BrowserTimeout:
     state=await page.evaluate('({boot:window.__boot?.state,game:!!window.__game,version:window.__BUILD_VERSION__})')
     print('BOOT WAIT FAILURE',state,'HTTP',bad,'transport',failed,flush=True)
     if not bad and not failed:raise
   print('TRANSIENT BOOT DOWNLOAD',attempt+1,bad,failed,flush=True)
  finally:
   page.remove_listener('response',response);page.remove_listener('requestfailed',failure)
  if attempt<2:await asyncio.sleep(10)
 raise RuntimeError('Game verification blocked by three transient download failures')
async def get_checked(client,url):
 for attempt in range(3):
  response=await client.get(url)
  if response.status_code not in(502,503,504):return response.raise_for_status()
  print('TRANSIENT HTTP',response.status_code,url,attempt+1,flush=True)
  if attempt<2:await asyncio.sleep(10)
 return response.raise_for_status()
