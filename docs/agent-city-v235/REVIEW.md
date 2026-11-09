# v235 — Female-agent / purchased-city playable study

Open `?study=agent-city`. The title button starts **야간 인계**, an isolated short contract. Without the query, the original nine-episode linear campaign and heroine remain unchanged.

The study contains eight narrower 5–8 storey buildings, street-level shop bays, actual interiors and stairs, a walkable level-five roof bridge, and eight moving traffic vehicles. The authoring changes building composition rather than copying the purchased pack's demonstration map. Main architectural surfaces, casements, shop pictures, coping, roof mechanics, bridge railings and deck come from the purchased GuttyKreum assets. The old rounded procedural vehicle bodies use licensed Kenney pixel sprites in this district. Doors and window apertures still follow the physical world. Sign bays deliberately replace solid wall/window cells and never cover an actual entrance.

The female suit study uses the existing CC0 Quaternius modular-woman rig, with the full suit outfit, a broader jacket silhouette, flat cloth shading and a reduced sprite palette. It is a **rendered asset-based comparison**, not a newly purchased Rancic sprite sheet or a hand-pixelled character pack. It retains eight directions, locomotion, paired takedowns and action contact anchors. Its identity stays with the existing heroine when wearing a stolen uniform. Existing character sheets/animation metadata were preserved; new sheets are separate.

The prototype intentionally uses a short familiar mission: incapacitate the alley guard, take the uniform, hide the body, enter the second floor, kill the accountant, recover his desk record and escape. This is an art/composition test, not a new full campaign episode. It has separate progress, skill, case-file, feedback and checkpoint storage, so trying it cannot overwrite campaign records. The retry link preserves the study query.

## Verification

- Native keyboard and CDP touch play, normal RAF, active AI, no actor/health/clock/progress overrides: both completed the contract with **3 HP, 1 KO, 1 disguise, 1 hidden body, 1 target kill, 0 detections, 0 alarms**. Native observations are in `native-pc.json` / `native-mobile.json`; route planning was read-only. These are known-map review runs, not novice-usability tests.
- Native bridge tests on PC and touch: explicit starting roof-position fixture, then real input, active AI/time. Crossed west→east→west and walked into the real stair-house doorway to descend to floor 5. The route tests do not claim a full roof-route mission completion from the ground.
- `t_agent_city_study.py`: 5,408 nonempty sprite frames, 136 climbing contact samples, both physical bridge joins and a nine-cell crossing route, 42 interior stair flights, eight moving vehicles, no actors inside furniture, target-room reachability, campaign storage unchanged after checkpoint/completion, normal route/hero unchanged.
- `t_hero_fluid_motion.py`: existing 27,928 dense frames, 25 actor/victim paired frames and movement/contact invariants passed on PC/touch.
- Build-pipeline integration: 8 checks passed. The packaged source hash matches the built document.
- While playing, a target overlapping an automatically placed desk was found and corrected. Repeated office desks were removed from the study's executive floor to provide a reachable rear approach. Window slots that had looked like doors use the paid office-glass casement in this study.

`district.webp` is an explicit art-view fixture from the actual renderer. The GIFs are controlled renderer pose reviews, not recordings of native input. No screenshot/generated illustration is being passed off as gameplay.

## Remaining art direction

The real rig preserves the game's established action coverage, but the dedicated 2D heroine art direction is still a comparison decision. This study does not claim to match a bespoke hand-pixelled character pack. The source pack has no modern top-down traffic set, so cars use a separately credited CC0 pixel supplement. The campaign's older architecture is not automatically replaced by this test; broader conversion should use the reviewed composition rather than repeat a single building layout everywhere.

Reproduce the native routes against a running preview or published base URL:

```
python tests/tutorial/agent_city_live.py --url http://localhost:8032/build/preview_city.html
python tests/tutorial/agent_city_live.py --mobile --url http://localhost:8032/build/preview_city.html
python tests/tutorial/agent_city_roof_live.py --url http://localhost:8032/build/preview_city.html
```
