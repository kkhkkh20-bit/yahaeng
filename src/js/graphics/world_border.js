// The playable rectangle ends at a visible town wall. The streets beyond it
// are scenery, drawn only for the current viewport with a small shared cache.
const exteriorArt={signature:'',blocks:new Map(),wall:null,ground:null,pattern:null};
function exteriorAssets(){
  const signature=[freeCityReady(),kitOk(kitG.asph0),kitOk(kitTex.wall),kitOk(kitTex.concrete)].join(':');
  if(exteriorArt.signature!==signature){exteriorArt.signature=signature;exteriorArt.blocks.clear();exteriorArt.wall=exteriorArt.ground=exteriorArt.pattern=null;}
  return exteriorArt;
}
function exteriorGround(){
  const cache=exteriorAssets();if(cache.ground)return cache.ground;
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#303a34';x.fillRect(0,0,96,96);
  const city=freeCityPattern('asphalt');
  if(city){x.fillStyle=x.createPattern(city,'repeat');x.fillRect(0,0,96,96);}
  else if(kitOk(kitG.asph0)){x.drawImage(kitG.asph0,0,0,96,96);x.fillStyle='#233127cc';x.fillRect(0,0,96,96);}
  return cache.ground=c;
}
function exteriorBlock(variant){
  const cache=exteriorAssets();if(cache.blocks.has(variant))return cache.blocks.get(variant);
  const c=document.createElement('canvas');c.width=288;c.height=224;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const bx=18+variant%3*9,by=25+(variant%2)*16,bw=222-(variant%3)*16,bh=114+(variant%2)*28;
  x.fillStyle='#18231dc0';x.fillRect(bx+12,by+16,bw+10,bh+35);
  x.fillStyle=['#333f36','#34413b','#3a4035'][variant%3];x.fillRect(bx,by,bw,bh);
  if(kitOk(kitTex.concrete)){x.globalAlpha=.14;x.fillStyle=x.createPattern(kitTex.concrete,'repeat');x.fillRect(bx,by,bw,bh);x.globalAlpha=1;}
  x.strokeStyle='#697265';x.lineWidth=3;x.strokeRect(bx+2,by+2,bw-4,bh-4);
  x.strokeStyle='#202e27';x.lineWidth=4;x.strokeRect(bx+7,by+7,bw-14,bh-14);
  x.fillStyle='#303a31';x.fillRect(bx,by+bh,bw,27);
  if(kitOk(kitTex.wall)){x.globalAlpha=.18;x.fillStyle=x.createPattern(kitTex.wall,'repeat');x.fillRect(bx,by+bh,bw,27);x.globalAlpha=1;}
  x.fillStyle='#111f1b';for(let i=0;i<4;i++)x.fillRect(bx+18+i*48,by+bh+6,24,13);
  x.fillStyle='#a49b66';x.globalAlpha=.42;x.fillRect(bx+18+(variant%4)*48,by+bh+6,24,13);x.globalAlpha=1;
  x.fillStyle='#747b68';x.fillRect(bx+26,by+26,32,24);x.fillStyle='#38473c';x.fillRect(bx+30,by+30,24,16);x.strokeStyle='#7e8570';x.lineWidth=1;for(let k=0;k<4;k++){x.beginPath();x.moveTo(bx+32,by+32+k*4);x.lineTo(bx+52,by+32+k*4);x.stroke();}
  x.fillStyle='#727762';x.fillRect(bx+bw-51,by+bh-44,28,20);x.fillStyle='#303c32';x.fillRect(bx+bw-48,by+bh-41,22,14);
  x.strokeStyle='#68715f';x.lineWidth=2;x.beginPath();x.moveTo(bx+44,by+50);x.lineTo(bx+44,by+bh-18);x.lineTo(bx+bw-28,by+bh-18);x.stroke();
  if(freeCityReady()){
    x.save();x.translate(bx,by);paintFreeCityRoof(x,{x0:variant,y0:variant+1,kind:'shop'},bw,bh);x.restore();
    const tile=freeCityPattern(variant%2?'wallGreen':'wallBrick');if(tile){x.fillStyle=x.createPattern(tile,'repeat');x.fillRect(bx,by+bh,bw,27);}
    for(let k=0;k<4;k++)freeCityDraw(x,'upperWindow',bx+12+k*46,by+bh+5,1);
    x.fillStyle='#08122166';x.fillRect(bx,by,bw,bh+27);
  }
  cache.blocks.set(variant,c);return c;
}
function exteriorWall(){
  const cache=exteriorAssets();if(cache.wall)return cache.wall;
  const c=document.createElement('canvas');c.width=192;c.height=32;const x=c.getContext('2d');x.fillStyle='#475044';x.fillRect(0,0,192,32);
  if(kitOk(kitTex.wall)){x.globalAlpha=.38;x.drawImage(kitTex.wall,0,0,192,32);x.globalAlpha=1;}
  const tile=freeCityPattern('wallPanel');if(tile){x.fillStyle=x.createPattern(tile,'repeat');x.fillRect(0,0,192,32);}
  x.fillStyle='#1a2736';x.fillRect(0,26,192,6);x.fillStyle='#8996a1';x.fillRect(0,0,192,5);x.fillStyle='#536474';x.fillRect(0,5,192,3);
  x.fillStyle='#354453';x.fillRect(0,3,13,26);x.fillStyle='#a4adb4';x.fillRect(0,0,15,6);
  return cache.wall=c;
}
function exteriorGates(){
  const width=MW*TILE,height=MH*TILE,points=[{x:tc(STAGE.start[0]),y:tc(STAGE.start[1])},...(S.exits||[]).map(e=>({...e,exit:true}))],out=[];
  for(const p of points){const options=[['west',p.x,p.y,height],['east',width-p.x,p.y,height],['north',p.y,p.x,width],['south',height-p.y,p.x,width]].sort((a,b)=>a[1]-b[1]),[side,d,along,length]=options[0];if(d>72)continue;
    const at=clamp(along,48,length-48),old=out.find(g=>g.side===side&&Math.abs(g.at-at)<80);if(old){old.exit=old.exit||p.exit;continue;}out.push({side,at,exit:!!p.exit});}
  return out;
}
function drawTownExterior(){
  if(STAGE.artSlice)return;
  const [vx,vy,vw,vh]=viewRect(40),width=MW*TILE,height=MH*TILE;
  if(vx>=0&&vy>=0&&vx+vw<=width&&vy+vh<=height)return;
  const cache=exteriorAssets(),ground=exteriorGround();cache.pattern=cache.pattern||ctx.createPattern(ground,'repeat');
  ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.rect(0,0,width,height);ctx.clip('evenodd');ctx.fillStyle=cache.pattern;ctx.fillRect(vx,vy,vw,vh);
  const block=(x,y)=>{const v=(((Math.round(x)*73856093)^(Math.round(y)*19349663))>>>0)%6;ctx.drawImage(exteriorBlock(v),x,y);};
  for(let x=Math.floor(vx/288)*288;x<vx+vw;x+=288){
    for(let y=height+88+Math.max(0,Math.floor((vy-height-88)/224))*224;y<vy+vh;y+=224)block(x,y);
    for(let y=-88-224-Math.max(0,Math.floor((-vy-vh-88)/224))*224;y+224>vy;y-=224)if(y<vy+vh)block(x,y);
  }
  for(let y=Math.max(-88,Math.floor(vy/224)*224);y<Math.min(height+88,vy+vh);y+=224){
    for(let x=width+88+Math.max(0,Math.floor((vx-width-88)/288))*288;x<vx+vw;x+=288)block(x,y);
    for(let x=-88-288-Math.max(0,Math.floor((-vx-vw-88)/288))*288;x+288>vx;x-=288)if(x<vx+vw)block(x,y);
  }
  // Pavement and curbs continue around the inaccessible neighboring blocks.
  ctx.fillStyle='#4e5967';ctx.fillRect(-48,-48,width+96,20);ctx.fillRect(-48,height+28,width+96,20);ctx.fillRect(-48,-28,20,height+56);ctx.fillRect(width+28,-28,20,height+56);
  ctx.strokeStyle='#8997a2';ctx.lineWidth=2;ctx.strokeRect(-48,-48,width+96,height+96);
  const wall=exteriorWall();
  for(let x=Math.floor(vx/192)*192;x<Math.min(width,vx+vw);x+=192)if(x+192>0){ctx.drawImage(wall,x,-32);ctx.drawImage(wall,x,height);}
  for(let y=Math.floor(vy/192)*192;y<Math.min(height,vy+vh);y+=192)if(y+192>0){for(const x of [0,width+32]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/2);ctx.drawImage(wall,0,0);ctx.restore();}}
  for(const g of exteriorGates()){
    ctx.save();if(g.side==='south')ctx.translate(g.at,height);else if(g.side==='north')ctx.translate(g.at,-32);else{ctx.translate(g.side==='west'?0:width+32,g.at);ctx.rotate(Math.PI/2);}
    ctx.fillStyle='#263341';ctx.fillRect(-42,0,84,32);ctx.fillStyle='#617184';ctx.fillRect(-42,2,84,5);ctx.fillRect(-42,27,84,4);
    if(!g.exit||!S.exitOpen){ctx.fillStyle='#81909d';for(let x=-38;x<42;x+=9)ctx.fillRect(x,7,3,20);ctx.fillStyle='#b2a680';ctx.fillRect(-3,17,7,5);}
    ctx.fillStyle='#8b99a6';ctx.fillRect(-46,0,7,34);ctx.fillRect(39,0,7,34);ctx.restore();
  }
  ctx.restore();
}
