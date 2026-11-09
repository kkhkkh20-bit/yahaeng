"""Reported wall seams, phantom corridor doors and exterior entry readability."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 out=R/'build/buildings-v222';out.mkdir(exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.freeCityReady()')
   row=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();const S=G.S,warehouse=G.BLD[1],office=G.BLD[0];
    ok(!S.doors.some(d=>G.bldAt(d.tx,d.ty)===1&&d.tx>warehouse.x0&&d.tx<warehouse.x1&&d.ty>warehouse.y0&&d.ty<warehouse.y1),'corridor floor is still a row of doors');
    ok(G.cityExteriorEntries(warehouse).length===0,'sealed warehouse invents an external door');
    const entries=G.cityExteriorEntries(office);ok(entries.length===2&&entries.some(e=>e.nx===-1)&&entries.some(e=>e.ny===1),'real front/side entrances were lost');
    let wall;
    for(let y=2;y<G.MH-2&&!wall;y++)for(let x=0;x<G.MW;x++){if(G.bldAt(x,y)>=0||G.G0[y][x]!=='#')continue;const a=G.cityWallEdges(x,y);if(a.n&&a.s&&!a.e&&!a.w){wall={x,y};break;}}
    ok(wall,'vertical wall fixture missing');const c=document.createElement('canvas');c.width=48;c.height=144;const p=c.getContext('2d');p.translate(-wall.x*48,-(wall.y-1)*48);for(let k=-1;k<=1;k++)ok(G.cityBoundaryWall(p,wall.x,wall.y+k),'boundary material missing');
    const im=p.getImageData(8,48,32,48).data;let caps=0;for(let k=0;k<im.length;k+=4)if(im[k]===141&&im[k+1]===153&&im[k+2]===161)caps++;
    ok(caps===0,'vertical midsection repeats horizontal silver caps');
    const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,fill=proto.fillRect,painted=[],order=[],open=__ASSETS__.dotonbori.frames.doorOpen.rect,closed=__ASSETS__.dotonbori.frames.doorClosed.rect;
    proto.drawImage=function(im,...a){if(this.canvas.id==='game'&&im?.src===__ASSETS__.dotonbori.src&&a.length===8&&(a.slice(0,4).join(',')===open.join(',')||a.slice(0,4).join(',')===closed.join(',')))painted.push({state:a.slice(0,4).join(',')===open.join(',')?'open':'closed',x:a[4],y:a[5],w:a[6],h:a[7]});if(this.canvas.id==='game'&&window.__heroParts?.has(im))order.push('hero');return draw.call(this,im,...a)};
    proto.fillRect=function(...a){if(this.canvas.id==='game'&&this.fillStyle==='#4c5965')order.push('threshold');return fill.apply(this,a)};
    try{
     Object.assign(S.player,{x:840,y:600});S.fade=0;G.moveCamera(1);G.benchDraw(2);const side=entries.find(e=>e.nx===-1),d=side.doors[0];
     // Side doors now sit inside the wall profile, rather than displaying a
     // full frontal sprite outside it. Inspect actual pixels at that opening.
     const crop=()=>{const dp=G.DPRinfo()[0],sc=G.SCALE*dp,x=Math.round((side.wallX+10-G.cam.x)*sc+innerWidth*dp/2),y=Math.round((side.y-G.cam.y)*sc+innerHeight*dp/2),w=Math.max(2,Math.round(14*sc)),h=Math.max(2,Math.round(30*sc));return Array.from(G.ctx.getImageData(x-w/2,y-h/2,w,h).data).join(',');};
     G.setDoor(d,true);G.benchDraw(30);const shut=crop();
     G.setDoor(d,false);G.benchDraw(30);const opened=crop();ok(shut!==opened,'side wall portal ignores open / closed state');
     ok(G.doorVisualOpen(d)>.9,'side entrance has no open aperture');
     window.__heroParts=new Set(G.prVar[G.characterLook(S.player)]?.parts.filter(Boolean));order.length=0;G.benchDraw(1);ok(order.includes('hero')&&order.includes('threshold')&&order.lastIndexOf('threshold')<order.indexOf('hero'),'doorstep paints over the player');
    }finally{proto.drawImage=draw;proto.fillRect=fill;}
    return{mobile:document.body.classList.contains('touch'),corridorDoors:0,entries:entries.map(e=>({x:e.x,y:e.y,nx:e.nx,ny:e.ny})),verticalCaps:caps,openClosed:true,thresholdBehindPlayer:true};}''')
   assert not errors,errors;rows.append(row);await q.screenshot(path=str(out/(('mobile'if mobile else'pc')+'-entry.png')));print('PASS building finish',row,flush=True);await q.close()
  await b.close()
 (out/'rules.json').write_text(json.dumps(rows,indent=2))
if __name__=='__main__':asyncio.run(main())
