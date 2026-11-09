// A playable art study, deliberately outside the linear campaign and its saves.
if(window.__AGENT_CITY_STUDY__)STAGES.push({
 id:'agentCity',layoutRevision:'radial-sign-v239',agentStudy:true,retiredCampaign:true,no:'TEST',name:'야간 인계',sub:'여성 요원 · 도시 테스트',fee:'',
 mission:'이도현 처치 · 거래 기록 회수 · 서쪽 골목으로 탈출',
 brief:'백송상사 2층에서 이도현과 거래 기록을 찾는다. 경비 옷으로 건물 안을 통과하거나, 옥상 연결교로 돌아 들어갈 수 있다. 서쪽 골목으로 빠져나오면 끝이다.',
 endText:'거래 기록을 챙겼다. 서쪽 골목으로 무사히 빠져나왔다.',
 W:42,H:44,start:[12,19],exit:[2,20],exitName:'서쪽 골목',startA:0,
 bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:true,residents:0,rivals:0,
 pspd:1.3,gspd:.8,kunai:0,coins:2,radioCheck:0,securityResponse:false,
 freeCityExteriors:true,roadsX:[18],roadsY:[21],traffic:8,
 studyStyles:['stone','brick','office','green','brick','green','stone','office'],
 referenceBuildings:[
  {box:[8,9,16,17],h:5,front:'frontBrick',windows:[0,1,1,1,1],roof:'roofMetal',ad:{brand:true,lines:['백송상사'],sub:'수출입 · 물류',x:1,fl:1,w:6,h:1}},
  {box:[23,8,31,17],h:5,front:'frontGlass',windows:[1,1,1,1],roof:'roofStone',ad:{lines:['밤샘식당'],x:1,fl:2,w:4,h:1}},
  {box:[0,4,6,16],h:7,front:'frontSilver',windows:[1,1,1],roof:'roofStone',ad:{lines:['청솔약국'],sub:'조제 · 상담',x:1,fl:6,w:5,h:3}},
  {box:[33,8,40,16],h:6,front:'frontWood',windows:[1,[0,1,0],[0,1,0],0],roof:'roofMetal',ad:{lines:['음','악','실'],x:1,fl:4,w:1,h:2}},
  {box:[1,30,8,40],h:7,front:'frontBrick',windows:[0,1,1,1,1],roof:'roofMetal',ad:{lines:['선일','전기'],x:1,fl:5,w:2,h:2}},
  {box:[10,31,16,41],h:6,front:'frontGreen',windows:[1,0,0,0,0,0],roof:'roofMetal',ad:{lines:['동진인쇄'],sub:'인쇄 · 제본',x:1,fl:4,w:5,h:3}},
  {box:[23,31,30,41],h:6,front:'frontRetail',windows:[1,0,0],roof:'roofStone',ad:{lines:['종로서점'],x:1,fl:3,w:2,h:1}},
  {box:[32,30,40,40],h:8,front:'frontSilver',windows:[1,1,1],roof:'roofStone',ad:{lines:['백','야','다','방'],x:1,fl:6,w:1,h:2}}
 ],
 referenceRow(i,fl){const s=this.referenceBuildings[i],n=s.windows.length;return fl===s.h-1?0:fl<n-1?n-1-fl:1;},
 referenceWindow(i,tx,fl){const s=this.referenceBuildings[i],a=s.ad;if(a&&tx>=s.box[0]+a.x&&tx<s.box[0]+a.x+a.w&&fl<=a.fl&&fl>a.fl-a.h)return false;const row=s.windows[this.referenceRow(i,fl)];return Array.isArray(row)?!!row[(tx-s.box[0]-1)%3]:!!row;},
 officeArt:{default:'dispatch',buildings:{0:['dispatch','executive','archive'],1:['club','dispatch','security'],2:'exchange',3:'residence',4:'freight',5:'dispatch',6:'archive',7:'executive'},decor:[{b:0,fl:1,u:.55,art:'board',w:84},{b:0,fl:0,u:.6,art:'monitorRack',w:80}]},
 build(m){
  m.fill(0,0,41,43,',');m.rect(0,0,41,43);
  m.fill(18,0,21,43,'.');m.fill(0,21,41,24,'.');
  m.fill(17,0,17,43,'=');m.fill(22,0,22,43,'=');m.fill(0,20,41,20,'=');m.fill(0,25,41,25,'=');
  const names=['백송상사','성일빌딩','청솔빌딩','가온빌딩','선일상회','동진빌딩','종로서점','백야회관'],ground=['office','food','store','food','store','food','store','food'];
  this.referenceBuildings.forEach((b,i)=>m.villa(...b.box,b.h,{kind:'shop',use:Array.from({length:b.h},(_,fl)=>fl?'office':ground[i]),signs:[names[i]],name:names[i],back:i<2}));
  for(let i=0;i<this.referenceBuildings.length;i++){const b=this.referenceBuildings[i],[x0,,x1,y1]=b.box;for(let x=x0+1;x<x1;x++)if(x!==x1-2)m.set(x,y1,this.referenceWindow(i,x,0)?'N':'#');}
  // The front apron stays connected around each real doorway and corner shop.
  m.fill(1,18,16,20,'=');m.fill(23,18,40,20,'=');m.fill(1,26,16,28,'=');m.fill(23,26,40,28,'=');
  m.many('B',[[3,19],[4,19],[25,19],[26,19],[39,26],[40,26],[3,26]]);
  m.many('T',[[7,18],[32,18],[9,42],[31,42]]);
 },
 roomPatches:[{fl:1,bounds:[8,9,16,17],furniture:[
  {t:'desk2',from:[10,13],remove:true},{t:'chairD',from:[10,14],remove:true}],
  tiles:[[10,13,'w'],[11,13,'w'],[10,14,'w']]}],
 fixedFurn:[{x:9,y:14,t:'sofa',w:2,fl:1}],
 closedDoors:[[14,17],[29,17],[4,16],[38,16],[6,40],[14,41],[28,41],[38,40]],
 planks:[[16,9,23,10,5]],wires:[],roofs:['cRoofB','cRoofA','cRoofA','cRoofB'],
 zones:[[0,0,41,43,'pub',null,'거리',[]],[8,9,16,17,'res',null,'백송상사 · 직원 구역',['crew','guard','worker']]],
 guards:[
  {kind:'g1',tag:'alleyGuard',at:[14,19],post:0,still:true,radio:false},
  {kind:'g1',tag:'receptionGuard',route:[[9,15,6],[11,15,6]],radio:false,startPause:8},
  {kind:'t',tag:'accountant',target:true,fl:1,at:[12,11],post:270,still:true,radio:false,model:'suit',outfit:'suit'},
  {kind:'civ',tag:'commuter',route:[[24,19,4],[35,19,4]],model:'coat',radio:false},
  {kind:'civ',tag:'customer',route:[[6,26,5],[14,26,5]],radio:false},
  {kind:'civ',tag:'officeWorker',at:[24,16],still:true,post:90,radio:false}
 ],targetNames:{accountant:'이도현'},
 items:[[10,10,1]],itemName:'거래 기록',itemNames:['거래 기록'],itemPlaces:['백송상사 · 2층'],itemFurniture:[['desk','desk2','shelf']],
 lamps:[[7,19,230,1],[14,18,135,1],[26,19,200,1],[17,8,210,1],[22,13,170,1],[6,26,210,1],[26,26,220,1],[13,13,260,0],[10,10,260,0,1]],
 challenges:[],fastT:420
});
if(window.__AGENT_CITY_STUDY__)DIALOGUE.agentCity=[
 ['master','백송상사 2층이야. 이도현하고 거래 기록. 둘 다 확인하고 나와.'],
 ['hero','알았어. 퇴근길에 길 좀 돌아가면 되겠네.']
];

if(window.__AGENT_CITY_STUDY__){const s=STAGES.find(s=>s.agentStudy);s.floorTiles=[];for(let i=0;i<s.referenceBuildings.length;i++){const b=s.referenceBuildings[i],[x0,,x1,y1]=b.box;for(let fl=1;fl<b.h;fl++)for(let x=x0+1;x<x1;x++)s.floorTiles.push([fl,x,y1,s.referenceWindow(i,x,fl)?'N':'#']);}}
