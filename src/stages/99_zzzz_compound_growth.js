// Five real jobs: repeat the core stealth loop, then add one new spatial problem.
// Existing IDs/clear records remain; the former single-rule errands are optional archives.
const COMPOUND_COMMON={layoutRevision:212,compound:true,physicalWorld:true,storyEpisode:true,episodeLesson:false,tutorial:false,steps:undefined,
 W:34,H:24,start:[6,18],exit:[3,19],exitName:'골목 철문 밖',startA:0,floors:true,
 bare:true,ownedLoadout:true,noRefine:true,noSupport:true,noAmbientChats:true,residents:0,rivals:0,
 kunai:0,coins:0,pspd:1.3,gspd:.8,radioCheck:0,securityResponse:false,
 floorTiles:[],camRoom:null,securityEvidence:false,cameraFocus:undefined,windowStates:[],wires:[],roofs:[],bricks:[],challenges:[],props:[],items:[],cams:[],keyItems:[],traps:[],fixedFurn:[],lampControls:[],
 zones:[[0,0,33,23,'pub',null,'물류 골목',[]],[4,3,31,15,'res',null,'금성 운송 · 출입 통제',['crew']],[18,3,30,15,'res',null,'물류 거점 · 직원 구역',['crew']]],
 buildingNames:{0:'금성 운송 · 야간 사무동',1:'봉인된 적재 창고'},industrialBuildings:[0,1],
 build(m){
  m.fill(0,0,33,23,',');m.rect(0,0,33,23);m.fill(1,16,32,21,'.');m.fill(1,15,17,15,'=');
  m.fill(5,3,17,14,'=');m.fill(3,2,32,2,'#');m.fill(3,2,3,16,'#');m.fill(32,2,32,16,'#');m.fill(3,16,12,16,'#');m.fill(15,16,32,16,'#');m.fill(9,9,10,10,'C');m.fill(4,8,4,10,'C');
  m.bld(18,3,30,15,2,[[18,12],[24,15]],'h');m.set(28,12,'Y');
  m.many('B',[[7,11],[7,10],[2,8],[2,9],[12,13],[14,17],[31,17]]);
  m.bld(5,3,11,5,1,[],'h');
  m.many('T',[[2,4],[3,9],[32,4],[32,13],[2,22],[30,22]]);m.car(26,19,1);
 },
 lamps:[[14,6,170,1],[5,17,160,1],[24,9,350,0,0],[25,8,330,0,1]],
 lampControls:[[2,19.5,12.5],[3,19.5,12.5]],
 fixedFurn:[{x:20,y:5,t:'shelf',w:3},{x:22,y:10,t:'boxes',w:2},{x:19,y:13,t:'locker'},{x:26,y:13,t:'locker'},
  {x:20,y:5,t:'locker',fl:1},{x:28,y:8,t:'locker',fl:1},{x:25,y:5,t:'desk',w:2,fl:1},{x:27,y:10,t:'shelf',w:2,fl:1}],
};
const yardGuard=()=>({kind:'g1',tag:'uniformDonor',at:[14,8],post:0,still:true,radio:false});
const hallGuard=()=>({kind:'g1',tag:'hallKeeper',at:[26,11],post:0,still:true,radio:false});
const lightGuard=()=>({kind:'g1',tag:'lightKeeper',at:[22,7],post:90,still:true,radio:false});
const newCast=(name,role,appearance,key,palette)=>({name,role,appearance,key,palette,habit:role+'로서 보고를 확인한다.'});
TARGET_CAST.foreman=newCast('한재문 · 작업반장','금성회 야간 출고 책임자','붉은 작업 코트 · 회색 머리','castForeman@coat',['#d5ab88','#a8a6a0','#a33e3b','#2d3440','#181f28']);
TARGET_CAST.records=newCast('차유진 · 기록책','금성회 증인 이송 기록책','금발 · 자주색 정장','castRecords@femaleBoss',['#e4b79a','#c7a263','#884c70','#2b3543','#20242d']);
TARGET_CAST.inspector=newCast('서명석 · 감시반장','금성회 현장 감시 책임자','검은 머리 · 붉은 조끼','castInspector@worker',['#d3a282','#20232b','#973f40','#35404c','#202932']);
TARGET_CAST.watchCaptain={...TARGET_CAST.inspector,name:'박태준 · 출고 감시담당',key:'castWatchCaptain@worker',palette:['#d3a282','#74766b','#925348','#35404c','#202932']};
TARGET_CAST.cameraLead={...TARGET_CAST.inspector,name:'류건호 · 감시팀장',key:'castCameraLead@worker',appearance:'짧은 검은 머리 · 보라색 경비 조끼',palette:['#d3a282','#303446','#593e77','#2e3e48','#202932']};
TARGET_CAST.handover={...TARGET_CAST.foreman,name:'윤태오 · 인계책',key:'castHandover@helmet',appearance:'안전모 · 황토색 작업복',palette:['#cca07d','#37332b','#b3833e','#35414c','#c6b18b']};
TARGET_CAST.foreman.personality={cues:[['phone','마당은 보고 있나? 불 끄고 퇴근할 생각은 하지 마.'],['point','차는 내가 확인하고 보낸다. 서류는 기록실로 넘겨.']],alert:'출고 멈춰! 누가 들어왔어!'};
TARGET_CAST.records.personality={cues:[['ledger','사람은 바꿔도 숫자는 남아. 명세서는 내가 챙긴다.'],['phone','인계서는 정하린에게. 여기 이름은 남기지 말고.']],alert:'명세서 건드리지 마! 경비, 기록실로!'};
TARGET_CAST.inspector.personality={cues:[['point','한 사람씩 확인해. 이송 명단은 위층에서 받는다.'],['phone','마당 순찰 확인. 기록책은 아직 안 나왔다.']],alert:'기록실 막아! 계단부터 지켜!'};
TARGET_CAST.cameraLead.personality={cues:[['phone','사람 눈은 쉬어도 카메라는 안 쉰다.'],['point','그 렌즈 가리지 마. 녹화 빠지면 네 책임이야.']],alert:'녹화 확인해! 관리 단말부터 지켜!'};
function compoundJob(id,data){const s=campaignStage(id);Object.assign(s,COMPOUND_COMMON,data);delete s._base;s.targetNames=Object.fromEntries(Object.entries(s.targetCast||{}).map(([k,v])=>[k,v.name]));s.endText=s.story.after;for(const profile of Object.values(s.targetCast||{})){if(profile.appearance&&!s.brief.includes(profile.appearance.split(' · ')[0]))s.brief+=' '+profile.name+': '+profile.appearance+'.';}}
compoundJob('p0',{
 name:'닫힌 철문',sub:'첫 의뢰 · 잠입과 은폐',fee:'30만',openingContract:true,starterContract:undefined,apprenticeContract:undefined,
 purpose:'운반책 박인호를 처치하고 금성 운송의 철문 밖으로 탈출한다.',mission:'2층 운반책 처치 후 서쪽 철문 밖으로 탈출',
 brief:'박인호는 2층에서 거래 전화를 기다린다. 마당 경비 한 명, 1층 경비 한 명, 2층 표적 한 명이다. 마당 경비를 등 뒤에서 기절시키고 옷을 얻는다. 몸은 왼쪽 화단, 1층은 사물함에 숨길 수 있다. 계단으로 올라가 검은 머리 · 주황색 후드의 박인호를 찾아 처치하고 철문 밖으로 빠져나오자. 짧게 누르면 기절, 길게 누르면 살해한다.',
 story:{before:'제비의 서류가 가리킨 박인호는 금성 운송 2층에 숨어 증인을 팔아넘길 전화를 기다린다. 경비의 옷과 빈 사물함을 이용해 거점을 뚫는다.',after:'박인호의 전화를 끊었다. 그가 부르던 작업반장 한재문은 옆 출고동에 있다. 이번에는 경비 둘이 서로를 보고 있다.',cast:{runner:'runner'}},
 targetCast:{runner:TARGET_CAST.runner},guards:[yardGuard(),hallGuard(),{kind:'t',tag:'runner',target:true,at:[26,7],fl:1,post:0,still:true,radio:false}],
});
compoundJob('p1',{
 name:'불 꺼진 출고동',sub:'두 번째 의뢰 · 어둠으로 분리',fee:'40만',openingContract:false,starterContract:'darkness',apprenticeContract:undefined,compoundLight:true,
 purpose:'겹친 경비 시야를 조명으로 나누고 작업반장 한재문을 처치한다.',mission:'출고 감시담당·작업반장 처치 후 철문 밖으로 탈출',
 brief:'기절·변장·몸 숨기기는 그대로 활용한다. 이번에는 1층 경비 두 명의 시선이 겹친다. 서쪽 문 안 벽 스위치를 끄면 방이 어두워지고 경비 한 명이 다시 켜러 온다. 그를 따로 처리하고 사물함에 숨기면 계단이 열린다. 붉은 조끼의 출고 감시담당과 2층 붉은 코트의 한재문이 표적이다. 일반 조명 스위치는 기술 없이 사용한다.',
 story:{before:'한재문이 박인호의 연락을 기다린다. 출고동에는 경비 둘이 서로를 지킨다. 까마귀: 불을 한번 꺼 보죠. 누군가는 켜러 와야 하니까.',after:'작업반장의 보고를 막았다. 증인 이송 명세서는 기록책 차유진이 따로 보관한다. 다음 거점에서는 사람과 서류를 함께 처리한다.'},
 targetCast:{foreman:TARGET_CAST.foreman,watchCaptain:TARGET_CAST.watchCaptain},guards:[yardGuard(),{...hallGuard(),kind:'t',tag:'watchCaptain',target:true},lightGuard(),{kind:'t',tag:'foreman',target:true,at:[26,7],fl:1,post:0,still:true,radio:false}],
});
compoundJob('p2',{
 name:'야간 기록실',sub:'세 번째 의뢰 · 처치와 회수',fee:'50만',openingContract:false,starterContract:'records',apprenticeContract:undefined,compoundLight:true,
 purpose:'감시반장과 기록책을 처치하고 증인 이송 명세서를 확보한다.',mission:'감시반장·기록책 처치 · 이송 명세서 회수 후 탈출',
 brief:'마당 경비의 옷으로 들어가고, 몸은 화단과 사물함에 숨긴다. 1층 감시반장과 2층 기록책이 필수 표적이다. 경비들은 조명이 꺼지면 스위치를 확인한다. 한 명씩 분리한 뒤 명세서를 챙겨 나온다. 서류는 2층 책상에 있고, 두 표적 처치와 회수를 모두 마쳐야 탈출할 수 있다.',
 story:{before:'기록책 차유진이 명세서를 정리하고 감시반장 서명석이 인계를 지킨다. 지금까지 익힌 암살·변장·조명·은폐로 두 사람의 보고와 서류를 함께 끊는다.',after:'명세서에 정하린의 감시 거점이 적혀 있다. 정하린은 사람만 믿지 않는다. 기록실 앞 CCTV까지 확인해야 한다.'},
 targetCast:{recordsLead:TARGET_CAST.records,inspector:TARGET_CAST.inspector},
 guards:[yardGuard(),{...hallGuard(),kind:'t',tag:'inspector',target:true},lightGuard(),{kind:'t',tag:'recordsLead',target:true,at:[26,7],fl:1,post:0,still:true,radio:false},{kind:'g1',tag:'upperKeeper',at:[21,9],fl:1,post:180,still:true,radio:false}],
 items:[[25,6,1]],itemName:'이송 명세서',itemNames:['이송 명세서'],itemPlaces:['야간 기록실 2층 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],
});
compoundJob('e1',{
 name:'녹화된 얼굴',sub:'네 번째 의뢰 · 감시망',fee:'60만',openingContract:false,starterContract:undefined,apprenticeContract:true,compoundLight:true,compoundCamera:true,
 purpose:'감시망을 끊고 연락책 정하린과 감시반장을 처치한 뒤 인계서를 회수한다.',mission:'정하린·감시반장 처치 · 인계서 회수 후 탈출',
 brief:'암살·변장·조명·은폐는 이전과 같다. 이번에는 2층 작업 구역을 CCTV가 비춘다. 허용 복장으로 지나가는 것과 살해·서류 작업은 다르다. 카메라 뒤 벽의 전선을 분리하면 녹화를 막는다. 이미 찍혔다면 같은 층 보안 단말에서 감시망을 정지하고 기록을 지운다. 실수해도 의뢰가 바로 끝나지 않는다.',
 story:{before:'정하린의 거점에는 증인 인계서를 지키는 CCTV가 있다. 까마귀: 경비 옷은 사람 눈을 속이죠. 저 렌즈 앞에서까지 손을 놀리지는 마세요.',after:'정하린의 연락망과 인계서를 확보했다. 중개인 문서윤의 원본 장부는 옆 건물 3층에 있다. 정문 대신 지붕과 창문으로 길을 만들자.'},
 targetCast:{contact:TARGET_CAST.contact,inspector:TARGET_CAST.cameraLead},
 guards:[yardGuard(),{...hallGuard(),kind:'t',tag:'inspector',target:true},lightGuard(),{kind:'t',tag:'contact',target:true,at:[26,7],fl:1,post:90,still:true,radio:false},{kind:'g1',tag:'upperKeeper',at:[21,9],fl:1,post:180,still:true,radio:false}],
 items:[[25,6,1]],itemName:'증인 인계서',itemNames:['증인 인계서'],itemPlaces:['감시 거점 2층 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],
 cams:[[27,6,180,0,1]],securityEvidence:true,securityTerminalVersion:1,camRoom:{pos:[29,10],fl:1,name:'2층 감시 관리 단말'},cameraFocus:[25,6],
 fixedFurn:COMPOUND_COMMON.fixedFurn.concat({x:29,y:9,t:'pc',fl:1}),
});
compoundJob('e2',{
 name:'지붕 위의 장부',sub:'다섯 번째 의뢰 · 수직 잠입',fee:'80만',openingContract:false,starterContract:undefined,apprenticeContract:true,compoundLight:true,compoundCamera:true,compoundVertical:true,
 floorTiles:[[2,29,8,'#'],[2,30,8,'#']],W:38,H:26,start:[2,19],exit:[3,22],buildingNames:{0:'폐쇄된 정비동',1:'금성 거래소'},
 purpose:'창문·3층·지붕 사이 이동으로 거래소에 침입해 중개인과 인계책을 처치하고 원본 장부를 가져온다.',
 mission:'중개인·인계책 처치 · 3층 원본 장부 회수 후 탈출',
 brief:'정비동 옆 작업대의 가는 철사는 창문 락픽으로 한 번 쓸 수 있다. 서쪽 창문을 따고 계단으로 3층과 옥상에 오른다. 한 칸 골목 건너 거래소 옥상으로 뛸 수 있다. 인계책이 아래 간판 밑을 지날 때 행동을 1초 길게 눌러 고정을 풀면 사고로 처리할 수 있다. 중개인과 장부는 거래소 3층이다. 조명·복장·몸 숨기기·CCTV 차단도 계속 활용한다. 정면 계단은 우회 경로로 남아 있다.',
 story:{before:'문서윤이 거래소 3층에서 원본 장부를 숨긴다. 인계책은 간판 아래서 배송을 기다린다. 올빼미: 문이 잠겼으면 옆 건물부터 올라가면 되겠군.',after:'원본 장부와 중개인의 보고선을 끊었다. 결재자는 클럽 실장 강도윤. 이제 작은 거점을 벗어나 그의 클럽 전체를 공략한다.'},
 build(m){
  m.fill(0,0,37,25,',');m.rect(0,0,37,25);m.fill(1,17,36,23,'.');m.fill(1,16,36,16,'=');
  m.bld(5,4,16,15,3,[[10,15]],'h');m.set(5,12,'N');m.set(14,12,'Y');
  m.bld(18,4,31,15,3,[[18,12],[28,15]],'h');m.set(29,12,'Y');
  m.many('B',[[3,14],[3,15],[12,18],[32,17]]);m.fill(10,18,11,19,'C');m.car(33,20,1);m.many('T',[[2,4],[35,4],[35,13],[2,24]]);
 },
 zones:[[0,0,37,25,'pub',null,'거래 골목',[]],[5,4,16,15,'res',null,'폐쇄된 정비동',['crew']],[18,4,31,15,'res',null,'금성 거래소',['crew']]],
 targetCast:{broker:TARGET_CAST.broker,handover:TARGET_CAST.handover},
 guards:[{kind:'g1',tag:'uniformDonor',at:[8,20],post:0,still:true,radio:false},{kind:'g1',tag:'hallKeeper',at:[26,12],post:0,still:true,radio:false},
  {kind:'g1',tag:'middleKeeper',at:[27,11],fl:1,post:90,still:true,radio:false},{kind:'g1',tag:'upperKeeper',at:[21,9],fl:2,post:180,still:true,radio:false},
  {kind:'t',tag:'broker',target:true,at:[27,7],fl:2,post:90,still:true,radio:false},{kind:'t',tag:'handover',target:true,route:[[25,17,16],[29,17,8]],startPause:16,radio:false}],
 items:[[25,6,2]],itemName:'거래 원본 장부',itemNames:['거래 원본 장부'],itemPlaces:['금성 거래소 3층 · 책상'],itemActions:[{kind:'recovery',duration:1.2}],
 keyItems:[{key:'pin',pos:[4,18]}],keyNames:{pin:'작업대의 가는 철사'},windowStates:[[5,12,0,'lock']],
 cams:[[27,6,180,0,2]],securityEvidence:true,securityTerminalVersion:1,camRoom:{pos:[29,10],fl:2,name:'3층 감시 관리 단말'},cameraFocus:[25,6],
 lamps:[[8,17,180,1],[25,17,160,1],[24,9,330,0,0],[25,9,300,0,1],[25,8,330,0,2]],
 lampControls:[[2,19.5,12.5],[3,19.5,12.5],[4,19.5,12.5]],
 fixedFurn:[{x:4,y:17,t:'desk'},{x:6,y:5,t:'locker'},{x:20,y:5,t:'locker'},{x:20,y:5,t:'locker',fl:1},{x:28,y:8,t:'locker',fl:1},{x:20,y:5,t:'locker',fl:2},
  {x:25,y:5,t:'desk',w:2,fl:2},{x:29,y:9,t:'pc',fl:2},{x:22,y:10,t:'boxes',w:2}],
 traps:[{k:'drop',at:[25,12],hit:[24,16,26,18],text:'금성 거래소'}],
});
TARGET_CAST.broker.habit='3층에서 원본 장부를 확인하고 통화로 보고를 재촉한다.';
// Fold the old three single-rule errands into these jobs; keep their saves/rewards intact.
for(const id of ['e3','e4','e5']){const s=campaignStage(id);s.retiredCampaign=true;s.storyEpisode=false;}
const source=(id,change)=>Object.assign(CASE_SOURCES.find(s=>s.id===id),change);
source('runner-down',{text:'운반책이 부르던 작업반장은 한재문이다. 출고동의 겹친 경비 시야를 먼저 풀어야 한다.',grants:{foreman:3,contact:1}});
source('release',{items:undefined,targets:['foreman'],title:'작업반장의 마지막 보고',text:'이송 명세서는 차유진이 야간 기록실에서 보관한다.',grants:{records:3,contact:1}});
source('delivery',{targets:['recordsLead','inspector'],title:'기록책의 이송 명세서',text:'감시반장과 기록책의 보고를 끊었다. 수신인은 정하린이며, 그의 인계서 보관실에는 CCTV가 있다.',grants:{contact:3}});
source('contact-down',{text:'정하린의 감시 거점에서 문서윤의 거래소 주소를 찾았다. 원본 장부는 3층에 있다.',grants:{broker:3}});
source('trade',{title:'중개인의 원본 장부',text:'원본 장부에 최종 결재자 강도윤의 이름이 남아 있다.',grants:{broker:3,club:3}});
source('broker-down',{stage:'e2',text:'문서윤의 연락을 끊었다. 클럽 실장 강도윤이 직접 결재를 받는다.',grants:{club:3}});
Object.assign(CASE_NODES.find(n=>n.id==='runner'),{area:'금성 운송 2층',routine:'마당·1층 경비를 지나 2층 사무실에서 거래 전화를 기다린다.'});
Object.assign(CASE_NODES.find(n=>n.id==='contact'),{area:'감시 거점 2층',routine:'CCTV와 감시반장이 인계서를 지킨다. 뒤쪽 전선을 끊으면 작업 기회가 난다.'});
Object.assign(CASE_NODES.find(n=>n.id==='broker'),{stage:'e2',area:'금성 거래소 3층',routine:'정비동 창문과 옥상 사이를 이용해 접근할 수 있다. 간판 아래에는 인계책이 있다.'});
CASE_NODES.splice(1,0,{id:'foreman',stage:'p1',tag:'foreman',tier:0,alias:'야간 작업반장',area:'출고동 2층',routine:'경비 두 명이 1층을 지킨다. 불이 꺼지면 한 명이 스위치를 확인한다.'},{id:'records',stage:'p2',tag:'recordsLead',tier:0,alias:'이송 기록책',area:'야간 기록실 2층',routine:'감시반장과 이송 명세서를 지킨다. 각 층 사물함으로 흔적을 숨길 수 있다.'});
CASE_LINKS.push(['runner','foreman'],['foreman','records'],['records','contact']);
