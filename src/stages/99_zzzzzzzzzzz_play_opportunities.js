// Give existing objectives different approaches, without adding a new checklist.
const movingBroker=campaignStage('e2').guards.find(g=>g.tag==='broker');
Object.assign(movingBroker,{post:undefined,startPause:12,still:true,sched:[
 {at:[27,7],stay:12,name:'보고 자리',act:'phone'},
 {at:[25,6],stay:10,name:'장부 책상',act:'ledger'}]});
campaignStage('e2').brief+=' 문서윤은 장부 책상과 보고 자리를 오간다. 카메라를 처리한 뒤 등을 보이는 순간을 노릴 수 있다.';
campaignStage('m4').itemActions[1].pickAlternative={cost:2,duration:5.5,loud:65,label:'계약서 금고 따기 · 락픽 2개'};
campaignStage('m4').itemActions[1].requiresText='초록 카드키 또는 락픽 2개가 필요하다';
campaignStage('m4').brief+=' 계약서 금고는 초록 카드키로 조용히 열거나, 락픽 2개로 직접 딸 수 있다. 직접 따면 시간이 더 걸리고 소리도 난다.';
// The old safe and the bed closed the only entrance to the bedroom's west
// side. Keep the safe on the south wall and leave the doorway aisle open.
campaignStage('m4').roomPatches.push({fl:1,bounds:[2,18,11,23],furniture:[
 {t:'safe',from:[6,19],to:[4,19]},{t:'safe',from:[8,19],to:[4,19]}
],tiles:[[6,19,'v'],[8,19,'v']]});
campaignStage('m4').itemLayoutVersion=3;
campaignStage('m4').fixedFurn=campaignStage('m4').fixedFurn.map(f=>f.t==='safe'&&f.fl===1&&f.x===6&&f.y===19?{...f,x:4}:f);
campaignStage('m7').itemActions[1].faultResponse={target:'broker',check:1.25,call:1.6,stay:14};
campaignStage('m7').brief+=' 관리자가 단말 이상을 무전으로 알리면 오태식이 배차실로 올라와 확인한다. 명세서를 먼저 빼낸 뒤 이곳으로 불러낼 수도 있다.';
