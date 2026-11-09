// A playable art study, deliberately outside the linear campaign and its saves.
if(window.__AGENT_CITY_STUDY__)STAGES.push({
 id:'agentCity',agentStudy:true,retiredCampaign:true,no:'TEST',name:'야간 인계',sub:'여성 요원 · 도시 테스트',fee:'',
 mission:'이도현 처치 · 거래 기록 회수 · 서쪽 골목으로 탈출',
 brief:'백송상사 2층에서 이도현과 거래 기록을 찾는다. 경비 옷으로 건물 안을 통과하거나, 옥상 연결교로 돌아 들어갈 수 있다. 서쪽 골목으로 빠져나오면 끝이다.',
 endText:'거래 기록을 챙겼다. 서쪽 골목으로 무사히 빠져나왔다.',
 W:42,H:44,start:[12,19],exit:[2,20],exitName:'서쪽 골목',startA:0,
 bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,floors:true,residents:0,rivals:0,
 pspd:1.3,gspd:.8,kunai:0,coins:2,radioCheck:0,securityResponse:false,
 freeCityExteriors:true,roadsX:[18],roadsY:[21],traffic:8,
 studyStyles:['stone','brick','office','green','brick','green','stone','office'],
 officeArt:{default:'dispatch',buildings:{0:['dispatch','executive','archive'],1:['club','dispatch','security'],2:'exchange',3:'residence',4:'freight',5:'dispatch',6:'archive',7:'executive'},decor:[{b:0,fl:1,u:.55,art:'board',w:84},{b:0,fl:0,u:.6,art:'monitorRack',w:80}]},
 build(m){
  m.fill(0,0,41,43,',');m.rect(0,0,41,43);
  m.fill(18,0,21,43,'.');m.fill(0,21,41,24,'.');
  m.fill(17,0,17,43,'=');m.fill(22,0,22,43,'=');m.fill(0,20,41,20,'=');m.fill(0,25,41,25,'=');
  m.villa(8,3,16,17,5,{kind:'shop',use:['office','office','office','office','office'],signs:['백송상사','야간 업무','기록실','서고','관리실'],name:'백송상사',back:true});
  m.villa(23,3,31,17,5,{kind:'shop',use:['food','office','office','office','office'],signs:['밤샘식당','성일기획','영진상사','건축사무소','관리실'],name:'성일빌딩',back:true});
  m.villa(1,5,6,17,7,{kind:'shop',use:['store','office','office','office','office','office','office'],signs:['청솔약국','미래여행'],name:'청솔빌딩'});
  m.villa(33,6,40,17,6,{kind:'shop',use:['food','office','office','office','office','office'],signs:['은행나무','가온스튜디오'],name:'가온빌딩'});
  m.villa(1,28,8,41,7,{kind:'shop',use:['store','office','office','office','office','office','office'],signs:['선일상회','삼일기획'],name:'선일상회'});
  m.villa(10,27,16,41,6,{kind:'shop',use:['food','office','office','office','office','office'],signs:['야시장','여행사'],name:'동진빌딩'});
  m.villa(23,28,30,41,6,{kind:'shop',use:['store','office','office','office','office','office'],signs:['종로서점','전당포'],name:'종로서점'});
  m.villa(32,27,40,41,8,{kind:'shop',use:['food','office','office','office','office','office','office','office'],signs:['백야회관','다온기획'],name:'백야회관'});
  // Original pictorial shop signs occupy a solid bay, not a usable window.
  for(const [x,y]of [[1,17],[8,17],[23,17],[33,17],[1,41],[10,41],[23,41],[32,41]]){m.set(x+1,y,'#');m.set(x+2,y,'#');}
  m.many('B',[[3,19],[4,19],[25,19],[26,19],[39,34],[39,35],[3,26]]);
  m.many('T',[[1,8],[40,10],[1,31],[40,30]]);
 },
 roomPatches:[{fl:1,bounds:[8,3,16,17],furniture:[
  {t:'desk2',from:[10,9],remove:true},{t:'chairD',from:[10,10],remove:true},
  {t:'desk2',from:[10,12],remove:true},{t:'chairD',from:[10,13],remove:true}],
  tiles:[[10,9,'w'],[11,9,'w'],[10,10,'w'],[10,12,'w'],[11,12,'w'],[10,13,'w']]}],
 fixedFurn:[{x:9,y:14,t:'sofa',w:2,fl:1},{x:12,y:16,t:'plant',fl:1}],
 planks:[[16,9,23,10,5]],wires:[],roofs:['cRoofB','cRoofA','cRoofA','cRoofB'],
 zones:[[0,0,41,43,'pub',null,'거리',[]],[8,3,16,17,'res',null,'백송상사 · 직원 구역',['crew','guard','worker']]],
 guards:[
  {kind:'g1',tag:'alleyGuard',at:[14,19],post:0,still:true,radio:false},
  {kind:'g1',tag:'receptionGuard',route:[[9,15,6],[11,15,6]],radio:false,startPause:8},
  {kind:'t',tag:'accountant',target:true,fl:1,at:[12,11],post:270,still:true,radio:false,model:'suit',outfit:'suit'},
  {kind:'civ',tag:'commuter',route:[[24,19,4],[35,19,4]],model:'coat',radio:false},
  {kind:'civ',tag:'customer',route:[[6,26,5],[14,26,5]],radio:false},
  {kind:'civ',tag:'officeWorker',at:[25,15],still:true,post:90,radio:false}
 ],targetNames:{accountant:'이도현'},
 items:[[10,7,1]],itemName:'거래 기록',itemNames:['거래 기록'],itemPlaces:['백송상사 · 2층'],itemFurniture:[['desk','desk2','shelf']],
 lamps:[[7,19,230,1],[26,19,200,1],[17,8,210,1],[22,13,170,1],[6,26,210,1],[26,26,220,1],[13,13,260,0],[10,10,260,0,1]],
 challenges:[],fastT:420
});
if(window.__AGENT_CITY_STUDY__)DIALOGUE.agentCity=[
 ['master','백송상사 2층이야. 이도현하고 거래 기록. 둘 다 확인하고 나와.'],
 ['hero','알았어. 퇴근길에 길 좀 돌아가면 되겠네.']
];
