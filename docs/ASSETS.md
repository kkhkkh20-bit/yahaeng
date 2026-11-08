# 원본 에셋 출처 (dl/ 폴더, 저장소 미포함)
- 현재 인물: Quaternius Ultimate Modular Women / Ultimate Modular Characters (CC0). 원본 GLB·출처·라이선스 근거는 `tools/prerender/characters/`, 제작 방법은 `docs/CHARACTERS.md` 참고.
- Kenney: Retro Urban Kit, Furniture Kit, Top-down Shooter, Medieval RTS, Racing, Tanks, Impact/Interface Sounds, RPG Audio (CC0, kenney.nl)
- Ninja Adventure Asset Pack (CC0, pixel-boy.itch.io)
- OpenGameArt: roof_tiles.gif, footsteps, crickets.mp3 (oga/)
- Galmuri 글꼴 (OFL)
- Quaternius Downtown City MegaKit (CC0, quaternius.itch.io/downtown-city-megakit) — 도시판 건물 외관 (dl/megakit). 옥상 소품은 three.js 기본 도형으로 직접 만든 것
- 의뢰 6 원본 복구: [작가 CC0 표기](https://quaternius.com/packs/downtowncitymegakit.html),
  [표준 무료팩 미러](https://github.com/tilakpatell/tilakverse-assets/tree/85064399bbdacc0e8cc50807179490314bc4ff1c/quaternius/downtown-city-megakit).
  `tools/prerender/megakit/`에 라이선스·고정 리비전·사용 파일 SHA-256을 기록했다.
  앱 코드는 가져오지 않았다. 원본은 기존 `dl/`에 내려받고, 저장소에는 구운 결과를 둔다.
- 메인 포스터와 제목 서체: `docs/UI_REFERENCES.md`의 현재 B안 항목 참고.

- v123 클럽 기준 구역: `src/art/quarter/`의 14개 모델 샘플은 Kenney Furniture Kit와 Quaternius Downtown City MegaKit(CC0)를 기존 2D 좌표에 맞춰 다시 구운 것. 원본 SHA-256·고정 리비전·두 라이선스는 같은 폴더에 보관. `tools/prerender/bake_quarter.py`로 재생성하며 AI 이미지 생성은 사용하지 않았다. 사용 범위·미적용 후보는 `docs/CLUB_QUARTER_V123.md`에 기록.

- 현재 UI·캔버스 안내 글꼴(v153): [IBM Plex Sans KR Regular](https://github.com/google/fonts/tree/main/ofl/ibmplexsanskr) (IBM, SIL OFL 1.1). 전체 한글 11,172음절을 포함한 WOFF2를 자체 제공하며, 출처·변환·해시는 `src/fonts/ui-font.json`, 라이선스는 `src/fonts/OFL-IBMPlexSansKR.txt`. 제목의 야행 로고는 기존 Black Han Sans를 유지한다. Galmuri는 이전 보관판의 출처다.

- v201 사무동 2층 시범 방: [Quaternius Ultimate House Interior](https://quaternius.com/packs/ultimatehomeinterior.html)의 의자·소파·서랍장과 [Poly Haven Industrial Wall Lamp](https://polyhaven.com/a/industrial_wall_lamp)(Kuutti Siitonen), 모두 CC0. 스위치·미닫이 창문·사무 책상은 직접 제작했다. 원본 파일·SHA-256·라이선스는 `tools/prerender/room_finish_src/`, 구운 2D WebP 48장은 `src/art/room-finish/`에 보관한다. Blender는 제작 도구로만 사용하며 게임은 계속 2D로 실행된다. 적용·검증 범위는 `docs/LIGHT_ROOM_V201.md` 참고.

## v202 접힌 복장과 서류

`src/art/field-items/`의 재킷·앞치마·폴더·종이는 프로젝트에서 직접 만든 기하·재질을 구운 원본 에셋이다. 제작 소스는 `tools/prerender/field_items_scene.py`, 재생성은 Blender 4.3.2와 Pillow로 `python tools/prerender/bake_field_items.py` 실행. 2D WebP 4장 총 6,036바이트, 배포 시 Blender나 3D 실행 코드는 필요 없다. 외부 원본·유료 에셋·추가 라이선스 의무는 없다. 기존 캐릭터와 동일한 48px/m 투영 및 게임 조명을 따른다.

- v226 공개 9개 의뢰의 실내 마감: 구매자가 제공한 [GuttyKreum Office Interior v3](https://guttykreum.itch.io/japanese-office-interior-game-assets)의 게임용 선택 아틀라스. 바닥·벽·창틀·업무 가구·수납장 문·조명 프레임을 2D로 사용한다. 원본 ZIP/전체 타일맵/Unity 패키지는 비공개이며 `tools/import_office_interiors.py`와 `src/art/office/interiors.json`에 출처 좌표와 해시를 기록했다. 전용 침대·주방·욕실·금고 및 야외 소재는 기존 팩을 함께 사용한다. 검수와 사용 조건은 `docs/office-v226/README.md`, `src/art/office/LICENSE.txt` 참고.
