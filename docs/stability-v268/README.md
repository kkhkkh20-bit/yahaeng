# v268 runtime stabilization

The free-city worst case was measured in headless system Chromium, a 390×844 touch viewport, DPR 1, on this development machine. Both builds use the same seeded random generator. The map is 280×227 tiles with 179 buildings and 449 actors. Each measurement starts three seconds after the scene is running and samples eight seconds with CDP CPU profiling enabled. These are browser measurements, not physical iPhone frame rates; asynchronous asset/idle scheduling still differs between runs.

| Metric | Before | After |
|---|---:|---:|
| Render median | 8.7 ms | 5.7 ms |
| Render p95 | 14.9 ms | 10.9 ms |
| Update median | 4.4 ms | 3.8 ms |
| Update p95 | 10.7 ms | 7.3 ms |
| Canvas readback calls | 5,979 | 17 |
| Readback pixels | 32,352,999 | 8,585,216 |
| Observed render frames in sample | 389 | 455 |
| Scene entry | 4.49 s | 5.22 s |
| Longest render | 101.3 ms | 80.8 ms |

The consistent improvement is steady rendering cost (34% lower median), not scene entry or the elimination of every cold-asset spike. Longest-frame samples remain affected by first-use sprite preparation. No physical-device 60 fps guarantee is implied.

Changes:

- Empty police gear, bicycles, parcel, cuffs and damage-feedback passes no longer allocate/read a pixel canvas. Active art uses the same rasterization.
- Indoor fixtures are partitioned by floor and culled before art/room checks. Rebuilding room circuits invalidates the index.
- Furniture masking queries nearby buckets, preserving original floor/bounds/seat checks and canvas state. No collision geometry changed.
- Offscreen dealer price labels avoid font/context setup.
- Source sprite classification and recolouring reuse one immutable decoded chunk, avoiding duplicate readback without retaining full source atlases.
- Camera HUD layout reads run at most once per 100 ms; viewport/stage changes invalidate immediately.
- Map eviction preserves visible chunks and prefetch cannot replace a displayed chunk. Wide driving views get their necessary visible working set; the cache returns to its walking allowance after eviction. Roof access updates actual LRU order.

Validation:

- Runtime cache regression: 90 stationary wide-view frames without a new bake, a second driving view settles, prefetch respects visibility, cache shrinks, recent roof survives eviction.
- 2,470 furniture boundary/floor cases; inactive and active pixel feedback.
- Eight build/package checks and 20 physical interaction groups, including low-frame collision substeps.
- Surface lighting and fixture lighting on desktop/touch, including walls, raised furniture, torch rotation and opened/closed doors.
- Desktop/touch tap/hold combat and six touch viewport layouts.
- Actual Free Mode button entry, a wedged vehicle recovering and reversing, 60 seconds of traffic contacts, and sprite source ownership/retry checks.

Reproduce the cache regressions with `node tests/integration/runtime_stability.cjs`; it is also included in `tools/run_tests.py`.
