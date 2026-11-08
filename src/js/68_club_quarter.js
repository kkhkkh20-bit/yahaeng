// One authored visual sample: club, entrance and service lane. Geometry is the
// existing collision grid; no invisible doors, cover or decorative obstacles.
const QUARTER=window.__QUARTER__||{},quarterImages={};
for(const [name,a]of Object.entries(QUARTER))quarterImages[name]={...a,img:Object.assign(new Image(),{src:a.src})};
function quarterClub(b){return STAGE.id==='m2'&&!!b&&b===BLD[1];}
function quarterNear(P=S?.player){return !!P&&STAGE.id==='m2'&&!STAGE.tutorial&&P.x>21*TILE&&P.x<39*TILE&&P.y>3*TILE&&P.y<20*TILE;}
function quarterSprite(x,name,px,py,w,h){
  const a=quarterImages[name];if(!a||!kitOk(a.img))return false;
  const sx=w/(a.footprint[0]*TILE),sy=h/(a.footprint[1]*TILE);
  x.save();x.imageSmoothingEnabled=true;x.drawImage(a.img,px+a.ox*sx,py+a.oy*sy,a.w*sx,a.h*sy);x.restore();return true;
}
function quarterFloor(x,ch,tx,ty){
  if(STAGE.id!=='m2')return false;
  const bi=bldAt(tx,ty),b=BLD[bi],inside=quarterClub(b),outside=!CUR_F&&bi<0&&tx>=21&&tx<=43&&ty>=3&&ty<=19;
  if(!inside&&!outside)return false;
  const px=tx*TILE,py=ty*TILE,n=(tx*17+ty*29)%7;
  if(inside){
    if('#NSXV'.includes(ch)){
      x.fillStyle='#252d2b';x.fillRect(px,py,TILE,TILE);x.fillStyle='#68716b';x.fillRect(px+1,py+3,TILE-2,7);x.fillStyle='#111917';x.fillRect(px+1,py+27,TILE-2,21);x.fillStyle='#a5a28d';x.fillRect(px+2,py+3,TILE-4,2);
    }else if('wv'.includes(ch)){
      x.fillStyle=ch==='v'?'#64594e':'#4c514b';x.fillRect(px,py,TILE,TILE);
      for(let k=0;k<4;k++){x.fillStyle=k%2?'#5d554b':'#6b6053';x.fillRect(px,py+k*12,TILE-1,11);x.fillStyle='#413f37';x.fillRect(px+((ty+k)%2?15:34),py+k*12,1,11);}
    }else{
      x.fillStyle=['#535c57','#58605a','#505952'][n%3];x.fillRect(px,py,TILE,TILE);x.fillStyle='#444d47';x.fillRect(px,py,TILE,1);if(tx%2===0)x.fillRect(px,py,1,TILE);x.fillStyle='#71776b';x.fillRect(px+3,py+2,TILE-6,1);
    }
  }else{
    if(!'=,.p'.includes(ch))return false;
    x.fillStyle=ch===','?'#454c43':'#59615a';x.fillRect(px,py,TILE,TILE);x.fillStyle='#414a44';x.fillRect(px,py+TILE-2,TILE,2);if((tx+ty)%2===0)x.fillRect(px,py,2,TILE);x.fillStyle='#72796c';x.fillRect(px+4,py+2,TILE-8,1);
    if(ty===15){x.fillStyle='#252e2b';x.fillRect(px,py+6,TILE,8);x.fillStyle='#788074';x.fillRect(px,py+5,TILE,1);if(tx%3===0)quarterSprite(x,'drain',px+4,py+1,40,22);}
  }
  return true;
}
function quarterFurn(x,it){
  if(STAGE.id!=='m2'||!quarterClub(BLD[bldAt(it.x,it.y)]))return false;
  if(it.t==='dance'){const px=it.x*TILE,py=it.y*TILE,w=it.w*TILE,h=it.h*TILE;x.fillStyle='#293c34';x.fillRect(px,py,w,h);x.strokeStyle='#535f4d';x.lineWidth=2;x.strokeRect(px+2,py+2,w-4,h-4);for(let yy=py+3;yy<py+h-3;yy+=24){x.fillStyle=(yy-py)%48?'#33453a':'#304238';x.fillRect(px+4,yy,w-8,22);}return true;}
  if(!['sofa','sofaV','bar','spk','plant','tableS','desk','chairD','cab'].includes(it.t))return false;
  const px=it.x*TILE,py=it.y*TILE,w=it.w*TILE,h=it.h*TILE;
  if(!quarterSprite(x,it.t,px,py,w,h))return false;
  if(it.t==='bar'){
    x.fillStyle='#d8c3a0';for(let k=0;k<it.w;k++){x.fillRect(px+13+k*48,py+8,3,12);x.fillStyle=k%2?'#8d9f84':'#c5ac7b';x.fillRect(px+12+k*48,py+3,5,8);}
    x.fillStyle='#bba77e';x.fillRect(px+8,py+8,w-16,2);
  }return true;
}
function quarterRoof(b){
  if(!quarterClub(b))return false;
  const px=b.x0*TILE,py=b.y0*TILE,w=(b.x1-b.x0+1)*TILE,h=b.roofC.rh;
  let c=b.quarterRoof;
  if(!c){c=b.quarterRoof=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
    x.fillStyle='#303b38';x.fillRect(0,0,w,h);
    for(let yy=10;yy<h-10;yy+=64){x.fillStyle=yy%128?'#3b4741':'#35403d';x.fillRect(10,yy,w-20,62);x.fillStyle='#536057';x.fillRect(11,yy,w-22,1);for(let xx=20;xx<w-10;xx+=96){x.fillStyle='#25322d';x.fillRect(xx,yy,2,62);}}
    x.fillStyle='#1a2823';x.fillRect(0,h-15,w,15);x.fillStyle='#8a9382';x.fillRect(1,h-15,w-2,4);
    x.strokeStyle='#7c8677';x.lineWidth=5;x.strokeRect(3,3,w-6,h-6);x.strokeStyle='#17251f';x.lineWidth=7;x.strokeRect(10,10,w-20,h-20);
    // Solid roof reads as a roof, rather than a transparent copy of the room.
  }
  ctx.drawImage(c,px,py);quarterRoofProps(b);quarterFacade(b);drawRoofCoping(b);return true;
}
function quarterFacade(b){
  const px=b.x0*TILE,w=(b.x1-b.x0+1)*TILE,bot=(b.y1+1)*TILE,top=bot-b.fh*TILE;
  ctx.save();ctx.fillStyle='#283b34';ctx.fillRect(px,top,w,bot-top);for(let yy=top+16;yy<bot;yy+=9){ctx.fillStyle=yy%18?'#405248':'#35473d';ctx.fillRect(px+4,yy,w-8,1);}ctx.fillStyle='#707d70';ctx.fillRect(px,top,w,5);ctx.fillStyle='#101c19';ctx.fillRect(px,top+5,w,9);
  for(let xx=px+8;xx<px+w;xx+=TILE*2){ctx.fillStyle='#30423b';ctx.fillRect(xx,top+18,TILE*2-16,bot-top-25);ctx.fillStyle='#172b25';ctx.fillRect(xx+3,top+22,TILE*2-22,bot-top-34);ctx.fillStyle='#43564a';ctx.fillRect(xx,top+18,TILE*2-16,2);}
  for(const d of S.doors.filter(d=>d.ty===b.y1&&d.tx>=b.x0&&d.tx<=b.x1)){
    const cx=d.x,yy=bot-TILE;
    ctx.fillStyle='#0a1712';ctx.fillRect(cx-43,yy-24,86,72);quarterSprite(ctx,'doorframe',cx-25,yy-5,50,48);
    ctx.fillStyle='#77826e';ctx.fillRect(cx-45,yy-26,90,5);ctx.fillStyle='#162b22';ctx.fillRect(cx-43,yy-21,86,7);ctx.fillStyle='#d7b27d';ctx.fillRect(cx-37,yy-15,74,2);
    ctx.fillStyle='#101c19';ctx.fillRect(cx-34,yy-12,68,60);ctx.fillStyle='#9b9d85';ctx.fillRect(cx-33,yy-18,66,4);ctx.fillStyle='#647865';ctx.fillRect(cx-33,yy-14,4,62);ctx.fillRect(cx+29,yy-14,4,62);
    ctx.fillStyle='#3c5345';ctx.fillRect(cx-28,yy-13,56,13);ctx.fillStyle='#dfd5b5';ctx.font=uiFont(9);ctx.textAlign='center';ctx.fillText('CLUB',cx,yy-3);
    drawFacadeDoorWork(d);
    ctx.fillStyle='#8b917e';ctx.fillRect(cx-35,bot-3,70,5);ctx.fillStyle='#26392e';ctx.fillRect(cx-33,bot+2,66,6);ctx.fillStyle='#b5a57d';ctx.fillRect(cx-26,bot+3,52,1);

  }
  // Real windows retain their physical opening coordinates; new art never adds a passage.
  for(const win of S.windows.filter(o=>o.ty===b.y1&&o.tx>b.x0&&o.tx<b.x1)){
    const xx=win.tx*TILE,yy=bot-TILE;ctx.fillStyle='#8b927d';ctx.fillRect(xx+9,yy+8,30,29);ctx.fillStyle='#172b26';ctx.fillRect(xx+12,yy+10,24,24);ctx.fillStyle='#456452';ctx.fillRect(xx+14,yy+12,20,1);ctx.fillStyle='#758a70';ctx.fillRect(xx+24,yy+11,2,24);
  }
  for(const l of S.ladders.filter(l=>l.kind==='pipe'&&l.gas&&l.tx>=b.x0&&l.tx<=b.x1&&l.ty>=b.y1-b.fh&&l.ty<=b.y1))drawPipe(l);
  ctx.restore();
}
function quarterWallEdges(){
  const P=S.player;if(!quarterNear(P)||P.z||P.under||P.vent||!quarterClub(BLD[S.openB]))return;
  // Low front cut: the entrance remains readable without a facade across the actor.
  const b=BLD[S.openB];ctx.save();ctx.fillStyle='#1c2c26';ctx.fillRect(b.x0*TILE,(b.y1+1)*TILE-6,(b.x1-b.x0+1)*TILE,6);
  ctx.fillStyle='#8e9985';ctx.fillRect(b.x0*TILE,(b.y1+1)*TILE-7,(b.x1-b.x0+1)*TILE,2);
  for(const d of S.doors.filter(d=>d.ty===b.y1&&d.tx>b.x0&&d.tx<b.x1)){ctx.fillStyle='#847e67';ctx.fillRect(d.x-23,(b.y1+1)*TILE-8,46,8);}
  ctx.restore();
}
function quarterCuts(x,rx0,ry0,rx1,ry1){
  if(STAGE.id!=='m2')return;
  const b=BLD[1];if(!b)return;
  for(let ty=Math.max(ry0,b.y0);ty<=Math.min(ry1,b.y1);ty++)for(let tx=Math.max(rx0,b.x0);tx<=Math.min(rx1,b.x1);tx++){
    const ch=G[ty][tx];if(ch==='#')quarterFloor(x,ch,tx,ty);
    if(ch==='N'){
      const px=tx*TILE,py=ty*TILE;x.fillStyle='#25352d';x.fillRect(px,py,TILE,TILE);x.fillStyle='#7e8d7b';x.fillRect(px+1,py+3,TILE-2,5);x.fillStyle='#14261f';x.fillRect(px+7,py+12,TILE-14,27);x.fillStyle='#607867';x.fillRect(px+9,py+13,TILE-18,2);x.fillStyle='#a8ac8d';x.fillRect(px+23,py+13,2,25);x.fillRect(px+7,py+39,TILE-14,3);
    }
  }
}
function quarterRoofProps(b){
  // Respect the exact existing roof obstacle footprints, especially stair huts.
  for(const p of b.kitProps||[]){
    const px=(p.x||0)*TILE,py=(p.y||0)*TILE;
    ctx.save();
    if(p.t==='sh'){
      const xs=p.cells.map(c=>c[0]),ys=p.cells.map(c=>c[1]),x=Math.min(...xs)*TILE,y=Math.min(...ys)*TILE,w=(Math.max(...xs)-Math.min(...xs)+1)*TILE,h=(Math.max(...ys)-Math.min(...ys)+1)*TILE;
      ctx.fillStyle='#13241d';ctx.fillRect(x+6,y+10,w,h);ctx.fillStyle='#657365';ctx.fillRect(x,y-25,w,h+25);ctx.fillStyle='#84917d';ctx.fillRect(x-3,y-29,w+6,8);ctx.fillStyle='#394e3f';ctx.fillRect(x,y+h-20,w,20);ctx.fillStyle='#c8bf96';ctx.fillRect(x+2,y+h-21,w-4,2);
    }else if(p.t==='tank'){
      ctx.fillStyle='#17291f';ctx.beginPath();ctx.ellipse(px+26,py+29,22,13,0,0,TAU);ctx.fill();ctx.fillStyle='#495f4d';ctx.fillRect(px+5,py-22,38,46);ctx.beginPath();ctx.ellipse(px+24,py-22,19,9,0,0,TAU);ctx.fill();ctx.strokeStyle='#9ba487';ctx.lineWidth=2;ctx.stroke();
    }else if(p.t==='ac'){
      ctx.fillStyle='#18291e';ctx.fillRect(px+6,py+9,40,32);ctx.fillStyle='#8b9581';ctx.fillRect(px+2,py-6,39,37);ctx.fillStyle='#566c55';ctx.fillRect(px+5,py+2,31,25);ctx.strokeStyle='#b0b79b';ctx.lineWidth=1;for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(px+8,py+5+k*3);ctx.lineTo(px+33,py+5+k*3);ctx.stroke();}
    }else if(p.t==='plant')quarterSprite(ctx,'planter',px,py,48,48);
    else if(p.t==='vent'){ctx.fillStyle='#7c8c77';ctx.fillRect(px+8,py+10,32,26);ctx.fillStyle='#2c4936';for(let k=0;k<5;k++)ctx.fillRect(px+11,py+13+k*4,26,2);}
    ctx.restore();
  }
}
