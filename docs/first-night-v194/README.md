# First night: one new rule per contract (v194)

New players previously went from a short kill to VIP, where disguise clearance, cameras, restricted floors and several objectives arrived together. The opening now leads through two compact real contracts: borrowed uniform → camera cable → VIP. Returning main-campaign records retain their place; the ledger still allows direct selection.

- **담배 한 대:** one target, one patrol. A short attack on a designated assassination target is lethal. This also applies to main-campaign designated targets, so the first control remains useful later. Ordinary guards and civilians keep their existing tap-to-KO / hold-to-kill controls; spare objectives and skill/contact restrictions remain.
- **빌린 제복:** a spare coat, one ordinary guard and one paper on a desk. Actual guard perception accepts permitted ordinary walking; theft is still illegal work.
- **꺼진 눈:** one camera, no guards. Disconnect its cable from behind with the existing unskilled 2s action, then investigate a desk. Work in view really records the player and triggers a 1.3s checkpoint retry.
- Introductory missions show one current action and omit end-of-mission rank pressure. Starter contracts hide empty tool buttons; the camera-only contract also hides the unused attack button. Briefings identify the actual room and desk. Death retries a safe checkpoint where the selected difficulty permits checkpoints. Successful coat/camera progress persists through recovery. Each new contract earns the ordinary once-only first-clear point. Existing skill-spending notices remain, without recommending a skill.

## Local native evidence

`native-journeys.json` records keyboard and CDP touch journeys with normal RAF, live actors and fresh saves. There are no position, health, inventory, skill, alert, completion, random-seed or clock overrides. Both devices completed p0→p1→p2→VIP with HP 3, no personal detection and no remaining CCTV recordings. Each deliberately tried theft in camera view, was recorded, automatically retried at the entrance, then disabled the camera and completed the contract. The ending skill budget is 6P with zero learned skills (initial 4P plus two earned first clears).

This is a known-map automated route, not a new human user's comprehension study or a physical iPhone test. Perception, illegal-work timers, reward replay and checkpoint state have separate controlled fixtures in `t_first_night.py`. CI additionally replays the existing training, handoff, chase and full VIP journeys.

Screenshots are unedited captures of actual input journeys. Full videos and CI logs are build artifacts, rather than repository payload.

Packaged source SHA256: `cca576b04a3518ccfca9ead7dd7c74e08bf01723176b6848191c611a98ff95ba`.
