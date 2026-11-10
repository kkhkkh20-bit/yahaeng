function syncPlayOpportunities(){
 if(STAGE.id!=='e2'||S.brokerRoutineVersion===1)return;
 const g=npc('broker'),d=STAGE.guards.find(g=>g.tag==='broker');
 if(g&&d?.sched&&!g.sched){
  g.sched=cloneDeep(d.sched);g.route=d.sched.map(s=>({x:tc(s.at[0]),y:tc(s.at[1]),pause:s.stay}));
  g.ri=1%g.route.length;g.post=null;g.still=true;
  if(g.state==='PATROL'){g.wait=Math.min(g.wait||0,12);g.path=null;}
 }
 S.brokerRoutineVersion=1;
}
function startDispatchFault(it,operator,spec){
 if(!spec||S.dispatchFault||!operator||!operator.radio)return;
 S.dispatchFault={phase:'checking',operator:operator.id,target:spec.target,at:{x:it.x,y:it.y,fl:flOf(it),z:0},face:{x:it.dx??it.x,y:it.dy??it.y},t:0,spec};
}
function updateDispatchFault(dt){
 const f=S.dispatchFault;if(!f||!['checking','calling'].includes(f.phase))return;
 const op=S.guards.find(g=>g.id===f.operator);
 // A real operator must reach the terminal and finish the call. Interrupting
 // that person before delivery leaves the boss on the original route.
 if(!op||op.doomed||op.yank||!['PATROL','RETURN','SUSPICIOUS'].includes(op.state)){f.phase='interrupted';return;}
 const at=f.at,there=flOf(op)===at.fl&&!(op.z||0)&&dist(op.x,op.y,at.x,at.y)<44&&!op.moving;
 if(!there){f.t=0;if(f.phase==='calling')f.phase='interrupted';return;}
 f.t+=dt;
 if(f.phase==='checking'&&f.t>=f.spec.check){
  f.phase='calling';f.t=0;gsay(op,'배차가 전부 취소됐습니다. 배차실로 와서 확인해 주세요.',2.2);op.path=null;op.wait=Math.max(op.wait||0,f.spec.call+.3);
 }
 if(f.phase!=='calling'||f.t<f.spec.call)return;
 f.phase='delivered';const boss=npc(f.target);
 if(!boss||boss.doomed||boss.yank||!['PATROL','RETURN'].includes(boss.state))return;
 goSuspicious(boss,at.x,at.y,f.spec.stay,'dispatch');boss.poi={...at};boss.dispatchVisit=true;
 gsay(boss,'뭘 잘못 눌렀나 보네. 내가 올라갈게.',2.2);
 const P=S.player;if(flOf(P)===flOf(op)&&dist(P.x,P.y,op.x,op.y)<420&&los(P.x,P.y,op.x,op.y))toast('오태식이 직접 배차실을 확인하러 온다',2.4);
 op.state='RETURN';op.path=null;op.relight=null;
}
