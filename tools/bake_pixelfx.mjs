// Bake the selected MIT pixelfx recipes once; the game only decodes this atlas.
import {writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEffect,renderFrames,contactSheet} from '../.agents/skills/pixelfx/vendor/pixelfx/tools/lib/fxlib.mjs';
import {encodePNG} from '../.agents/skills/pixelfx/vendor/pixelfx/tools/lib/png.mjs';
import * as foliage from './pixelfx/foliage.mjs';
import * as dust from './pixelfx/dust.mjs';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),round=Number(process.argv[2]||3),OUT=join(ROOT,'build/effects-v146/round-'+round);
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
 ['shock','lightning/zap-hit',.4,{light:.16},.8]
];
const all=[],manifest={version:1,upstream:'a84159688af3ca37a4be05a0d422b94451b2e24e',effects:{}};
for(const [key,recipe,scale,options,opacity] of defs){
 const fx=typeof recipe==='string'?await loadEffect(recipe):{id:key,mod:recipe,meta:recipe.meta};
 const r=renderFrames(fx,{fps:20,actor:false,options}),second=renderFrames(fx,{fps:20,actor:false,options});
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
  frames.push({w,h,rgba});
 }
 manifest.effects[key]={frames:[],fps:20,duration:fx.meta.duration,origin:fx.meta.origin.map(n=>Math.round(n*scale)),recipe:typeof recipe==='string'?recipe:'tools/pixelfx/'+(key==='leaf'?'foliage':'dust')+'.mjs'};
 all.push({key,frames});
}
const width=1024;let x=0,y=0,row=0;
for(const group of all)for(const f of group.frames){if(x+f.w>width){x=0;y+=row+2;row=0;}f.x=x;f.y=y;manifest.effects[group.key].frames.push([x,y,f.w,f.h]);x+=f.w+2;row=Math.max(row,f.h);}
const height=y+row,rgba=new Uint8ClampedArray(width*height*4);
for(const group of all)for(const f of group.frames)for(let yy=0;yy<f.h;yy++)rgba.set(f.rgba.subarray(yy*f.w*4,(yy+1)*f.w*4),((f.y+yy)*width+f.x)*4);
writeFileSync(join(ROOT,'src/art/fx/pixelfx.png'),encodePNG(width,height,rgba));
manifest.width=width;manifest.height=height;
writeFileSync(join(ROOT,'src/art/fx/pixelfx.json'),JSON.stringify(manifest));
writeFileSync(join(OUT,'checks.json'),JSON.stringify({deterministic:true,emptyCustomEnd:true,effects:defs.length,width,height},null,2));
console.log(JSON.stringify({round,effects:defs.length,width,height,frames:all.reduce((n,g)=>n+g.frames.length,0)}));
