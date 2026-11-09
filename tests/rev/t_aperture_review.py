"""Reported fixtures and close-range cutaways, including old checkpoint repair."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.wait_for_timeout(200)
   row=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.setLayer(0);return G.S;};let mounts=0,stairs=0;
    for(const id of G.LEARNING_ROUTE){const S=fresh(id);
     for(const l of S.lamps.filter(l=>!l.outdoor&&l.control)){
      const p=G.switchVisualPoint(l);G.setLayer(l.fl||0);const tx=Math.floor(p.x/48),ty=Math.floor(p.y/48);let touches=false;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(G.tileCh(tx+dx,ty+dy)==='#'){
       const x=Math.max((tx+dx)*48,Math.min((tx+dx+1)*48,p.x)),y=Math.max((ty+dy)*48,Math.min((ty+dy+1)*48,p.y));if(Math.hypot(p.x-x,p.y-y)<1)touches=true;
      }ok(touches,id+' floating switch '+JSON.stringify(p));ok(Math.hypot(p.x-l.control.x,p.y-l.control.y)<=5.01,'visual switch leaves interaction');mounts++;
     }
     G.setLayer(0);
     for(const l of S.ladders.filter(l=>l.kind==='stair')){
      const b=G.BLD[G.bldAt(l.tx,l.ty)];if(!b.facade||b.fh!==b.h)continue;
      const h=b.kitProps?.find(p=>p.t==='sh'&&p.sx===l.tx&&p.sy===l.ty);ok(h&&l.roofDoor,id+' invisible roof stair');ok(h.cells.every(([x,y])=>G.robAt(x,y)),'walk through stair house');ok(!G.robAt(Math.floor(l.rx/48),Math.floor(l.ry/48)),'roof stair landing blocked');stairs++;
     }
    }
    let S=fresh('e2'),P=S.player;
    const w=S.windows.find(w=>w.tx===18&&w.ty===5);ok(w,'side window fixture');Object.assign(P,{x:w.x-48,y:w.y,z:0,fl:0,a:0});
    G.setLayer(0);G.moveCamera(2);G.benchDraw(40);let f=G.aperturePeekFrame;ok(f?.b===1&&f.alpha>.9&&f.capture,'looks through wrong alley wall');ok(G.nearWindow()?.w===f.opening,'action targets the opposite window');
    ok(f.capture.w<innerWidth*G.DPRinfo()[0]&&f.capture.h<innerHeight*G.DPRinfo()[0],'peek duplicates the whole viewport');
    const point={x:f.x-f.nx*12,y:f.y-f.ny*12,fl:0,z:0};ok(G.aperturePeekContains(point),'near interior missing');ok(!G.aperturePeekContains({...point,fl:1}),'peek reveals another floor');ok(!G.aperturePeekContains({...point,x:P.x,y:P.y}),'peek paints over alley');
    const wx=Math.floor((f.x-f.nx*48)/48),wy=Math.floor((f.y-f.ny*48)/48),old=G.G0[wy][wx];
    try{G.G0[wy][wx]='#';G.benchDraw(1);ok(!G.aperturePeekContains({...point,x:f.x-f.nx*120,y:f.y-f.ny*120}),'peek crosses an interior wall');}finally{G.G0[wy][wx]=old;}
    Object.assign(P,{x:w.x-150,y:w.y});G.benchDraw(1);ok(!G.aperturePeekFrame,'distant window exposes room');
    Object.assign(P,{x:w.x-48,y:w.y,fl:1});ok(!G.aperturePeekCandidate(P,-1),'ground window exposes upper floor');P.fl=0;P.z=3;ok(!G.aperturePeekCandidate(P,-1),'roof x-ray');P.z=0;
    const door=S.doors.find(d=>d.tx===18&&d.ty===12);ok(door,'door fixture');Object.assign(P,{x:door.x-48,y:door.y,fl:0,z:0,a:0});G.setDoor(door,true);G.benchDraw(40);ok(G.aperturePeekFrame?.opening!==door,'closed door reveals interior');G.setDoor(door,false);G.benchDraw(40);ok(G.aperturePeekFrame?.opening===door,'open doorway cannot be inspected');G.setDoor(door,true);G.benchDraw(40);ok(G.aperturePeekFrame?.opening!==door,'closing door retains live cutaway');
    // A checkpoint made at the formerly invisible stair cell moves onto its
    // actual landing, retaining health, inventory, light state and progress.
    S=fresh('e2');P=S.player;const l=S.ladders.find(l=>l.kind==='stair'&&G.bldAt(l.tx,l.ty)===1);Object.assign(P,{x:l.ux,y:l.uy,z:l.tz,fl:0,hp:2});S.compoundThirdFloor=S.compoundJumpUsed=true;const lamp=S.lamps.find(l=>l.authoredControl);lamp.off=true;G.saveCheckpoint();ok(G.loadCheckpoint(),'checkpoint rejected');S=G.S;P=S.player;
    ok(P.hp===2&&S.compoundJumpUsed&&S.lamps.find(l=>l.authoredControl).off,'checkpoint repair loses progress');ok(P.x===l.rx&&P.y===l.ry&&!G.robAt(Math.floor(P.x/48),Math.floor(P.y/48)),'checkpoint traps player in new stair house');
    const before=JSON.stringify(S.lamps.filter(l=>l.authoredControl).map(l=>[l.circuit,l.control]));G.saveCheckpoint();G.loadCheckpoint();ok(JSON.stringify(G.S.lamps.filter(l=>l.authoredControl).map(l=>[l.circuit,l.control]))===before,'wall controls drift on reload');
    return{mounts,stairs,nearWindow:true,directionalChoice:true,wallOcclusion:true,oneFloor:true,farOpaque:true,openDoorOnly:true,checkpointRepair:true};}''')
   assert not errors,errors;rows.append({'mobile':mobile,**row});print('PASS aperture / fixture review',rows[-1],flush=True);await q.close()
  await b.close()
 out=R/'build/peek-v232';out.mkdir(exist_ok=True);(out/'checks.json').write_text(json.dumps(rows,indent=2))
if __name__=='__main__':asyncio.run(main())
