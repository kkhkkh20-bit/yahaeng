# 조선풍 시안 빌드: 조선풍 그림 묶음 + 용어·문구 바꾸기 (본편 파일은 건드리지 않음)
assets = open('/root/game/build/assets_joseon.json').read()
js = open('/root/game/src/game.js').read()
stages = open('/root/game/src/stages.js').read()
html = open('/root/game/src/template.html').read()
REP = [
    ('픽셀 닌자 잠입 암살', '조선, 정유년(1777) 가을 밤'),
    ('빛을 피하고, 소리를 죽이고, 등 뒤나 지붕 위에서 덮친다. 들키면 끝이다.', '인정 종이 스물여덟 번 울리면 도성의 문이 닫힌다. 파루 서른세 번이 울리기 전까지, 지붕과 수로는 자객의 길이다.'),
    ('자정의 장원', '판서 댁의 밤'), ('안개 낀 항구', '마포 나루'), ('산중 별장', '북한산 별서'), ('등불 거리', '운종가 저잣거리'),
    ('쿠나이', '비수'), ('경비견', '사냥개'),
    ('경비가', '순라꾼이'), ('경비는', '순라꾼은'), ('경비를', '순라꾼을'), ('경비와', '순라꾼과'), ('경비에게', '순라꾼에게'), ('경비의', '순라꾼의'), ('경비', '순라꾼'),
    ('감시병은', '궁수는'), ('감시병이', '궁수가'), ('감시병', '궁수'),
    ('정예', '포교'), ('점호', '점고'), ('작전', '의뢰'), ('닌자', '자객'),
]
def tr(s):
    for a, b in REP: s = s.replace(a, b)
    return s
js = tr(js).replace("toast(STAGE.name + ' — ' + STAGE.mission, 4);", "toast('인정 — 종이 스물여덟 번 울렸다. 도성 문이 닫힌다', 3.5); toast(STAGE.name + ' — ' + STAGE.mission, 4);")
html = tr(html).replace('<title>야행</title>', '<title>야행 — 조선 시안</title>')
html = html.replace('<script>window.__ASSETS__', "<script>window.__THEME = 'joseon';</script>\n<script>window.__ASSETS__")
html = html.replace('__ASSETS_JSON__', assets).replace('__STAGES_JS__', tr(stages)).replace('__GAME_JS__', js)
open('/root/game/build/yahaeng_joseon.html', 'w').write(html)
pre = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
open('/root/game/build/preview_joseon.html', 'w').write(pre + html)
print('ok', len(html))
