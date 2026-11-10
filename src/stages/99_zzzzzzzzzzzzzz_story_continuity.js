// Final copy pass after wardrobe, navigation and room patches. Save IDs, access
// checks and objective slots remain stable; acquired records retain their rules.
Object.assign(campaignStage('m6'),{name:'인계 대상',
 brief:'올빼미는 제비를 찾으려고 인계 차량을 타고 구금동에 들어왔다. 장비는 동쪽 경비실에 압수됐다. 감방 바닥의 머리핀으로 간수가 등을 돌릴 때 문을 딸 수 있다. 장비 회수는 선택이다. 제비의 무전기는 감금동 동쪽 계단으로 올라가는 2층 사무실에, 까마귀 인계서는 남동쪽 자재 창고 보관함에 있다. 조직원 옷으로 마당과 자재 창고를 통행할 수 있지만 감금동 2층과 정문 정예는 피해야 한다. CCTV에 녹화되면 경비실에서 기록을 지우고 탈출한다.',
 purpose:'제비의 무전기와 인계 기록으로 남은 증인들의 이송 차량을 찾는다.'});
Object.assign(campaignStage('m4'),{purpose:'장무혁과 백철민을 처치하고 증인 거래 계약서와 도피에 쓸 현금을 확보한다.'});
Object.assign(campaignStage('m7'),{purpose:'오태식을 처치하고 출고를 취소해 남은 증인들의 이송을 막는다.'});
Object.assign(campaignStage('m5'),{purpose:'까마귀를 처치하고 증인들을 추적할 원본 장부를 회수한다.'});
Object.assign(campaignStage('n1'),{purpose:'윤서경을 처치하고 명령 원장을 확보해 증인 거래를 공개한다.'});
campaignStage('m4').brief=campaignStage('m4').brief.replace('황토색 재킷','황금색 재킷').replace('밝은 정장','보라색 정장');
DIALOGUE.m4[0][1]='황금색 재킷에 덩치 큰 쪽이 장무혁, 보라색 정장에 회색 머리가 백철민이야. 끝나면 내가 차를 보낼게.';
DIALOGUE.m2[0][1]='붉은 정장의 강도윤이야. 장부와 회계 숙소 암호표를 챙겨. 구매자 명단은 바로 보내 주고.';
campaignStage('e2').brief=campaignStage('e2').brief.replace('조명 스위치','조명');
const swallowMemo='제비가 압수품 목록 뒷면에 남긴 메모: “감방 침대 밑 머리핀. 무전기는 2층. 나 못 만나면 녹음부터 들어.”';
campaignStage('m4').storyCoda.lines.splice(1,0,[{note:'계약서에 끼워진 메모'},swallowMemo]);
campaignStage('tB').storyCoda.lines.splice(1,0,[{recorded:'aide'},'끝나면 밥이나 먹자. 이번엔 네가 계산해.']);
// The old overheard conversation said Owl was ambushed and both arrived together.
const detention=campaignStage('m6');
Object.assign(detention.intel[0],{learn:'제비는 살아 나오지 못했다. 무전기는 2층에 있다. 올빼미는 오늘 들어왔다.',lines:[[0,'오늘 들어온 사람이 올빼미래.'],[1,'까마귀가 직접 차 보냈대. 내일 같이 이송하라고.'],[0,'제비도 아직 여기 있어?'],[1,'어제 죽었어. 무전기만 위층에 남았고.']]});
Object.assign(detention.interrogate[0],{learn:'제비는 살아 나오지 못했다. 무전기는 2층에 있다.',say:'제비는 어제 죽었어. 무전기는 2층에 뒀어. 오늘 차 보낸 사람은 까마귀야.'});
const newEvidence={
 dispatch:['확인되지 않은 도착','제비가 남긴 배차표에 올빼미의 호송 번호와 박인호의 인수 기록이 있다. 안전가옥의 도착 확인은 없다.'],
 'runner-down':['박인호의 인원 거래','통화 기록은 은신처와 다음 차량의 인원을 흥정한 내용이다. 정산 담당자는 금성 거래소의 문서윤이다.'],
 trade:['같은 입금 계좌','거래소 원본 장부의 백림재단 계좌는 올빼미의 호송비 입금 계좌와 같다. 강도윤이 구매자를 모았다.'],
 cipher:['구매자 명단의 호출부호','암호표로 장무혁과 백철민의 실명을 확인했다. 구매자 칸에는 까마귀의 호출부호도 있다. 이 사실은 송신하지 않았다.'],
 'district-down':['계약서의 인계 장소','까마귀의 서명 아래 제비의 수용 번호가 있다. 철수 차량 목적지도 같은 구금동이다.'],
 betrayal:['제비가 남긴 차량 번호','제비의 마지막 무전과 인계서에서 아직 출발하지 않은 증인들의 차량을 확인했다. 운송 책임자는 오태식이다.'],
 'dispatch-stopped':['멈춘 이송과 피신 연락','차량 출고를 취소했다. 제비가 남긴 연락처로 피신 경로를 전했다. 까마귀 본부에는 추적에 쓸 연락망이 남아 있다.'],
 'crow-down':['추적을 지시한 연락 총책','까마귀는 올빼미에게 경쟁자를 제거하게 하고 증인 거래를 독점하려 했다. 그 연락망으로는 더 이상 피신한 사람들을 쫓을 수 없다.'],
 'last-name':['처음 호송비를 보낸 재단','원본 장부의 명령과 자금은 백림재단 이사장 윤서경에게 이어진다. 재단 사저에서는 증인 보호 사업 발표를 준비한다.'],
 'root-cut':['직접 받은 도착 확인','명령 원장은 공개하고 증인 연락처는 지웠다. 마지막 두 사람까지 피신했다는 회신을 올빼미가 직접 받았다.']
};
for(const[id,[title,text]]of Object.entries(newEvidence))Object.assign(CASE_SOURCES.find(s=>s.id===id),{title,text});
// Local speech lets players overhear the scheme while watching existing routines.
TARGET_CAST.runner.personality.cues[1]=['phone','문서윤 씨, 오늘 인원까지 넣어서 계산해 주세요. 은신처 주소는 입금 보고 보낼게요.'];
TARGET_CAST.broker.personality.cues[1]=['phone','호송비도 백림재단 계좌로 보내세요. 지난번하고 같은 데예요.'];
TARGET_CAST.collector.personality.cues[2]=['phone','백철민 서명 받으면 차 보내. 사람들은 새벽 출발이야.'];
TARGET_CAST.district.personality.cues[0]=['ledger','인계 차량 목적지는 구금동으로. 까마귀 서명은 받았어?'];
TARGET_CAST.crow.personality.cues[0]=['phone','새벽 차 도착하면 명단부터 보내. 나머지 정산은 내가 맡을게.'];
TARGET_CAST.chair.personality.cues[0]=['drink','증인 보호 사업에 함께해 주셔서 고마워요. 다들 한 잔 하시죠.'];

