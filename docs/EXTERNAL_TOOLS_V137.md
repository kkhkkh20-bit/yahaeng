# 승인한 외부 도구 설치·사용 기록

사용자의 “외부 설치파일도 추천안대로 사용해줘” 승인에 따라 앞서 제안한 두 도구만 프로젝트 안에 설치했다. 처음 제시된 나머지 저장소는 설치하지 않았다.

| 도구 | 고정한 원본 | 설치·사용 범위 |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable/tree/e89e3ada3e875a89ac2c5d33d11e65ebef6fe285) | `e89e3ada3e875a89ac2c5d33d11e65ebef6fe285` | `.agents/skills/impeccable/`, Apache 2.0 라이선스. 기존 UI의 창문·문구·온보딩 검수, context와 실제 CDP 브라우저 detect 실행. |
| [Ponytail REVIEW](https://github.com/DietrichGebert/ponytail/tree/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846) | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` | `.agents/skills/ponytail-review/`, MIT 라이선스. REVIEW 지침으로 AI의 호출부·상태 변경·회귀 검사를 읽고 검수. 상시 Ponytail 플러그인은 설치하지 않음. |

두 도구의 `agents/openai.yaml`은 `allow_implicit_invocation: false`로 설정했다. 자동 훅·전역 설정·루트 AGENTS.md는 추가하지 않았다. Impeccable에 포함된 에이전트 설정은 원본 자료로 보관했으며 전역 등록하거나 실행하지 않았다. 라이선스·원본 Git blob·설치 파일 SHA-256은 [고정 목록](../.agents/skill-sources.lock.json)에 기록했다. 총 68개 프로젝트 파일 중 목록 자체를 뺀 67개 파일의 해시를 다시 확인했다.

Impeccable 스크립트가 사용하는 Linux x64 엔진 0.1.18을 다운로드해 실행했다. 실행 파일은 저장소 밖 `~/.impeccable/bin/0.1.18/impeccable`에 있고 게임 배포물에는 포함되지 않는다.

- 다운로드: https://github.com/pbakaus/impeccable/releases/download/engine-v0.1.18/impeccable-linux-x64
- 크기: 21,984,304바이트
- 확인한 SHA-256: `736ed785e74ae2344d3036127f614ddde5ab520a527d8bc82a891612ef71f648`
- 실행: `context --target src/js/70_render.js`와 브라우저 `detect`. 제품 초기화나 일괄 자동 수정은 하지 않았다.
- 첫 검사의 `#btnSneak > small` 9px 경고를 11px로 수정했고 동일 화면의 재검사는 빈 결과였다. [수정 전 결과](refinement-v137/impeccable-before.json) · [수정 후 결과](refinement-v137/impeccable-detect.json).

재현용 선택 검사는 `tests/tutorial/audit_ui.py`다. 로컬 HTTP 서버, Playwright/Chromium, 설치한 엔진이 필요하다. 일반 게임 실행이나 플레이어의 브라우저에는 도구가 필요하지 않다.
