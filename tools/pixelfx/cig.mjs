// A thin looping thread of cigarette smoke with a glowing tip, made with pixelfx's smoke puff painter.
// MIT, Copyright (c) 2026 Patch and Hugo Duprez (pixelfx), Yahaeng adaptation.
import { Rng, hex } from '../../.agents/skills/pixelfx/vendor/pixelfx/src/core/index.js';
import { smokePuff } from '../../.agents/skills/pixelfx/vendor/pixelfx/src/fx/fire/_lib.js';
export const meta={name:'Cigarette smoke',size:[40,64],origin:[20,58],duration:2,loop:true,fps:12,bg:'ground',options:{seed:3,count:7}};
export function draw(p,t,o){
  const D=meta.duration,R=new Rng(o.seed),tip=['#ff9a3a','#ffd27a'].map(hex),smoke=hex('#b9bdc2');
  for(let i=0;i<o.count;i++){
    const ph=R.range(0,1),sw=R.range(.6,1.4),u=((t/D)+ph+i/o.count)%1;   // 0 → 1: 끝에서 올라가 흩어진다
    const x=Math.sin(u*5.5+i)*u*6*sw,y=-u*48;
    smokePuff(p,x,y,1-u,2.2+u*4,smoke,false,1.1);
  }
  const g=.6+.4*Math.sin(t/D*Math.PI*2*3);p.px(0,0,tip[g>.8?1:0]);p.glow(0,0,4,tip[0],.35*g);
}
