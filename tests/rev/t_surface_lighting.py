"""Source sprites and near wall faces receive light; blockers still stop ground rays."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/lighting-v248'
async def main():
 O.mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},is_mobile=touch,has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.purchasedPropsReady()&&__game.officeReady()&&__game.purchasedReady()');
   report=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.S.guards=[];G.S.cams=[];return G.S;},alpha=(c,x,y,q=4)=>c.getContext('2d').getImageData(Math.floor(x/q),Math.floor(y/q),1,1).data[3];
    let S=start('tB');G.setLayer(1);let wall;
    for(let y=4;y<13&&!wall;y++)for(let x=15;x<23;x++)if(G.tileG(x,y)==='#'&&G.tileG(x,y-1)==='#'&&G.tileG(x,y+1)==='#'&&!G.solidAt(x-1,y)&&!G.solidAt(x+1,y)){wall={tx:x,ty:y};break;}
    check(wall,'no real partition for occlusion test');const l={x:wall.tx*48-24,y:wall.ty*48+24,r:180,fl:1,poly:[]};S.lamps=[l];G.refreshLightMasks();const face={x:wall.tx*48+8,y:l.y},back={x:wall.tx*48+72,y:l.y},lm=G.lightMap('surface-partition',S.lamps),wallMask={face:alpha(lm,face.x,face.y),back:alpha(lm,back.x,back.y)};check(wallMask.face>100&&wallMask.back<5,'wall receiver opens the floor behind it '+JSON.stringify(wallMask));check(G.lightAtG(back.x,back.y,1)===.04,'rendering changed stealth light behind wall');
    const beam=document.createElement('canvas');beam.width=G.MW*48;beam.height=G.MH*48;const c=beam.getContext('2d');G.cam.x=l.x;G.cam.y=l.y;const guard={x:l.x,y:l.y,a:0,fl:1,z:0,torch:true,state:'PATROL'};S.guards=[guard];S.lamps=[];
    const beamSample=()=>{c.clearRect(0,0,beam.width,beam.height);G.drawDynamicLightFields(c,1);return{face:alpha(beam,face.x,face.y,1),back:alpha(beam,back.x,back.y,1)};};const torch=beamSample();check(torch.face>100&&torch.back<5,'torch ignores surfaces or occlusion');guard.a=Math.PI;const turned=beamSample();check(turned.face===0,'rotated torch leaves a static surface glow');guard.state='DEAD';check(beamSample().face===0,'dead owner leaves beam');S.guards=[];const camera={...l,a:0,search:true,b:-1};S.cams=[camera];const search=beamSample();check(search.face>100&&search.back<5,'searchlight is not in shared occluded field');camera.unplugged=true;check(beamSample().face===0,'disabled searchlight stays on');
    S=start('m1');G.setLayer(0);let gate;
    for(const d of S.doors.filter(d=>(d.fl||0)===0))for(const[dx,dy]of [[1,0],[0,1]])if(!G.solidAt(d.tx-dx,d.ty-dy)&&!G.solidAt(d.tx+dx,d.ty+dy)){gate={d,dx,dy};break;}
    check(gate,'no physical interior door');const{d,dx,dy}=gate,doorLamp={x:(d.tx-dx)*48+24,y:(d.ty-dy)*48+24,r:240,fl:0,poly:[]},beyond={x:(d.tx+dx)*48+24,y:(d.ty+dy)*48+24};S.lamps=[doorLamp];G.setDoor(d,true);G.refreshLightMasks();const doorSample=()=>alpha(G.lightMap('g',S.lamps),beyond.x,beyond.y),closed=doorSample();G.setDoor(d,false);const opened=doorSample();G.setDoor(d,true);const shut=doorSample();check(closed<5&&opened>80&&shut<5,'door light cache does not follow collider '+JSON.stringify({closed,opened,shut}));
    // Compare actual opaque sprite pixels in the production renderer. No white
    // rectangle stands in for the purchased furniture or parcel artwork.
    S=start('tB');S.guards=[];S.cams=[];window.__skip.ui=true;window.__skip.cone=true;const P=S.player;Object.assign(P,{x:936,y:552,fl:1,z:0});G.setLayer(1);G.setZoom(1);const rows=[];
    const pixelCompare=(o,art,l)=>{
     S.lamps=[l];G.refreshLightMasks();const b=G.lightReceiverBounds(o),a=document.createElement('canvas');a.width=Math.ceil(b.w);a.height=Math.ceil(b.h);const ac=a.getContext('2d');ac.translate(-b.x,-b.y);art(ac);const mask=ac.getImageData(0,0,a.width,a.height).data;G.cam.x=b.x+b.w/2;G.cam.y=b.y+b.h/2;G.benchDraw(35);const on=G.ctx.getImageData(0,0,G.ctx.canvas.width,G.ctx.canvas.height),scale=G.SCALE*G.DPRinfo()[0];l.off=true;G.benchDraw(2);const off=G.ctx.getImageData(0,0,G.ctx.canvas.width,G.ctx.canvas.height);let n=0,total=0,raised=0,raisedTotal=0;
     for(let y=1;y<a.height-1;y+=2)for(let x=1;x<a.width-1;x+=2){if(mask[(y*a.width+x)*4+3]<245)continue;const sx=Math.round((b.x+x-G.cam.x)*scale+on.width/2),sy=Math.round((b.y+y-G.cam.y)*scale+on.height/2);if(sx<0||sy<0||sx>=on.width||sy>=on.height)continue;const k=(sy*on.width+sx)*4,diff=(on.data[k]+on.data[k+1]+on.data[k+2]-off.data[k]-off.data[k+1]-off.data[k+2])/3;n++;total+=diff;if(b.y+y<o.y0){raised++;raisedTotal+=diff;}}
     check(n>8&&total/n>5,'object ignores lamp '+JSON.stringify({o,n,delta:total/n}));return{pixels:n,brightnessGain:total/n,raisedPixels:raised,raisedGain:raised?raisedTotal/raised:0};
    };
    for(const type of ['locker','sofa','desk2','chairD']){G.setLayer(1);const f=G.FURN.find(f=>f.fl===1&&f.t===type),o={furn:f,x0:f.x*48,y0:f.y*48,x1:(f.x+f.w)*48,y1:(f.y+f.h)*48},l={x:(f.x+f.w/2)*48,y:(f.y+f.h)*48+24,r:210,fl:1,poly:[]};rows.push({type,...pixelCompare(o,c=>G.drawFurnArt(c,f),l)});}
    const sofa=rows.find(r=>r.type==='sofa');check(sofa.raisedPixels>8&&sofa.raisedGain>5,'raised low-furniture pixels remain black above footprint');
    let cargo;for(const id of ['tB','m1','m2','m3','m4','m5','p0','p1','e5']){S=start(id);G.setLayer(0);for(let y=1;y<G.MH-1&&!cargo;y++)for(let x=1;x<G.MW-1;x++)if(G.tileG(x,y)==='C'&&G.bldAt(x,y)<0&&!G.solidAt(x,y+1)){cargo={tx:x,ty:y,ch:'C',x0:x*48,y0:y*48,x1:(x+1)*48,y1:(y+1)*48};break;}if(cargo)break;}
    check(cargo,'no outdoor source cargo');Object.assign(S.player,{x:cargo.x0+72,y:cargo.y1+24,fl:0,z:0});const cargoLamp={x:cargo.x0+24,y:cargo.y1+24,r:210,fl:0,outdoor:true,poly:[]};const parcel=pixelCompare(cargo,c=>G.drawPurchasedCargo(c,cargo.tx,cargo.ty),cargoLamp);check(parcel.brightnessGain>5,'outdoor parcel does not receive light');
    return{wallMask,torch,turned,search,door:{closed,opened,shut},furniture:rows,outdoorParcel:parcel};}''')
   assert not errors,errors;(O/('touch-surfaces.json'if touch else'pc-surfaces.json')).write_text(json.dumps(report,indent=2));print('PASS surface lighting',touch,json.dumps(report),flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
