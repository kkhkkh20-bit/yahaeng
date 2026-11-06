// Offline-authored cloth and stationery, shared by loose props and desk loot.
const fieldArt={};
for(const[key,a]of Object.entries(window.__FIELD_ART__||{}))fieldArt[key]={...a,img:Object.assign(new Image(),{src:a.src})};
function drawFieldItem(x,key,px,py,scale=1){
 const a=fieldArt[key];if(!a?.img.complete||!a.img.naturalWidth)return false;
 x.save();x.imageSmoothingEnabled=false;x.fillStyle='rgba(8,12,17,.3)';x.beginPath();x.ellipse(px,py+4,16*scale,9*scale,0,0,Math.PI*2);x.fill();x.drawImage(a.img,px+a.ox*scale,py+a.oy*scale,a.w*scale,a.h*scale);x.restore();return true;
}
