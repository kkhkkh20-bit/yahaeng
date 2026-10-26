# 템플릿 + 게임 코드 + 에셋 데이터를 한 장의 HTML로 합치는 스크립트
import json
assets = open('/root/game/build/assets.json').read()
js = open('/root/game/src/game.js').read()
stages = open('/root/game/src/stages.js').read()
html = open('/root/game/src/template.html').read()
html = html.replace('__ASSETS_JSON__', assets).replace('__STAGES_JS__', stages).replace('__GAME_JS__', js)
open('/root/game/build/yahaeng.html', 'w').write(html)
print('ok', len(html))
