"""Outdoor lights have physical support, reachable controls and preserved save state."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game')
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},counts={wall:0,street:0,pole:0};let reachable=0,stages=0;
   for(let si=0;si<G.STAGES.length;si++){
    G.start(si);for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;G.setLayer(0);stages++;
    const outdoors=S.lamps.filter(l=>l.outdoor&&!l.fl),indoors=S.lamps.filter(l=>!l.outdoor).map(l=>[l.x,l.y,l.fl]);
    for(const l of outdoors){
     const m=l.mount;check(m&&counts[m.kind]!=null,'unsupported outdoor light '+G.STAGE.id);counts[m.kind]++;
     check(l.poly?.length===360,'light polygon missing');check(Number.isFinite(l.x)&&Number.isFinite(l.y),'nonfinite lamp');
     if(m.kind==='wall'){const B=G.BLD[m.b];check(B&&!B.vacant&&G.tileG(m.tx,m.ty)==='#','wall mount without real wall');}
     if(m.kind==='street'){const x=Math.floor(m.ax/48),y=Math.floor(m.ay/48);check(!G.solidAt(x,y),'streetlight base inside obstacle');check(G.tileG(x,y)!=='.'||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>G.tileG(x+dx,y+dy)!=='.'),'streetlight placed in road centre');}
     const at=G.lampControl(l);Object.assign(P,{fl:0,z:0,hide:null,under:false,vent:false,carrying:null,captive:null,trav:null,jump:null});
     const approach=[[0,0],[0,32],[32,0],[-32,0],[0,-32],[24,24],[-24,24],[24,-24],[-24,-24]].find(([dx,dy])=>{P.x=at.x+dx;P.y=at.y+dy;return !G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))&&G.objectReachable(at,48)});
     check(approach,'inaccessible switch '+G.STAGE.id+' '+JSON.stringify(m));
     const a=G.envChoices().find(a=>a.k==='lamp'&&a.l===l);check(a,'fixture switch absent from choices '+G.STAGE.id+' '+JSON.stringify(m));reachable++;
    }
    check(JSON.stringify(S.lamps.filter(l=>!l.outdoor).map(l=>[l.x,l.y,l.fl]))===JSON.stringify(indoors),'indoor fixture moved');
   }
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();let S=G.S;const P=S.player,post=S.lamps.find(l=>l.mount?.kind==='street').mount;S.guards=[];Object.assign(P,{x:post.ax,y:post.ay+40,fl:0,z:0});G.setLayer(0);S.keys.ArrowUp=true;let minPost=Infinity;for(let i=0;i<30;i++){S.t+=.025;G.updatePlayer(.025);minPost=Math.min(minPost,Math.hypot(P.x-post.ax,P.y-post.ay))}S.keys.ArrowUp=false;check(minPost>=16.9,'player walks through light post');S.player.hp=2;S.player.keys.blue=true;S.items[0].got=true;
   const interior=JSON.stringify(S.lamps.filter(l=>!l.outdoor).map(l=>[l.x,l.y,l.fl,l.off,l.broken]));S.lightsOn=false;const outdoor=S.lamps.filter(l=>l.outdoor),states=outdoor.map((l,i)=>{l.off=i%2===0;l.broken=i%3===0;return{origin:l.origin,off:l.off,broken:l.broken,x:l.x,y:l.y,kind:l.mount.kind}});
   G.saveCheckpoint();for(const l of G.CP.S.lamps)if(l.outdoor){l.x=l.origin.x;l.y=l.origin.y;delete l.mount;delete l.mountVersion;delete l.control;delete l.origin;}
   check(G.loadCheckpoint(),'legacy save rejected');S=G.S;check(S.player.hp===2&&S.player.keys.blue&&S.items[0].got&&!S.lightsOn,'migration loses progress');check(JSON.stringify(S.lamps.filter(l=>!l.outdoor).map(l=>[l.x,l.y,l.fl,l.off,l.broken]))===interior,'migration changes indoor lighting');
   const restored=S.lamps.filter(l=>l.outdoor);restored.forEach((l,i)=>{check(l.off===states[i].off&&l.broken===states[i].broken,'fixture state reset');check(l.mount.kind===states[i].kind&&Math.abs(l.x-states[i].x)<1&&Math.abs(l.y-states[i].y)<1,'legacy placement differs');check(l.poly.length===360,'legacy light polygon not rebuilt')});
   const coords=restored.map(l=>[l.x,l.y,l.mount.ax,l.mount.ay]);G.saveCheckpoint();check(G.loadCheckpoint(),'new save rejected');check(JSON.stringify(G.S.lamps.filter(l=>l.outdoor).map(l=>[l.x,l.y,l.mount.ax,l.mount.ay]))===JSON.stringify(coords),'reload moves fixtures twice');
   return{stages,counts,reachable,legacyState:true};
  }''')
  assert not errors,errors;print('PASS',result,flush=True);await b.close()
asyncio.run(main())
