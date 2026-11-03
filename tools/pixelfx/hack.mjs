// Scanline tears adapted from patch-gg/pixelfx scifi/emp-blast and scifi/glitch.
// MIT, Copyright (c) 2026 Patch and Hugo Duprez; restrained CCTV completion adaptation.
import {Rng,hex,clamp} from '../../.agents/skills/pixelfx/vendor/pixelfx/src/core/index.js';
export const meta={name:'CCTV signal cut',size:[64,48],origin:[32,24],duration:.45,loop:false,fps:20,bg:'dark',options:{seed:41,reach:14,count:4,strength:.65}};
export function draw(p,t,o){
  if(t>=meta.duration)return;
  const u=t/meta.duration,R=new Rng(o.seed),C=['#344650','#607985','#9bb9c5','#dae3e5'].map(hex);
  const fade=Math.pow(1-u,1.2)*o.strength,reach=o.reach;
  // A quick lock-on bracket collapses into one passing scanline, then dead pixels.
  for(const sign of [-1,1]){
    const x=sign*(reach-3*clamp(u/.35,0,1));
    if(u<.55){p.line(x,-9,x,-5,C[1],fade);p.line(x,7,x,11,C[1],fade);p.line(x,-9,x-sign*4,-9,C[2],fade);p.line(x,11,x-sign*4,11,C[2],fade);}
  }
  if(u<.65){const y=-10+22*u/.65;p.line(-10,y,10,y,C[2],fade);p.line(-6,y+1,6,y+1,C[0],fade*.6);}
  for(let i=0;i<o.count;i++){
    const delay=R.range(0,.13),v=clamp((u-delay)/.78,0,1),x=R.range(-10,10)+(i%2?-1:1)*v*6,y=R.range(-8,8)+v*5;
    if(u<delay||v>=1)continue;
    const a=Math.pow(1-v,1.8)*fade;p.line(x,y,x+R.range(1,3),y,C[i%3+1],a);
  }
}
