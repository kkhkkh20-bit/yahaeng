"""Fixture animation receives the same night mask, floor tint and lamps as the map."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch,tone in [(False,''),(True,''),(False,'&tone=ink'),(True,'&tone=ink')]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,device_scale_factor=2 if touch else 1);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+tone);await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},records=[];let maxDelta=0;
    const sample=(h)=>{const dpr=G.DPRinfo()[0],x=Math.round(((h.x-8-G.cam.x)*G.SCALE+innerWidth/2)*dpr),y=Math.round(((h.y-15-G.cam.y)*G.SCALE+innerHeight/2)*dpr),d=G.ctx.getImageData(x-1,y-1,3,3).data,c=[0,0,0];for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)c[k]+=d[i+k]/9;return c;};
    for(const id of ['m2','m3']){
     G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;const seen=new Set();
     for(const h of S.hides){
      if(!['box','well','wardrobe','locker'].includes(h.type)||h.fl>2||h.ty<5)continue;const key=h.type+':'+(h.fl||0);if(seen.has(key))continue;
      G.setLayer(h.fl||0);const side=G.hidePerimeter(h).find(c=>c.ny===1&&!G.solidAt(c.tx,c.ty));if(!side)continue;seen.add(key);const points=[];
      for(const on of [false,true]){
       Object.assign(P,{x:side.tx*48+24,y:side.ty*48+24,fl:h.fl||0,z:0,trav:null,hide:null,captive:null,carrying:null,bodyAnim:null,strikeT:0,ledge:null,jump:null,wire:null});G.setLayer(P.fl);
       const lamp={x:h.x-60,y:h.y-15,r:180,fl:P.fl,off:!on,col:'255,186,105',poly:[h.x-180,h.y-180,h.x+180,h.y-180,h.x+180,h.y+180,h.x-180,h.y+180]};S.lamps=[lamp];S.hazeK=0;G.setZoom(1);G.cam.x=h.x;G.cam.y=h.y-60;
       G.benchDraw(40);const time=S.t,closed=sample(h);check(G.beginHideFlow('enter',h),'lighting fixture unreachable '+id+key);S.t=time-1/60;G.benchDraw(1);const active=sample(h),delta=Math.max(...active.map((v,k)=>Math.abs(v-closed[k])));maxDelta=Math.max(maxDelta,delta);
       check(delta<12,'fixture changes tone on activation '+id+key+' '+JSON.stringify({on,closed,active,delta}));points.push(active.reduce((a,v)=>a+v,0)/3);P.trav=null;
      }
      check(points[1]>points[0]+12,'fixture ignores lamp state '+id+key+' '+JSON.stringify(points));records.push({id,key,dark:+points[0].toFixed(1),lit:+points[1].toFixed(1)});
     }
    }
    // Buffers are shared; opening and closing never allocate a canvas per frame.
    const S=G.S,P=S.player,h=S.hides.find(h=>h.type==='box');G.setLayer(0);Object.assign(P,{x:h.x,y:h.y+48,fl:0,z:0,trav:null,hide:null});G.beginHideFlow('enter',h);G.benchDraw(2);
    const make=document.createElement.bind(document);let allocated=0;document.createElement=(tag,...a)=>{if(tag==='canvas')allocated++;return make(tag,...a);};
    try{for(let i=0;i<100;i++){G.drawLitContainer(h,'back');G.drawLitContainer(h,'front');}}finally{document.createElement=make;}
    check(allocated===0,'fixture allocates canvases during animation');check(records.some(r=>r.key.endsWith(':1')),'upper floor lighting untested');return{records,maxDelta:+maxDelta.toFixed(1),allocated};
   }''')
   assert not errors,errors;print('PASS','mobile device DPR 2'if touch else'PC','ink'if tone else'base',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
