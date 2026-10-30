# 야행 테스트 한 번에 돌리기:  python3 tools/run_tests.py [--quick] [--fast] [--no-build]
#   --fast: 핵심 묶음만(몇 분) · 기본: 전체(이동 전수 점검 포함, 30분 넘게) — 전체는 마일스톤 때
#   1) build.py 로 빌드  2) 도달 검사(validate)  3) 회귀 테스트(병렬, 실패한 것은 한 번 더 — 시간에 민감한 것이 있다)  4) 무작위 조작(fuzz)
#   --quick 은 fuzz 를 건너뛴다. 끝에 실패 목록을 보여 주고, 하나라도 실패하면 종료 코드 1
# 테스트는 build/preview_city.html 을 연다. 새 테스트는 tests/rev/ 에 t_*.py 로 두면 자동으로 포함된다 (오류가 나면 0 이 아닌 코드로 끝나게 쓸 것)
import asyncio, concurrent.futures as cf, glob, os, re, subprocess, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, 'build', 'test_logs'); os.makedirs(LOG, exist_ok=True)
SUITE = sorted(glob.glob(os.path.join(ROOT, 'tests', 'rev', 't_*.py')) + glob.glob(os.path.join(ROOT, 'tests', 'rev', 'r[0-9].py'))) + \
        [os.path.join(ROOT, 'tests', 'mis', f) for f in ('troutes.py', 'troutes2.py', 'tfeat2.py', 'tm1.py')]

# 빠른 묶음 (--fast): 매번 돌리는 핵심만 — 버튼·공격·세력·도시·의뢰 1·연습·구역·창문 (몇 분). 전체는 마일스톤 때만
FAST = ['t_interaction_flow', 't_disguise_ai', 't_btn4', 't_hanging_controls', 't_ko', 't_cqc', 't_fac', 't_instig', 't_rel', 't_city', 't_m1x', 't_choice', 't_change', 't_v33', 't_tut', 't_ui2', 't_zone', 'r3', 'tm1']
if '--fast' in sys.argv: SUITE = [f for f in SUITE if os.path.basename(f)[:-3] in FAST]

def run(path, timeout=400):
    name = os.path.relpath(path, ROOT); t0 = time.time()
    try: r = subprocess.run([sys.executable, os.path.basename(path)], cwd=os.path.dirname(path), capture_output=True, text=True, timeout=timeout); code, out = r.returncode, r.stdout + r.stderr
    except subprocess.TimeoutExpired as e: code, out = 124, 'TIMEOUT'
    bad = code != 0 or 'Traceback' in out or bool(re.search(r"errs'?,? \[['\"]", out))  # 페이지 오류를 출력하고 0 으로 끝난 경우도 실패
    open(os.path.join(LOG, name.replace('/', '_') + '.log'), 'w').write(out)
    return name, bad, code, time.time() - t0, out.strip().splitlines()[-1:] if out.strip() else []

async def validate():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + os.path.join(ROOT, 'build', 'preview_city.html')); await pg.wait_for_timeout(1500)
        v = await pg.evaluate('() => window.__game.validate()'); await b.close(); return v, errs

def main():
    if '--no-build' not in sys.argv: subprocess.run([sys.executable, os.path.join(ROOT, 'build.py')], check=True)
    v, errs = asyncio.run(validate()); print('도달 검사:', '통과' if not v and not errs else ('문제 ' + str(v) + str(errs)))
    fails = [] if not v and not errs else ['validate']
    with cf.ThreadPoolExecutor(4) as ex: res = list(ex.map(lambda f: run(f, 900 if 't_trav' in f else 400), SUITE))  # 이동 전수 점검은 오래 걸린다
    retry = [r[0] for r in res if r[1]]
    for name in retry:  # 병렬 실행 때 시간에 밀려 떨어진 것은 혼자 한 번 더
        r = run(os.path.join(ROOT, name), 900 if 't_trav' in name else 400); res = [r if x[0] == name else x for x in res]
    for name, bad, code, dt, tail in res: print(('실패 ' if bad else '통과 ') + f'{name} ({dt:.0f}초)' + (f' — {tail}' if bad else ''))
    fails += [r[0] for r in res if r[1]]
    if '--quick' not in sys.argv:
        r = run(os.path.join(ROOT, 'tests', 'rev', 'fuzz.py'), timeout=1200); print(('실패 ' if r[1] else '통과 ') + 'fuzz'); fails += [r[0]] if r[1] else []
    print('\n결과:', '모두 통과' if not fails else '실패 ' + ', '.join(fails), f'(로그: {os.path.relpath(LOG, ROOT)}/)')
    sys.exit(1 if fails else 0)

if __name__ == '__main__': main()
