import * as THREE from 'three';
// Authored material tiles. Muted mineral colours; marks are tied to real surfaces.
let seed=128;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const noise=(x,y)=>{const t=Math.sin(x*127.1+y*311.7)*43758.5453;return t-Math.floor(t)};
const smoothNoise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,f=u*u*(3-2*u),g=v*v*(3-2*v);return(noise(a,b)*(1-f)+noise(a+1,b)*f)*(1-g)+(noise(a,b+1)*(1-f)+noise(a+1,b+1)*f)*g;};
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),im=x.createImageData(512,512);
 const base={brick:[105,76,62],concrete:[115,113,102],asphalt:[53,62,64],wood:[91,69,47],metal:[57,74,70],tile:[143,137,116]}[kind];
 for(let j=0;j<512;j++)for(let i=0;i<512;i++){
  const n=(rand()-.5)*13+(smoothNoise(i/48,j/48)-.5)*8;let v=n;
  if(kind==='wood')v+=Math.sin(j*.31+Math.sin(i*.018)*3)*5+Math.sin(j*1.25+i*.006)*2;
  const p=(j*512+i)*4;im.data[p]=base[0]+v;im.data[p+1]=base[1]+v;im.data[p+2]=base[2]+v;im.data[p+3]=255;
 }x.putImageData(im,0,0);
 if(kind==='brick')for(let row=0;row<9;row++)for(let col=-1;col<6;col++){
  const a=col*108+(row%2)*54,b=row*58;x.strokeStyle='#444a44';x.lineWidth=4;x.strokeRect(a,b,108,58);x.strokeStyle='rgba(183,159,128,.18)';x.lineWidth=1;x.strokeRect(a+3,b+3,102,52);
  x.fillStyle=`rgba(35,30,23,${rand()*.17})`;x.fillRect(a+4,b+5,100,49);
 }
 if(kind==='wood')for(let j=0;j<512;j+=64){x.fillStyle='#352e24';x.fillRect(0,j,512,2);x.fillStyle='#b39b73';x.globalAlpha=.2;x.fillRect(0,j+2,512,1);x.globalAlpha=1;for(let i=(j%128?75:250);i<512;i+=256){x.fillStyle='#352e24';x.fillRect(i,j,2,64);}}
 if(kind==='tile')for(let i=0;i<512;i+=128){x.fillStyle='#8c8976';x.fillRect(i,0,2,512);x.fillRect(0,i,512,2);x.fillStyle='#d2c7a3';x.fillRect(i+2,0,1,512);}
 if(kind==='concrete'||kind==='asphalt')for(let i=0;i<45;i++){const px=rand()*512,py=rand()*512,r=6+rand()*50;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(22,28,25,${rand()*.09})`);g.addColorStop(1,'rgba(22,28,25,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export function makeMaterials(){
 const m={};for(const k of ['brick','concrete','asphalt','wood','metal','tile']){const t=texture(k);t.repeat.set(k==='brick'?.9:1,k==='brick'?4:1);m[k]=new THREE.MeshStandardMaterial({map:t,roughness:k==='metal'?.65:.9,metalness:k==='metal'?.45:0,bumpMap:t,bumpScale:k==='brick'?.025:.008});}
 m.wallCut=new THREE.MeshStandardMaterial({color:'#41463e',roughness:1});m.trim=new THREE.MeshStandardMaterial({color:'#474c47',roughness:.7,metalness:.2});m.steel=new THREE.MeshStandardMaterial({color:'#9b9d91',roughness:.45,metalness:.75});m.dark=new THREE.MeshStandardMaterial({color:'#151d1d',roughness:.8});m.plaster=new THREE.MeshStandardMaterial({color:'#9c9e8d',roughness:.94});m.leather=new THREE.MeshStandardMaterial({color:'#354640',roughness:.7});m.paper=new THREE.MeshStandardMaterial({color:'#c2b69a',roughness:.96});m.glass=new THREE.MeshStandardMaterial({color:'#3d5b61',roughness:.22,metalness:.1,transparent:true,opacity:.45});m.warm=new THREE.MeshStandardMaterial({color:'#e1c08a',emissive:'#f1ba73',emissiveIntensity:1.1});return m;
}
