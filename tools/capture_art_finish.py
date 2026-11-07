"""Positioned visual audit of existing stages and their actual object renderers."""
import asyncio,base64,json,argparse
from pathlib import Path
from playwright.async_api import async_playwright

async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':850})
  errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
  await q.goto(a.url+'?nostats&review=art-audit');await q.wait_for_function('!!window.__game')
  catalog={}
  for sid,bi,fl in [('tB',0,0),('e5',0,1),('m2',0,1),('m2',1,0),('m4',1,0),('m7',0,0),('n1',0,0)]:
   info=await q.evaluate('''([id,bi,fl])=>{
    const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();
    G.setLayer(fl);const room=G.PLANS[bi]?.[fl]?.store,b=G.BLD[bi],cx=((room||b).x0+(room||b).x1+1)/2,cy=((room||b).y0+(room||b).y1+1)/2;
    let spots=[];for(let y=b.y0+1;y<b.y1;y++)for(let x=b.x0+1;x<b.x1;x++)if(!G.solidAt(x,y))spots.push([x,y]);
    spots.sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cy)-Math.hypot(b[0]-cx,b[1]-cy));const at=spots[0];
    if(!at)throw Error('No open audit position '+id);
    Object.assign(G.S.player,{x:at[0]*48+24,y:at[1]*48+24,fl,z:0});G.S.fade=0;G.setZoom(1.1);G.moveCamera(1);G.updateHUD(true);
    return {stage:id,building:b.name,floor:fl,at,items:G.FURN.map(i=>({...i}))};
   }''',[sid,bi,fl])
   for it in info.pop('items'):catalog.setdefault(it['t'],it)
   await q.evaluate('document.fonts.ready');await q.wait_for_timeout(800)
   await q.evaluate('__game.S.floorC={};__game.benchDraw(8)')
   await q.screenshot(path=str(out/f'{sid}-{bi}-{fl}.png'))
   (out/f'{sid}-{bi}-{fl}.json').write_text(json.dumps(info,ensure_ascii=False,indent=2))
  data=await q.evaluate('''items=>{
   const G=__game,c=G.ctx,cols=6,rows=Math.ceil(items.length/6),w=210,h=180;c.canvas.width=w*cols;c.canvas.height=h*rows;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.fillStyle='#172029';c.fillRect(0,0,c.canvas.width,c.canvas.height);
   items.sort((a,b)=>a.t.localeCompare(b.t));items.forEach((it,i)=>{const x=i%cols*w,y=Math.floor(i/cols)*h;c.fillStyle='#28333c';c.fillRect(x+5,y+5,w-10,h-10);c.fillStyle='#d5d4c8';c.font='13px sans-serif';c.fillText(it.t+' '+it.w+'×'+it.h,x+15,y+25);c.save();const k=Math.min(1.3,150/(Math.max(it.w,it.h)*48));c.translate(x+w/2-it.w*48*k/2,y+65);c.scale(k,k);G.drawFurnArt(c,{...it,x:0,y:0,fl:0});c.restore();});return c.canvas.toDataURL();
  }''',list(catalog.values()))
  (out/'objects.png').write_bytes(base64.b64decode(data.split(',')[1]))
  (out/'catalog.json').write_text(json.dumps({'objects':catalog,'errors':errors,'method':__doc__},ensure_ascii=False,indent=2))
  assert not errors,errors
  await b.close()
 print('AUDITED',len(catalog),'object families',out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8001/public/');p.add_argument('--out',default='build/art-v208/visual');asyncio.run(main(p.parse_args()))
