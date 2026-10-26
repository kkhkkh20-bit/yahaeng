# 야행

2D 탑다운 잠입 암살 웹 게임. 바닐라 JS 캔버스, 빌드 결과는 HTML 파일 하나.

## 구조
- `src/game.js` 엔진 전체 (시야·소리·층 이동·경비 AI·렌더링)
- `src/stages_city.js` 도시 미션 5개 지도·배치
- `src/template.html` HUD·메뉴·스타일
- `build_city.py` 도시판 빌드 → `build/yahaeng_city.html` (게시본)
- `build.py`, `build_joseon.py`, `build_neo.py` 다른 테마 빌드
- `build_assets*.py` 아틀라스·소리·글꼴 생성 (원본 에셋 `dl/` 필요, 저장소에는 없음)
- `build/pr/` 미리 렌더링한 캐릭터 시트, `build/kit/` 3D로 구운 배경 조각 (생성 비용이 커서 저장소에 포함)
- `tools/prerender/` 캐릭터·배경 3D 렌더링 도구 (`npm install` 필요)
- `tests/` playwright 회귀 테스트

## 빌드
```
python3 build_city.py
```

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
```
