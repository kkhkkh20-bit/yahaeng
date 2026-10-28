import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('troutes.py').read().split('H = """')[1].split('"""')[0]
async def run(pg, st, steps, fresh=True):
    if fresh:
        await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(250); await pg.evaluate(SKIP); await pg.evaluate(H)
    out = []
    for s in steps:
        if s.startswith('WAIT'): await pg.wait_for_timeout(int(s[4:])); continue
        out.append(await pg.evaluate('() => { ' + s + ' }')); await pg.wait_for_timeout(60)
    return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 800}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        names = await pg.evaluate("() => window.__game.STAGES ? 1 : 0")
        # m2 (index 1): 엿듣기 — 야시장에서 쉬는 조직원 둘 옆에 서 있기 (금고 비번)
        print('M2 intel', await run(pg, 1, [
          "const S = T.S(); const a = S.guards[9], b = S.guards[10]; T.at(16, 8); return [a.state, b.state, Math.round(a.x/48), Math.round(a.y/48)];",
          "WAIT9000", "return [T.S().learned, Object.keys(T.S().player.keys), T.S().guards[9].say || T.S().guards[10].say];",
          "T.freeze(); T.at(5, 9); return T.act();"]))
        # m2: 간판 사고 — 표적이 클럽 앞에 나올 때
        print('M2 drop', await run(pg, 1, [
          "const S = T.S(), t = S.guards[0]; t.x = 27.5*48; t.y = 15.5*48; t.route = [{ x: t.x, y: t.y, pause: 999 }]; t.ri = 0; t.wait = 99; t.path = null; T.at(27, 12, 0, 2); return T.act();",
          "T.G().actPrimary(); T.at(1, 26); return 1;", "WAIT400",
          "const S = T.S(); return [S.guards[0].state, S.corpses.map(c => c.accident), S.alevel];",
          "WAIT6000", "const S = T.S(); return [S.alevel, S.corpses.map(c => c.discovered), S.guards.filter(g => g.state === 'SEARCH').length];"]))
        # m4 (index 4): 변장 — 경비 쓰러뜨리고 옷 갈아입기
        print('M5 disguise', await run(pg, 2, [
          "const S = T.S(), g = S.guards[5]; const P = S.player; P.x = g.x - Math.cos(g.a) * 34; P.y = g.y - Math.sin(g.a) * 34; P.a = g.a; return T.act();",
          "T.G().actPrimary(); return 1;", "WAIT300",
          "return T.G().secondaryAction().label;",
          "T.G().actCarry(); return [T.S().player.disguise, T.S().player.disguiseBlown];",
          # 길가 경비 앞을 걸어서 지나가기 (8칸 거리)
          "T.at(21, 14); T.S().player.a = 0; return 1;", "WAIT3000",
          "const S = T.S(); return [S.alevel, Math.max(...S.guards.filter(g => !g.civ).map(g => g.meter)).toFixed(2), S.player.disguiseBlown];",
          "T.at(16, 13); return 1;", "WAIT3000",
          "const S = T.S(); return ['near elite', S.alevel, S.player.disguiseBlown, S.guards[4].state];"]))
        # m3 (index 3): 감전
        print('M3 shock', await run(pg, 3, [
          "const S = T.S(), t = S.guards[0]; t.x = 21.5*48; t.y = 23.5*48; t.route = [{ x: t.x, y: t.y, pause: 999 }]; t.ri = 0; t.wait = 99; t.path = null; T.at(36, 25); return T.act();",
          "T.G().actPrimary(); return 1;", "WAIT300",
          "const S = T.S(); return [S.guards[0].state, S.corpses.map(c => c.accident)];"]))
        # 교대 (m4 index 4)
        print('M4 shift', await run(pg, 4, [
          "const S = T.S(); S.shiftT = 0.1; return S.guards.length;", "WAIT600", "return T.S().guards.length;"]))
        # 경비 클릭 주시
        print('mark', await run(pg, 0, [
          "const S = T.S(), g = S.guards[0]; T.at(Math.floor(g.x/48) - 2, Math.floor(g.y/48)); return 1;", "WAIT800",
          "const S = T.S(), g = S.guards[0], c = document.getElementById('game').getBoundingClientRect(), G = T.G(); const cam = { x: S.player.x, y: S.player.y }; return [g.x, g.y];"]))
        print(errs[:4]); await b.close()
asyncio.run(main())
