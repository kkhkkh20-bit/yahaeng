# 야행

2D 탑다운 잠입 암살 웹 게임. 바닐라 JS 캔버스, 빌드 결과는 HTML 파일 하나.

## 구조
- `src/game.js` 엔진 전체 (시야·소리·층 이동·경비 AI·렌더링)
- `src/stages_city.js` 도시 미션 5개 지도·배치
- `src/template.html` HUD·메뉴·스타일
- `build_city.py` 도시판 빌드 → `build/yahaeng_city.html` (게시본, 건물 외관 MegaKit + 옥상 살림). `python3 build_city.py kenney` → `build/yahaeng_city_kenney.html` (이전 외관 비교판)
- `build.py`, `build_joseon.py`, `build_neo.py` 다른 테마 빌드
- `build_assets*.py` 아틀라스·소리·글꼴 생성 (원본 에셋 `dl/` 필요, 저장소에는 없음)
- `build/pr/` 미리 렌더링한 캐릭터 시트, `build/kit/` 3D로 구운 배경 조각(Kenney), `build/kit_mk/` MegaKit 건물 외관 + 옥상 살림 (생성 비용이 커서 저장소에 포함)
- `tools/prerender/` 캐릭터·배경 3D 렌더링 도구 (`npm install` 필요)
- `tests/` playwright 회귀 테스트

## 빌드
```
python3 build_city.py
```

건물 외관을 다시 구울 때 (게임이 정한 옥상 배치를 spec에 담아 굽는다):
```
python3 build_city.py && cd tools/prerender/kenney_ruk && python3 spec.py 6 && python3 bake_mk.py && cd /root/game && python3 build_city.py
```
옥상 소품 중 옥탑방·물탱크·계단실은 지붕 위 막힘이자 시선 가림이고, 구운 `kit_mk/kit.json`의 목록을 그대로 쓴다.

## 테스트
테스트 스크립트는 `/root/game/build/preview_city.html` 경로를 기준으로 작성되어 있다.
```
python3 tests/city/vall.py      # 4개 빌드 오류 검사
python3 tests/v22/tval.py       # 지도 검증 (무작위 배치 3종)
python3 tests/mis/tfeat2.py     # 미션별 기능
python3 tests/mis/troutes2.py   # 경로·열쇠
python3 tests/rev/t_radio.py    # 무전 지연·차단
python3 tests/rev/t_stalk.py    # 경비 근처 Space=암살 전용
python3 tests/rev/t_cp.py       # 체크포인트 저장·불러오기
python3 tests/rev/t_opp.py      # 기회 목록
python3 tests/rev/t_music.py    # 도시 음악 생성·전환
python3 tests/rev/t_v33.py      # 락픽(창문·문)·걸쇠·방범창·자동 기대기·끌어당겨 암살
python3 tests/rev/t_wire.py     # 전깃줄 매달린 방향
python3 tests/rev/t_expo.py     # 숨음·들킬 수 있음·보인다 판정
python3 tests/rev/t_tree.py     # 나무에 기대 숨기
python3 tests/rev/t_change.py   # 경비가 열린 창문을 다시 잠금
python3 tests/rev/t_perk.py     # 별점 장비
python3 tests/rev/t_tut.py      # 연습(훈련장) 17단계 통과
python3 tests/rev/t_roof.py     # 옥상 살림 막힘: 지도 검증·지붕 경비 경로·지붕 연결·옥탑방에 막힘
python3 tests/rev/t_roof2.py    # 지붕 위 옥탑방 벽에 기대기·끌어당겨 암살
python3 tests/rev/t_sh.py       # 옥상 계단실: 실내 계단 위에 서고 문 앞에서 오르내림
python3 tests/rev/t_aware.py    # 발견 게이지: 거리별 의심·발각까지 걸리는 시간
python3 tests/rev/t_v48.py      # 덮칠 수 없는 이유 표시·들킨 뒤 버티는 시간·Esc 조준 취소
python3 tests/rev/t_mod.py      # 의뢰 변형
python3 tests/rev/t_risk.py     # 눈에 띄는 시체
python3 tests/rev/fuzz.py 90 1  # 무작위 입력으로 미션마다 90초씩 오류·멈춤 탐색
```
