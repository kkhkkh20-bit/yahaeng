# v203 — first infiltration, scarce progression, physical props

The opening now takes place in a 34 × 23 Korean freight depot. Warehouses, shuttered loading bays, a staffed dispatch booth, workshop, vehicles and loading crates give the route a purpose. The eight steps connect movement, foliage, a rear knockout, stealing that guard’s uniform, concealing the body, retrieving the dispatch document from a desk, and escaping. The first uniform permits entry into the dispatch booth; it is not a loose clothing pickup.

## Rules visible to the player

- A fresh campaign awards its first 1P after the first stage. Each non-tutorial mission’s first completion adds 1P. Stars, challenges, replays and optional practice do not create extra currency. Points may be saved for more expensive skills; purchasing stays restricted to stage preparation.
- Existing valid purchased skills survive migration. Previously unspent starting and achievement bonuses are removed. Older star totals do not silently buy abilities.
- Tap attacks knock human targets unconscious, including assassination targets. Holding for one second deliberately kills. Unconscious targets remain alive and do not satisfy a lethal objective. Finishing an unconscious target requires a held input, including from cover.
- Authored loose outfit pickups are removed throughout the campaign. Introductory clothing missions have real isolated uniform carriers while retaining the original indoor threats. Checkpoint migration removes obsolete loose clothing and adds a missing carrier once, preserving existing dead/stripped actors.
- The security lesson also requires a real knockout and three-second change of clothes, safely outside CCTV coverage. Its separate identity-check guard remains active.

## World presentation

Passive radios no longer float beside characters. A small radio sits at the belt; an access card has a small lanyard. Equipment text is available while inspecting or selecting the person. An active radio transmission retains a distinct warning/progress indicator. Key pickups are small static objects with contact shadows. Mission items use paper, terminal screens or furniture handles instead of pulsing oversized circles and cyan placeholder rectangles. Nearby/inspection corner marks preserve discoverability; existing objective guidance and interaction rules remain. Parcel props have cardboard edges, tape and a shipping label. Warehouses have metal shutters and Korean industrial signage.

## Validation and evidence

`tests/rev/t_progression_v203.py` covers scarce currency, bankable preparation, purchased-build migration, tap/held human-target intent, release cancellation, concealed finishing, uniform source/checkpoint migration and first-stage layout. Existing combat, skill, lesson, campaign and layout checks retain their mechanical assertions; fixtures now explicitly own skills instead of relying on the removed star-based grant.

Native keyboard and CDP touch walkthroughs navigate the live game. They read coordinates for navigation but do not move actors, grant inventory, reset detection or increase health. The fresh first-stage journey includes a premature light-switch detour, stealing the guard’s clothes, hiding the body, desk recovery, escape, first reward preparation, a tap-only unconscious mission target, deliberate finishing, and an earned dart used in optional practice. Later journeys cover legal disguised passage, CCTV work/retry, upstairs missions and VIP objectives. Selected advanced-build fixtures explicitly seed previous completed missions before buying their tested skills; these are not claimed as fresh-profile journeys.

GitHub Actions `Physical interaction verification` runs browser regression plus separate PC/mobile live journeys. Its artifacts contain `build/test_logs`, `build/linear-v198` and the new progression checks. The package-saving step commits only the build generated from the verified source; public deployment verification checks the resulting hashed scripts on both hosts.

`tools/capture_progression_v203.py` provides controlled before/after render captures against separate local baseline/current servers. It repositions the camera and, for equipment close-ups, the player; these captures are visual comparisons, not gameplay completion evidence. Live-play evidence is recorded separately. Automated journeys establish that routes can be completed; they do not substitute for a first-time human usability study.

The first CI PC run reached the VIP uniform carrier but its clothing action was interrupted by an approaching patrol. A prepared native replay confirmed actual damage and displacement rather than a missing outfit. One staggered crate now screens the uniform bay from the western patrol, preserving both patrol routes and the existing player approach. The VIP walkthrough also observes nearby unblocked sight lines before its knockout and three-second clothing change. The depot sign text is constrained to its plate width. No guard, damage or interruption rule is relaxed.

The upstairs VIP walkthrough uses its observed rear opening to knock the cipher keeper unconscious before taking the document and returning past the patrol. It verifies that a prepared build receives exactly 1P after the first VIP clear and buys a single one-point skill, replacing the obsolete four-point reward fixture.
