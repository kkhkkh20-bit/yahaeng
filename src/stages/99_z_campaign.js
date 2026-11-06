// One connected case. Identity is separate from uniform access and actor IDs.
// All shapes and portraits use the existing eight-direction character assets.
const TARGET_CAST = {
 runner:{name:'박인호 · 운반책',role:'금성회 하청 운반책',appearance:'갈색 후드 · 검은 머리',key:'castRunner@pack',palette:['#d9a47e','#171a20','#986d45','#30343b','#202127']},
 contact:{name:'정필수 · 연락책',role:'금성회 연락책',appearance:'회청색 작업복 · 검은 머리',key:'castContact@worker',palette:['#d8aa86','#1b2027','#607d91','#303a47','#24262b']},
 broker:{name:'문기석 · 중개인',role:'금성회 회계 중개인',appearance:'청록 정장 · 갈색 머리',key:'castBroker@suit',palette:['#e6b994','#5a392b','#346a70','#293f49','#20252c']},
 club:{name:'강도윤 · 클럽 실장',role:'금성회 유흥가 책임자',appearance:'자주색 정장 · 검은 머리',key:'castClub@suit',palette:['#e3b08c','#17171c','#80445f','#292832','#191b22']},
 collector:{name:'장무혁 · 수금반장',role:'금성회 자금책',appearance:'큰 체격 · 황토색 재킷',key:'castCollector@big',palette:['#c89471','#24211e','#ad7e3b','#34342e','#24201c']},
 district:{name:'백철민 · 상권 보스',role:'금성회 상권 지부장',appearance:'흰머리 · 밝은 회색 정장',key:'castDistrict@old',palette:['#ddb391','#d9d4ca','#b4ac99','#40444d','#25272b']},
 freight:{name:'오태식 · 운송 보스',role:'금성회 운송 지부장',appearance:'안전모 · 주황색 작업복',key:'castFreight@helmet',palette:['#d4a07c','#292b2a','#c36f35','#293642','#b1a692']},
 crow:{name:'까마귀',role:'금성회 총책 · 전 의뢰인',appearance:'백발 · 짙은 적갈색 정장',key:'old@old',palette:['#e6bd9a','#c4c4c4','#6a2a2a','#2e2e36','#3a2e24']}
};
const CAMPAIGN_STORY = {
 tB:{before:'증인들을 빼돌리던 제비가 사라졌다. 의뢰인 까마귀가 마지막 연락 장소인 대성 물류로 올빼미를 보냈다.',after:'서류에는 제비가 남긴 경고가 있었다. “금성회가 증인을 거래한다. 폐차장의 박인호가 은신처를 알고 있어.” 다음 밤, 운반책을 막는다.'},
 p0:{before:'제비의 서류가 가리킨 운반책 박인호가 오늘 밤 증인 은신처를 팔아넘긴다. 거래를 막아 제비를 찾을 시간을 번다.',after:'박인호의 연락은 끊겼다. 서류에 적힌 다음 출고 장소는 물류실이다. 그곳의 출고 서류로 증인이 어디로 옮겨졌는지 찾는다.',cast:{runner:'runner'}},
 p1:{before:'운반책이 쓰던 물류실이다. 제비가 쫓던 차량의 출고 서류가 남아 있다. 사람을 더 죽일 필요는 없다.',after:'출고 서류의 차량 번호가 옆 창고의 배송 명세서와 연결된다. 다음에는 사람 대신 카메라 한 대를 피하면 된다.'},
 p2:{before:'출고 서류에 나온 차량이 이 창고를 거쳤다. CCTV가 지키는 명세서에서 물건을 받은 사람을 확인한다.',after:'수신인은 금성회 연락책 정필수. 증인 명단을 동쪽 적치장에서 넘길 예정이다. 거래 전에 그를 막는다.'},
 e1:{before:'배송 명세서가 가리킨 정필수다. 증인 명단이 조직에 넘어가면 은신처가 모두 드러난다.',after:'명단 인계를 막았다. 정필수가 쓰던 거래 창고를 확인하면 누가 돈을 댔는지 알 수 있다.',cast:{contact:'contact'}},
 e2:{before:'연락책의 거래 창고다. 증인 거래 대금을 보낸 사람의 흔적을 찾는다.',after:'거래 명세서의 정산 장소는 골목 연락 거점이다. 2층 장부에 최종 결재자가 적혀 있다.'},
 e3:{before:'거래 명세서의 정산 거점이다. 2층 연락 장부를 확보해 증인 거래의 결재자를 확인한다.',after:'결재자는 클럽 실장 강도윤. 회계 중개인 문기석이 교환실을 통해 인계서를 보내고 있다. 연락부터 끊는다.'},
 e4:{before:'장부에 나온 교환실이다. 강도윤에게 보낼 인계서가 2층에 있다. 문기석의 보고가 넘어가기 전에 빼낸다.',after:'인계서에는 문기석의 사무실 주소가 있었다. 그는 거래가 끊긴 것을 알아차렸다. 강도윤에게 잠입을 알리기 전에 막는다.'},
 e5:{before:'교환실 인계서로 찾은 회계 중개인 문기석. 보고가 올라가면 클럽의 증거가 사라진다.',after:'문기석의 보고를 막았다. 인계서에 적힌 클럽 실장 강도윤이 다음 표적이다. 그가 가진 장부와 암호표로 자금줄을 밝힌다.',cast:{broker:'broker'}},
 m2:{before:'문기석이 보고하던 클럽 실장 강도윤. 금성회의 유흥가를 맡으며 증인 거래를 중개한다. 장부의 가명을 암호표와 맞춰 배후를 찾는다.',after:'강도윤의 장부를 거래 암호표와 대조했다. 자금책 장무혁과 상권 보스 백철민의 실명이 드러났다. 다음에는 돈줄과 계약서를 함께 끊는다.',cast:{vip:'club'}},
 m4:{before:'클럽 장부가 드러낸 두 사람이다. 장무혁은 돈을 걷고, 백철민은 증인 거래 계약을 승인한다. 클럽의 거래가 이곳에서 결재되고 돈이 된다.',after:'두 사람의 자금과 계약서를 확보했다. 그러나 철수 장소에서 금성회에 붙잡혔다. 그들이 알고 있던 것은 까마귀에게만 보낸 귀환 경로였다.',cast:{collector:'collector',vip:'district'}},
 m6:{solo:true,before:'까마귀에게만 보낸 귀환 경로가 새어 나갔다. 감방에서 깨어난 올빼미는 제비의 무전기와 인계서로 누가 넘겼는지 확인해야 한다.',after:'제비는 이미 죽었다. 까마귀가 서명한 인계서는 금성회 운송 보스 오태식에게 보내졌다. 무전기에 남은 집하장 주파수로 마지막 이송을 추적한다.'},
 m7:{solo:true,before:'까마귀의 인계서를 받은 운송 보스 오태식. 제비가 남긴 주파수로 집하장을 찾았다. 그를 처치하고 출고를 끊어 남은 증인들을 지킨다.',after:'새벽배송을 멈췄다. 운송명세서의 최종 수취인은 까마귀였다. 금성회 본부가 그의 은신처다. 처음부터 의뢰로 하부 조직을 정리하고 증인을 독점하려던 것이다.',cast:{broker:'freight'}},
 m5:{solo:true,before:'운송명세서가 가리킨 마지막 주소. 길을 알려 주던 까마귀가 금성회의 총책이었다. 그를 처치하고 원본 장부를 밖으로 가져가 증인 거래를 끝낸다.',after:'까마귀를 처치하고 증인 거래 원본 장부를 확보했다. 올빼미는 장부와 남은 증인들을 조직 밖으로 보냈다. 제비가 시작한 일은 끝났다. 날이 밝는다.',cast:{boss:'crow'}}
};
for(const [id,story] of Object.entries(CAMPAIGN_STORY)){
 const s=STAGES.find(s=>s.id===id);s.story=story;s.endText=story.after;
 if(story.cast){s.targetCast=Object.fromEntries(Object.entries(story.cast).map(([tag,id])=>[tag,TARGET_CAST[id]]));s.targetNames=Object.fromEntries(Object.entries(s.targetCast).map(([tag,p])=>[tag,p.name]));}
}
// Keep established places, inventory names and mechanics legible in guidance.
const campaignStage=id=>STAGES.find(s=>s.id===id);
campaignStage('tB').brief=campaignStage('tB').brief.replace('연락책이 사라졌다.','제비가 사라졌다.');
campaignStage('m6').brief=campaignStage('m6').brief.replace('까마귀가 우리를 넘겼다.','까마귀가 준 철수 장소에서 붙잡혔다.');
campaignStage('p0').brief='갈색 후드의 운반책 박인호가 표적이다. '+campaignStage('p0').brief;
campaignStage('e1').brief='회청색 작업복의 연락책 정필수가 표적이다. '+campaignStage('e1').brief;
campaignStage('e5').brief='청록 정장의 중개인 문기석이 표적이다. '+campaignStage('e5').brief;
Object.assign(campaignStage('m2'),{purpose:'강도윤을 처치하고, 장부와 거래 암호표로 자금책의 실명을 밝힌다.'});
campaignStage('m2').brief='자주색 정장의 강도윤이 클럽 실장이다. '+campaignStage('m2').brief;
Object.assign(campaignStage('m4'),{name:'돈줄',purpose:'자금책 장무혁과 상권 보스 백철민을 처치하고, 현금 가방과 계약서를 확보한다.',mission:'장무혁·백철민 처치 · 현금 가방과 계약서 회수 후 탈출'});
campaignStage('m4').brief='황토색 재킷에 체격이 큰 장무혁은 수금반장, 흰머리에 밝은 정장을 입은 백철민은 클럽 VIP룸의 상권 보스다. '+campaignStage('m4').brief;
campaignStage('m4').brief=campaignStage('m4').brief.replaceAll('수금원','수금반장');
campaignStage('m4').notes?.forEach(n=>{if(n.lines)n.lines=n.lines.map(l=>l.replaceAll('클럽 실장','상권 보스 백철민'));});
Object.assign(campaignStage('m7'),{purpose:'운송 보스 오태식을 처치하고 배송망을 끊어 남은 증인들의 이송을 막는다.'});
campaignStage('m7').brief='안전모와 주황색 작업복을 입은 오태식이 운송 보스다. '+campaignStage('m7').brief;
Object.assign(campaignStage('m5'),{name:'마지막 의뢰',sub:'마지막 밤 · 금성회 본부',storyEpisode:true,noSupport:true,rivals:0,briefBy:'독자 행동',
 purpose:'까마귀를 처치하고 증인 거래 원본 장부를 회수한다.',mission:'본부 2층 까마귀 처치 · 1층 원본 장부 회수 후 탈출',itemName:'원본 장부',itemNames:['원본 장부'],
 buildingNames:{0:'금성회 본부'},
 brief:'백발에 적갈색 정장을 입은 까마귀가 2층에 있다. 1층 금고에는 증인 거래 원본 장부가 있다. 남쪽 골목에서 혼자 쉬는 조직원의 옷을 얻으면 본부 앞길과 1층을 통행할 수 있다. 2층 보안구역은 옷으로 통과할 수 없고, 정문 정예도 얼굴을 확인한다. 뒷문과 계단, 배관을 살펴 접근하자. 금고 번호는 1층 사무실의 대화에서 들을 수 있다. 까마귀와 장부가 목표다. 다른 조직원을 모두 처치할 필요는 없다.'});
Object.assign(campaignStage('m5').guards[5],{still:true,smoker:true});
const finaleBuild=campaignStage('m5').build;
campaignStage('m5').build=m=>{finaleBuild(m);m.many('B',[[11,18]]);};
// Leave real service space behind the ground-floor camera. The generated
// locker previously filled that space; keep it against the office wall.
campaignStage('m5').roomPatches=[{bounds:[12,2,27,10],furniture:[{t:'locker',from:[23,7],to:[13,9]}],tiles:[[23,7,'w']]}];
// The final job rewards the same assassination/stealth rules as earlier jobs.
campaignStage('m5').stories=campaignStage('m5').stories.filter(s=>s.id!=='purge');
delete campaignStage('m5').purgeBonus;
campaignStage('m5').challenges=['disguise','intel','ghost','clean'];
campaignStage('m5').hints=campaignStage('m5').hints.filter(h=>!h.includes('추가 수고비'));
DIALOGUE.m2=[['master','자주색 정장의 강도윤. 클럽 실장입니다. 장부와 거래 암호표를 맞추면 배후의 이름이 나올 겁니다.'],['hero','먼저 거리에서 살펴보자. 경비를 건드릴 필요는 없어.']];
DIALOGUE.m4=[['master','장부에 나온 장무혁과 백철민입니다. 큰 체격에 황토색 재킷이 장무혁, 흰머리에 밝은 정장이 백철민입니다.'],['hero','돈을 걷는 자와 계약을 승인한 자. 현금과 계약서도 챙긴다.']];
DIALOGUE.m7=[['hero','까마귀의 인계서를 받은 오태식. 안전모와 주황색 작업복이다.'],['hero','명세서를 챙기고 2층 단말에서 배송을 멈춘다. 제비가 지키려던 사람들은 아직 여기 있어.']];
DIALOGUE.m5=[['hero','길을 봐 주던 목소리가 저 위에 있다. 이제 누구 지시도 필요 없어.'],['hero','까마귀, 그리고 원본 장부. 이 거래를 끝낸다.']];
