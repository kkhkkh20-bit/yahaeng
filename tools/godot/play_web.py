#!/usr/bin/env python3
"""Real browser input walkthrough. Reads diagnostics; never mutates Godot state."""
import argparse
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright


async def play(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    mode = "mobile" if args.mobile else "pc"
    logs, steps = [], []
    async with async_playwright() as runner:
        launch = {"executable_path": os.environ.get("CHROMIUM", "/usr/bin/chromium"),
                  "headless": True, "args": ["--no-sandbox", "--enable-unsafe-swiftshader"]}
        if args.url.startswith("https:") and os.environ.get("HTTPS_PROXY"):
            launch["proxy"] = {"server": os.environ["HTTPS_PROXY"]}
        browser = await runner.chromium.launch(**launch)
        context = await browser.new_context(viewport={"width": 960 if args.mobile else 1200,
                                                      "height": 640 if args.mobile else 800},
                                            has_touch=args.mobile, is_mobile=args.mobile)
        page = await context.new_page()
        if args.fallback_gzip:
            await page.add_init_script("window.DecompressionStream = undefined")
        page.on("console", lambda m: logs.append({"type": m.type, "text": m.text[:1800]}))
        page.on("pageerror", lambda e: logs.append({"type": "pageerror", "text": str(e)}))
        await page.goto(args.url)
        await page.wait_for_function("window.yahaengGodotReady === true && !!window.yahaengGodotState", timeout=60000)
        touch = await context.new_cdp_session(page) if args.mobile else None
        touches = {}
        view_size = await page.evaluate("window.yahaengGodotState.viewport")

        async def state():
            return await page.evaluate("() => {window.yahaengGodotInspect();return window.yahaengGodotState}")

        async def contact(pointer, point=None):
            if point is None:
                if pointer not in touches:
                    return
                touches.pop(pointer, None)
                kind = "touchEnd"
            else:
                kind = "touchMove" if pointer in touches else "touchStart"
                touches[pointer] = {"id": pointer, "x": point[0]*960/view_size[0],
                                    "y": point[1]*640/view_size[1], "radiusX": 3, "radiusY": 3}
            await touch.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": list(touches.values())})

        async def button(name, hold=70):
            if not args.mobile:
                key = {"action": "e", "attack": "z", "crouch": "Control", "pause": "Escape"}[name]
                await page.keyboard.down(key)
                await page.wait_for_timeout(hold)
                await page.keyboard.up(key)
            else:
                s = await state()
                w, h = s["viewport"]
                positions = {"action": (w-207,h-100), "attack": (w-99,h-106),
                             "crouch": (w-101,h-216), "pause": (w-48,40)}
                await contact(1, positions[name])
                await page.wait_for_timeout(hold)
                await contact(1)

        async def snapshot(name):
            s = await state()
            steps.append({"name": name, "state": s})
            print(mode, name, json.dumps(s, ensure_ascii=False), flush=True)
            await page.screenshot(path=str(out/f"{mode}-{name}.png"))
            return s

        async def move(x=None, y=None):
            for axis, destination, positive, negative in [("x", x, "d", "a"), ("y", y, "s", "w")]:
                if destination is None:
                    continue
                key = None
                start = asyncio.get_running_loop().time()
                try:
                    while True:
                        s = await state()
                        delta = destination-s[axis]
                        if abs(delta) < 4:
                            break
                        assert s["hp"] > 0, "Player died"
                        assert asyncio.get_running_loop().time()-start < 12, f"Blocked {axis} → {destination}: {s}"
                        if args.mobile:
                            w, h = s["viewport"]
                            direction = 1 if delta > 0 else -1
                            magnitude = min(1, max(0.12, abs(delta)/65))
                            point = (112 + direction*55*magnitude, h-112) if axis == "x" else (112,h-112+direction*55*magnitude)
                            await contact(0, point)
                        else:
                            next_key = positive if delta > 0 else negative
                            if next_key != key:
                                if key:
                                    await page.keyboard.up(key)
                                key = next_key
                                await page.keyboard.down(key)
                        await page.wait_for_timeout(30)
                finally:
                    if args.mobile:
                        await contact(0)
                    elif key:
                        await page.keyboard.up(key)
                await page.wait_for_timeout(60)

        passed = False
        try:
            await snapshot("brief")
            s = await state()
            assert s["touch_controls"] == args.mobile
            if args.mobile:
                w, h = s["viewport"]
                await contact(0, (w/2,h/2+187))
                await contact(0)
            else:
                await page.keyboard.press("Enter")
            await page.wait_for_timeout(100)
            await button("crouch")
            await page.wait_for_timeout(60)
            assert (await state())["crouched"]
            await button("crouch")
            await move(y=600)
            await move(x=504)
            await move(y=588)
            if args.mobile:
                # Hold one neutral joystick finger and attack with the other.
                s = await state()
                await contact(0, (112,s["viewport"][1]-112))
            await button("attack",1100)
            if args.mobile:
                await contact(0)
            await page.wait_for_timeout(800)
            assert (await snapshot("target"))["target_dead"]
            await move(y=600)
            await move(x=792)
            await move(y=552)
            await button("action")
            assert (await snapshot("uniform"))["uniform"]
            await move(y=600)
            await move(x=456)
            await move(y=312)
            await move(x=744)
            await move(y=216)
            assert (await snapshot("upstairs"))["floor"] == 1
            if not args.mobile:
                await page.keyboard.down("Shift")
            await move(y=264)
            await move(x=216)
            await button("action")
            assert (await snapshot("ledger"))["ledger"]
            await move(x=744)
            await move(y=216)
            assert (await snapshot("downstairs"))["floor"] == 0
            await move(y=308)
            await move(x=456)
            await move(y=552)
            await move(x=72)
            await button("action")
            await page.wait_for_timeout(100)
            assert (await snapshot("win"))["won"]
            errors = [entry for entry in logs if entry["type"] in ["error", "pageerror"]]
            assert not errors, errors
            passed = True
        finally:
            await snapshot("last")
            (out/f"{mode}-report.json").write_text(json.dumps({"passed": passed, "url": args.url,
                "fallback_gzip": args.fallback_gzip, "steps": steps, "logs": logs}, ensure_ascii=False, indent=2))
            await browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8031/public/godot-vip/")
    parser.add_argument("--out", default="build/godot-vip/play-proof")
    parser.add_argument("--mobile", action="store_true")
    parser.add_argument("--fallback-gzip", action="store_true")
    asyncio.run(play(parser.parse_args()))
