# v242 — streets, surfaces and close-window inspection

The warehouse street in `m4` had two solid walls extending into the carriageway. Remove those interruptions, keep boundary walls, and repair the same cells in old checkpoints. The abandoned contact office now has an opaque, one-storey roof; its authored ground layout, note, furniture and guard routes remain. The roof opens on entry like other buildings.

Long unlit building approaches receive actual wall lights with individual controls, including 27 added lamps in m4. Sources sit on real wall faces and do not add collision posts in the road. Light rays and guard perception use the existing shared occlusion rules. Turning lights off creates real darkness; it is not an exposure filter. Coverage is installed after gates and furniture are final, once per save version. Existing light states, health and mission progress survive migration.

Indoor wall faces receive light from their accessible side. Tall furniture receives it on its actual sprite alpha, including pixels projected above the opaque footprint. Ground ray polygons still stop exactly at walls. Purchased office materials now cover visible side wall faces as well as south-facing walls. Asset readiness invalidates static light caches.

At a real window or an open external door, approaching the sill fades in the connected room. Internal walls and door thresholds delimit the room; different floors and neighbouring rooms stay covered. This replaces the narrow, blurred cone and removes its second canvas and radial mask. The live, already-lit room is copied into a reused region buffer. No player light bubble is added.

Cigarettes and handheld radios share original pixel assets between world and quick slots. A cigarette pack follows a short throw arc, has one brief landing mark, and is picked up by an eligible smoker who then smokes. A radio call uses a raised-hand pose, hand-held device and short acknowledgement rather than a generic throw. Ownership, charges, cooldown, eligible responders and same-floor route checks remain.

## Validation

- Build pipeline: 8 checks; physical interaction logic: 20 groups.
- All 27 authored maps: 425 outdoor fixtures checked for wall/post support and reachable switches; legacy light-state preservation and repeat-load stability passed.
- PC and mobile street regression: continuous east-west route, both retired road walls removed, 27 added sources, brightness at the reported road point 0.927 with lamps on / 0.04 off, working switch action, old-save migration, lit wall face and furniture, no light reaching the far side of the test wall.
- PC/mobile room inspection: same room, solid partitions, one floor, distant opaque roofs, open doors only, entry and deliberate scan, existing stair and switch repair.
- Quick-item native touch: portrait, small, short, landscape and compact sizes; single use, aim cancellation and ownership. Rounded controls are checked by their actual circular geometry rather than overlapping corner rectangles.
- Native PC/mobile e2 journey with active AI: window pick, roof access, roof-stair descent, CCTV unplug, target assassination, document recovery and exit. Both finished at 3 HP, zero detections and zero recordings. Selected-stage known-map verification; this does not measure first-time human comprehension or physical iOS.

## Existing findings retained for follow-up

The old fixture-lighting sampling test passes PC but fails its mobile locker sample by 17 RGB levels on activation; the identical failure was reproduced on unchanged v241. The ordinary disguised ground route in the scripted e2 journey was detected near its enforcer; the verified alternative was the authored direct window/roof route. No general claim that every possible route is safe is made.

The protagonist's body artwork is unchanged in this release. This update addresses the reported surroundings, lighting, inspection and handheld objects; it does not represent a newly drawn full-body character.
