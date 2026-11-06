// First real assassination after the opening tutorial. One live target,
// a clear rear approach and an exposed front route; normal perception stays active.
STAGES.push({
  id:'p0',no:'00',name:'담배 한 대',sub:'첫 밤 1 · 첫 암살',openingContract:true,
  fee:'20만',priorityTarget:true,targetNames:{runner:'운반책'},
  mission:'증인을 넘기는 운반책 한 명을 처치하고 들어온 골목으로 탈출한다.',
  brief:'폐차장에서 담배를 피우는 운반책 한 명이 표적이다. 서쪽 적치장 옆으로 돌아 등 뒤에 접근하자. 표적을 처리한 뒤 들어온 골목으로 돌아오면 된다.',
  endText:'증인의 은신처는 넘어가지 않았다. 다음 의뢰에서는 경비 재킷으로 감시 앞을 지나가 보자.',
  W:24,H:19,start:[6,13],exit:[3,15],exitName:'들어온 골목',startA:0,
  noRefine:true,noSupport:true,noAmbientChats:true,floors:false,residents:0,
  bare:true,ownedLoadout:true,kunai:0,coins:0,well:'manhole',pspd:1.3,gspd:.85,radioCheck:0,
  securityResponse:false,wires:[],roofs:[],bricks:[],items:[],challenges:[],
  build(m){
    m.fill(0,0,23,18,',');m.rect(0,0,23,18);
    m.fill(1,13,22,16,'.');m.fill(1,12,22,12,'=');
    m.fill(5,3,21,11,'=');
    // A short screen separates the exposed front path and the quiet western lane.
    m.fill(9,9,10,10,'C');m.fill(16,3,20,3,'C');
    // A second corner lets a fleeing player leave the remembered bush and
    // change direction behind actual cover. The western entry stays open.
    m.fill(4,8,4,10,'C');
    m.car(19,6,1);m.many('B',[[7,11],[7,10],[2,8],[3,8]]);
    m.many('T',[[2,4],[3,9],[22,4],[22,11],[2,17],[21,17]]);
    m.many('H',[[6,5]]);
  },
  zones:[[5,3,21,11,'res',null,'폐차장 · 출입 금지',[]]],
  lamps:[[14,7,240,1],[18,11,180,1],[4,13,145,1]],
  guards:[
    {kind:'t',tag:'runner',target:true,at:[14,8],post:0,still:true,radio:false}
  ]
});
