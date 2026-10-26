# 네온·스티커 시험판 빌드: 조선 소재 + 네온 색 + 스티커 테두리 (본편 파일은 건드리지 않음)
import importlib.util
spec = importlib.util.spec_from_file_location('bj', '/root/game/build_joseon.py')
src = open('/root/game/build_joseon.py').read()
src = src.replace("/root/game/build/assets_joseon.json", "/root/game/build/assets_neo.json").replace("window.__THEME = 'joseon';", "window.__THEME = 'neo';")
src = src.replace("'<title>야행 — 조선 시안</title>'", "'<title>야행 — 네온 시안</title>'").replace("yahaeng_joseon.html", "yahaeng_neo.html").replace("preview_joseon.html", "preview_neo.html")
src = src.replace("('픽셀 닌자 잠입 암살', '조선, 정유년(1777) 가을 밤')", "('픽셀 닌자 잠입 암살', 'NEO 漢陽 · 1777 · 인정 이후')")
NEO_CSS = '''<style>
:root { --blood: #ff2e88; --blood-hi: #ff5fa8; --lamp: #2ef2ff; --moss: #7dffb0; --night: #0d0820; --night-2: #160c30; --ink-line: #3b2a66; --paper: #f4efff; --paper-dim: #b6a8d8; }
body { background: #0d0820; }
.chip, .obj, .toast, .sysbtns button, .tools, .keys { font-family: Galmuri, var(--f-body) !important; background: rgba(18, 8, 44, .82) !important; }
.chip, .sysbtns button { border: 1px solid #3b2a66; }
.toast { border-bottom-color: #ff2e88 !important; box-shadow: 0 0 0 1px rgba(46, 242, 255, .25); }
.obj { border-left-color: #2ef2ff !important; }
h1 { color: #fff; text-shadow: 0 0 6px #ff2e88, 0 0 18px #ff2e88, 3px 3px 0 #2ef2ff; }
h1 span { color: #2ef2ff; text-shadow: 0 0 10px #2ef2ff; }
.eyebrow { color: #2ef2ff !important; font-family: Galmuri, var(--f-body); letter-spacing: .3em; }
.stage { border: 2px solid #3b2a66 !important; box-shadow: 4px 4px 0 #ff2e88; background: #160c30 !important; }
.stage:hover { box-shadow: 4px 4px 0 #2ef2ff; }
.pad > button { border-color: #2ef2ff !important; box-shadow: 0 0 10px rgba(46, 242, 255, .35); }
.pad #btnAct.kill { background: #ff2e88 !important; }
.tools .tool.on { background: #2ef2ff !important; color: #0d0820 !important; }
.dlg-box { border-image: none !important; border: 2px solid #2ef2ff !important; background: #160c30; color: #f4efff !important; box-shadow: 5px 5px 0 #ff2e88; padding: 8px 12px !important; }
.dlg-box b { background: #ff2e88 !important; color: #0d0820 !important; }
.dlg-box small { color: #8fe9ff !important; }
.dlg-face { background-image: none !important; border: 2px solid #ff2e88; background: #0d0820; box-shadow: 4px 4px 0 #2ef2ff; }
</style>'''
src = src.replace("open('/root/game/build/yahaeng_neo.html', 'w').write(html)", "html = html.replace('<canvas id=\"game\"', NEO_CSS + '\\n<canvas id=\"game\"', 1)\nopen('/root/game/build/yahaeng_neo.html', 'w').write(html)")
exec(compile(src, 'build_neo', 'exec'), {'NEO_CSS': NEO_CSS})
