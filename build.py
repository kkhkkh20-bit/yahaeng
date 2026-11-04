# 야행 빌드: src/ 의 모듈을 이어 붙여 HTML 파일 하나로 만든다
#   python3 build.py          → build/yahaeng_city.html (게시본), build/preview_city.html (테스트용)
#   python3 build.py --itch   → 위 + dist/itch/yahaeng_itch.zip (index.html 하나)
# 런타임 순서 = src/modules.json. 의뢰 데이터는 src/stages/NN_이름.js 순서. 모듈은 한 즉시 실행 함수 안에 이어 붙으므로
# 서로의 함수·변수를 그대로 쓴다. 맨 위에서 실행되는 코드(const 초기화 등)는 앞 번호 모듈에만 기대야 한다.
import base64, glob, json, os, sys, zipfile
from tools.buildlib.modules import bundle_game
from tools.buildlib.assets import campaign_assets
ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
read = lambda p: open(p, encoding='utf-8').read()

def version():
    v = read(P('VERSION')).strip() if os.path.exists(P('VERSION')) else 'dev'
    import datetime
    return v, datetime.date.today().isoformat()   # 화면에 '야행 v53 · 날짜' 로 보인다 (피드백 받을 때 판본 확인용)

def game_js():
    return bundle_game(ROOT)

def stages_js():
    return ''.join(read(m) for m in sorted(glob.glob(P('src', 'stages', '*.js'))))

CREDIT = ("HUD 아이콘: <a href=\"https://game-icons.net/\" target=\"_blank\" rel=\"noopener\">Lorc · Delapouite / Game-icons.net</a> (CC BY 3.0, 단색 적용) · "
          "효과: <a href=\"https://github.com/patch-gg/pixelfx\" target=\"_blank\" rel=\"noopener\">PixelFX · Patch / Hugo Duprez</a> (MIT) · "
          "건물 외관: <a href=\"https://quaternius.com/packs/downtowncitymegakit.html\" target=\"_blank\" rel=\"noopener\">Quaternius Downtown City MegaKit</a> (CC0) · "
          "배경 3D 모델: <a href=\"https://kenney.nl/assets/retro-urban-kit\" target=\"_blank\" rel=\"noopener\">Kenney Retro Urban Kit</a> · <a href=\"https://kenney.nl/assets/furniture-kit\" target=\"_blank\" rel=\"noopener\">Furniture Kit</a> (CC0) · "
          "캐릭터 3D 모델: <a href=\"https://quaternius.com/packs/ultimatemodularwomen.html\" target=\"_blank\" rel=\"noopener\">Quaternius Ultimate Modular Women</a> · <a href=\"https://quaternius.com/packs/ultimatemodularcharacters.html\" target=\"_blank\" rel=\"noopener\">Ultimate Modular Characters</a> (CC0, 8방향 프리렌더) · 그래픽(도시): <a href=\"https://kenney.nl/assets/rpg-urban-pack\" target=\"_blank\" rel=\"noopener\">Kenney RPG Urban Pack</a> (CC0) · ")

def syntax_check(js):
    # 줄 중간에 끼운 // 주석이 뒤 코드를 삼키는 실수가 잦다 — 게시 전에 node 로 문법부터 확인한다 (node 가 없으면 건너뜀)
    import shutil, subprocess, tempfile
    if not shutil.which('node'): return
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(js); tmp = f.name
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if r.returncode: print('문법 오류:\n' + r.stderr[-800:]); sys.exit(1)

def comment_lint():
    # 줄 끝 // 주석 안에 코드처럼 보이는 것(키: 값, 키: 값, … / const / return / => / );)이 있으면 경고 — 주석이 뒤 코드를 삼킨 흔적일 수 있다
    import re
    pat = re.compile(r"(\b\w+: [^,;]{1,40}, ){2,}\w+:|\bconst \w+ =|\breturn \w|=> \{|\); \w")
    for f in sorted(glob.glob(P('src', 'js', '**', '*.js'), recursive=True) + glob.glob(P('src', 'stages', '*.js'))):
        for i, line in enumerate(open(f, encoding='utf-8'), 1):
            s = re.sub(r"'(\\.|[^'\\])*'|\"(\\.|[^\"\\])*\"|`(\\.|[^`\\])*`", "''", line)
            k = s.find('//')
            if k > 0 and s[:k].strip() and pat.search(s[k:]): print('주석 확인:', os.path.relpath(f, ROOT) + ':' + str(i), s[k:k + 90].strip())

def build():
    script = game_js()
    syntax_check(script); comment_lint()
    html = read(P('src', 'template.html')).replace('<p class="credit">그래픽·음악', '<p class="credit">' + CREDIT + '그래픽·음악', 1)
    title_font = base64.b64encode(open(P('src', 'fonts', 'title-blackhansans.ttf'), 'rb').read()).decode()
    html = html.replace('__TITLE_FONT__', title_font)
    html = html.replace('__TITLE_FONT_LICENSE__', read(P('src', 'fonts', 'OFL-BlackHanSans.txt')))
    menu_art = base64.b64encode(open(P('src', 'art', 'title-poster.webp'), 'rb').read()).decode()
    html = html.replace('__MENU_ART__', menu_art)
    html = html.replace('__INK_STUDY_CSS__', read(P('src', 'ink-study.css')))
    icons=':root{'+''.join('--art-'+os.path.basename(f)[:-4]+':url(data:image/svg+xml;base64,'+base64.b64encode(open(f,'rb').read()).decode()+');' for f in sorted(glob.glob(P('src','art','hud','**','*.svg'),recursive=True)))+'}'
    html = html.replace('__HUD_CSS__', icons+read(P('src', 'hud.css')))
    html = html.replace('__INTERFACE_CSS__', read(P('src','interface.css')))
    html = html.replace('__UI_FONT__', base64.b64encode(open(P('src','fonts','ui-regular.woff2'),'rb').read()).decode())
    html = html.replace('__UI_FONT_LICENSE__','\n'.join(line.rstrip()for line in read(P('src','fonts','OFL-IBMPlexSansKR.txt')).splitlines()))
    ink_map=base64.b64encode(open(P('src','art','ink-vip-map.webp'),'rb').read()).decode()
    html=html.replace('<script>window.__ASSETS__','<script>window.__INK_VIP_MAP__ = '+json.dumps('data:image/webp;base64,'+ink_map)+';</script>\n<script>window.__ASSETS__')
    quarter = json.load(open(P('src','art','quarter','meta.json')))
    for key, item in quarter.items():
        item['src']='data:image/webp;base64,'+base64.b64encode(open(P('src','art','quarter',key+'.webp'),'rb').read()).decode()
    html=html.replace('<script>window.__ASSETS__','<script>window.__QUARTER__ = '+json.dumps(quarter)+';</script>\n<script>window.__ASSETS__')
    meta = json.load(open(P('build', 'pr', 'pr_meta.json')))
    meta['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'key.webp'), 'rb').read()).decode()
    if meta.get('faces') and os.path.exists(P('build', 'pr', 'face.webp')): meta['faces']['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'face.webp'), 'rb').read()).decode()
    for bn, bm in (meta.get('bodies') or {}).items():  # 주민 체형 변형 시트
        bm['src'] = 'data:image/webp;base64,' + base64.b64encode(open(P('build', 'pr', 'body_' + bn + '.webp'), 'rb').read()).decode()
    kit = read(P('build', 'kit_mk', 'kit.json')) if os.path.exists(P('build', 'kit_mk', 'kit.json')) else 'null'
    v, h = version()
    thumbs = read(P('build', 'thumbs.json')) if os.path.exists(P('build', 'thumbs.json')) else 'null'  # 의뢰 카드 지도 미리보기 (tools/thumbs.py)
    tbg = read(P('build', 'title_bg.json')) if os.path.exists(P('build', 'title_bg.json')) else 'null'  # 첫 화면 배경 (tools/titlebg.py)
    html = html.replace('<script>window.__ASSETS__', "<script>window.__BUILD_VERSION__ = " + json.dumps(v) + "; window.__PR = " + json.dumps(meta) + "; window.__KIT = " + kit + "; window.__TITLE_BG = " + tbg + "; window.__THUMBS = " + thumbs + ";</script>\n<script>window.__ASSETS__")
    hud_art={os.path.basename(f)[:-4]:read(f) for f in sorted(glob.glob(P('src','art','hud','*.svg')))}
    html=html.replace('<script>window.__BUILD_VERSION__','<script>window.__HUD_ART__='+json.dumps(hud_art)+';window.__BUILD_VERSION__',1)
    html = html.replace('__ASSETS_JSON__', campaign_assets(ROOT)).replace('__STAGES_JS__', stages_js()).replace('__GAME_JS__', script)
    html = html.replace('__VERSION__', v + (' · ' + h if h else ''))
    open(P('build', 'yahaeng_city.html'), 'w', encoding='utf-8').write(html)
    # Preview the exact same complete document that is packaged for release.
    # A preview-only viewport used to hide the iPhone release's 980px layout bug.
    open(P('build', 'preview_city.html'), 'w', encoding='utf-8').write(html)
    demo = html.replace('window.__THUMBS = ', "window.__DEMO = 'all'; window.__THUMBS = ", 1)  # itch 데모: 연습 + 의뢰 전부 (도시 시제품만 뺀다)
    open(P('build', 'preview_demo.html'), 'w', encoding='utf-8').write(demo)
    for edition in (['club-study'] if '--club' in sys.argv else []) + (['episode-one'] if '--episode' in sys.argv else []):
        flags='window.__CLUB_STUDY__=true;'+('window.__EPISODE_ONE__=true;' if edition=='episode-one' else '')
        study=html.replace('<script>window.__ASSETS__','<script>'+flags+'</script><script>window.__ASSETS__',1)
        study=study.replace('<script>window.__BUILD_VERSION__','<script>window.__INK_FORCE__=true;</script><script>window.__BUILD_VERSION__',1)
        head='<script type="importmap">{"imports":{"three":"./lib/three.module.min.js","three/addons/":"./lib/addons/"}}</script>'
        folder=P('build',edition);os.makedirs(folder,exist_ok=True)
        import shutil
        shutil.copytree(P('src','club-study'),folder,dirs_exist_ok=True)
        # Version the first-party import graph so returning testers do not mix old
        # cached actors/world modules with a new HTML build. Vendored Three stays pinned.
        import re, hashlib
        asset_rev=v+'-'+hashlib.sha256(''.join(read(p) for p in sorted(glob.glob(P('src','club-study','*.js')))).encode()).hexdigest()[:12]
        for path in glob.glob(os.path.join(folder,'*.js')):
            code=read(path)
            code=re.sub(r"(from\s+['\"])(\./[^'\"]+\.js)(['\"])",lambda m:m[1]+m[2]+'?v='+asset_rev+m[3],code)
            open(path,'w',encoding='utf-8').write(code)
        study=study.replace('</head>',head+'</head>',1).replace('</body>','<script type="module" src="./view.js?v='+asset_rev+'"></script></body>',1)
        open(os.path.join(folder,'index.html'),'w',encoding='utf-8').write(study)
    print('ok', len(html), v, h)
    if '--cloudflare' in sys.argv:
        # Regular 2D campaign only. The dedicated art-slice flag/modules are absent.
        folder=P('dist','cloudflare-2d');os.makedirs(folder,exist_ok=True)
        payload=html.replace('<head>','<head><script>window.__INK_FORCE__=true;</script>',1)
        files={'index.html':payload,'_headers':'/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n',
               'version.json':json.dumps({'version':v,'build_date':h,'edition':'2d-campaign'},ensure_ascii=False)+'\n'}
        for name,data in files.items():
            if len(data.encode('utf-8'))>25*1024*1024:raise ValueError('Cloudflare Pages file exceeds 25 MiB: '+name)
            open(os.path.join(folder,name),'w',encoding='utf-8').write(data)
        archive=P('dist','yahaeng-2d-cloudflare.zip')
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for name in files:z.write(os.path.join(folder,name),name)
        print('cloudflare',archive,os.path.getsize(archive))
    if '--itch' in sys.argv:
        os.makedirs(P('dist', 'itch'), exist_ok=True); z = P('dist', 'itch', 'yahaeng_itch.zip')
        with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as f: f.writestr('index.html', demo)
        print('itch', z, os.path.getsize(z))

if __name__ == '__main__': build()
