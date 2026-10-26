# 맵 구조도: 길·건물·컨테이너·빗장·판자 다리·사다리·맨홀·출발/출구
import asyncio, sys, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
st = int(sys.argv[1]); out = sys.argv[2]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await ev(SKIP)
        d = await ev('''() => { const G = window.__game, S = G.S; const rows = []; for (let y = 0; y < 80; y++) { let r = ''; for (let x = 0; x < 90; x++) { let c; try { c = G.tileG(x, y); } catch (e) { c = undefined; } if (c === undefined) break; r += c; } if (!r) break; rows.push(r); }
          return { rows, rl: rows.map((r, y) => [...r].map((c, x) => G.rLv(x, y))), bi: rows.map((r, y) => [...r].map((c, x) => G.bldAt(x, y))), bld: G.BLD.map(b => [b.x0, b.y0, b.x1, b.y1, b.h, b.name || b.plate || '']),
            gates: S.doors.filter(d => d.gate || d.keyLock).map(d => [d.tx, d.ty, d.gate ? 'g' : d.keyLock]), lad: S.ladders.filter(l => l.kind !== 'fstair').map(l => [l.bx, l.by, l.kind]), wells: S.hides.filter(h => h.type === 'well').map(h => [h.tx, h.ty]),
            start: [Math.floor(S.player.x / 48), Math.floor(S.player.y / 48)], exit: [Math.floor(S.exit.x / 48), Math.floor(S.exit.y / 48)], planks: window.__game.S && (window.STAGE_PL || null), vents: S.vents.map(v => [v.tx, v.ty, v.roof ? 1 : 0]),
            items: S.items.map(i => [Math.floor(i.x / 48), Math.floor(i.y / 48)]), keys: (S.keyItems || []).map(i => [Math.floor(i.x / 48), Math.floor(i.y / 48)]), targets: S.guards.filter(g => g.target).map(g => [Math.floor(g.x / 48), Math.floor(g.y / 48)]) }; }''')
        await b.close()
    rows = d['rows']; H = len(rows); W = len(rows[0]); T = 16
    im = Image.new('RGB', (W * T, H * T), (20, 22, 28)); dr = ImageDraw.Draw(im)
    for y in range(H):
        for x in range(W):
            c = rows[y][x]; bi = d['bi'][y][x]; rl = d['rl'][y][x]
            col = (52, 56, 66) if c in '.=' else (64, 62, 58) if c in ',dg' else (40, 70, 44) if c in 'gBT' else (24, 24, 30)
            if c == 'g': col = (42, 66, 44)
            if c in '#': col = (16, 16, 20)
            if bi >= 0: col = (88, 92, 104) if rl else col
            if c == 'U': col = (170, 110, 50)
            if c == 'W': col = (70, 110, 200)
            if c == 'L': col = (240, 220, 80)
            if bi < 0 and rl >= 2 and c != 'U': col = (150, 105, 60)
            dr.rectangle([x * T, y * T, x * T + T - 1, y * T + T - 1], fill=col)
    for b_ in d['bld']:
        x0, y0, x1, y1, h, nm = b_; dr.rectangle([x0 * T, y0 * T, (x1 + 1) * T - 1, (y1 + 1) * T - 1], outline=(200, 200, 210), width=2)
        dr.text((x0 * T + 4, y0 * T + 3), f'{h}F', fill=(255, 255, 255))
    for x, y, k in d['gates']: dr.rectangle([x * T + 2, y * T + 2, x * T + T - 3, y * T + T - 3], fill=(230, 60, 50) if k == 'g' else (200, 60, 200))
    for x, y, k in d['lad']: dr.ellipse([x * T + 4, y * T + 4, x * T + T - 4, y * T + T - 4], outline=(255, 230, 90), width=2)
    for x, y, r in d['vents']: dr.rectangle([x * T + 4, y * T + 4, x * T + T - 4, y * T + T - 4], outline=(110, 220, 210), width=2)
    for x, y in d['items']: dr.rectangle([x * T + 3, y * T + 3, x * T + T - 3, y * T + T - 3], fill=(255, 210, 60))
    for x, y in d['keys']: dr.polygon([(x * T + T // 2, y * T + 2), (x * T + T - 2, y * T + T // 2), (x * T + T // 2, y * T + T - 2), (x * T + 2, y * T + T // 2)], fill=(255, 80, 80))
    for x, y in d['targets']: dr.ellipse([x * T + 2, y * T + 2, x * T + T - 2, y * T + T - 2], outline=(255, 40, 40), width=3)
    sx, sy = d['start']; ex, ey = d['exit']
    dr.ellipse([sx * T, sy * T, sx * T + T, sy * T + T], fill=(120, 210, 255)); dr.ellipse([ex * T, ey * T, ex * T + T, ey * T + T], outline=(255, 210, 60), width=3)
    im = im.resize((im.width * 2 // 2 * 1, im.height), Image.NEAREST)
    im.save(out); print(W, H)
asyncio.run(main())
