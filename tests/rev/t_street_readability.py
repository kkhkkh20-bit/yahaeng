"""Street continuity, switchable night light and opaque-surface reception on PC/mobile."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m4'));while(__game.DLG.modal)__game.advanceDialog();__game.S.fade=0")
   await q.wait_for_function('__game.fieldArtReady&&__game.officeReady()',polling=100)
   row=await q.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},S=G.S,P=S.player;G.setLayer(0);
    for(let y=11;y<=14;y++)ok(!G.solidAt(12,y),'warehouse wall still divides the street');
    for(let y=13;y<=16;y++)ok(!G.solidAt(36,y),'east wall still divides the street');
    ok(G.astar(2,13,45,13,G.solidAt).length,'main street has no east-west route');
    ok(!G.BLD[0].vacant&&G.BLD[0].h===1,'abandoned office still has a missing roof');
    const added=S.lamps.filter(l=>l.streetSite);ok(added.length>=10,'street coverage not improved');
    const on=G.lightAtG(15.5*48,13.5*48,0);for(const l of S.lamps)if(l.outdoor)l.off=true;
    const off=G.lightAtG(15.5*48,13.5*48,0);ok(on>off+.3,'street lamps do not change stealth brightness');
    const l=added[0],at=G.lampControl(l),m=l.mount;Object.assign(P,{x:at.x+m.nx*22,y:at.y+m.ny*22,fl:0,z:0});
    const action=G.envChoices().find(a=>a.k==='lamp'&&a.l===l);ok(action,'new lamp cannot be switched');
    G.actPrimary({...action,viaZ:true});for(let i=0;i<70;i++)G.update(.025,false);ok(!l.off,'lamp interaction did not turn it back on');
    // Old saves contain the former walls and no added lights. Migrate once only.
    S.player.hp=2;G.saveCheckpoint();G.CP.grids[0][12][12]='#';G.CP.grids[0][14][36]='#';
    G.CP.S.lamps=G.CP.S.lamps.filter(l=>!l.streetSite);delete G.CP.S.streetLightVersion;
    ok(G.loadCheckpoint(),'old checkpoint rejected');ok(!G.solidAt(12,12)&&!G.solidAt(36,14),'old road walls restored');
    const count=G.S.lamps.length,stillOff=G.S.lamps.filter(l=>l.outdoor&&!l.streetSite).every(l=>l.off);
    ok(stillOff&&G.S.player.hp===2,'migration resets existing state');G.saveCheckpoint();G.loadCheckpoint();ok(G.S.lamps.length===count,'checkpoint duplicates street lights');
    // A controlled same-floor lamp lights a real wall face, but not its far side.
    G.setLayer(1);let sample=null;
    for(let y=3;y<10&&!sample;y++)for(let x=23;x<32&&!sample;x++){
     if(G.solidAt(x,y)||G.tileG(x-1,y)!=='#')continue;
     sample={x:x*48+24,y:y*48+24,wallX:x*48-8,wallY:y*48+24,farX:(x-1)*48-8};
    }
    ok(sample,'wall receiver fixture missing');
    const lamp={x:sample.x,y:sample.y,r:180,fl:1,outdoor:false,poly:null};G.S.lamps=[lamp];G.refreshLightMasks();
    const mask=G.lightMap('surface-regression',[lamp]),c=mask.getContext('2d'),alpha=(x,y)=>c.getImageData(Math.floor(x/4),Math.floor(y/4),1,1).data[3];
    ok(alpha(sample.wallX,sample.wallY)>140,'near wall face remains black');ok(alpha(sample.farX,sample.wallY)===0,'surface light leaks through wall');
    const f=G.FURN.find(f=>f.fl===1&&G.officeFurnBounds(f)&&['cab','shelf'].includes(f.t));ok(f,'furniture receiver fixture missing');
    const bounds=G.officeFurnBounds(f);Object.assign(lamp,{x:(f.x+f.w/2)*48,y:(f.y+f.h)*48+25,r:220});G.refreshLightMasks();
    const lit=G.lightMap('furniture-regression',[lamp]).getContext('2d'),x=Math.floor((bounds.x+bounds.w/2)/4),y=Math.floor((bounds.y+bounds.h*.45)/4);
    ok(lit.getImageData(x,y,1,1).data[3]>80,'opaque furniture does not receive light');
    return{addedLights:added.length,streetBrightness:{on,off},roadRoute:true,checkpointStable:true,wallSurface:true,noWallLeak:true,furnitureSurface:true};
   }''')
   assert not errors,errors;print('PASS', 'mobile' if mobile else 'PC',json.dumps(row),flush=True);await q.close()
  await b.close()
asyncio.run(main())
