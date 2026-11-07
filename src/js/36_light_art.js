// Kenney CC0 fixtures are baked into 2D; no model loading in the game.
const lightArtImages={};
for(const [name,a]of Object.entries(window.__LIGHT_ART__||{}))lightArtImages[name]={...a,img:Object.assign(new Image(),{src:a.src})};
function drawLightArt(name,x,y,alpha=1,scale=1) {
  const a=lightArtImages[name];if(!a||!a.img.complete||!a.img.naturalWidth)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;ctx.drawImage(a.img,x+a.ox*scale,y+a.oy*scale,a.w*scale,a.h*scale);ctx.restore();return true;
}
const lightArtRotation=(nx,ny)=>Math.abs(nx)>Math.abs(ny)?nx>0?3:1:ny>0?2:0;
function drawIndoorLampFixtures(fl,building=-1) {
  const controls=new Set(),fixtures=new Set();
  for(const l of S.lamps){
    if(l.outdoor||l.hearth||flOf(l)!==fl||building>=0&&bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE))!==building)continue;
    if(l.roomFinish)continue;
    const f=l.fixture,fk=f&&f.x+','+f.y;
    if(f&&!fixtures.has(fk)&&inView(f.x,f.y,70)){
      fixtures.add(fk);const modern=roomArtDraw(ctx,'lamp-'+Number(lampOn(l))+'-'+roomArtRotation(f.nx,f.ny),f.x,f.y);
      if(!modern)drawLightArt('wall-'+((lightArtRotation(f.nx,f.ny)+2)%4),f.x,f.y-16,lampOn(l)?1:.6,.65);
      const bulb=f.y-(modern?35:16);
      if(lampOn(l)){const glow=ctx.createRadialGradient(f.x,bulb,0,f.x,bulb,10);glow.addColorStop(0,'rgba('+(l.col||'255,222,170')+',.25)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(f.x-10,bulb-10,20,20);}
      if(l.broken){ctx.strokeStyle='#b1a49a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(f.x-3,bulb-3);ctx.lineTo(f.x+3,bulb+3);ctx.stroke();}
    }
    const p=l.control;if(!p||controls.has(l.circuit)||!inView(p.x,p.y,50))continue;controls.add(l.circuit);
    const normal=switchArtNormal(l);if(roomArtDraw(ctx,'switch-'+Number(!lampCircuitOff(l))+'-'+roomArtRotation(...normal),p.x,p.y))continue;
    // A small wall plate, separate from fixtures and their ground light pools.
    ctx.fillStyle='#10171f';ctx.fillRect(p.x-6,p.y-10,12,17);ctx.fillStyle='#a6adb1';ctx.fillRect(p.x-5,p.y-9,10,15);
    ctx.fillStyle=lampCircuitOff(l)?'#59656e':'#e0e3de';ctx.fillRect(p.x-3,p.y-7,6,10);
    ctx.fillStyle=lampCircuitOff(l)?'#20282e':'#59656e';ctx.fillRect(p.x-2,p.y+(lampCircuitOff(l)?-1:-6),4,2);
  }
  drawRoomFinishFixtures(fl,building);
}
