"""Window proximity preserves an opaque roof; entry and deliberate scan still work."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(300)
   result=await q.evaluate("""()=>{const G=__game,S=G.S,c=G.ctx,b=G.BLD[0],ok=(v,m)=>{if(!v)throw Error(m)};
    S.fade=0;G.benchDraw(2);Object.assign(S.player,{x:168,y:366,a:-Math.PI/2});
    // A legacy checkpoint's peek value must not turn off a roof.
    S.peek={b:0,w:S.windows.find(w=>w.tx===3&&w.ty===6)};
    const rc=b.roofC.getContext('2d');rc.fillStyle='#ff00ff';rc.fillRect(0,0,b.roofC.width,b.roofC.rh);
    G.cam.x=240;G.cam.y=300;G.benchDraw(35);
    ok(S.openB===-1&&b.ra===1,'approaching a window opens the whole building');
    const sample=(wx=168,wy=144)=>{const k=c.canvas.width/innerWidth,x=Math.round(((wx-G.cam.x)*G.SCALE+innerWidth/2)*k),y=Math.round(((wy-G.cam.y)*G.SCALE+innerHeight/2)*k);return [...c.getImageData(x,y,2,2).data]};
    const sealed=sample();ok(sealed[0]>50&&sealed[2]>sealed[0]*.8&&sealed[1]<sealed[0]*.25,'room projection covers the opaque roof '+sealed);
    const windows=S.windows.filter(a=>a.ty===b.y1&&a.tx<=b.x1);ok(windows.length===3,'changed real opening geometry');
    const plan=G.BLD.find(o=>o.plan),cx=(plan.x0+plan.x1+1)*24,cy=(plan.y0+4)*48;
    Object.assign(S.player,{x:plan.x0*48-24,y:cy});G.cam.x=cx;G.cam.y=cy;
    const pc=plan.roofC.getContext('2d');pc.fillStyle='#ff00ff';pc.fillRect(0,0,plan.roofC.width,plan.roofC.rh);G.benchDraw(35);
    const plain=sample(cx,cy);G.input.scan=true;G.benchDraw(1);const scanned=sample(cx,cy);ok(scanned.some((v,i)=>v!==plain[i]),'deliberate floor-plan scan disappeared');
    G.input.scan=false;G.benchDraw(1);ok(sample(cx,cy).every((v,i)=>v===plain[i]),'scan does not restore exterior');
    Object.assign(S.player,{x:216,y:168});G.benchDraw(35);ok(S.openB===0&&b.ra===0,'entering does not open current building');
    return{outsideRoofOpaque:true,legacyPeekIgnored:true,scanRestores:true,entryStillOpens:true,actualWindows:windows.length};}""")
   assert not errors,errors;print('PASS opaque window approach',w,result,flush=True);await q.close()
  await b.close()
asyncio.run(main())
