"""Optional HTTP origin for portable file-based Playwright tests in CI."""
import os
if os.environ.get('YH_TEST_HTTP')=='1':
 import threading
 from pathlib import Path
 from functools import partial
 from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
 from urllib.parse import urlparse,unquote
 from playwright.async_api import Page
 ROOT=Path(__file__).resolve().parents[2]
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 original_goto=Page.goto
 async def http_goto(self,url,**kwargs):
  if url.startswith('file://'):
   p=Path(unquote(urlparse(url).path))
   for old in ['/root/game','/workspace/yahaeng']:
    if str(p).startswith(old+'/'):p=ROOT/str(p)[len(old)+1:];break
   url=f'http://127.0.0.1:{server.server_port}/{p.relative_to(ROOT)}'
  return await original_goto(self,url,**kwargs)
 Page.goto=http_goto
