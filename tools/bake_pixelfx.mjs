// Bake the selected MIT pixelfx recipes once; the game only decodes this atlas.
import {writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEffect,renderFrames,contactSheet} from '../.agents/skills/pixelfx/vendor/pixelfx/tools/lib/fxlib.mjs';
import {encodePNG} from '../.agents/skills/pixelfx/vendor/pixelfx/tools/lib/png.mjs';
import * as foliage from './pixelfx/foliage.mjs';
import * as dust from './pixelfx/dust.mjs';
import * as hack from './pixelfx/hack.mjs';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),round=Number(process.argv[2]||3),OUT=join(ROOT,'build/pixelfx-preview/integrated/round-'+round);
mkdirSync(OUT,{recursive:true});mkdirSync(join(ROOT,'src/art/fx'),{recursive:true});
const gray=['#252b2e','#4c5558','#737d7d','#9fa8a0','#c4cabb','#e1e1ce','#f1edd9'];
const defs=[
 ['leaf',foliage,.95,{count:round===1?14:round===2?10:8,reach:round===1?30:round===2?25:22},1],
 ['dust',dust,1,{count:round===1?10:round===2?8:6,reach:round===1?28:round===2?24:20},1],
 ['impact','impacts/blunt-hit',.42,{palette:gray,warm:'#c3bea5',dust:'#929786',clod:'#4f5650',height:0,light:.06},.65],
 ['strike','melee/sword-slash',.43,{palette:gray,light:.04},.6],
 ['dart','impacts/hit-spark',.32,{palette:gray,height:0,light:.02},.55],
 ['muzzle','projectiles/muzzle-pistol',.58,{height:0,light:.16},.9],
 ['loot','pickups/collect-burst',.32,{palette:['#3d3e30','#666247','#8a8052','#aaa373','#d0c08d','#dfd3aa','#eee4c7','#f5edda'],light:.05},.6],
 ['shock','lightning/zap-hit',.4,{light:.16},.8],
 ['smoke','explosions/smoke-bomb',.38,{palette:['#151a1b','#252d2d','#374141','#4b5553','#626c68','#818983','#a0a59a'],canister:['#151a1b','#252d2d','#374141','#4b5553','#626c68'],light:0},.85],
 ['hack',hack,1,{reach:round===1?20:round===2?16:14,count:round===1?8:round===2?6:4,strength:round===1?.9:round===2?.75:.65},1],
 // 자유 모드 차: 타는 차(검게 탄 차체 위 불길, 고리) · 폭발(섬광 → 불덩이 → 버섯 연기, 앞 3.4초)
 ['carfire','fire/campfire',.5,{wood:['#07070a','#111115','#1a1a1f','#24242a','#2e2e35','#3a3a42'],height:26},1,15],
 ['carboom','explosions/big-explosion',.55,{},1,15,3.4],
 ['burnman','status/burning',.6,{},1,15]
];
const all=[],manifest={version:1,upstream:'a84159688af3ca37a4be05a0d422b94451b2e24e',effects:{}};
for(const [key,recipe,scale,options,opacity,fpsOpt,cut] of defs){
 const fx=typeof recipe==='string'?await loadEffect(recipe):{id:key,mod:recipe,meta:recipe.meta};
 const fps=fpsOpt||(key==='smoke'?10:20),r=renderFrames(fx,{fps,actor:false,options}),second=renderFrames(fx,{fps,actor:false,options});
 if(cut){r.frames=r.frames.slice(0,Math.round(cut*fps));second.frames=second.frames.slice(0,r.frames.length);}
 if(r.frames.some((f,i)=>!Buffer.from(f.clear).equals(Buffer.from(second.frames[i].clear))))throw Error('Non-deterministic '+key);
 if(typeof recipe!=='string'&&r.frames.at(-1).clear.some(v=>v))throw Error('Custom effect does not end empty '+key);
 writeFileSync(join(OUT,key+'.png'),contactSheet(fx,r,{max:12,zoom:2}));
 const w=Math.ceil(r.w*scale),h=Math.ceil(r.h*scale),frames=[];
 for(const frame of r.frames){
  const rgba=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const from=(Math.min(r.h-1,Math.floor(y/scale))*r.w+Math.min(r.w-1,Math.floor(x/scale)))*4,to=(y*w+x)*4;
   rgba.set(frame.clear.subarray(from,from+4),to);rgba[to+3]=Math.round(rgba[to+3]*opacity);
  }
  // 빈 테두리를 잘라 낸다 (큰 효과도 아틀라스가 작게): dx,dy = 원래 프레임 안에서 잘라 낸 자리
  let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rgba[(y*w+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0){x0=y0=0;x1=y1=0;}
  const tw=x1-x0+1,th=y1-y0+1,t=new Uint8ClampedArray(tw*th*4);for(let y=0;y<th;y++)t.set(rgba.subarray(((y0+y)*w+x0)*4,((y0+y)*w+x0+tw)*4),y*tw*4);
  frames.push({w:tw,h:th,rgba:t,dx:x0,dy:y0});
 }
 manifest.effects[key]={frames:[],fps,duration:cut||fx.meta.duration,loop:!!fx.meta.loop,size:[w,h],origin:fx.meta.origin.map(n=>Math.round(n*scale)),recipe:typeof recipe==='string'?recipe:'tools/pixelfx/'+(key==='leaf'?'foliage':key)+'.mjs'};
 all.push({key,frames});
}
const width=1024;let x=0,y=0,row=0;
for(const group of all)for(const f of group.frames){if(x+f.w>width){x=0;y+=row+2;row=0;}f.x=x;f.y=y;manifest.effects[group.key].frames.push([x,y,f.w,f.h,f.dx,f.dy]);x+=f.w+2;row=Math.max(row,f.h);}
const height=y+row,rgba=new Uint8ClampedArray(width*height*4);
for(const group of all)for(const f of group.frames)for(let yy=0;yy<f.h;yy++)rgba.set(f.rgba.subarray(yy*f.w*4,(yy+1)*f.w*4),((f.y+yy)*width+f.x)*4);
writeFileSync(join(ROOT,'src/art/fx/pixelfx.png'),encodePNG(width,height,rgba));
manifest.width=width;manifest.height=height;
writeFileSync(join(ROOT,'src/art/fx/pixelfx.json'),JSON.stringify(manifest));
writeFileSync(join(OUT,'checks.json'),JSON.stringify({deterministic:true,emptyCustomEnd:true,effects:defs.length,width,height},null,2));
console.log(JSON.stringify({round,effects:defs.length,width,height,frames:all.reduce((n,g)=>n+g.frames.length,0)}));
