"""Split a supplied 2D build into cacheable assets without changing its game rules.
Usage: python3 tools/package_cloudflare_2d.py /path/to/frozen-2d.html
The input must be a self-contained build; public/press is left untouched.
"""
import base64,hashlib,json,re,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def package(source,destination):
 out=Path(destination);out.mkdir(exist_ok=True,parents=True);assets=out/'assets';assets.mkdir(exist_ok=True)
 original=Path(source).read_text();html=original;files={}
 def save(data,ext):
  name=hashlib.sha256(data).hexdigest()[:20]+'.'+ext
  (assets/name).write_bytes(data);files[name]=len(data);return './assets/'+name
 def image(match):
  return save(base64.b64decode(match[2]),{'jpeg':'jpg'}.get(match[1],match[1]))
 html=re.sub(r'data:image/(png|webp|jpeg);base64,([A-Za-z0-9+/=]+)',image,html)
 count=0
 def script(match):
  nonlocal count
  attrs,code=match.groups()
  if len(code)<500:return match[0]
  if 'src='in attrs or 'type='in attrs:raise ValueError('Only inline classic scripts are supported')
  count+=1
  url=save(code.encode(),'js')
  return '<script defer src="'+url+'" onload="window.__boot.loaded()" onerror="window.__boot.fail(\'스크립트 다운로드 실패\')"></script>'
 html=re.sub(r'<script([^>]*)>(.*?)</script>',script,html,flags=re.S)
 boot=(R/'src/deploy/cloudflare_boot.js').read_text().replace("done+'/6'","done+'/%d'"%count)
 marker=re.search(r'<script defer ',html)
 if not marker:raise ValueError('Input is already packaged or contains no game')
 html=html[:marker.start()]+'<script>'+boot+'</script>\n'+html[marker.start():]
 (out/'index.html').write_text(html)
 (out/'_headers').write_text('/\n  Cache-Control: no-cache\n  Content-Type: text/html; charset=utf-8\n/index.html\n  Cache-Control: no-cache\n  Content-Type: text/html; charset=utf-8\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n')
 result={'edition':'2d-campaign','version':'v128-loading-fix','source_sha256':hashlib.sha256(original.encode()).hexdigest(),'html_bytes':len(html.encode()),'source_bytes':len(original.encode()),'scripts':count,'assets':len(files),'asset_bytes':sum(files.values())}
 (out/'version.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
 return result
if __name__=='__main__':package(sys.argv[1],sys.argv[2]if len(sys.argv)>2 else R/'public')
