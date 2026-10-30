# 모듈형 인물

여성 주인공과 주민·직원·경비를 Quaternius의 같은 모델 계열로 교체했다.
게임의 구역·변장 허가·공격 판정·HUD·버튼 위치는 변경하지 않는다.

## 외형

- 주인공: Casual의 머리와 하의, Suit의 재킷, Worker의 신발을 조합했다.
- 경비 변장: 같은 머리에 경비 장비가 있는 상체를 결합한다.
- 직원/택배/뷔페: 작업복, 웨이터: 정장. 옷을 바꿔도 주인공의 피부·머리색과 여성 체형은 유지한다.
- 경비: Swat의 장비와 헬멧. 역할별 기존 색상 의미를 유지한다.
- 주민: 평상복·정장·치마·후드, 체형·헤어·배낭·지팡이·작업자 헬멧으로 구별한다.
- 기존 `big/fLong/fBob/fTail/old/coat/pack/kid/helmet` 키를 유지해 저장된 인물/시체의 외형 참조를 보존한다. 아이의 비공격 규칙도 그대로다.
- 옷을 가져간 뒤의 쓰러진 사람도 원래 성별에 맞는 평상복 체형으로 표시한다.
- 대사 초상은 같은 모델에서 찍었다. 기존 대사창 위치와 크기는 유지하고 얼굴·의상을 볼 수 있게 표시한다.

## 라이선스와 원본

Ultimate Modular Women / Ultimate Modular Characters by Quaternius, CC0 1.0.
여성팩을 포함해 작가 사이트의 GitHub 원본 페이지에서 CC0 표기를 확인했다.
페이지 스냅샷·출처·모델 SHA-256은 `tools/prerender/characters/`에 보관했다.

- [작가 여성팩 페이지](https://quaternius.com/packs/ultimatemodularwomen.html)
- [작가 남성팩 페이지](https://quaternius.com/packs/ultimatemodularcharacters.html)
- [작가 사이트 소스](https://github.com/Quaternius/quaternius.github.io/tree/main/packs)
- [사용한 GLB 변환본](https://github.com/LuanDucate/Ducz.CharacterCreator/tree/main/public/models)

변환 도구 애플리케이션의 코드는 가져오지 않았다. 모델·애니메이션과 작가 표기만 사용한다.

## 다시 만들기

```
npm ci --prefix tools/prerender --ignore-scripts
python3 tools/prerender/bake_modular.py
python3 build.py
```

Python에 Pillow와 Playwright, Chromium이 필요하다. 기본 브라우저 경로는
`/usr/bin/chromium`이다. 일부 외형만 다시 찍으려면 `--only=hero,heroSuit`를 쓴다.
전체 얼굴 시트 생성에는 각 외형의 `face_<이름>.webp`가 모두 필요하므로 최초에는 전체를 굽는다.

기존 `render.html`의 이동/제압/운반 포즈를 공유한다. `modular_models.js`가 뼈 이름과
모델 단위, 부위별 재질을 연결한다. 서로 다른 고유 클립 길이는 기존 시간표로 맞춘다.
두 사람 동작은 주인공/경비를 상대 모델로 놓고 가림을 포함해 찍는다.
웅크림·매달림·운반·붙잡기·창문 넘기·벽 기대기는 기존 포즈를 새 뼈대에 적용한다.

결과는 64px 프레임·8방향 이미지이며 플레이 중 3D 모델을 불러오지 않는다.
쓰러짐/오르기에는 별도 지면 기준점을 기록해 프레임 안에 몸이 들어오게 하고,
그림을 그릴 때 같은 기준점을 사용한다. 외곽선은 프레임별로 만들어 이웃 프레임이 번지지 않게 한다.
팔레트 전처리는 투명 여백을 제외한 픽셀만 저장하며 기존 색칠 결과와의 동등성 검사를 둔다.

## 검증

`tests/rev/t_characters.py`는 주인공 네 의상의 모든 동작·8방향 프레임,
변장 시 성별/피부/머리색 유지, 여성 NPC의 직업 의상, 기존 체형 키,
초상, 팔레트 색칠 결과를 검사한다.
기존 이동·운반·붙잡기·기절·변장·체크포인트·모바일 검사는 그대로 사용한다.

2026-10-30 검증: 도달 검사와 회귀 60개 통과. 마지막 프레임 기준점/외형 팔레트
수정 후 캐릭터 전용 검사 및 버튼·UI·메뉴·동작·기절·저장·전깃줄·변장·아이·변형
관련 10개를 재검증했다. 실제 붙잡기/운반 상태와 390×844 모바일 캡처도 확인했다.
실제 휴대폰 GPU/배터리 성능을 측정한 결과는 아니다.

확대 모델 확인은 `tools/prerender/characters/preview.html`을 도구 디렉터리의 HTTP 서버로 연다.
메인 포스터는 후속 B안 적용에서 같은 단발·재킷을 참조한 잉크 초상으로 연결했다.
구성과 출처는 `docs/UI_REFERENCES.md`를 참고한다.
