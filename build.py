# 야행 빌드: src/ 의 모듈을 이어 붙여 HTML 파일 하나로 만든다
#   python3 build.py          → build/yahaeng_city.html (게시본), build/preview_city.html (테스트용)
#   python3 build.py --itch   → 위 + dist/itch/yahaeng_itch.zip (index.html 하나)
# 모듈 순서 = 파일 이름 순서 (src/js/NN_이름.js, src/stages/NN_이름.js). 모듈은 한 즉시 실행 함수 안에 이어 붙으므로
# 서로의 함수·변수를 그대로 쓴다. 맨 위에서 실행되는 코드(const 초기화 등)는 앞 번호 모듈에만 기대야 한다.
import base64, glob, json, os, sys, zipfile
ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
read = lambda p: open(p, encoding='utf-8').read()

def version():
    v = read(P('VERSION')).strip() if os.path.exists(P('VERSION')) else 'dev'
    import datetime
    return v, datetime.date.today().isoformat()   # 화면에 '야행 v53 · 날짜' 로 보인다 (피드백 받을 때 판본 확인용)

def game_js():
    mods = sorted(glob.glob(P('src', 'js', '*.js')))
    return "'use strict';\n(function () {\n" + ''.join(read(m) for m in mods) + "})();\n"

def stages_js():
    return ''.join(read(m) for m in sorted(glob.glob(P('src', 'stages', '*.js'))))

CREDIT = ("건물 외관: <a href=\"https://quaternius.com/packs/downtowncitymegakit.html\" target=\"_blank\" rel=\"noopener\">Quaternius Downtown City MegaKit</a> (CC0) · "
          "배경 3D 모델: <a href=\"https://kenney.nl/assets/retro-urban-kit\" target=\"_blank\" rel=\"noopener\">Kenney Retro Urban Kit</a> · <a href=\"https://kenney.nl/assets/furniture-kit\" target=\"_blank\" rel=\"noopener\">Furniture Kit</a> (CC0) · "
          "캐릭터 3D 모델: Quaternius Animated Human (CC0, 8방향 프리렌더) · 그래픽(도시): <a href=\"https://kenney.nl/assets/rpg-urban-pack\" target=\"_blank\" rel=\"noopener\">Kenney RPG Urban Pack</a> (CC0) · ")

def build():
    html = read(P('src', 'template.html')).replace('<p class="credit">그래픽·음악', '<p class="credit">' + CREDIT + '그래픽·음악', 1)
    meta = json.load(open(P('build', 'pr', 'pr_meta.json')))
    meta['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'key.webp'), 'rb').read()).decode()
    if meta.get('faces') and os.path.exists(P('build', 'pr', 'face.webp')): meta['faces']['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'face.webp'), 'rb').read()).decode()
    for bn, bm in (meta.get('bodies') or {}).items():  # 주민 체형 변형 시트
        bm['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'body_' + bn + '.webp'), 'rb').read()).decode()
    kit = read(P('build', 'kit_mk', 'kit.json')) if os.path.exists(P('build', 'kit_mk', 'kit.json')) else 'null'
    v, h = version()
    thumbs = read(P('build', 'thumbs.json')) if os.path.exists(P('build', 'thumbs.json')) else 'null'  # 의뢰 카드 지도 미리보기 (tools/thumbs.py)
    tbg = read(P('build', 'title_bg.json')) if os.path.exists(P('build', 'title_bg.json')) else 'null'  # 첫 화면 배경 (tools/titlebg.py)
    html = html.replace('<script>window.__ASSETS__', "<script>window.__PR = " + json.dumps(meta) + "; window.__KIT = " + kit + "; window.__TITLE_BG = " + tbg + "; window.__THUMBS = " + thumbs + ";</script>\n<script>window.__ASSETS__")
    html = html.replace('__ASSETS_JSON__', read(P('build', 'assets_city.json'))).replace('__STAGES_JS__', stages_js()).replace('__GAME_JS__', game_js())
    html = html.replace('__VERSION__', v + (' · ' + h if h else ''))
    open(P('build', 'yahaeng_city.html'), 'w', encoding='utf-8').write(html)
    pre = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
    open(P('build', 'preview_city.html'), 'w', encoding='utf-8').write(pre + html)
    demo = html.replace('window.__THUMBS = ', "window.__DEMO = ['tI', 't0', 't1', 'm1', 'm2', 'm3']; window.__THUMBS = ", 1)  # itch 데모: 연습 + 의뢰 1~3
    open(P('build', 'preview_demo.html'), 'w', encoding='utf-8').write(pre + demo)
    print('ok', len(html), v, h)
    if '--itch' in sys.argv:
        os.makedirs(P('dist', 'itch'), exist_ok=True); z = P('dist', 'itch', 'yahaeng_itch.zip')
        with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as f: f.writestr('index.html', pre + demo)
        print('itch', z, os.path.getsize(z))

if __name__ == '__main__': build()
