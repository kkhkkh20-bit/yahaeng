// The public route follows one lead per place. Runtime story delivery is kept
// separate from objectives: a line never grants evidence, opens an exit or fails a job.
const EPISODE_VOICE={
 tB:{before:'제비가 마지막으로 연락한 곳은 대성 물류 배차실이다. 까마귀와 함께 2층에 남은 서류를 찾는다.',after:'제비의 서류에서 운반책 박인호와 금성 운송 주소를 찾았다.',
  coda:{context:'배차실을 빠져나온 뒤',lines:[['hero','제비 글씨 맞아. 박인호, 금성 운송 2층.'],['master','아는 이름이네. 그 사람이 누구한테 제비를 넘겼는지 알아보자.']]},
  beat:{id:'swallow-note',when:S=>S.items.some(i=>i.got),speaker:'hero',text:'제비가 주소를 남겼어. 나한테 직접 말할 수는 없었던 모양이네.'}},
 p0:{before:'제비가 남긴 이름, 박인호. 금성 운송 2층에서 은신처를 팔아넘긴 대금을 기다린다. 거래를 막고 다음 연락처를 찾는다.',after:'박인호의 통화 기록에서 금성 거래소의 문서윤을 찾았다.',
  coda:{context:'금성 운송 · 통화 기록',lines:[['hero','박인호가 계속 걸던 번호, 문서윤이 받았어.'],['master','금성 거래소 3층이야. 이번에는 장부도 같이 가져와.']]},
  beat:{id:'runner-waiting',when:S=>S.t>=1&&S.t<18,speaker:'master',text:'제비가 남긴 이름이 박인호야. 2층에서 거래 대금을 기다리고 있어. 그 거래부터 막자.'}},
 e2:{before:'박인호의 거래 상대는 회계 중개인 문서윤이었다. 거래소 3층의 문서윤과 원본 장부를 찾아 돈의 흐름을 확인한다.',after:'거래소 장부는 클럽 실장 강도윤에게 이어졌다. 가명을 풀 암호표도 필요하다.',
  coda:{context:'거래소를 빠져나온 뒤',lines:[['hero','장부에 강도윤 이름이 계속 나와. 나머지는 전부 별명이고.'],['master','클럽 실장이야. 회계 숙소의 암호표랑 맞춰 보면 누가 돈을 댔는지 나올 거야.']]},
  beat:{id:'trade-ledger',when:S=>S.items.some(i=>i.got),speaker:'hero',text:'장부 찾았어. 강도윤은 실명으로 적어 놓고, 돈 보낸 사람들은 별명으로 숨겼네.'}},
 m2:{before:'문서윤의 장부는 클럽 실장 강도윤을 가리켰다. 그의 장부와 회계 숙소의 암호표를 맞춰 증인 거래의 자금책을 찾는다.',after:'장부의 가명은 장무혁과 백철민이었다. 다음 정산 장소에서 둘을 막는다.',
  intro:[['master','문서윤 장부에 나오던 강도윤이 여기 있어. 클럽 장부하고 회계 숙소의 암호표를 같이 봐야 해.'],['hero','장부만 두 개면 회계라도 봐야겠네. 알았어, 둘 다 챙길게.']],
  coda:{context:'클럽 장부와 암호표 대조',lines:[['hero','찾았다. 돈 걷는 쪽은 장무혁, 계약에 서명한 쪽은 백철민이야.'],['master','둘이 정산하러 만나. 이번에는 현금하고 계약서까지 확보하자.']]},
  beat:{id:'half-code',when:S=>S.items.some(i=>i.got)&&S.items.some(i=>!i.got),speaker:'hero',text:'하나는 챙겼어. 장부의 별명이랑 암호표의 실명을 맞춰 봐야겠네.'}},
 m4:{before:'장무혁은 증인 거래 대금을 모으고, 백철민은 계약을 승인한다. 둘이 만나는 정산 구역에서 표적과 현금·계약서를 확보한다. 철수 차량은 까마귀가 맡았다.',after:'증거 확보에는 성공했다. 그러나 까마귀가 보낸 철수 차량은 금성회의 인계 차량이었다.',
  intro:[['master','황금색 재킷이 장무혁, 보라색 정장이 백철민이야. 현금하고 계약서 챙기면 철수 차량은 내가 보낼게.'],['hero','주소는 너한테만 보낼게. 이번에는 차 번호도 같이 알려 줘.']],
  coda:{context:'임무 완료 뒤 · 까마귀가 보낸 철수 차량',lines:[['master','골목 끝 검은 승합차야. 증거 챙겼지? 일단 타.'],['hero','잠깐. 이 사람들 금성회잖아. 까마귀, 차를 잘못 보낸—'],[{note:'철수 차량 안'},'문이 잠긴다. “인계 대상 확보.” 차량 무전이 울리고, 까마귀와의 통신이 끊긴다.']]},
  beat:{id:'exfil-arranged',when:S=>S.exitOpen,speaker:'master',text:'할 일은 끝났네. 출구로 나오면 철수 차량 위치를 보낼게. 현금하고 계약서, 빠뜨리지 말고.'}},
 m6:{before:'철수 차량의 문이 잠긴 뒤 기억이 끊겼다. 눈을 뜬 곳은 금성회 구금동. 제비도 이곳을 거쳤다. 무전기와 인계 기록을 찾아 빠져나간다.',after:'제비의 무전기와 인계서를 찾았다. 서명은 까마귀, 인계 담당자는 운송 지부장 오태식이었다.',
  intro:[['hero','그 차, 까마귀가 보낸 게 맞았어. 날 빼낸 게 아니라 넘긴 거네.'],['hero','장비는 없어졌고… 제비도 여기로 왔다고 했지. 우선 이 문부터 열자.']],
  coda:{context:'구금동 탈출 뒤 · 무전기와 인계서',lines:[['hero','인계서에 까마귀 서명이 있어. 제비 이름도… 제비는 못 나왔구나.'],['hero','받은 사람은 오태식. 무전기에 집하장 주파수가 남아 있어. 이걸 따라가 보자.']]},
  beat:{id:'swallow-radio',when:S=>S.items[0]?.got,speaker:'hero',text:'제비 무전기야. 배터리도 남아 있어. 인계서까지 찾으면 누가 데려왔는지 알 수 있겠어.'}},
 m7:{before:'제비의 무전기에 남은 주파수는 새벽배송 집하장의 것이었다. 운송 지부장 오태식을 막고, 남은 증인들이 출발하기 전에 배차를 멈춘다.',after:'새벽배송을 멈췄다. 오태식의 명세서에 적힌 최종 수령인은 까마귀였다.',
  intro:[['hero','제비가 쓰던 주파수로 여기까지 왔어. 오태식이 이송을 맡고 있네.'],['hero','사람들이 나가기 전에 명세서를 챙기고 2층 배차 단말을 멈춰야 해.']],
  coda:{context:'집하장 · 출고 중단 확인',lines:[['hero','차량 멈췄어. 명세서의 수령인은… 까마귀네.'],['hero','본부 주소까지 친절하게 써 놨네. 이제 네 쪽으로 갈게.']]},
  beat:{id:'dispatch-names',when:S=>S.items.some(i=>i.got),speaker:'hero',text:'명세서에 아직 출발 안 한 이름들이 있어. 배차부터 멈추면 이 사람들은 살릴 수 있겠어.'}},
 m5:{before:'오태식의 명세서가 가리킨 곳은 까마귀의 본부다. 그가 증인 거래를 직접 받고 있었다. 까마귀와 원본 장부를 찾아 마지막 결재선을 확인한다.',after:'까마귀 위에도 결재자가 있었다. 원본 장부와 연락 기록은 백림재단 이사장 윤서경을 가리켰다.',
  intro:[['hero','까마귀, 남의 주소는 잘 알려 주더니 네 주소는 숨겼네.'],['hero','너는 2층, 원본 장부는 1층 금고. 이번에는 네 설명 없이 확인할게.']],
  coda:{context:'금성회 본부 · 원본 장부 대조',lines:[['hero','까마귀 결재 위에 한 칸이 더 있어. 백림재단… 윤서경.'],['hero','오늘 사저에서 연회까지 연다고? 그래, 마지막으로 그쪽도 들러야겠네.']]},
  beat:{id:'another-signature',when:S=>S.items.some(i=>i.got),speaker:'hero',text:'원본 장부 챙겼어. 까마귀가 받은 돈이랑, 위로 보낸 돈을 따로 적어 놨네.'}},
 n1:{before:'원본 장부의 마지막 결재자는 백림재단 이사장 윤서경이었다. 사저의 연회에 들어가 그를 막고, 2층 명령 원장으로 증인 거래의 증거를 완성한다.',after:'윤서경의 명령 원장을 확보했다. 거래 기록과 남은 증인들을 조직 밖으로 보냈다.',
  intro:[['hero','장부에는 증인 값이 적혀 있는데, 여기서는 건배를 하고 있네.'],['hero','윤서경하고 2층 명령 원장. 둘 다 확인하고 나가자.']],
  coda:{context:'새벽 · 제비의 무전기에 남은 녹음',lines:[[{recorded:'aide'},'나한테 무슨 일 생기면, 사람들 먼저 부탁해. 연락처는 무전기에 넣어 뒀어.'],['hero','연락했어. 다들 나왔대. 너도 같이 들었으면 좋았을 텐데.']]},
  beat:{id:'last-record',when:S=>S.items.some(i=>i.got),speaker:'hero',text:'명령 원장 찾았어. 이름이랑 돈 보낸 날짜까지 다 있네. 이제 밖으로 가져가자.'}}
};
for(const[id,voice]of Object.entries(EPISODE_VOICE)){
 const s=campaignStage(id);s.story={...s.story,before:voice.before,after:voice.after};s.endText=voice.after;s.storyCoda=voice.coda;s.storyBeat=voice.beat;if(voice.intro)DIALOGUE[id]=voice.intro;
}
