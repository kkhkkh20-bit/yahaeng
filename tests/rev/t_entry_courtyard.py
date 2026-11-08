"""A real approach from street gate to building door; consistent low cover and cargo art."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 out=R/'build/entry-v223';out.mkdir(exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.freeCityReady()')
   result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},rows=[];
    for(const id of ['p0','p1','p2','e1']){
     G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,b=G.BLD[0],door=S.doors.find(d=>d.tx===24&&d.ty===b.y1);ok(door,'real front door missing');
     for(const dy of [1,2])ok(!G.solidAt(door.tx,door.ty+dy),'perimeter wall blocks the front door');
     const first=[Math.floor(P.x/48),Math.floor(P.y/48)],end=[door.tx,door.ty],queue=[first],seen=new Map([[first.join(','),null]]);
     for(let i=0;i<queue.length;i++){const a=queue[i];if(a.join(',')===end.join(','))break;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[a[0]+dx,a[1]+dy],k=n.join(',');if(n[0]<0||n[1]<0||n[0]>=G.MW||n[1]>=G.MH||seen.has(k)||G.solidAt(...n))continue;seen.set(k,a);queue.push(n);}}
     ok(seen.has(end.join(',')),'street has no route to front entrance');const path=[];for(let a=end;a;a=seen.get(a.join(',')))path.push(a);ok(path.some(([x,y])=>y===18&&(x===13||x===14)),'street route bypasses the authored gate');
     ok(G.G0[18][12]==='#'&&G.G0[18][15]==='#'&&P.y>19*48,'gate has no solid wall ends or player starts inside it');rows.push({id,approachDepth:2,streetToGateToDoor:true,pathLength:path.length});
    }
    G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;Object.assign(P,{x:600,y:648,mode:'sneak'});G.input.sneakToggle=true;G.updatePlayer(.016);ok(P.hidden,'replacement cover loses hiding');
    const before=JSON.stringify({grid:G.G0,doors:S.doors.map(d=>[d.tx,d.ty,d.locked,d.open]),stats:S.stats,bushes:S.bushes.map(b=>[b.x,b.y,b.cap])});S.fade=0;G.moveCamera(1);
    // Both foliage passes must use the same low pixel sprite, including the pass over the hero.
    const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,calls=[],a=__ASSETS__.dotonbori,rects=['bush0','bush1'].map(k=>a.frames[k].rect);
    proto.drawImage=function(im,...args){if(this.canvas.id==='game'&&im?.src===a.src&&rects.some(r=>r.join(',')===args.slice(0,4).join(',')))calls.push(args.slice(4));return draw.call(this,im,...args)};
    try{G.benchDraw(1);}finally{proto.drawImage=draw;}
    const under=calls.filter(([x,y])=>x<600&&x+64>600&&y<648&&y+48>648);ok(under.length>=2&&under.every(r=>r[2]===64&&r[3]===48),'hidden player uses a different tall cover image');
    ok(before===JSON.stringify({grid:G.G0,doors:S.doors.map(d=>[d.tx,d.ty,d.locked,d.open]),stats:S.stats,bushes:S.bushes.map(b=>[b.x,b.y,b.cap])}),'art rendering changes physical cover');
    ok(a.frames.cargoCrate0.sourceRect&&a.frames.bush0.sourceRect,'selected paid art has no source provenance');
    const c=document.createElement('canvas');c.width=c.height=48;const ctx=c.getContext('2d');G.drawPropFurn(ctx,{t:'boxes',x:0,y:0,w:1,h:1});ok(ctx.getImageData(20,20,1,1).data[3]>0,'interior cargo art is missing');
    return{maps:rows,hidden:true,consistentCoverPasses:under.length,renderKeepsPhysics:true,cargo:true};}''')
   assert not errors,errors;rows.append({'mobile':mobile,**result});await q.screenshot(path=str(out/('mobile-cover.png'if mobile else'pc-cover.png')));print('PASS courtyard and cover',mobile,result,flush=True);await q.close()
  await b.close()
 (out/'rules.json').write_text(json.dumps(rows,indent=2))
if __name__=='__main__':asyncio.run(main())
