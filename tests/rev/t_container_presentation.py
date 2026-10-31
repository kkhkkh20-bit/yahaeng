"""Visible motion must not restart at the rim; cabinet doors cover the whole body."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.benchDraw(2)")
   await pg.wait_for_timeout(200)
   r=await pg.evaluate('''()=>{
    const G=__game,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)};S.guards=[];S.cams=[];S.facOn=false;S.fade=0;let motions=0,cabinets=0,paint=0;
    for(const type of ['box','well']){
     const h=S.hides.find(h=>h.type===type&&!G.solidAt(h.tx,h.ty+1));Object.assign(P,{x:h.x,y:h.y+48,fl:0,z:0,trav:null,hide:null,captive:null,carrying:null,bodyAnim:null,strikeT:0});G.setLayer(0);
     G.beginHideFlow('enter',h);const T=P.trav,F=T.hideFlow,sample=q=>{T.t=F.walk+q*F.duration;return G.hideHeroSample(P,T)};
     check(F.duration<=1.15,'container body transfer too long');const before=sample(.60),after=sample(.64);check(after.y-before.y>3,'body pauses at the old vault/sink boundary');
     let previous=sample(.2).y,descending=false,turns=0;
     for(let q=.21;q<.88;q+=.01){const y=sample(q).y,down=y>previous;if(down!==descending){turns++;descending=down;}previous=y;}
     check(turns===1,'motion has a second stop or rise');check(sample(.90).y-F.geo.rim<=41,'body falls deep below the container');
     const ctx=G.ctx,pixels=q=>{sample(q);ctx.save();ctx.resetTransform();ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.translate(120-h.x,150-h.y);G.drawHideFlowHero(P,T);ctx.restore();const data=ctx.getImageData(0,0,250,250).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>128)count++;return count;};
     check(pixels(.35)>25,'entry actor not rendered');check(pixels(.90)===0,'body must be behind the rim before the lid closes');P.trav=null;motions++;
    }
    const keys=new Set();for(const h of S.hides.filter(h=>['locker','wardrobe'].includes(h.type))){
     const key=h.type+' '+(h.w||1);if(keys.has(key))continue;keys.add(key);const g=G.cabinetGeometry(h),a=G.cabinetAperture(h,1);
     check(g.top<h.ty*48-45&&a.h>75,'only the cabinet bottom opens');check(a.y<g.top+8&&a.y+a.h>g.bottom-12,'door excludes cabinet top or bottom');
     const image=open=>{const c=document.createElement('canvas');c.width=200;c.height=220;const x=c.getContext('2d');x.translate(80-h.x,135-h.y);G.drawContainer(h,'all',x,open);return{x,c,data:x.getImageData(0,0,200,220).data};};
     const closed=image(0),opened=image(1),cx=Math.round((a.x+a.w/2)-h.x+80);
     for(const f of [.12,.5,.88]){const cy=Math.round(a.y+a.h*f-h.y+135),idx=(cy*200+cx)*4;check(opened.data[idx]+opened.data[idx+1]+opened.data[idx+2]<90,'full-height opening is painted over');check(closed.data[idx]+closed.data[idx+1]+closed.data[idx+2]>180,'closed cabinet missing door section');paint++;}
     const it=G.hideFootprint(h).it,c=document.createElement('canvas');c.width=200;c.height=220;const x=c.getContext('2d');x.translate(80-h.x,135-h.y);G.drawFurnArt(x,it);const data=x.getImageData(0,0,200,220).data;
     check(data.every((v,i)=>v===closed.data[i]),'static closed body differs from the moving cabinet');cabinets++;
    }
    // A tug retains its velocity across the edge rather than stopping before free fall.
    const A={from:{x:0,y:0},edge:{x:0,y:30},to:{x:0,y:100}},p0=G.ledgeVictimPoint(A,.379),p1=G.ledgeVictimPoint(A,.38),p2=G.ledgeVictimPoint(A,.381);
    const v0=(p1.y-p0.y)/.001,v1=(p2.y-p1.y)/.001;check(v0>60&&v1>60&&Math.abs(v0-v1)<2,'ledge victim pauses at release');
    let edge=null;G.setLayer(0);for(let y=2;y<G.MH-2&&!edge;y++)for(let x=2;x<G.MW-2&&!edge;x++){const z=G.rLv(x,y);if(!z||G.robAt(x,y)||G.rLv(x,y+1)>=z)continue;const px=x*48+24,py=y*48+42;if(G.landBelow(px,py,{x:0,y:1},z))edge={x:px,y:py,z};}
    check(edge,'missing drop fixture');Object.assign(P,edge,{fl:0,hide:null,trav:null,jump:null,ledge:{x:0,y:1},lethalHold:null});G.dropLedge(P);let last={x:P.x,y:P.y},speeds=[];
    for(let i=0;i<200&&P.jump;i++){S.t+=.005;G.updatePlayer(.005);if(P.jump)speeds.push(Math.hypot(P.x-last.x,P.y-last.y)/.005);last={x:P.x,y:P.y};}
    check(Math.min(...speeds)>1&&Math.max(...speeds)/Math.min(...speeds)<1.01,'release jump hovers before falling '+JSON.stringify({min:Math.min(...speeds),max:Math.max(...speeds),samples:speeds.slice(0,8),P:{jump:P.jump,ledge:P.ledge,hide:P.hide,pick:P.pick,snap:P.snap},over:S.over}));
    return{motions,cabinets,wholeDoorSamples:paint,releaseVelocity:[v0,v1],continuousFallFrames:speeds.length};

   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',r,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
