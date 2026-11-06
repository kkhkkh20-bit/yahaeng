// Small real episodes combine learned rules before the full city contracts.
STAGES.push({
 id:'e1',no:'입문 1',name:'골목의 연락책',sub:'입문 1 · 움직이는 표적',apprenticeContract:true,
 fee:'35만',priorityTarget:true,targetNames:{contact:'연락책'},
 purpose:'증인 명단을 넘기러 나온 연락책을 처리하고 서쪽 골목으로 돌아온다.',
 mission:'연락책 처치 후 서쪽 골목으로 탈출',
 brief:'운반책과 거래하던 연락책이 증인 명단을 넘기러 나왔다. 그는 동쪽 적치장과 골목 사이를 왕복한다. 경비는 한 명이다. 연락책이 멈추거나 등을 보일 때 조용히 접근하자. 카메라와 잠긴 문은 없다. 표적만 처리하고 빠져나오면 된다.',
 endText:'명단이 넘어가는 것을 막았다. 연락책이 쓰던 창고에 거래 명세서가 남아 있다. 첫 완료 기술 포인트로 원하는 기술을 배우고 다음 의뢰로 가자.',
 W:32,H:22,start:[5,18],exit:[3,18],exitName:'서쪽 골목',startA:0,
 bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:false,residents:0,rivals:0,
 kunai:0,coins:0,pspd:1.3,gspd:.75,securityResponse:false,radioCheck:0,wires:[],roofs:[],bricks:[],items:[],challenges:[],
 build(m){m.fill(0,0,31,21,',');m.rect(0,0,31,21);m.fill(1,15,30,19,'.');m.fill(7,5,29,14,'=');m.fill(14,10,16,12,'C');m.fill(25,3,29,3,'C');m.many('B',[[9,13],[10,13],[20,11],[20,12],[20,15]]);m.many('T',[[3,5],[5,10],[29,19]]);m.car(25,12,1);},
 zones:[[0,0,31,21,'pub',null,'공개 골목',[]]],lamps:[[30,8,250,1],[6,15,190,1]],
 guards:[{kind:'t',tag:'contact',target:true,route:[[22,8,10],[27,8,10]],radio:false},{kind:'g1',tag:'lookout',route:[[12,16,5],[24,16,6]],radio:false}],
});
STAGES.push({
 id:'e2',no:'입문 2',name:'창고의 거래',sub:'입문 2 · 복장과 CCTV',apprenticeContract:true,
 fee:'40만',purpose:'연락책의 거래 명세서를 회수해 증인 거래의 배후를 확인한다.',
 mission:'거래 명세서 회수 후 골목으로 탈출',
 brief:'연락책이 쓰던 창고에 거래 명세서가 있다. 경비 둘과 CCTV 한 대가 지킨다. 골목의 예비 재킷으로 평범하게 걸어 들어갈 수 있다. 카메라 뒤에서 전선을 분리하면 책상 작업이 안전해진다. 만약 신원이 녹화되면 골목의 관리 단말에서 기록을 지운 뒤 나가자.',
 endText:'명세서에서 연락 거점의 주소를 찾았다. 그곳 2층의 장부로 배후를 확인하자.',
 W:34,H:23,start:[5,19],exit:[3,19],exitName:'서쪽 골목',startA:0,
 bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:false,residents:0,rivals:0,
 kunai:0,coins:0,pspd:1.3,gspd:.8,securityResponse:false,radioCheck:0,wires:[],roofs:[],bricks:[],challenges:[],
 build(m){m.fill(0,0,33,22,',');m.rect(0,0,33,22);m.fill(1,16,32,20,'.');m.fill(14,3,31,14,'h');m.fill(14,3,31,3,'#');m.fill(14,3,14,14,'#');m.fill(31,3,31,14,'#');m.fill(14,14,31,14,'#');m.fill(18,14,19,14,'h');m.fill(14,10,14,11,'h');m.many('C',[[15,4],[16,4],[30,4],[30,5]]);m.many('B',[[8,17],[12,14],[12,13]]);m.many('T',[[4,5],[7,9],[31,20]]);},
 zones:[[0,0,33,22,'pub',null,'골목',[]],[14,3,31,14,'res',null,'거래 창고',['crew']]],
 props:[],
 guards:[{kind:'g1',tag:'doorkeeper',at:[18,12],post:90,still:true,radio:false},{kind:'g1',tag:'warehousePatrol',route:[[16,9,8],[21,9,8],[19,11,0],[19,12,6]],radio:false}],
 fixedFurn:[{x:27,y:5,t:'desk',w:2},{x:9,y:16,t:'pc'}],
 items:[[27,6]],itemName:'거래 명세서',itemNames:['거래 명세서'],itemPlaces:['거래 창고 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],
 cams:[[23,5,0,12]],securityEvidence:true,camRoom:{pos:[9,17],fl:0,name:'골목 관리 단말'},
 lamps:[[30,10,380,0],[8,20,200,1]],
});
{
 const layout=STAGES.find(s=>s.id==='tR');
 STAGES.push({...layout,id:'e3',no:'입문 3',name:'윗층의 장부',sub:'입문 3 · 작은 2층 건물',apprenticeContract:true,
  tutorial:false,episodeLesson:false,lessonLoot:false,steps:undefined,
  fee:'45만',purpose:'거래 명세서가 가리킨 연락 거점에서 배후가 적힌 장부를 회수한다.',
  mission:'연락 거점 2층 장부 회수 후 서쪽 골목으로 탈출',
  brief:'명세서가 가리킨 연락 거점이다. 배후의 이름이 적힌 장부는 2층에 있다. 경비는 1층에 한 명뿐이다. 골목의 예비 재킷을 입고 앞문으로 들어가자. 계단은 기술 없이 오르내릴 수 있다. 2층에서 장부를 챙긴 뒤 계단으로 내려와 왼쪽 골목으로 빠져나온다. 카메라는 없다.',
  endText:'장부는 클럽 실장을 가리킨다. 암살, 복장, CCTV와 층 이동을 익혔다. 이제 VIP에서 배운 방법을 조합해 보자.',
  rivals:0,ownedLoadout:true,securityResponse:false,radioCheck:0,
  zones:[[0,0,24,22,'pub',null,'골목',[]],[6,3,18,14,'res',null,'연락 거점',['crew']]],
  props:[],
  guards:[{kind:'g1',tag:'officeKeeper',b:0,fl:0,at:'S',post:180,still:true,radio:false}],
  itemName:'연락 장부',itemNames:['연락 장부'],itemPlaces:['연락 거점 2층 · 책상'],challenges:[],
 });
}
