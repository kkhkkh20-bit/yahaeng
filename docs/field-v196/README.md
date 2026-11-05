# Learn a chosen skill and use it in the field (v196)

The early route now connects a real purchase to an optional opportunity and an actual-use receipt. The briefing explains the last skill the player chose, including when no points remain. It never recommends, buys or selects a skill for the player. Nearby guidance appears only when that owned skill has a valid opportunity. Mission objectives stay unchanged.

The contact episode has a crouching bush beside the existing patrol. The warehouse patrol briefly joins the existing doorkeeper, creating a two-guard opportunity. No additional guards are added. Ordinary rear approaches, disguises, camera cables and walking routes remain available without skills.

Learned equipment is now granted in the six real early contracts, despite their zero-equipment baseline. A player who owns dart operation receives two darts; an untrained player still receives none. Menu refresh and checkpoint synchronization cannot refill used ammunition. Actual bare challenge modifiers and basic rehearsals retain their restrictions.

Successful takedowns, projectile impacts, deployed smoke, completed hacks/radio commands, power cuts, actual movement and reduced player noises can record owned skill effects. Misses, canceled attacks/work, standing still, unowned skills and tutorial loans do not earn a use receipt. No additional points are awarded for skill use. Existing skill budgets, prerequisites, first-clear rewards and campaign saves remain intact. Some advanced skills retain their existing descriptions rather than having a bespoke early encounter.

## Verification

The native script purchases prerequisites and the chosen skill through the real interface, plays the contact mission with native keyboard or CDP touch, uses the skill, kills the designated target and exits. All guards remain active under ordinary RAF. The journeys read actor positions to follow a known route; they do not change skills, inventory, positions, health, progress, alert, clock or random seed. These are execution checks, not novice comprehension tests or physical-iPhone testing.

`native-journeys.json` and the unedited screenshots capture three choices on PC and portrait touch: approach assassination, concealed ambush, and a short nonlethal dart. Each completed journey retains full health and zero personal detections. The result screen names the skill actually used. The regression fixture separately covers owned equipment versus the bare baseline, no refill on refresh, canceled intent/missed impact, completed effects, tutorial exclusion, the real patrol opportunity, refunded/new saves, and visible departure controls at 1280×800, 390×844, 844×390 and 320×568 with a chosen zero-point build.

Commands:

```sh
node tests/integration/physical_interactions.cjs
python tests/rev/t_field_learning.py
python tests/tutorial/field_learning_live.py --url http://127.0.0.1:8001/public/
python tools/run_tests.py --fast --quick --no-build
```

The PR workflow additionally replays the unchanged first night, unskilled beginner episodes, handoff/pursuit scenes and a full PC VIP contract before publishing.
