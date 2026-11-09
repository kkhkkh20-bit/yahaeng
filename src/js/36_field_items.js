// Offline-authored cloth and stationery, shared by loose props and desk loot.
const fieldArt={};
for(const[key,a]of Object.entries(window.__FIELD_ART__||{}))fieldArt[key]={...a,img:Object.assign(new Image(),{src:a.src})};
function drawFieldItem(x,key,px,py,scale=1){
 if(drawPurchasedPaper(x,key,px,py,scale))return true;
 const a=fieldArt[key];if(!a?.img.complete||!a.img.naturalWidth)return false;
 x.save();x.imageSmoothingEnabled=false;x.fillStyle='rgba(8,12,17,.3)';x.beginPath();x.ellipse(px,py+4,16*scale,9*scale,0,0,Math.PI*2);x.fill();x.drawImage(a.img,px+a.ox*scale,py+a.oy*scale,a.w*scale,a.h*scale);x.restore();return true;
}
function drawFieldTool(c,key,x,y,h=18,angle=0){
 const a=fieldArt[key];if(!a?.img.complete||!a.img.naturalWidth)return false;
 const w=h*a.w/a.h;c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.imageSmoothingEnabled=false;c.drawImage(a.img,-w/2,-h/2,w,h);c.restore();return true;
}
function drawLures(visible){
 for(const l of S.lures){
  if(!visible(l)||l.claim?.lure===l&&l.claim.lureT!=null&&l.claim.lureT<3.8)continue;
  const f=clamp(l.t/.35,0,1),x=l.x0+(l.x-l.x0)*f,y=l.y0-22+(l.y-l.y0+22)*f-Math.sin(f*Math.PI)*18;
  drawFieldTool(ctx,'cigarettes',x,y,16,l.landed?-.22:f*2);
  const age=S.t-(l.landedAt??-10);
  if(l.landed&&age<.35){ctx.save();ctx.strokeStyle=`rgba(214,203,164,${(1-age/.35)*.45})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+5,5+age*16,3+age*6,0,0,TAU);ctx.stroke();ctx.restore();}
 }
}
function drawThrownCans(visible){
 for(const s of S.stones){
  const f=Math.min(1,s.t/s.dur),x=s.x0+(s.x1-s.x0)*f,y=s.y0+(s.y1-s.y0)*f-Math.sin(f*Math.PI)*30;
  if(!visible({fl:flOf(s),x,y:y+Math.sin(f*Math.PI)*30}))continue;
  drawFieldTool(ctx,'can',x,y,12,f*4);
 }
}
