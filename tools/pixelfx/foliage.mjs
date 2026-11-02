// Leaf tumble adapted from patch-gg/pixelfx nature/leaf-storm and Sprite Fusion's
// falling-leaves, MIT, Copyright (c) 2026 Patch and Hugo Duprez.
import { Rng, hex, clamp, TAU } from '../../.agents/skills/pixelfx/vendor/pixelfx/src/core/index.js';
export const meta={name:'Hedge rustle',size:[72,48],origin:[36,36],duration:.65,loop:false,fps:20,bg:'ground',options:{seed:19,count:8,reach:22,revision:3}};
export function draw(p,t,o){
  if(t>=meta.duration)return;
  const R=new Rng(o.seed),ramp=['#263e30','#3c6043','#628258','#849465'].map(hex),u=t/meta.duration;
  for(let i=0;i<o.count;i++){
    const a=R.range(-Math.PI+.3,-.3),d=R.range(o.reach*.45,o.reach),q=clamp((u-i*.012)/.9,0,1);
    const x=Math.cos(a)*d*q,y=-4+Math.sin(a)*d*Math.sin(q*Math.PI)*.55+8*q;
    const w=(1+R.range(0,1.8))*Math.cos(q*TAU+R.range(0,TAU)),h=1+R.range(0,1),alpha=Math.min(1,(1-q)*2.2);
    p.poly([[x-w,y],[x,y-h],[x+w,y+1],[x,y+h]],ramp[i%ramp.length],alpha);
  }
}
