// A kill opens a lead; recovered records establish names and reporting lines.
TARGET_CAST.crow.role='금성회 연락 총책 · 전 의뢰인';
TARGET_CAST.chair={name:'윤서경 · 의장',role:'백림재단 이사장 · 금성회 의장',appearance:'은빛 머리 · 아이보리 정장',key:'castChair@femaleSuit',palette:['#e5ba97','#b9b8b4','#e3ddc8','#292e38','#171a20']};
const CASE_NODES=[
 {id:'runner',stage:'p0',tag:'runner',tier:0,alias:'하청 운반책',area:'폐차장',routine:'혼자 담배를 피운다. 서쪽 적치장 뒤로 접근할 수 있다.'},
 {id:'contact',stage:'e1',tag:'contact',tier:0,alias:'골목 연락책',area:'동쪽 적치장',routine:'적치장 사이를 왕복하며 멈춘다. 경비는 한 명이다.'},
 {id:'broker',stage:'e5',tag:'broker',tier:1,alias:'회계 중개인',area:'새벽 부동산 2층',routine:'창가와 책상을 오간다. 카메라를 끄고 등을 노릴 수 있다.'},
 {id:'club',stage:'m2',tag:'vip',tier:1,alias:'클럽 실장',area:'클럽 1층',routine:'흡연·술자리·VIP룸을 돈다. 장부 내선으로 따로 부를 수 있다.'},
 {id:'collector',stage:'m4',tag:'collector',tier:2,alias:'수금반장',area:'상가 큰길 · 남쪽 정산 동선',routine:'경호원과 순찰한다. 빨간 카드키를 지니며 헐거운 간판 밑을 지난다.'},
 {id:'district',stage:'m4',tag:'vip',tier:2,alias:'상권 지부장',area:'상가 클럽 VIP룸',routine:'경호가 입구를 지킨다. 파란 카드키로 뒷문을 열 수 있다.'},
 {id:'freight',stage:'m7',tag:'broker',tier:2,alias:'운송 지부장',area:'집하장 동쪽 검수대',routine:'검수대·상차 대기장·창고를 돈다. 기록보관실 카드를 지닌다.'},
 {id:'crow',stage:'m5',tag:'boss',tier:3,alias:'연락 총책',area:'금성회 본부 2층',routine:'상층에서 경호원과 움직인다. 보안구역은 복장으로 통과할 수 없다.'},
 {id:'chair',stage:'n1',tag:'boss',tier:4,alias:'의장',area:'백림재단 사저 · 연회장',routine:'단상·연못가·잔칫상을 돈다. 정전 때 복구하러 가는 경비를 피해 본채로 들어갈 수 있다.'}
];
const CASE_LINKS=[['runner','contact'],['contact','broker'],['broker','club'],['club','district'],['collector','district'],['district','crow'],['freight','crow'],['crow','chair']];
const CASE_SOURCES=[
 {id:'dispatch',stage:'tB',items:[0],title:'제비의 연락 서류',text:'금성회 운반책 박인호가 증인의 은신처를 넘기려 한다. 거래 전에 막아야 한다.',grants:{runner:3}},
 {id:'runner-down',stage:'p0',targets:['runner'],title:'끊어진 운반 연락',text:'운반책의 연락이 끊기자 조직이 골목 연락책을 움직였다. 출고 서류가 다음 연결고리다.',grants:{contact:1}},
 {id:'release',stage:'p1',items:[0],title:'출고 차량 번호',text:'운반책이 쓰던 차량은 옆 창고를 거쳤다. 수신인 기록을 대조할 수 있다.',grants:{contact:1}},
 {id:'delivery',stage:'p2',items:[0],title:'배송 명세서의 수신인',text:'수신인은 정필수. 동쪽 적치장에서 증인 명단을 넘길 예정이다.',grants:{contact:3}},
 {id:'contact-down',stage:'e1',targets:['contact'],title:'회계 보고선',text:'연락책을 잃은 조직이 거래 창고의 명세서를 찾고 있다. 위에는 회계 중개인이 있다.',grants:{broker:1}},
 {id:'trade',stage:'e2',items:[0],title:'중개인의 정산 거점',text:'거래 대금은 2층 연락 거점에서 정산한다. 장부에 결재자가 남아 있다.',grants:{broker:1}},
 {id:'ledger',stage:'e3',items:[0],title:'두 명의 결재자',text:'문기석은 회계 중개인, 그 위 결재자는 클럽 실장이다. 교환실의 인계서를 추적한다.',grants:{broker:2,club:1}},
 {id:'handover',stage:'e4',items:[0],title:'문기석의 보고 대상',text:'문기석의 사무실과 보고 대상 강도윤을 확인했다. 중개인을 먼저 막으면 클럽에 경고가 가지 않는다.',grants:{broker:3,club:2}},
 {id:'broker-down',stage:'e5',targets:['broker'],title:'비어 버린 중간 연락선',text:'중개인이 사라져 강도윤이 직접 연락을 받는다. 흡연 동선과 장부 내선이 접근 기회다.',grants:{club:3}},
 {id:'club-down',stage:'m2',targets:['vip'],title:'금고 밖으로 움직이는 자금',text:'실장의 보고가 끊기자 수금반장과 상권 지부장이 정산을 서두른다. 장부의 가명을 풀어야 실명을 안다.',grants:{collector:1,district:1}},
 {id:'cipher',stage:'m2',items:[0,1],title:'장부와 거래 암호표 대조',text:'가명은 장무혁과 백철민이었다. 돈을 걷는 자와 계약을 승인하는 자다.',grants:{collector:3,district:3}},
 {id:'collector-down',stage:'m4',targets:['collector'],title:'수금이 끊긴 뒤의 운송선',text:'수금반장을 잃은 조직이 운송 지부로 돈을 빼돌린다. 계약서에서 수취인을 추적할 수 있다.',grants:{freight:1}},
 {id:'district-down',stage:'m4',targets:['vip'],title:'삭제되지 않은 호칭',text:'상권 보스도 최종 결재자가 아니었다. 계약에는 이름 대신 ‘의장’이라는 호칭이 남아 있다.',grants:{chair:1}},
 {id:'betrayal',stage:'m6',items:[0,1],title:'제비의 무전기와 서명된 인계서',text:'까마귀가 우리를 넘겼다. 수령자는 운송 지부장 오태식. 까마귀는 조직의 연락 총책이었다.',grants:{crow:2,freight:3}},
 {id:'freight-down',stage:'m7',targets:['broker'],title:'본부로 돌아간 보고선',text:'운송 보스가 쓰러지자 남은 보고가 본부 한 곳으로 모였다. 까마귀의 은신처를 찾았다.',grants:{crow:3}},
 {id:'dispatch-stopped',stage:'m7',items:[0,1],title:'취소된 새벽배송',text:'운송명세서의 최종 수취인은 까마귀였다. 그러나 의장에게 보내는 별도 결재란이 있다.',grants:{crow:3,chair:1}},
 {id:'crow-down',stage:'m5',targets:['boss'],title:'총책 위의 명령',text:'까마귀도 누군가의 대리인이었다. 원본 장부와 그의 연락 암호를 맞추면 마지막 이름을 찾을 수 있다.',grants:{chair:1}},
 {id:'last-name',stage:'m5',items:[0],targets:['boss'],title:'원본 장부의 실소유주',text:'의장의 실명은 윤서경. 백림재단 사저의 연회에서 증인 거래망을 정리하려 한다. 마지막 명령선이다.',grants:{chair:3}},
 {id:'root-cut',stage:'n1',items:[0],targets:['boss'],title:'의장 처치와 명령 원장',text:'간부들에게 내려간 명령과 돈의 출처를 확보했다. 금성회에 남은 지휘선은 없다.',grants:{chair:3}}
];
const crowJob=campaignStage('m5');
crowJob.name='검은 연락선';crowJob.sub='열네 번째 밤 · 금성회 본부';
crowJob.story.before='운송명세서가 가리킨 까마귀의 은신처. 금성회의 연락 총책이지만, 계약에는 그 위의 ‘의장’이 남아 있다. 까마귀를 처치하고 원본 장부로 마지막 보고선을 밝힌다.';
crowJob.story.after='까마귀의 연락 암호와 원본 장부를 대조했다. 의장의 실명은 윤서경. 백림재단 사저에서 마지막 연회가 열린다. 금성회를 끝내려면 그 명령선까지 끊어야 한다.';
crowJob.endText=crowJob.story.after;crowJob.purpose='까마귀를 처치하고 원본 장부로 의장의 실명을 밝힌다.';
const chairStory={solo:true,before:'까마귀의 원본 장부가 가리킨 마지막 이름, 윤서경. 백림재단의 이사장 뒤에 숨은 금성회 의장이다. 간부들을 정리한 뒤 남은 증거와 돈을 지우려 한다. 오늘 이 지휘선을 끊는다.',after:'의장 윤서경을 처치하고 명령 원장을 확보했다. 연락책부터 자금·운송·본부까지, 금성회의 지휘망이 무너졌다. 올빼미는 제비가 지키려던 증인들과 증거를 조직 밖으로 보냈다. 더는 명령을 내릴 간부가 없다.'};
const chairBase=campaignStage('m3');
const chairWords=v=>typeof v==='string'?v.replaceAll('회장','의장'):Array.isArray(v)?v.map(chairWords):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,chairWords(x)])):v;
STAGES.push({...chairBase,id:'n1',no:'15',name:'마지막 이름',sub:'마지막 밤 · 백림재단 사저',kitId:'m3',storyEpisode:true,story:chairStory,noSupport:true,rivals:0,
 intel:chairWords(chairBase.intel),interrogate:chairWords(chairBase.interrogate),stories:chairWords(chairBase.stories),zones:chairWords(chairBase.zones),challenges:chairBase.challenges.filter(id=>id!=='purge'),
 targetCast:{boss:TARGET_CAST.chair},targetNames:{boss:TARGET_CAST.chair.name},
 purpose:'금성회 의장 윤서경을 처치하고 지휘망의 명령 원장을 확보한다.',mission:'의장 처치 · 본채 2층 명령 원장 회수 후 탈출',
 itemName:'명령 원장',itemNames:['명령 원장'],buildingNames:{0:'백림재단 사저'},
 brief:'은빛 머리와 아이보리 정장의 윤서경이 의장이다. 단상에서 연못가와 잔칫상으로 이동한다. 뷔페 조끼는 마당 통행에 쓰지만 본채는 조직원 복장이 필요하다. 정문 밖 경비의 초록 카드키로 본채에 들어갈 수 있다. 본채 2층 명령 원장까지 확보해야 지휘망을 끊을 수 있다. 다른 손님은 표적이 아니다. 현장의 대화에서 연못·단상·발전기 접근 기회를 찾을 수 있다.',
 endText:chairStory.after});
DIALOGUE.n1=[['hero','까마귀가 숨긴 마지막 이름, 윤서경. 의장을 잃으면 금성회도 끝이다.'],['hero','표적은 의장 한 명. 2층 명령 원장까지 챙겨 지휘망을 남기지 않는다.']];
DIALOGUE.m5=[['hero','까마귀의 은신처다. 하지만 그 위에는 아직 이름 없는 의장이 있다.'],['hero','까마귀와 원본 장부. 이 둘로 마지막 보고선을 밝힌다.']];
// An organization hunt is the purpose from the first night; mechanics stay gradual.
campaignStage('tB').story.before='금성회가 증인들을 사고팔고 있다. 조직을 뿌리째 없애려면 숨어 있는 간부와 명령선을 찾아야 한다. 실종된 제비가 대성 물류에 첫 단서를 남겼다.';

campaignStage('e3').story.after='결재자는 회계 중개인 문기석. 그 위에는 이름 없는 클럽 실장이 있다. 교환실의 인계서를 확보하면 다음 보고 대상을 알 수 있다.';
campaignStage('e3').endText=campaignStage('e3').story.after;
campaignStage('e4').story.before='장부에 나온 교환실이다. 클럽 실장에게 보낼 인계서가 2층에 있다. 문기석의 보고가 넘어가기 전에 빼낸다.';
