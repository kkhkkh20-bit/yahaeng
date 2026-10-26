# 비교판: 건물 외관만 Quaternius Downtown City MegaKit(CC0)으로 구운 kit_mk 를 쓴다. 나머지는 build_city.py 와 같다
# 현대 도시(빌라촌) 시안 빌드: Kenney RPG Urban Pack 그림 + 빌라촌 지도 + 전깃줄 (본편 파일은 건드리지 않음)
assets = open('/root/game/build/assets_city.json').read()
js = open('/root/game/src/game.js').read()
stages = open('/root/game/src/stages_city.js').read()
html = open('/root/game/src/template.html').read()
REP = [
    ('보통부터 점호가 돈다. ', '점호는 없다. 무전기를 든 자경대원에게 들키면 그가 몇 초간 무전으로 보고한다 — 그 사이 처치하면 경보가 퍼지지 않는다. '),
    ('<li><strong>점호</strong>보통·어려움에선 일정 시간마다 점호가 돈다(10초 전 알림). 쓰러진 경비가 하나면 경계, 둘 이상이면 수색이 시작된다. 몰아서 처리하고 빨리 끝내라.</li>', '<li><strong>무전</strong>자경대원 셋 중 하나와 정예는 무전기를 든다(머리 위 무전기 표시). 들키면 그가 멈춰 서서 보고하고, 붉은 원이 다 차면 맵 전체가 경계한다. 그 전에 붙거나 다트로 처치하면 끊긴다. 무전기가 없으면 근처만 경계한다.</li><li><strong>시체 발견</strong>쓰러진 사람을 직접 보면 소리쳐 주변 대원을 부르고 수색이 시작된다. 쓰러뜨린 사람은 수거함·맨홀에 숨겨라.</li>'),
    ('픽셀 닌자 잠입 암살', '전쟁 뒤 · 서울 북쪽 빌라촌'),
    ('빛을 피하고, 소리를 죽이고, 등 뒤나 지붕 위에서 덮친다. 들키면 끝이다.', '전쟁이 끝나고 질서도 끝났다. 통조림 몇 개면 무엇이든 가져다주는 떠돌이가 있다. 그의 길은 골목이 아니라 옥상과 전깃줄이다.'),
    ("stone: '돌'", "stone: '빈 캔'"), ('돌이 없다', '빈 캔이 없다'), ('돌이 떨어진', '빈 캔이 떨어진'), ('돌·쿠나이', '빈 캔·다트'), ('돌·엽전', '빈 캔·담배'),
    ('<kbd>1</kbd>돌 ', '<kbd>1</kbd>빈 캔 '), ('<b>돌 3</b>', '<b>빈 캔 3</b>'), ('<strong>돌 · 퓨즈 상자</strong>돌로', '<strong>빈 캔 · 두꺼비집</strong>빈 캔으로'),
    ('퓨즈 상자', '두꺼비집'), ('쿠나이', '다트'), ('경비견', '들개'), ('밀서', '약품 상자'), ('궤짝', '수거함'), ('덤불', '화단'), ('우물', '맨홀'),
    ('경비가', '자경대원이'), ('경비는', '자경대원은'), ('경비를', '자경대원을'), ('경비와', '자경대원과'), ('경비에게', '자경대원에게'), ('경비의', '자경대원의'), ('경비', '자경대원'),
    ('감시병은', '망꾼은'), ('감시병이', '망꾼이'), ('감시병', '망꾼'), ('활을 든 ', ''), ('화살에', '석궁 화살에'),
    ('엽전', '담배'), ('지붕', '옥상'), ('작전', '의뢰'), ('닌자', '도둑'), ('스승', '의뢰인'),
]
def tr(s):
    for a, b in REP: s = s.replace(a, b)
    return s
CREDIT = "건물 외관: <a href=\"https://quaternius.com/packs/downtowncitymegakit.html\" target=\"_blank\" rel=\"noopener\">Quaternius Downtown City MegaKit</a> (CC0) · 배경 3D 모델: <a href=\"https://kenney.nl/assets/retro-urban-kit\" target=\"_blank\" rel=\"noopener\">Kenney Retro Urban Kit</a> · <a href=\"https://kenney.nl/assets/furniture-kit\" target=\"_blank\" rel=\"noopener\">Furniture Kit</a> (CC0) · 캐릭터 3D 모델: Quaternius Animated Human (CC0, 8방향 프리렌더) · 그래픽(도시): <a href=\"https://kenney.nl/assets/rpg-urban-pack\" target=\"_blank\" rel=\"noopener\">Kenney RPG Urban Pack</a> (CC0) · "
html = tr(html).replace('<title>야행</title>', '<title>야행 — MegaKit 비교판</title>').replace('<p class="credit">그래픽·음악', '<p class="credit">' + CREDIT + '그래픽·음악', 1)
import base64, json as _json
_meta = _json.load(open('/root/game/build/pr/pr_meta.json'))
_meta['src'] = 'data:image/webp;base64,' + base64.b64encode(open('/root/game/build/pr/key.webp', 'rb').read()).decode()
import os as _os
_kit = open('/root/game/build/kit_mk/kit.json').read() if _os.path.exists('/root/game/build/kit_mk/kit.json') else 'null'
html = html.replace('<script>window.__ASSETS__', "<script>window.__THEME = 'city'; window.__PR = " + _json.dumps(_meta) + "; window.__KIT = " + _kit + ";</script>\n<script>window.__ASSETS__")
html = html.replace('__ASSETS_JSON__', assets).replace('__STAGES_JS__', tr(stages)).replace('__GAME_JS__', tr(js))
open('/root/game/build/yahaeng_city_mk.html', 'w').write(html)
pre = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
open('/root/game/build/preview_city_mk.html', 'w').write(pre + html)
print('ok', len(html))
