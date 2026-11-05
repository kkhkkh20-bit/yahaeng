# Gradual beginner episodes (v195)

The first three short contracts previously led directly into the much larger VIP mission. The new default route is:

`담배 한 대 → 빌린 제복 → 꺼진 눈 → 골목의 연락책 → 창고의 거래 → 윗층의 장부 → VIP → existing campaign`

| Episode | New problem | Initial opposition | Objective | First-clear reward |
| --- | --- | --- | --- | --- |
| 골목의 연락책 | A moving target, including real pauses and turns | One target, one patrol; no camera; one level | Assassinate the contact and leave | 1P |
| 창고의 거래 | Combine ordinary disguise clearance and CCTV work | Two ordinary guards, one camera; one level | Recover the manifest and leave | 1P |
| 윗층의 장부 | Navigate a small building and return downstairs | One guard on the lower floor, no cameras; two levels | Recover the upstairs contact ledger and leave | 1P |

No episode requires a learned skill or grants trial abilities. The initial 4P budget stays intact. A fresh player who completes the first night earns 2P, then these episodes earn another 3P before VIP (9P total earned/initial budget, before spending). Failure, replay and repeat result calls never pay again. Existing generic skill-spending notices remain; no skill is recommended or selected automatically.

The ledger groups first night, beginner episodes and full city contracts. Existing main-contract IDs, numbering, records and direct access remain. Returning players with main-campaign completion continue at their existing campaign position. Beginners who take the optional basic rehearsals also join the beginner route instead of jumping to VIP.

The episodes retain the actual game rules. Designated assassination targets use the same one-press control as the first night and main contracts. A recording in the warehouse is recoverable at the actual alley management terminal; unplugging does not erase a past recording. New upstairs progress creates a safe checkpoint when the selected difficulty permits checkpoints. Early results focus on completion and earned points, with one current action in the HUD.

The story connects the witness list to the contact's warehouse, the warehouse manifest to the small office, and the contact ledger to the club manager. The first mission's stakes and each next destination are stated in their briefings.

## Verification

`native-journeys.json` contains ordinary-RAF keyboard and CDP-touch journeys from fresh saves. Each selects e1 through the actual ledger, then uses the real result buttons through e2 and e3 into VIP. All actors and cameras stay active; there are no position, health, skills, inventory, alert, completion, seed or clock overrides. The automation reads map/actor positions to choose a known route and waits for a real target pause. It is not a novice human comprehension study or a physical iPhone test.

Both local journeys completed all three with HP 3, personal detection 0, no remaining CCTV recordings and no learned skills. Assertions verified budgets 5→6→7P when starting these three directly with a fresh 4P save. Separate rule fixtures verify the complete first-night-plus-beginner 9P progression, repeat/failure reward protection, actual CCTV recording and erasure, floor checkpoints, older-save continuation and visible departure/current-goal UI at 1280×800,390×844,844×390 and320×568.

The existing 90-case core suite and 20 physical-interaction groups passed locally. CI repeats the exact final package with the full suite, first-night and beginner native journeys, existing training, handoff/chase and a complete PC VIP run.

Screenshots are unedited native-play captures. Full videos remain CI/build artifacts.

Final packaged source SHA256: `fbd83c2f6025ec43940490d138bf16d903c699ca8cfe4a36fcc592e587e3da89`.
