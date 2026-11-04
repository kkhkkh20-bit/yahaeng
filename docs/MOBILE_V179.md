# v179 — iPhone release viewport

The reported iPhone in-app Safari screenshot showed the opening briefing as a
scaled desktop page. The production template had neither a doctype nor a mobile
viewport. Only the development preview received a wrapper with those settings.
Previous tests that used `has_touch=True` without `is_mobile=True` also missed
the browser's mobile layout viewport behavior.

The template now owns one complete Korean HTML document, standards mode and
`width=device-width, initial-scale=1, viewport-fit=cover`. Release and preview
use identical document bytes. Optional exports insert their scripts into that
document instead of wrapping it again. Zoom remains available.

Before: Chromium iPhone 13 emulation at 390×664 used a 980px layout viewport,
scale 0.398 and BackCompat. After: 390px, scale 1 and CSS1Compat. The briefing
scrolls vertically; its departure button remains at least 44 CSS pixels tall.

Validation:

- `tests/integration/test_build_pipeline.py`: eight checks, including the real
  template, preview, release and packaged HTML document/viewport contract.
- `tests/tutorial/mobile_release_walk.py`: packaged output in Chromium and
  WebKit at 390×664, 375×568, 390×600 and 844×390. Trusted taps enter the briefing,
  depart, toggle crouch, pause and resume after rotation. Visible action controls
  stay within the viewport and do not overlap. Chromium additionally sends
  native CDP joystick touch events and verifies player displacement.
- `tests/tutorial/first_steps_live.py`: first two lessons completed with normal
  browser time and keyboard/native touch input on desktop and mobile, including
  movement, concealment, knockout and body storage.
- `tests/tutorial/verify_deployment.py` now enables actual mobile emulation and
  rejects a release whose layout viewport expands beyond device width.

These are browser/device emulation checks, not physical iPhone testing. WebKit
button taps are trusted browser input; its joystick drag is not claimed tested.
Maps, game rules and the original 2D engine are unchanged.
