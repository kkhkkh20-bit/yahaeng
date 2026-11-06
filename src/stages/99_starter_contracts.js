// Two small, real contracts bridge the first assassination and the full city.
// They use ordinary permissions, loot, cameras and earned records, not loaned skills.
STAGES.push({
  id:'p1',no:'00',name:'빌린 제복',sub:'첫 밤 2 · 복장으로 통과',starterContract:'disguise',
  fee:'25만',purpose:'경비 재킷을 입고 물류실의 출고 서류를 회수한다.',
  mission:'골목 경비를 기절시켜 옷을 훔쳐 입고 물류실의 출고 서류를 가져온다.',
  brief:'혼자 있는 골목 경비를 기절시킨 뒤 옷을 훔쳐 입는다. 이 재킷으로 물류실을 걸어서 통과할 수 있다. 입구 경비는 동료의 평범한 통행을 막지 않는다. 서류는 경비의 등 뒤에 있다. 서류를 챙긴 뒤 들어온 골목으로 돌아온다.',
  endText:'출고 기록을 확보했다. 이 화물을 지켜보던 카메라에 배송 명세서의 행방도 남아 있다. 까마귀가 다음 창고의 위치를 보냈다.',
  W:26,H:18,start:[6,14],exit:[3,15],exitName:'들어온 골목',startA:0,
  bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:false,residents:0,rivals:0,
  kunai:0,coins:0,pspd:1.3,gspd:.8,securityResponse:false,radioCheck:0,
  wires:[],roofs:[],bricks:[],challenges:[],
  build(m){
    m.fill(0,0,25,17,',');m.rect(0,0,25,17);m.fill(1,12,24,16,'.');
    m.fill(10,3,23,11,'h');m.fill(10,3,23,3,'#');m.fill(10,3,10,11,'#');m.fill(23,3,23,11,'#');m.fill(10,11,23,11,'#');m.fill(16,11,17,11,'h');
    m.many('C',[[11,4],[12,4],[21,4],[22,4]]);m.many('B',[[5,13],[7,13]]);m.many('T',[[4,4],[7,6],[24,14]]);
  },
  zones:[[0,0,25,17,'pub',null,'골목',[]],[10,3,23,11,'res',null,'물류실',['crew']]],
  props:[],
  guards:[{kind:'g1',tag:'doorkeeper',at:[16,9],post:90,still:true,radio:false}],
  fixedFurn:[{x:17,y:5,t:'desk',w:2}],itemActions:[{kind:'recovery',duration:1.2}],
  items:[[17,6]],itemName:'출고 서류',itemNames:['출고 서류'],itemPlaces:['물류실 · 책상'],
  lamps:[[22,7,420,0],[13,14,220,1]],starterPass:[16.5,11],
});
STAGES.push({
  id:'p2',no:'00',name:'꺼진 눈',sub:'첫 밤 3 · CCTV 한 대',starterContract:'camera',
  fee:'30만',purpose:'CCTV 뒤에서 전선을 분리하고 배송 명세서를 회수한다.',
  mission:'비어 있는 창고에서 CCTV를 끄고 배송 명세서를 가져온다.',
  brief:'경비가 비운 작은 창고다. 카메라 뒤쪽에는 시야가 닿지 않는다. 뒤로 접근해 행동으로 전선을 분리한다. 조작은 2초가 걸린다. CCTV가 꺼지면 명세서를 챙겨 골목으로 나온다.',
  endText:'배송 명세서의 수신인은 동쪽 적치장의 연락책이다. 증인 명단이 넘어가기 전에 그를 찾아야 한다.',
  W:26,H:18,start:[6,13],exit:[3,15],exitName:'들어온 골목',startA:0,
  bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:false,residents:0,rivals:0,
  kunai:0,coins:0,pspd:1.3,gspd:.8,securityResponse:false,radioCheck:0,
  wires:[],roofs:[],bricks:[],guards:[],challenges:[],
  build(m){
    m.fill(0,0,25,17,',');m.rect(0,0,25,17);m.fill(1,12,24,16,'.');
    m.fill(12,5,24,12,'h');m.fill(12,4,24,4,'#');m.fill(12,4,12,9,'#');m.fill(24,4,24,12,'#');
    m.many('C',[[21,5],[22,5],[23,5],[23,10]]);m.many('B',[[6,12],[8,12]]);m.many('T',[[4,5],[8,4],[23,15]]);
  },
  zones:[[0,0,25,17,'pub',null,'빈 창고',[]]],
  fixedFurn:[{x:20,y:5,t:'desk',w:2}],itemActions:[{kind:'recovery',duration:1.2}],
  cams:[[16,5,0,10]],items:[[20,6]],itemName:'배송 명세서',itemNames:['배송 명세서'],itemPlaces:['창고 · 책상'],
  lamps:[[23,7,420,0],[16,10,300,0]],
});
