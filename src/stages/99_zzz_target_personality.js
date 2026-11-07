// Identities keep their existing bodies, access rules and paths. The coat colour
// carries rank; authored performances happen at the actual stops on those paths.
const OFFICER_STYLE={
 runner:{appearance:'주황색 후드 · 검은 배낭',coat:'#ce7c27',pants:'#252d39',habit:'혼자 담배를 피우며 거래 상대를 기다린다.',temperament:'성급한 하청 운반책',cues:[['smoke','거래까지 담배 한 대. 그놈만 오면 바로 뜬다.'],['phone','아직도 출발 안 했어? 오래 기다릴 생각 없어.']],alert:'거래는 취소야! 나부터 빠져야겠어!'},
 contact:{appearance:'선명한 청색 작업복 · 검은 작업모',coat:'#398dd5',pants:'#263b57',habit:'걸음을 멈추면 통화를 확인하고 다음 연락을 재촉한다.',temperament:'주변을 살피는 연락책',cues:[['phone','신호 오기 전엔 움직이지 마. 명단은 내가 넘긴다.'],['point','여기선 이름 부르지 마. 연락 끝나면 바로 흩어져.']],alert:'연락선을 끊어! 여긴 들켰다!'},
 broker:{appearance:'옥색 정장 · 갈색 머리',coat:'#35a59c',pants:'#263d48',habit:'2층에서 장부를 확인하고 통화로 보고를 재촉한다.',temperament:'숫자에 집착하는 중개인',cues:[['ledger','숫자가 안 맞잖아. 사본 말고 원본으로 가져와.'],['phone','교환실 연락이 왜 없어? 실장께 보고하기 전에 확인해.']],alert:'장부부터 지켜! 저 사람 들여보낸 게 누구야!'},
 club:{appearance:'붉은 정장 · 흰 셔츠 · 검은 머리',coat:'#de394d',pants:'#27232e',habit:'흡연할 땐 혼자, 홀과 VIP룸에서는 술잔을 든다.',temperament:'과시적인 클럽 실장',cues:[['smoke','담배 피울 때는 붙지 마. 입구에서 기다려.'],['drink','잔은 비워 두지 마. 얘기는 VIP룸에서 하지.'],['phone','장부 건이면 내선으로 돌려. 내가 직접 간다.']],reply:'알겠습니다. 입구에서 기다리겠습니다.',alert:'내 클럽에서 감히! 문 막아, 당장!'},
 collector:{appearance:'황금색 재킷 · 큰 체격',coat:'#e4b439',pants:'#33313a',habit:'수금 동선에서 멈춰 금액을 대조하고 경호를 재촉한다.',temperament:'정산을 직접 하는 수금반장',cues:[['ledger','한 푼이라도 비면 네가 메워. 오늘 합계는 다시 맞춰.'],['point','떨어지지 마. 현금 금고는 내 빨간 카드로만 연다.'],['phone','수금 끝나면 운송 쪽으로 넘긴다. 결재부터 받아.']],reply:'예, 반장님. 경호 붙어 있습니다.',alert:'돈에는 손대지 마! 저놈부터 잡아!'},
 district:{appearance:'보라색 정장 · 은빛 머리',coat:'#9953cc',pants:'#2a263b',habit:'VIP룸에서 계약서를 읽고 경호원에게 지시한다.',temperament:'체면을 중시하는 상권 지부장',cues:[['ledger','수금은 장무혁에게. 계약 결재는 내가 한다.'],['point','손님이라고 다 들이지 마. 허락받은 사람만 받아.']],reply:'예. VIP룸 입구를 지키겠습니다.',alert:'결재도 없이 누가 들여보냈나! 경호는 뭐 하는 거야!'},
 freight:{appearance:'주황색 작업복 · 밝은 안전모',coat:'#ef8932',pants:'#293d50',shoes:'#dfd8c4',habit:'검수대에서 서류를 대조하고 상차 대기장에서는 통화한다.',temperament:'현장을 직접 챙기는 운송 지부장',cues:[['ledger','봉인 번호부터 맞춰. 명세서랑 다르면 차를 세워.'],['phone','새벽배송 시간 맞춰. 승인 전에는 출발하지 마.'],['point','저 화물 다시 확인해. 빈 차로 돌려보낼 생각 없어.']],alert:'차량 세워! 출고 기록부터 잠가!'},
 crow:{appearance:'진홍색 정장 · 백발',coat:'#ae304c',pants:'#302837',habit:'본부 2층을 돌며 통화하고 하부 보고를 확인한다.',temperament:'말을 아끼는 연락 총책',cues:[['phone','보고는 나한테만. 위에서 묻기 전엔 입 열지 마.'],['ledger','장부는 여기 남긴다. 원본 없이 거래를 넘길 순 없어.'],['point','얼굴까지 확인해. 위층에 아무나 들여보내지 마.']],alert:'올빼미… 여기까지 왔군. 경호, 막아!'},
 chair:{appearance:'아이보리 재킷 · 자주색 바지 · 은발',coat:'#f2e8d4',pants:'#652d51',habit:'단상에서 건배하고 연못가를 둘러본 뒤 연회석으로 간다.',temperament:'우아하게 명령하는 의장',cues:[['drink','잔은 높이. 오늘 일은 오늘 밤에 끝냅시다.'],['point','연못 쪽은 비워 두세요. 조용히 걸을 곳은 필요하니까.'],['drink','명령은 원장에 남깁니다. 내 서명만 확인하세요.']],reply:'네, 의장님.',alert:'당황하지 마세요. 문을 닫고 경비를 부르세요.'}
};
const wardrobeWords=[['갈색 후드','주황색 후드'],['회청색 작업복','선명한 청색 작업복'],['청록 정장','옥색 정장'],['청록색 정장','옥색 정장'],['자주색 정장','붉은 정장'],['황토색 재킷','황금색 재킷'],['밝은 회색 정장','보라색 정장'],['밝은 정장','보라색 정장'],['적갈색 정장','진홍색 정장'],['아이보리 정장','아이보리 재킷과 자주색 바지']];
const wardrobeText=text=>wardrobeWords.reduce((s,[from,to])=>s.replaceAll(from,to),text);
for(const [id,style]of Object.entries(OFFICER_STYLE)){
 const p=TARGET_CAST[id];p.appearance=style.appearance;p.temperament=style.temperament;p.habit=style.habit;
 p.palette=[...p.palette.slice(0,2),style.coat,style.pants,style.shoes||p.palette[4]];p.personality=style;
}
for(const st of STAGES){if(st.brief)st.brief=wardrobeText(st.brief);if(DIALOGUE[st.id])DIALOGUE[st.id]=DIALOGUE[st.id].map(([who,text])=>[who,wardrobeText(text)]);}

TARGET_CAST.collector.key='castCollector@bossBig';
