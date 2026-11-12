"""Free-mode shop signs never overlap: the shop name band, the hanging vertical sign, picture signs and night neon,
measured in world space for every building in the big city (same geometry as drawStoreSigns / drawStudySign / drawNeonSigns)."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
R = Path(__file__).resolve().parents[2]
JS = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();G.update(1/60);
 const T=48,St=G.STAGE,R=[];G.BLD.forEach((b,i)=>{if(b.vacant)return;const x0=b.x0*T,w=(b.x1-b.x0+1)*T,top=(b.y1-b.fh+1)*T;
  if(b.kind==='shop'&&b.signs){const n=(b.signs[0]||'').trim();if(n)R.push({i,k:'H',t:n,x:x0+4,y:b.y1*T-52,w:w-8,h:30});
   const ups=[];for(let f=1;f<b.signs.length&&f<b.fh;f++){const t=(b.signs[f]||'').trim();if(t)ups.push(t)}
   if(ups.length)R.push({i,k:'V',t:ups[0],x:x0+w-4,y:top+8,w:28,h:Math.max(T,(b.fh-1)*T-10)});
   if(!(St.cityLife&&b.signs)&&b.facade&&b.fh>=3){const t=(b.plate||b.name||'').replace(/\\s/g,'');if(t)R.push({i,k:'N',t,x:b.x1*T+8,y:top+10,w:30,h:Math.min(t.length*22+14,(b.fh-1)*T-10)})}}
  const sp=St.referenceBuildings&&St.referenceBuildings[i];if(sp&&sp.ad&&!(St.cityLife&&b.kind==='shop'&&(b.signs?.[0]||'').trim()&&sp.ad.fl<=1)){const a=sp.ad;R.push({i,k:'A',t:a.image,x:(b.x0+a.x)*T,y:(b.y1-a.fl)*T,w:a.w*T,h:a.h*T})}
 });
 const ov=[];for(let a=0;a<R.length;a++)for(let c=a+1;c<R.length;c++){const p=R[a],q=R[c];const ix=Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x),iy=Math.min(p.y+p.h,q.y+q.h)-Math.max(p.y,q.y);if(ix>2&&iy>2)ov.push([p.k+p.i+':'+p.t,q.k+q.i+':'+q.t,ix,iy])}
 const kinds={};for(const o of ov){const k=o[0][0]+o[1][0];kinds[k]=(kinds[k]||0)+1}
 return {n:R.length,count:ov.length,kinds,ex:ov.slice(0,12),facade:G.BLD.filter(b=>b.facade&&b.kind==='shop').length}}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(JS); print(json.dumps(r, ensure_ascii=False)[:600]); await b.close()
    bad = [] if r['count'] == 0 and r['n'] > 100 and not errs else ['signs overlap: %s %s' % (r['count'], r['ex'][:5])] + errs
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
