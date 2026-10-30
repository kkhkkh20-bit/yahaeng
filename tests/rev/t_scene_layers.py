"""Exterior wires/signs cannot paint into upper-floor rooms; rooftop doors retain their anchors."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();pg=await browser.new_page(viewport={'width':900,'height':720});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
  await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m3'))");await pg.wait_for_function('__game.BLD.every(b=>!b.kit||b.kit.img.complete)',polling=100)
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.guards.forEach(g=>{g.x=g.y=-9999});return G.S};
   const S=fresh('m3'),P=S.player,b=G.BLD[0],ctx=G.ctx;Object.assign(P,{x:S.items[0].x,y:S.items[0].y,fl:1,z:0});G.setLayer(1);for(let i=0;i<120;i++)G.moveCamera(1/60);G.benchDraw(40);
   const a={dx:b.x0*48-100,dy:(b.y0+3)*48,roof:false},z={dx:(b.x1+1)*48+100,dy:(b.y0+3)*48,roof:false};
   S.wires=[{a,b:z,sag:12}];S.traps=[{k:'drop',text:'옥상전용간판',at:[b.x0+4,b.y0+3],hit:[0,0,0,0],auto:false,used:false}];
   const rect=()=>{const c=ctx.canvas,s=G.SCALE*dpr,x=Math.max(0,Math.ceil((b.x0*48-G.cam.x)*s+c.width/2)),y=Math.max(0,Math.ceil((b.y0*48-G.cam.y)*s+c.height/2)),right=Math.min(c.width,Math.floor(((b.x1+1)*48-G.cam.x)*s+c.width/2)),bottom=Math.min(c.height,Math.floor(((b.y1+1)*48-G.cam.y)*s+c.height/2));return[x+3,y+3,right-x-6,bottom-y-6]};
   const dpr=G.DPRinfo()[0],t=S.t,texts=[],fill=ctx.fillText;ctx.fillText=function(t,...a){texts.push(String(t));return fill.call(this,t,...a)};
   G.input.scan=false;G.benchDraw(1);const R=rect(),withExterior=ctx.getImageData(...R).data;check(!texts.includes('옥상전용간판'),'roof sign is submitted inside current room');
   S.wires=[];S.traps=[];S.t=t;G.benchDraw(1);const withoutExterior=ctx.getImageData(...R).data;
   check(withExterior.every((v,i)=>v===withoutExterior[i]),'exterior wire/sign changes room pixels');
   // Scan marks must also respect floor membership. Window-to-wire connections stay identified as windows.
   G.input.scan=true;texts.length=0;G.benchDraw(1);check(!texts.some(t=>t==='전깃줄'||t.startsWith('전봇대')||t==='두꺼비집'||t==='옥상 환기구'),'exterior scan marker appears on upper floor');G.input.scan=false;
   // The same exterior remains visible when standing on its roof.
   Object.assign(P,{z:2,fl:0});G.setLayer(0);S.wires=[{a,b:z,sag:12}];S.traps=[{k:'drop',text:'옥상전용간판',at:[b.x0+4,b.y0+3],hit:[0,0,0,0],auto:false,used:false}];texts.length=0;G.benchDraw(40);check(texts.includes('옥상전용간판'),'roof sign disappeared from rooftop');ctx.fillText=fill;
   let doors=0;
   for(const id of ['m1','m2','m3','m4','m5','m6','city']){
    const S=fresh(id),P=S.player;for(const l of S.ladders.filter(l=>l.roofDoor)){
     Object.assign(P,{x:l.rx,y:l.ry,fl:0,z:l.tz});G.setLayer(0);const signature=JSON.stringify([l.rx,l.ry,l.roofDoor,l.tx,l.ty]),grid=G.GF.map(g=>g&&g.map(r=>r.join('')).join('')).join('|');
     const create=document.createElement;let canvases=0;document.createElement=function(tag,...a){if(tag==='canvas')canvases++;return create.call(this,tag,...a)};
     let labels=0;const fill=ctx.fillText;ctx.fillText=function(t,...a){if(t==='계단')labels++;return fill.call(this,t,...a)};
     const state=JSON.stringify([ctx.globalAlpha,ctx.getTransform(),ctx.lineWidth]);
     try{G.drawRoofEntrances(P)}finally{document.createElement=create;ctx.fillText=fill}
     check(labels>=1&&canvases===0,id+' door cue absent or allocates bitmap');check(JSON.stringify([ctx.globalAlpha,ctx.getTransform(),ctx.lineWidth])===state,id+' entrance cue leaks drawing state');
     check(JSON.stringify([l.rx,l.ry,l.roofDoor,l.tx,l.ty])===signature&&G.GF.map(g=>g&&g.map(r=>r.join('')).join('')).join('|')===grid,id+' door cue moves entrance or geometry');
     check(G.nearClimbDown()===l,id+' physical door approach changed');doors++;
    }
   }
   return {upperFloorPixels:'unchanged by exterior',scan:'floor-aware',rooftopSigns:'visible',doorCues:doors,extraBitmaps:0};
  }''')
  assert not errors,errors;print('PASS',result);await browser.close()

asyncio.run(main())
