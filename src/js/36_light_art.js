// Kenney CC0 fixtures are baked into 2D; no model loading in the game.
const lightArtImages={};
for(const [name,a]of Object.entries(window.__LIGHT_ART__||{}))lightArtImages[name]={...a,img:Object.assign(new Image(),{src:a.src})};
function drawLightArt(name,x,y,alpha=1,scale=1) {
  const a=lightArtImages[name];if(!a||!a.img.complete||!a.img.naturalWidth)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;ctx.drawImage(a.img,x+a.ox*scale,y+a.oy*scale,a.w*scale,a.h*scale);ctx.restore();return true;
}
const lightArtRotation=(nx,ny)=>Math.abs(nx)>Math.abs(ny)?nx>0?3:1:ny>0?2:0;
function switchVisualPoint(l){
 const p=l.control;if(!p)return null;
 const n=switchArtNormal(l),nx=p.nx??-n[0],ny=p.ny??-n[1];
 return{x:p.x+nx*5,y:p.y+ny*5,nx,ny};
}
function drawOfficeSwitch(l){
 if(drawPurchasedSwitch(l))return true;
 if(!officeReady())return false;
 const p=switchVisualPoint(l);if(!p)return false;
 const off=lampCircuitOff(l),side=!!p.nx;
 ctx.save();ctx.translate(p.x,p.y);
 ctx.fillStyle='#16232d';ctx.fillRect(side?-3:-5,side?-6:-3,side?6:10,side?12:7);
 ctx.fillStyle='#67757b';ctx.fillRect(side?-2:-4,side?-5:-2,side?4:8,side?10:5);
 ctx.fillStyle=off?'#35444e':'#9eac9f';ctx.fillRect(side?-1:-2,side?-2:-1,side?2:4,side?4:2);
 ctx.restore();return true;
}
function drawIndoorLampFixtures(fl,building=-1) {
  const controls=new Set(),fixtures=new Set();
  for(const l of S.lamps){
    if(l.outdoor||l.hearth||flOf(l)!==fl||building>=0&&bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE))!==building)continue;
    if(l.roomFinish&&!officeReady())continue;
    const f=l.fixture,fk=f&&f.x+','+f.y;
    if(f&&!fixtures.has(fk)&&inView(f.x,f.y,70)){
      fixtures.add(fk);if(!drawOfficeLamp(l)){const modern=roomArtDraw(ctx,'lamp-'+Number(lampOn(l))+'-'+roomArtRotation(f.nx,f.ny),f.x,f.y);
      if(!modern)drawLightArt('wall-'+((lightArtRotation(f.nx,f.ny)+2)%4),f.x,f.y-16,lampOn(l)?1:.6,.65);
      const bulb=f.y-(modern?35:16);
      if(lampOn(l)){const glow=ctx.createRadialGradient(f.x,bulb,0,f.x,bulb,10);glow.addColorStop(0,'rgba('+(l.col||'255,222,170')+',.25)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(f.x-10,bulb-10,20,20);}
      if(l.broken){ctx.strokeStyle='#b1a49a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(f.x-3,bulb-3);ctx.lineTo(f.x+3,bulb+3);ctx.stroke();}
      }
    }

  }
  drawRoomFinishFixtures(fl,building);
}
