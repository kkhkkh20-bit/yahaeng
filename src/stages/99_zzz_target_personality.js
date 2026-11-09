// Identities keep their existing bodies, access rules and paths. The coat colour
// carries rank; authored performances happen at the actual stops on those paths.
const OFFICER_STYLE={
 runner:{appearance:'주황색 후드 · 검은 배낭',coat:'#ce7c27',pants:'#252d39',habit:'혼자 담배를 피우며 거래 상대를 기다린다.',temperament:'성급한 하청 운반책',cues:[["smoke", "한 대만 더 피우고 갈게. 차 안에서는 못 피우잖아."], ["phone", "문서윤 씨, 나 벌써 도착했어요. 몇 분이나 더 기다려야 돼요?"]],alert:"누구야! 경비 좀 불러 줘!"},
 contact:{appearance:'선명한 청색 작업복 · 구리빛 머리',hair:'#9b5c3b',coat:'#398dd5',pants:'#263b57',habit:'걸음을 멈추면 통화를 확인하고 다음 연락을 재촉한다.',temperament:'주변을 살피는 연락책',cues:[["phone", "도착하면 전화해. 여기서 계속 기다리기도 좀 그래."], ["point", "아, 이름은 좀 작게 불러. 여기 사람들 다 듣겠다."]],alert:"여기 누가 들어왔어! 일단 나오지 마!"},
 broker:{appearance:'옥색 정장 · 버건디 단발',hair:'#763f54',coat:'#35a59c',pants:'#263d48',habit:'3층에서 장부를 확인하고 통화로 보고를 재촉한다.',temperament:'숫자에 집착하는 중개인',cues:[["ledger", "사진 말고 원본을 달라니까. 사진은 나도 있어요."], ["phone", "박인호 씨는요? 왔다면서 왜 안 올라와요?"]],alert:"거기 누구예요? 그 서류 내려놔요!"},
 club:{appearance:'붉은 정장 · 애쉬브라운 머리',hair:'#817368',coat:'#de394d',pants:'#27232e',habit:'흡연할 땐 혼자, 홀과 VIP룸에서는 술잔을 든다.',temperament:'과시적인 클럽 실장',cues:[["smoke", "여기까지 따라오지 마. 담배 피울 동안 문 앞에서 기다려."], ["drink", "얼음 좀 더 넣어 줘. 아까 건 거의 맹물이던데."], ["phone", "장부 찾는 전화야? 사무실로 돌려. 내가 올라갈게."]],reply:"네, 실장님. 문 앞에 있겠습니다.",alert:"뭐야? 저 사람 누가 들여보냈어!"},
 collector:{appearance:'황금색 재킷 · 큰 체격',coat:'#e4b439',pants:'#33313a',habit:'수금 동선에서 멈춰 금액을 대조하고 경호를 재촉한다.',temperament:'정산을 직접 하는 수금반장',cues:[["ledger", "십만 원이 비는데? 다시 세어 봐. 아까는 맞았잖아."], ["point", "금고 열려면 내 빨간 카드가 필요해. 나 없을 때 건드리지 말고."], ["phone", "다 걷었어. 백철민한테 확인받으면 차 보낼게."]],reply:"네, 반장님. 다 세고 바로 말씀드릴게요.",alert:"야, 가방 내려놔! 그건 내 돈이야!"},
 district:{appearance:'보라색 정장 · 회색 머리',hair:'#929d9f',coat:'#9953cc',pants:'#2a263b',habit:'VIP룸에서 계약서를 읽고 경호원에게 지시한다.',temperament:'체면을 중시하는 상권 지부장',cues:[["ledger", "장무혁한테 돈부터 보내라고 해. 계약서만 쌓이면 뭐 해."], ["point", "손님 왔어? 약속했는지부터 물어봐. 오늘은 아무나 못 만나."]],reply:"네. 먼저 확인하겠습니다.",alert:"누가 들어왔잖아! 문 앞에서 뭘 한 거야!"},
 freight:{appearance:'주황색 작업복 · 밝은 안전모',coat:'#ef8932',pants:'#293d50',shoes:'#dfd8c4',habit:'검수대에서 서류를 대조하고 상차 대기장에서는 통화한다.',temperament:'현장을 직접 챙기는 운송 지부장',cues:[["ledger", "봉인 번호가 또 달라. 명세서랑 맞을 때까지 차 세워 둬."], ["phone", "출발시키지 마. 서류부터 다시 확인해."], ["point", "저 차 뒷문도 확인해. 아까 덜 닫혔더라."]],alert:"차부터 세워! 누가 안으로 들어왔어!"},
 crow:{appearance:'진홍색 정장 · 백발',hair:'#d9d2c4',coat:'#ae304c',pants:'#302837',habit:'본부 2층을 돌며 통화하고 하부 보고를 확인한다.',temperament:'말을 아끼는 연락 총책',cues:[["phone", "그건 이따 나한테 따로 얘기해. 여기서 말고."], ["ledger", "원본은 여기 두고 사본을 가져가. 그건 내가 볼 거야."], ["point", "위층에 사람 올라오면 나부터 불러. 혼자 들여보내지 마."]],alert:"올빼미? 네가 왜 여기 있어? 경비!"},
 chair:{appearance:'아이보리 재킷 · 자주색 바지 · 연금색 머리',hair:'#c9b58d',coat:'#f2e8d4',pants:'#652d51',habit:'단상에서 건배하고 연못가를 둘러본 뒤 연회석으로 간다.',temperament:'우아하게 명령하는 의장',cues:[["drink", "잔 좀 채워 주시겠어요? 오늘 와 주셔서 고마워요."], ["point", "연못 쪽에는 사람 좀 빼 주세요. 잠깐 걸으려고요."], ["drink", "원장은 제 방에 두세요. 제가 읽어 보고 서명할게요."]],reply:"네, 이사장님. 바로 가져다 놓겠습니다.",alert:"저 사람 누구예요? 경비 좀 불러 주세요!"}
};
const wardrobeWords=[['갈색 후드','주황색 후드'],['회청색 작업복','선명한 청색 작업복'],['청록 정장','옥색 정장'],['청록색 정장','옥색 정장'],['자주색 정장','붉은 정장'],['황토색 재킷','황금색 재킷'],['밝은 회색 정장','보라색 정장'],['밝은 정장','보라색 정장'],['적갈색 정장','진홍색 정장'],['아이보리 정장','아이보리 재킷과 자주색 바지']];
const wardrobeText=text=>wardrobeWords.reduce((s,[from,to])=>s.replaceAll(from,to),text);
for(const [id,style]of Object.entries(OFFICER_STYLE)){
 const p=TARGET_CAST[id];p.appearance=style.appearance;p.temperament=style.temperament;p.habit=style.habit;
 p.palette=[p.palette[0],style.hair||p.palette[1],style.coat,style.pants,style.shoes||p.palette[4]];p.personality=style;
}
for(const st of STAGES){if(st.brief)st.brief=wardrobeText(st.brief);if(DIALOGUE[st.id])DIALOGUE[st.id]=DIALOGUE[st.id].map(([who,text])=>[who,wardrobeText(text)]);}

TARGET_CAST.collector.key='castCollector@bossBig';

TARGET_CAST.contact.key='castContact@femaleWorker';
TARGET_CAST.broker.key='castBroker@femaleBoss';
