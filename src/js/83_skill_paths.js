// Layout is derived from prerequisites, so a line always means a real unlock.
function skillPath(id){const s=SKILL_BY_ID[id];return s?[...s.req.flatMap(skillPath),id]:[];}
function skillTreeLayout(branch){
 const defs=SKILL_TREE.filter(s=>s.branch===branch),positions={},children=id=>defs.filter(s=>s.req.includes(id));let leaf=0;
 function visit(s,depth){const kids=children(s.id),start=leaf;if(kids.length)kids.forEach(k=>visit(k,depth+1));else leaf++;positions[s.id]={row:depth,col:start+leaf,depth};}
 defs.filter(s=>!s.req.length).forEach(s=>visit(s,1));return{positions,leaves:leaf};
}
const SKILL_UTILITY={
 quietStep:'경비가 돌아서는 틈에 걸어서 거리를 좁히기',quietCrouch:'경비 바로 옆 통로를 낮은 자세로 지나가기',lookout:'접근하기 전에 순찰과 출구를 함께 살피기',swiftCrouch:'순찰이 돌아오기 전에 어두운 구간을 통과하기',shadow:'불이 약한 방에서 발각되기 전 이동할 시간 벌기',landing:'옥상에서 내려온 뒤 착지점 수색을 줄이기',foliage:'풀숲 가까이 순찰이 지나갈 때 버티기',sprint:'노출된 도로를 짧은 틈에 건너기',
 silentHands:'주변 경비가 접촉 소리를 듣는 범위 줄이기',ambush:'풀숲이나 엄폐 뒤에서 모습을 드러내지 않고 제압하기',drop:'지상 순찰을 우회해 위에서 접근하기',dual:'가까이 붙은 두 경비를 한 번에 처리하기',bodyCarry:'동료 순찰이 돌아오기 전에 몸을 치우기',chain:'떨어져 순찰하는 두 경비를 연달아 처리하기',reach:'멀어지는 적을 따라잡아 뒤에서 제압하기',flow:'다음 순찰을 상대할 때 암살 기술을 빨리 다시 준비하기',blindside:'정확한 정후방을 잡기 어려운 좁은 통로에서 기습하기',
 kit:'잠긴 경로를 열거나 캔으로 순찰 방향 바꾸기',dart:'접근하기 어려운 적을 멀리서 기절시키기',kunai:'위험 구역에 들어가기 전에 적을 원거리에서 처치하기',smoke:'카메라와 경비가 보는 길을 잠시 가리고 통과하기',precision:'더 멀리서 투척하고 추가 탄약으로 경로 선택 폭 늘리기',smokeMix:'몸을 운반하거나 긴 통로를 건널 시간을 벌기',electric:'건물·구역 전원을 차단하고 복구하러 오는 경비 유인하기',radio:'확보한 무전기로 순찰 한 명만 다른 곳으로 보내기',hack:'전원을 끄러 들어가지 않고 CCTV 통과 시간 만들기',signal:'CCTV에 더 멀리서 개입하고 안전하게 통과할 시간 늘리기'
};
function skillBenefit(d){
 const pairs={reach:['1.5m 이내에서 접촉 제압','3.5m에서 직접 접근 후 제압'],ambush:['은신 상태 공격 불가','풀숲·엄폐·은신처에서 기습'],dart:['다트 조준·발사 불가','다트 사용 · 기본 2발'],electric:['일반 조명 스위치 조작','건물·구역 분전반 조작'],dual:['한 명씩 제압','붙어 있는 두 적 동시 처치'],chain:['첫 적만 처치','다음 적에게 이동해 연속 처치'],drop:['옥상에서 기습 불가','가장자리에서 낙하 기습'],smoke:['연막 사용 불가','반경 3m · 5초 시선 차단'],kunai:['쿠나이 사용 불가','살상용 쿠나이 2개'],radio:['허위 무전 불가','확보한 무전기로 유인 · 2회'],hack:['원격 CCTV 정지 불가','4m · 10초 정지'],signal:['해킹 4m · 10초','5.5m · 15초'],quietStep:['걷기 소음 100%','걷기 소음 75%'],quietCrouch:['웅크리기 소음 100%','웅크리기 소음 65%'],swiftCrouch:['웅크리기 속도 100%','웅크리기 속도 120%'],sprint:['달리기 속도 100%','달리기 속도 112%'],bodyCarry:['운반 속도 60%','운반 속도 75%'],silentHands:['기절 접촉 소음 100%','기절 접촉 소음 70%'],landing:['착지 소음 100%','착지 소음 60%'],shadow:['어두운 곳 발견 속도 100%','웅크리면 발견 속도 85%'],foliage:['풀숲 시각 감지 1.1m','풀숲 시각 감지 0.9m'],lookout:['기본 화면 범위','화면 범위 10% 확대'],flow:['동시 암살 12초 · 연속 16초','동시 암살 9.6초 · 연속 12.8초'],smokeMix:['연막 3m · 5초','3.5m · 8초 · 1개 추가'],precision:['투척 사거리 100%','130% · 배운 투척 도구 1개 추가'],blindside:['기본 후방 허용 각도','일반 경비 후방 약 20도 확대'],kit:['기본 소지품','락픽 1개 · 빈 캔 2개 추가']};
 return pairs[d.id];
}
