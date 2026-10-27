# 3D 인물 → 8방향 스프라이트 시트 (변형마다 한 장). 결과: /root/game/build/pr/<이름>.png, pr_meta.json
import asyncio, base64, io, json, os, subprocess, time, sys
from PIL import Image, ImageFilter
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = '/root/game/build/pr'; os.makedirs(OUT, exist_ok=True)
FR = 64
ANIMS = [  # 이름, 클립, 시간들, 웅크림
  ('idle', 'Idle', [0, 5], 0), ('walk', 'Walk', [i / 8 for i in range(8)], 0), ('run', 'Run', [i / 8 * 0.63 for i in range(8)], 0),
  ('sneak', 'Walk', [i / 8 for i in range(8)], 0.7), ('crouch', 'Idle', [0], 0.75),
  ('death', 'Death', [0.2, 0.7, 1.2, 1.8, 2.6, 3.45], 0), ('punch', 'Punch', [0.12, 0.3, 0.45, 0.65], 0), ('hang', 'Idle', [0, 0.5, 1.0, 1.5], 0),
  # 두 사람 자세: 어깨에 멘 사람·멘 시체 / 뒤에서 붙잡은 사람·붙잡힌 사람 (서로 가린 채 따로 찍는다)
  ('carry', 'Walk', [i / 8 for i in range(8)], 0, ('carry', 'a')), ('carryI', 'Idle', [0], 0, ('carry', 'a')),
  ('carried', 'Walk', [i / 8 for i in range(8)], 0, ('carry', 'b')), ('carriedI', 'Idle', [0], 0, ('carry', 'b')),
  ('grab', 'Walk', [i / 6 for i in range(6)], 0, ('grab', 'a')), ('grabI', 'Idle', [0], 0, ('grab', 'a')),
  ('held', 'Walk', [i / 6 for i in range(6)], 0, ('grab', 'b')), ('heldI', 'Idle', [0], 0, ('grab', 'b')),
  # 동작 포즈: 배관·벽 타기 / 창문 넘기
  ('climb', 'Idle', [0, 1, 2, 3], 0, ('pose', 'climb')), ('vault', 'Idle', [0, 1, 2], 0, ('pose', 'vault')), ('lean', 'Idle', [0, 1], 0, ('pose', 'lean')),
  # 시체 들기(허리 숙임 → 안아 올림 → 어깨에 얹음) · 뒤에서 처치(칼 / 목 조르기: 다가섬 → 제압 → 무릎 꺾임 → 내려놓음)
  ('stoop', 'Idle', [0], 0, ('pose', 'stoop')), ('lift', 'Idle', [1, 2], 0, ('lift', 'a')), ('lifted', 'Idle', [1, 2], 0, ('lift', 'b')),
  ('stab', 'Idle', [0, 1, 2, 3], 0, ('stab', 'a')), ('stabbed', 'Idle', [0, 1, 2, 3], 0, ('stab', 'b')),
  ('choke', 'Idle', [0, 1, 2, 3], 0, ('choke', 'a')), ('choked', 'Idle', [0, 1, 2, 3], 0, ('choke', 'b'))]
HANG_SWAY = [0, 0.7, 0, -0.7]
VAR = {
  'key': dict(skin='#ff0000', hair='#00ff00', shirt='#0000ff', pants='#ff00ff', eyes='#000000', shirtUp=16, shoes='#00ffff'),
}
VAR_OLD = {
  'ninja':  dict(skin='#e6b38a', hair='#141414', shirt='#17191f', pants='#1f2537'),
  'sam':    dict(skin='#ddaa80', hair='#3a2a1c', shirt='#56603c', pants='#3e3a2c'),
  'samB':   dict(skin='#c79470', hair='#1d1d1d', shirt='#2a3654', pants='#1d1f26'),
  'samR':   dict(skin='#e4b28a', hair='#0f0f0f', shirt='#121317', pants='#121317'),
  'hunter': dict(skin='#d4a078', hair='#2b1d12', shirt='#3d4a2e', pants='#5a4630'),
  'noble':  dict(skin='#efc49e', hair='#2b2b2b', shirt='#e6e2d8', pants='#3a3a44'),
  'old':    dict(skin='#e6bd9a', hair='#c4c4c4', shirt='#6a2a2a', pants='#2e2e36'),
  'doc':    dict(skin='#edc6a2', hair='#4a3a2a', shirt='#f0f0ea', pants='#8a7f6a'),
  'civ0':   dict(skin='#efbf98', hair='#6a4020', shirt='#b84a3a', pants='#3a4a6a'),
  'civ1':   dict(skin='#c48961', hair='#1a1a1a', shirt='#d6ae48', pants='#5a5040'),
  'civ2':   dict(skin='#e6b68e', hair='#2a2a2a', shirt='#3a8a8a', pants='#6a6a72'),
  'civ3':   dict(skin='#f2caa6', hair='#7a2a2a', shirt='#d27a9e', pants='#20222a'),
}
def outline(im):
    a = im.split()[3]; d = a.filter(ImageFilter.MaxFilter(3))
    ol = Image.new('RGBA', im.size, (12, 12, 18, 0)); ol.putalpha(d.point(lambda v: 170 if v > 40 else 0))
    ol.alpha_composite(im); return ol
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766'], cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']); pg = await b.new_page()
            await pg.goto('http://localhost:8766/render.html'); info = await pg.evaluate('window.__ready')
            cols = sum(len(a[2]) for a in ANIMS); meta = {'fr': FR, 'cols': cols, 'groundY': 46.8, 'anims': {}}
            c = 0
            for an in ANIMS: meta['anims'][an[0]] = [c, len(an[2])]; c += len(an[2])
            for vn, col in VAR.items():
                await pg.evaluate(f'setTex({json.dumps(col)})')
                sheet = Image.new('RGBA', (cols * FR, 8 * FR))
                for d in range(8):
                    a = d * 3.14159265 / 4; c = 0
                    for an in ANIMS:
                        name, clip, ts, cr = an[:4]; pr = an[4] if len(an) > 4 else None
                        for ti, t in enumerate(ts):
                            hg = HANG_SWAY[ti] if name == 'hang' else 'undefined'
                            url = await pg.evaluate(f"renderPose('{pr[1]}', {t}, {a})" if pr and pr[0] == 'pose' else f"renderPair('{pr[0]}', '{clip}', {t}, {a}, '{pr[1]}')" if pr else f"renderFrame('{clip}', {t}, {a}, {cr}, {hg})")
                            if name == 'hang' and d == 6 and ti == 0: hand = await pg.evaluate('window.lastHand'); meta['hangHand'] = [round(hand[0] / 2, 1), round(hand[1] / 2, 1)]
                            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA').resize((FR, FR), Image.LANCZOS)
                            sheet.paste(outline(im), (c * FR, d * FR)); c += 1
                sheet.save(f'{OUT}/{vn}.png', optimize=True); sheet.save(f'{OUT}/{vn}.webp', 'WEBP', lossless=True, method=6); print(vn, os.path.getsize(f'{OUT}/{vn}.png'), os.path.getsize(f'{OUT}/{vn}.webp'))
            json.dump(meta, open(f'{OUT}/pr_meta.json', 'w')); print(meta)
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
