// One finite budget, three prerequisite graphs. Effects are read by the owning systems.
const SKILL_BRANCHES={body:{name:'신체',note:'소음 · 은폐 · 기동'},assassin:{name:'암살',note:'기습 · 연계 · 운반'},tools:{name:'도구',note:'투척 · 연막 · 전자장비'}};
const SKILL_TREE=[
 {id:'quietStep',branch:'body',name:'가벼운 발',cost:1,req:[],row:1,col:0,description:'걷기 발소리 범위 25% 감소. 유리·철판의 추가 소음은 남는다.'},
 {id:'quietCrouch',branch:'body',name:'낮은 발걸음',cost:1,req:['quietStep'],row:2,col:1,description:'웅크린 이동의 발소리 범위 35% 감소.'},
 {id:'lookout',branch:'body',name:'주변 살피기',cost:1,req:['quietStep'],row:2,col:2,description:'일반 카메라를 10% 넓힌다. 다른 층이나 벽 너머를 투시하지 않는다.'},
 {id:'swiftCrouch',branch:'body',name:'낮은 보행',cost:2,req:['quietCrouch'],row:3,col:1,description:'웅크린 이동 속도 20% 증가.'},
 {id:'shadow',branch:'body',name:'어둠 적응',cost:2,req:['quietCrouch'],row:3,col:2,description:'어두운 곳에서 웅크리면 시각 발견 게이지가 15% 느리게 찬다. 접촉 감지는 유지된다.'},
 {id:'landing',branch:'body',name:'유연한 착지',cost:2,req:['swiftCrouch'],row:4,col:1,description:'일반 착지 소음 40% 감소. 사람이나 물건이 떨어지는 소리는 줄이지 않는다.'},
 {id:'foliage',branch:'body',name:'풀숲 자세',cost:2,req:['shadow'],row:4,col:2,description:'웅크려 숨은 풀숲에서 사람의 시각 감지 거리가 22% 줄어든다. 개의 후각은 막지 못한다.'},
 {id:'sprint',branch:'body',name:'짧은 질주',cost:2,req:['swiftCrouch'],row:5,col:1,description:'달리기 속도 12% 증가. 달리기 소음과 의심은 그대로다.'},
 {id:'silentHands',branch:'assassin',name:'제압 숙련',cost:1,req:[],row:1,col:0,description:'맨손 기절의 접촉 소음 30% 감소. 목격자와 쓰러진 몸은 그대로 남는다.'},
 {id:'drop',branch:'assassin',name:'낙하 암살',cost:1,req:['silentHands'],row:2,col:1,description:'옥상 가장자리에서 [공격]으로 바깥의 적을 덮친다. 실제 착지와 빈 경로가 필요하다.'},
 {id:'dual',branch:'assassin',name:'쌍암살',cost:2,req:['silentHands'],row:2,col:2,description:'서로 붙어 있는 두 적의 등 뒤에서 함께 처치. B 길게 · 재사용 12초.'},
 {id:'bodyCarry',branch:'assassin',name:'시체 운반',cost:1,req:['drop'],row:3,col:1,description:'기절자·시체 운반 속도가 기본 보행의 60%에서 75%가 된다.'},
 {id:'chain',branch:'assassin',name:'연속 암살',cost:3,req:['dual'],row:3,col:2,description:'첫 적을 처치한 뒤 다음 적에게 직접 이동. B 길게 · 재사용 16초. 들키면 중단.'},
 {id:'reach',branch:'assassin',name:'기습 보폭',cost:2,req:['silentHands'],row:4,col:1,description:'등 뒤 돌진·끌어당기기 거리 20% 증가. 이동 경로가 막히면 사용할 수 없다.'},
 {id:'flow',branch:'assassin',name:'연계 정비',cost:2,req:['chain'],row:4,col:2,description:'쌍암살·연속 암살의 재사용 대기시간 20% 감소. 전투 중 즉시 초기화하지 않는다.'},
 {id:'blindside',branch:'assassin',name:'기습 포착',cost:2,req:['reach'],row:5,col:1,description:'일반 경비의 후방 공격 허용 각도를 약 20도 넓힌다. 정예·주민에게는 적용하지 않는다.'},
 {id:'kit',branch:'tools',name:'현장 장비',cost:1,req:[],row:1,col:0,description:'의뢰 시작 시 락픽 1개·빈 캔 2개 추가. 맨손 시작 조건은 유지한다.'},
 {id:'kunai',branch:'tools',name:'쿠나이 운용',cost:1,req:['kit'],row:2,col:1,description:'살상용 쿠나이 2개 지급. 도구로 선택 후 1초 이상 눌렀다 떼어 투척한다.'},
 {id:'smoke',branch:'tools',name:'연막탄',cost:1,req:['kit'],row:2,col:2,description:'연막탄 1개 지급. 반경 3m·5초 동안 시선을 차단한다. 소리·접촉·개의 후각은 남는다.'},
 {id:'precision',branch:'tools',name:'투척 숙련',cost:2,req:['kunai'],row:3,col:1,description:'다트·쿠나이 사거리 30% 증가. 시작 시 다트·쿠나이 각각 1개 추가.'},
 {id:'smokeMix',branch:'tools',name:'연막 조제',cost:2,req:['smoke'],row:3,col:2,description:'연막 반경 3.5m·지속 8초. 시작 시 연막탄 1개 추가.'},
 {id:'radio',branch:'tools',name:'무전기 역이용',cost:2,req:['kit'],row:4,col:0,description:'쓰러진 경비에게서 무전기를 확보한 뒤 허위 점검 지시로 경비 한 명을 유인한다. 의뢰당 2회·재사용 30초.'},
 {id:'hack',branch:'tools',name:'CCTV 해킹',cost:2,req:['radio'],row:5,col:0,description:'같은 층·약 4m 안에서 CCTV를 겨누고 1.5초 작업해 10초간 정지. 녹화 기록은 남는다. 재사용 25초.'},
 {id:'signal',branch:'tools',name:'회로 분석',cost:2,req:['hack'],row:6,col:0,description:'CCTV 해킹 거리 약 5.5m·정지 15초. 중간 벽과 다른 층 제한은 유지한다.'}
];
const SKILL_BY_ID=Object.fromEntries(SKILL_TREE.map(s=>[s.id,s]));
const SKILL_STORE='yahaeng.skillTree.v1',SKILL_START_POINTS=4;
let volatileSkillTree=null;
const skillBudget=()=>SKILL_START_POINTS+totalStars();
const skillSpent=r=>r.learned.reduce((n,id)=>n+SKILL_BY_ID[id].cost,0);
function storeSkillTree(record){try{localStorage.setItem(SKILL_STORE,JSON.stringify(record));volatileSkillTree=null;return true;}catch(e){volatileSkillTree=record;return false;}}
function loadSkillTree(){
 let raw=null;try{raw=localStorage.getItem(SKILL_STORE);}catch(e){if(volatileSkillTree)return volatileSkillTree;}
 if(!raw&&volatileSkillTree)return volatileSkillTree;
 let record;try{record=JSON.parse(raw);}catch(e){}
 if(!raw){
  const owned=new Set(),add=id=>{if(owned.has(id))return;for(const req of SKILL_BY_ID[id].req)add(req);owned.add(id);},stars=totalStars();
  // One-time v147 migration, including automatically granted equipment.
  if(stars>=3){add('dual');add('kit');}if(stars>=6){add('chain');add('precision');}if(stars>=9)add('quietStep');if(stars>=16)add('reach');if(stars>=20)add('swiftCrouch');
  record={schema:1,learned:SKILL_TREE.filter(s=>owned.has(s.id)).map(s=>s.id)};storeSkillTree(record);
 }
 const want=new Set(record?.schema===1&&Array.isArray(record.learned)?record.learned:[]),learned=[],owned=new Set(),budget=skillBudget();let spent=0;
 // Topological order and budget checks reject malformed, duplicate and orphan entries.
 for(const s of SKILL_TREE)if(want.has(s.id)&&s.req.every(k=>owned.has(k))&&spent+s.cost<=budget){learned.push(s.id);owned.add(s.id);spent+=s.cost;}
 return{schema:1,learned};
}
function skillOn(id){
 if(!S||STAGE.artSlice||STAGE.tutorial&&!STAGE.skillPractice&&!STAGE.toolPractice)return false;
 return !!S.skills?.[id]||!!S.practiceSkills?.[id]||!!STAGE.skillPractice&&['dual','chain','drop'].includes(id)||!!STAGE.toolPractice&&SKILL_BY_ID[id]?.branch==='tools';
}
function syncRuntimeSkills(){
 const previous=S.perks||{};if(!S.skillGrants&&!S.skills&&S.t>0)S.skillGrants={kit:!!(previous.pick||previous.can),precision:!!previous.dart};
 const r=loadSkillTree();S.skills=Object.fromEntries(r.learned.map(id=>[id,true]));S.skillStars=totalStars();S.skillGrants=S.skillGrants||{};
 S.perks={sole:skillOn('quietStep'),shadow:skillOn('swiftCrouch'),reach:skillOn('reach'),pick:skillOn('kit'),can:skillOn('kit'),dart:skillOn('precision')};
 if((!STAGE.tutorial&&(!STAGE.bare||S.gearRecovered)&&S.mod!=='bare')||STAGE.toolPractice||STAGE.skillPractice&&Object.keys(S.practiceSkills||{}).length){
  const grants={kit:{picks:1,stones:2},kunai:{blades:2},smoke:{smokes:1},precision:{kunai:1,blades:1},smokeMix:{smokes:1},radio:{radioCharges:2},hack:{hackDevice:1}};
  for(const[id,items]of Object.entries(grants))if(skillOn(id)&&!S.skillGrants[id]){for(const[k,v]of Object.entries(items))S.player[k]=(S.player[k]||0)+v;S.skillGrants[id]=true;}
 }
 S.smokes=S.smokes||[];
}
function learnTreeSkill(id){
 const s=SKILL_BY_ID[id];if(!s||!assassinMenu)return false;
 if(assassinMenu.practice){S.practiceSkills=S.practiceSkills||{};if(!s.req.every(k=>skillOn(k)))return false;S.practiceSkills[id]=true;syncRuntimeSkills();renderAssassinMenu();syncTools();return true;}
 const r=loadSkillTree();if(r.learned.includes(id)||!s.req.every(k=>r.learned.includes(k))||skillBudget()-skillSpent(r)<s.cost)return false;
 r.learned.push(id);const stored=storeSkillTree(r);if(S&&running)syncRuntimeSkills();
 if(ASSASSIN_SKILLS[id])chooseAssassinSkill(id);else renderAssassinMenu();if(S){hudCache.skillScan=null;syncTools();}
 if(!stored&&S)toast('기기 저장 불가 · 이번 실행에 배운 기술을 유지한다',2.4);return true;
}
function resetTreeSkills(){
 if(!assassinMenu||assassinMenu.from!=='ledger'&&!assassinMenu.practice)return false;
 if(assassinMenu.practice){S.practiceSkills={};syncRuntimeSkills();}else storeSkillTree({schema:1,learned:[]});
 renderAssassinMenu();return true;
}
const skillNoise=(src,r)=>r*(src==='step'?(S.player.mode==='walk'&&skillOn('quietStep')?.75:S.player.mode==='sneak'&&skillOn('quietCrouch')?.65:1):src==='land'&&skillOn('landing')?.6:src==='ko'&&skillOn('silentHands')?.7:1);
const skillMoveMul=mode=>mode==='run'&&skillOn('sprint')?1.12:1;
const skillViewMul=()=>skillOn('lookout')?1/1.1:1;
const skillDetection=(g,light,sneak,d)=>!g.dog&&sneak&&light<.45&&d>=48&&skillOn('shadow')?.85:1;
const projectileRange=()=>skillOn('precision')?325:250;
