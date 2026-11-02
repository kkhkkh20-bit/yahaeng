# PixelFX 프로젝트 스킬 설치

원본: https://github.com/patch-gg/pixelfx

고정 커밋: `a84159688af3ca37a4be05a0d422b94451b2e24e` · 버전 0.3.0 · MIT

이 폴더는 Codex 프로젝트 스킬이다. `SKILL.md`는 원본 지침에 번들 경로와 미리보기 출력 위치 안내를 추가했다. `agents/openai.yaml`은 명시적 호출만 허용한다. 전역 설정이나 자동 훅을 등록하지 않았다.

`vendor/pixelfx/`에는 원본의 src, tools, package.json, README, AUTHORING, CATALOG, LICENSE, NOTICE를 보관한다. 244개 효과와 필요한 공통 모듈이 포함된다. 갤러리·데모 GIF·Patch Pixel 폰트는 설치 범위에서 제외했다. 따라서 tools/serve.mjs와 tools/build-gallery.mjs를 통한 별도 웹 갤러리 제작은 이 번들의 지원 범위가 아니다.

Node 18 이상에서 동작하며 npm 설치는 필요 없다. GIF/MP4 출력에만 ffmpeg가 선택적으로 필요하다. 게임 통합을 요청받기 전에는 본편 코드에 효과 라이브러리를 포함하지 않는다.

프로젝트 루트에서 실행한 설치 확인:

```bash
node .agents/skills/pixelfx/vendor/pixelfx/tools/list.mjs smoke
node .agents/skills/pixelfx/vendor/pixelfx/tools/render.mjs fire/torch --sheet --out build/pixelfx-preview
node .agents/skills/pixelfx/vendor/pixelfx/tools/check.mjs fire/torch
```

244개 효과 모듈을 모두 import했다. fire/torch 검사는 1 pass, 0 fail, 0 warnings였고, 60프레임 PNG 스프라이트시트와 JSON을 출력했다. contact.png를 열어 시각 확인했다. 모든 효과에 대한 품질 검사를 실행했다는 뜻은 아니다.

설치 파일의 원본 blob과 SHA-256은 ../../skill-sources.lock.json에 기록했다. 게임 src, public, VERSION, 배포 구성과 전역 Codex 설정은 변경하지 않았다.
