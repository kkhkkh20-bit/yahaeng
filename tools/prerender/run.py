# 3D 인물 → 8방향 스프라이트 시트 (변형마다 한 장). 결과: /root/game/build/pr/<이름>.png, pr_meta.json
import asyncio, base64, io, json, os, subprocess, time, sys
from PIL import Image, ImageFilter
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'build', 'pr')); os.makedirs(OUT, exist_ok=True)
FR = 64
KT = [round(i / 3, 4) for i in range(10)]
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
  # 웅크려 벽에 바짝 붙기(정면·좌우 살핌) · 붙은 채 옆걸음
  ('hug', 'Idle', [0, 1, 2], 0, ('pose', 'hug')), ('hugStep', 'Idle', [0, 1, 2, 3], 0, ('pose', 'hugStep')),
  # 시체 들기(허리 숙임 → 안아 올림 → 어깨에 얹음) · 뒤에서 처치(칼 / 목 조르기: 다가섬 → 제압 → 무릎 꺾임 → 내려놓음)
  ('stoop', 'Idle', [0], 0, ('pose', 'stoop')), ('lift', 'Idle', [1, 2], 0, ('lift', 'a')), ('lifted', 'Idle', [1, 2], 0, ('lift', 'b')),
  # 핵심 자세 4개(0~3) 사이를 뼈마다 보간해 중간 프레임 2장씩 더 찍는다 (0, 1/3, 2/3, 1 … 3 = 10장)
  ('stab', 'Idle', KT, 0, ('stab', 'a')), ('stabbed', 'Idle', KT, 0, ('stab', 'b')),
  ('choke', 'Idle', KT, 0, ('choke', 'a')), ('choked', 'Idle', KT, 0, ('choke', 'b')),
  # 물건(택배 상자) 들고 걷기·서기
  ('hold', 'Walk', [i / 8 for i in range(8)], 0, ('hold', 'w')), ('holdI', 'Idle', [0], 0, ('hold', 'i')),
  # 편한 서기(팔 내리고 곧게) · 대화 손짓 — 주민과 평소의 경비 (기본 Idle 은 싸움 자세)
  ('idleC', 'Walk', [0.25, 0.25], 0, ('relax', 'i')), ('talk', 'Walk', [0.25, 0.25, 0.25, 0.25], 0, ('relax', 't')),
  ('hide', 'Idle', [i/16 for i in range(17)], 0, ('hide', 'vault')),
  ('duck', 'Idle', [i/8 for i in range(9)], 0, ('hide', 'duck')),
  ('drop', 'Idle', [i/12 for i in range(13)], 0, ('hide', 'drop')),
  ('leap', 'Idle', [i/12 for i in range(13)], 0, ('hide', 'leap')),
  ('ledgePull', 'Idle', [i/12 for i in range(13)], 0, ('hide', 'ledgePull')),
  ('openLow', 'Idle', [i/16 for i in range(17)], 0, ('access', 'low')),
  ('openHigh', 'Idle', [i/16 for i in range(17)], 0, ('access', 'high'))]
TALK = [0, 1, 0.45, 1.25]
def js_for(an, t, ti, a, hg='undefined'):
    name, clip, ts, cr = an[:4]; pr = an[4] if len(an) > 4 else None
    if pr and pr[0] == 'access': return f"renderAccessPose('{pr[1]}', {t}, {a})"
    if pr and pr[0] == 'hide': return f"renderHidePose('{pr[1]}', {t}, {a})"
    if pr and pr[0] == 'pose': return f"renderPose('{pr[1]}', {t}, {a})"
    if pr and pr[0] == 'hold': return f"renderFrame('{clip}', {t}, {a}, 0, undefined, true)"
    if pr and pr[0] == 'relax': return f"renderFrame('{clip}', {t}, {a}, 0, undefined, false, " + ('{talk: %s}' % TALK[ti] if pr[1] == 't' else '{sway: %d}' % ti) + ')'
    if pr and pr[0] in ('stab', 'choke') and t != int(t):
        k0 = int(t); return f"renderPair('{pr[0]}', '{clip}', {k0}, {a}, '{pr[1]}', {{k1: {k0 + 1}, f: {round(t - k0, 4)}}})"
    if pr: return f"renderPair('{pr[0]}', '{clip}', {t}, {a}, '{pr[1]}')"
    return f"renderFrame('{clip}', {t}, {a}, {cr}, {hg})"
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
            if os.path.exists(f'{OUT}/pr_meta.json'):  # 따로 잰 값(상자 든 손 위치)은 다시 찍어도 유지
                om = json.load(open(f'{OUT}/pr_meta.json'))
                for k in ('holdHand', 'faces'):
                    if k in om: meta[k] = om[k]
            c = 0
            for an in ANIMS: meta['anims'][an[0]] = [c, len(an[2])]; c += len(an[2])
            if '--faces' in sys.argv:  # 대사창 얼굴: 기본 체형 + 체형마다 한 장씩, 키 색으로 (게임에서 팔레트로 칠한다)
                from bodies import BODIES
                FF = 256; names = [''] + list(BODIES); sheet = Image.new('RGBA', (len(names) * FF, FF))
                await pg.evaluate(f'setTex({json.dumps(VAR["key"])})')
                for i, bn in enumerate(names):
                    await pg.evaluate(f'setBody({json.dumps(BODIES[bn]) if bn else "null"})')
                    url = await pg.evaluate(f'renderFace(0.42, {FF})'); im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
                    sheet.paste(im, (i * FF, 0))
                await pg.evaluate('setBody(null)')
                sheet.save(f'{OUT}/face.webp', 'WEBP', lossless=True, method=6)
                old = json.load(open(f'{OUT}/pr_meta.json')); old['faces'] = {'fr': FF, 'cols': {n: i for i, n in enumerate(names)}}
                json.dump(old, open(f'{OUT}/pr_meta.json', 'w')); print('faces', os.path.getsize(f'{OUT}/face.webp')); await b.close(); return
            app = [x.split('=')[1].split(',') for x in sys.argv if x.startswith('--append=')]
            if app:  # 기존 기본 시트 뒤에 동작 몇 개만 덧붙인다 (전체를 다시 찍지 않는다)
                old = json.load(open(f'{OUT}/pr_meta.json')); base = Image.open(f'{OUT}/key.png').convert('RGBA'); oc = old['cols']
                AN = [an for an in ANIMS if an[0] in app[0]]; same = lambda x: x[0] in old['anims'] and old['anims'][x[0]][1] == len(x[2]); nc = sum(len(x[2]) for x in AN if not same(x))  # 이미 있는 동작은 그 자리에 다시 찍는다
                sheet = Image.new('RGBA', ((oc + nc) * FR, 8 * FR)); sheet.paste(base, (0, 0))
                await pg.evaluate(f'setTex({json.dumps(VAR["key"])})')
                for d in range(8):
                    a = d * 3.14159265 / 4; c = oc
                    for an in AN:
                        name, clip, ts, cr = an[:4]; pr = an[4] if len(an) > 4 else None
                        if name in old['anims'] and old['anims'][name][1] == len(ts): c0, c = c, old['anims'][name][0]
                        else: c0 = None
                        for ti, t in enumerate(ts):
                            url = await pg.evaluate(js_for(an, t, ti, a))
                            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA').resize((FR, FR), Image.LANCZOS)
                            sheet.paste(outline(im), (c * FR, d * FR)); c += 1
                        if c0 is not None: c = c0
                c = oc
                for an in AN:
                    if not same(an): old['anims'][an[0]] = [c, len(an[2])]; c += len(an[2])
                old['cols'] = oc + nc; sheet.save(f'{OUT}/key.png', optimize=True); sheet.save(f'{OUT}/key.webp', 'WEBP', lossless=True, method=6)
                json.dump(old, open(f'{OUT}/pr_meta.json', 'w')); print('append', app[0], old['cols'], os.path.getsize(f'{OUT}/key.webp')); await b.close(); return
            if '--bodies' not in sys.argv:
              for vn, col in VAR.items():
                  await pg.evaluate(f'setTex({json.dumps(col)})')
                  sheet = Image.new('RGBA', (cols * FR, 8 * FR))
                  for d in range(8):
                      a = d * 3.14159265 / 4; c = 0
                      for an in ANIMS:
                          name, clip, ts, cr = an[:4]; pr = an[4] if len(an) > 4 else None
                          for ti, t in enumerate(ts):
                              hg = HANG_SWAY[ti] if name == 'hang' else 'undefined'
                              url = await pg.evaluate(js_for(an, t, ti, a, hg))
                              if name == 'hang' and d == 6 and ti == 0: hand = await pg.evaluate('window.lastHand'); meta['hangHand'] = [round(hand[0] / 2, 1), round(hand[1] / 2, 1)]
                              im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA').resize((FR, FR), Image.LANCZOS)
                              sheet.paste(outline(im), (c * FR, d * FR)); c += 1
                  sheet.save(f'{OUT}/{vn}.png', optimize=True); sheet.save(f'{OUT}/{vn}.webp', 'WEBP', lossless=True, method=6); print(vn, os.path.getsize(f'{OUT}/{vn}.png'), os.path.getsize(f'{OUT}/{vn}.webp'))
            # 주민 체형 변형 시트: 주민에게 필요한 동작만, 체형마다 한 장 (body_<이름>.webp)
            from bodies import BODIES, CIV_ANIMS, BODY_ANIMS
            only = [a.split('=')[1] for a in sys.argv if a.startswith('--only=')]; only = only[0].split(',') if only else None
            old = json.load(open(f'{OUT}/pr_meta.json')) if '--bodies' in sys.argv and os.path.exists(f'{OUT}/pr_meta.json') else None
            if old: meta = old
            meta['bodies'] = meta.get('bodies', {}) if only else {}
            await pg.evaluate(f'setTex({json.dumps(VAR["key"])})')
            for bn, spec in BODIES.items():
                if only and bn not in only: continue
                CA = [an for an in ANIMS if an[0] in BODY_ANIMS.get(bn, CIV_ANIMS)]; ccols = sum(len(a[2]) for a in CA); cmap = {}; c = 0
                for an in CA: cmap[an[0]] = [c, len(an[2])]; c += len(an[2])
                await pg.evaluate(f'setBody({json.dumps(spec)})')
                sheet = Image.new('RGBA', (ccols * FR, 8 * FR))
                for d in range(8):
                    a = d * 3.14159265 / 4; c = 0
                    for an in CA:
                        name, clip, ts, cr = an[:4]; pr = an[4] if len(an) > 4 else None
                        for ti, t in enumerate(ts):
                            url = await pg.evaluate(js_for(an, t, ti, a))
                            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA').resize((FR, FR), Image.LANCZOS)
                            sheet.paste(outline(im), (c * FR, d * FR)); c += 1
                sheet = sheet.quantize(colors=128, method=Image.FASTOCTREE).convert('RGBA')  # 128색으로 줄여 용량 1/4 (게임에서 색을 다시 칠하므로 충분)
                sheet.save(f'{OUT}/body_{bn}.webp', 'WEBP', lossless=True, method=6); meta['bodies'][bn] = {'cols': ccols, 'anims': cmap}
                print(bn, os.path.getsize(f'{OUT}/body_{bn}.webp'))
            await pg.evaluate('setBody(null)')
            json.dump(meta, open(f'{OUT}/pr_meta.json', 'w')); print(meta)
            await b.close()
    finally: srv.terminate()
if __name__ == '__main__':
    asyncio.run(main())
