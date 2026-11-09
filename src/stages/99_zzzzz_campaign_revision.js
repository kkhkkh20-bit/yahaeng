// Public campaign: each episode uses a different location. Retired definitions
// remain only for earned-record compatibility and internal regression fixtures.
for(const id of ['p1','p2','e1','e3','e4','e5']){
 const s=campaignStage(id);s.retiredCampaign=true;s.storyEpisode=false;
}
const currentStories={
 tB:{before:'제비가 연락을 끊었다. 마지막으로 간 곳은 대성 물류 배차실이다. 올빼미는 2층에 남은 서류부터 찾기로 한다.',after:'서류에 박인호의 이름과 금성 운송 주소가 있었다. 제비가 어디로 갔는지 아는 사람이다. 다음에는 그를 찾아간다.'},
 p0:{before:'박인호가 제비의 은신처를 금성회에 넘겼다. 지금은 금성 운송 2층에서 거래 상대를 기다리고 있다.',after:'박인호가 기다리던 사람은 문서윤이었다. 통화 기록에 거래소 주소가 남아 있다. 3층의 문서윤과 거래 장부를 확인한다.'},
 e2:{before:'문서윤은 거래소 3층에 있다. 옆 정비동을 통해 지붕으로 넘어갈 수 있다. 표적과 장부를 확보하면 이곳에서 할 일은 끝난다.',after:'장부에 클럽 실장 강도윤의 이름이 있었다. 그가 가진 장부와 암호표를 대조하면 돈을 댄 사람을 찾을 수 있다.'},
 m2:{before:'강도윤은 클럽에서 증인 거래를 중개한다. 그의 장부에 쓰인 가명을 회계 숙소의 암호표와 맞춰 봐야 한다.',after:'돈을 댄 사람은 장무혁과 백철민이었다. 둘이 만나는 구역에서 현금과 계약서를 찾는다.'},
 m4:{before:'장무혁이 돈을 모으고 백철민이 계약을 승인했다. 두 사람과 현금 가방, 계약서를 함께 확보한다.',after:'현금과 계약서를 챙겼지만 철수 장소에서 붙잡혔다. 그 위치는 까마귀에게만 알려 줬다.'},
 m6:{before:'까마귀에게 알려 준 철수 장소에서 붙잡혔다. 감방을 빠져나가 제비의 무전기와 인계 기록을 찾아야 한다.',after:'제비는 살아 나오지 못했다. 인계서에는 까마귀의 서명이 있었다. 수령인 오태식은 새벽배송 집하장에 있다.'},
 m7:{before:'오태식이 증인들의 이송을 맡고 있다. 그를 막고 명세서를 찾은 뒤 배차 단말에서 배송을 멈춘다.',after:'배차를 멈췄다. 명세서의 최종 수령인은 까마귀였다. 처음부터 우리를 이용해서 경쟁자들을 없애고 있었다.'},
 m5:{before:'까마귀가 숨어 있는 금성회 본부다. 그를 막고 원본 장부에서 마지막 결재자가 누구인지 확인한다.',after:'원본 장부와 까마귀의 연락 기록을 대조했다. 돈과 명령을 내린 사람은 백림재단 이사장 윤서경이었다.'},
 n1:{before:'윤서경은 사저에서 연회를 열고 있다. 그를 막고 2층의 명령 원장을 가져오면 증인 거래의 증거가 모두 모인다.',after:'윤서경을 처치하고 명령 원장을 가져왔다. 올빼미는 증거와 남은 증인들을 조직 밖으로 보냈다. 제비가 남긴 연락처로 마지막 확인 전화를 건다.'}
};
for(const[id,text]of Object.entries(currentStories)){
 const s=campaignStage(id);Object.assign(s.story,text);s.endText=text.after;
}
Object.assign(campaignStage('p0'),{sub:'금성 운송 · 첫 암살 의뢰'});
Object.assign(campaignStage('e2'),{
 purpose:'문서윤을 처치하고 거래소 3층의 원본 장부를 가져온다.',
 brief:'문서윤과 장부는 거래소 3층에 있다. 옆 정비동 작업대의 철사로 서쪽 창문을 열고, 계단을 올라 지붕으로 건너갈 수 있다. 거래소 정문으로 들어가는 길도 있다. 3층 카메라 뒤의 전선을 끊으면 작업이 찍히지 않는다. 마당 경비의 옷과 조명 스위치는 그대로 사용할 수 있다. 간판은 주변 경비를 처리하는 선택지다.'
});
const currentDialogue={
 tB:[],
 p0:[],e2:[], // These jobs use live radio; do not add a blocking introduction.
 m2:[['master','클럽 실장 강도윤, 붉은 정장이야. 그를 처리하고 장부와 거래 암호표도 가져와.'],['hero','입구부터 볼게. 장부는 사무동, 암호표는 회계 숙소였지?']],
 m4:[['master','장무혁은 황금색 재킷, 백철민은 보라색 정장이야. 현금 가방하고 계약서도 가져와.'],['hero','알았어. 두 사람이 어디 있는지부터 볼게.']],
 m6:[['hero','아, 머리야. 주머니까지 싹 털었네.'],['hero','제비도 여기로 끌려왔다고 했지. 감방부터 나가자.']],
 m7:[['hero','창고 동쪽, 주황색 작업복에 안전모. 오태식부터 찾자.'],['hero','명세서를 챙기고 2층 배차 단말에서 출고를 멈추자. 차가 나가기 전에.']],
 m5:[['hero','까마귀, 여기 숨어 있었네. 내 무전은 안 받더니.'],['hero','까마귀는 2층에 있고 원본 장부는 1층 금고에 있어. 뒷문부터 보자.']],
 n1:[['hero','윤서경. 연회까지 열었네. 오늘은 기분이 좋은가 봐.'],['hero','윤서경을 처리하고 2층 명령 원장을 가져오자. 누구한테 뭘 시켰는지 다 적혀 있을 테니.']]
};
for(const[id,lines]of Object.entries(currentDialogue))DIALOGUE[id]=lines;
Object.assign(BARKS,{
 alert:['누구야? 거기 멈춰!','이쪽으로 좀 와! 누가 들어왔어!','야, 저 사람 잡아!'],
 lost:['어디 갔어? 아까 이쪽으로 왔는데.','난 안쪽 볼게. 넌 출입구 좀 봐.'],
 calm:['이쪽은 아무도 없어. 돌아갈게.','별거 없네. 나 다시 순찰 돈다.'],
 calmLost:['못 찾았어. 나가는 사람 잘 봐.','이쪽은 다 봤어. 다시 순찰 돌게.'],
 calmBody:['아직 누가 그랬는지는 몰라. 혼자 다니지는 마.','여기 한 명 쓰러졌어. 근처에 수상한 사람 못 봤어?'],
 giveup:['이쪽엔 없어. 다른 데도 좀 봐 줘.','놓쳤네. 출입구부터 다시 확인하자.'],
 roll:['다들 응답해. 대답 없는 쪽부터 확인하자.'],
 hurt:['아, 맞았어! 일단 여기서 나가자.','아직 움직일 수 있어. 빨리 나가자.'],
 done:['챙겼어? 그럼 이제 나와.'],
 terror:['사람 떨어졌어! 다들 비켜요!','여기 사람 쓰러졌어요! 좀 도와주세요!']
});
TARGET_CAST.runner.habit='사무실에서 전화를 하다가 다른 책상으로 자리를 옮긴다.';
TARGET_CAST.runner.temperament='기다리는 걸 싫어하는 운반책';
TARGET_CAST.crow.temperament='친근하게 말하며 일을 떠넘기는 연락책';
// No dead-end bosses or clues for the removed copies of the depot mission.
const removedOfficers=new Set(['foreman','records','contact']);
for(let i=CASE_NODES.length-1;i>=0;i--)if(removedOfficers.has(CASE_NODES[i].id))CASE_NODES.splice(i,1);
for(let i=CASE_LINKS.length-1;i>=0;i--)if(CASE_LINKS[i].some(id=>removedOfficers.has(id)))CASE_LINKS.splice(i,1);
CASE_LINKS.push(['runner','broker']);
Object.assign(CASE_SOURCES.find(s=>s.id==='runner-down'),{title:'박인호의 통화 기록',text:'박인호가 기다리던 상대는 문서윤이었다. 통화 기록에 금성 거래소 주소가 남아 있다.',grants:{broker:3}});
Object.assign(CASE_SOURCES.find(s=>s.id==='trade'),{text:'문서윤의 원본 장부에 클럽 실장 강도윤의 이름이 적혀 있다.',grants:{broker:3,club:3}});
const evidenceCopy={
 'club-down':['클럽의 정산 연락','강도윤에게 돈을 받던 두 사람이 정산을 서두른다. 장부의 가명을 암호표와 맞추면 이름을 알 수 있다.'],
 'cipher':['장부와 암호표 대조','가명으로 적힌 사람은 장무혁과 백철민이었다. 장무혁은 돈을 모았고, 백철민은 계약을 승인했다.'],
 'collector-down':['수금반장의 운송 기록','장무혁이 모은 돈은 운송 지부로 보내졌다. 계약서를 보면 받는 사람이 적혀 있다.'],
 'district-down':['계약서에 적힌 의장','백철민 위에도 결재자가 있었다. 계약서에는 이름 대신 의장이라고 적혀 있다.'],
 'betrayal':['제비의 무전기와 인계서','인계서에 까마귀가 서명했다. 올빼미와 제비를 넘겨받은 사람은 운송 지부장 오태식이다.'],
 'freight-down':['오태식의 본부 연락처','오태식의 연락 기록에 까마귀가 쓰는 본부 주소가 남아 있다.'],
 'dispatch-stopped':['멈춘 새벽배송','명세서의 최종 수령인은 까마귀였다. 그 위에 의장에게 결재받는 칸이 따로 있다.'],
 'crow-down':['까마귀의 연락 기록','까마귀도 다른 사람의 지시를 받았다. 원본 장부와 연락 암호를 대조하면 그 이름을 찾을 수 있다.'],
 'last-name':['원본 장부의 소유주','의장의 이름은 윤서경이다. 백림재단 사저에서 연회를 열고 있다.'],
 'root-cut':['윤서경의 명령 원장','증인 거래를 지시한 기록과 돈의 출처를 확보했다. 남은 증인들을 밖으로 데려갈 수 있다.']
};
for(const[id,[title,text]]of Object.entries(evidenceCopy))Object.assign(CASE_SOURCES.find(s=>s.id===id),{title,text});
