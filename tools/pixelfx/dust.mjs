// A small contact puff using the pixelfx painter and seeded particle method.
// MIT, Copyright (c) 2026 Patch and Hugo Duprez (pixelfx), Yahaeng adaptation.
import { Rng, hex, clamp } from '../../.agents/skills/pixelfx/vendor/pixelfx/src/core/index.js';
export const meta={name:'Foot contact dust',size:[72,40],origin:[36,28],duration:.5,loop:false,fps:20,bg:'ground',options:{seed:7,count:6,reach:20,revision:3}};
export function draw(p,t,o){
  if(t>=meta.duration)return;
  const R=new Rng(o.seed),u=t/meta.duration,C=['#6b7165','#919384','#b1ae98'].map(hex);
  for(let i=0;i<o.count;i++){
    const a=R.range(-Math.PI,0),r=R.range(2,4),reach=R.range(o.reach*.35,o.reach),x=Math.cos(a)*reach*u,y=Math.sin(a)*3-4*Math.sin(u*Math.PI);
    p.disc(x,y,r*(.6+u*.6),C[i%3],Math.pow(1-u,1.8)*.28);
    if(i%2===0&&u<.5)p.px(x,y+R.range(0,3),C[0]);
  }
}
