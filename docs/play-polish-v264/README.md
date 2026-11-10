# v264: actionable goal names and distinct working rooms

The v263 play review found a generic “여기” tutorial marker, repeated floor text and similar office arrangements. This change gives the first lesson named destinations (including its door → observer → document transition), removes duplicate floor prefixes while preserving up/down and roof cues, and changes the working arrangement of five rooms in three episodes.

- **돈줄**: the upper club office becomes a settlement desk and consultation table with two facing chairs, filing cabinets and a separate carpeted discussion area. The security office has its own monitor bank. These use owned Office Interior frames.
- **새벽배송**: the ground office becomes a receiving counter and waybill storage area; upstairs has a monitoring bank, dispatch desk and clear right-side terminal approach. Patrol stations, the dispatch objective and the stair/window approaches stay clear.
- **배신**: the repeated four-computer intake becomes two registration stations and one adjacent evidence-record cabinet bank.

The rooms have authored names and purchased floor materials. Added/moved furniture uses real colliders through the existing stage-furniture and checkpoint-migration paths. No decorative drawing represents a walk-through desk. The CCTV workstation now binds to its actual tabletop in the changed offices, preventing a second small computer from floating at the old interaction point. Its ordinary interaction and old-save restore are checked.

## Validation

- `t_play_wayfinding`: named tutorial phases and observer→document handoff, duplicate floor removal, 16 clear work/patrol stations, five circulation paths, real terminal commits and four legacy checkpoint repairs without changing health/keys/objective flags.
- Eight contract progression routes pass with AI frozen; this isolates doors, keys, objectives and escape, and is not eight live campaign clears.
- Tutorial PC and emulated touch complete in ordinary browser time with native input, active AI, HP 3, no detection, two KOs and one body stash. Screens show the now-named corridor door.
- Native safe choice and dispatch-response encounters pass on PC and emulated touch with active AI. Those encounter fixtures position the player; the dispatch fixture begins with the manifest already recovered. They are not full-mission completion claims.
- Nine episode interior/art fixtures, one-page briefings at five sizes, existing location-aware radio/contact tests, target-floor/roof navigation tests, 20 physical-interaction groups and eight build checks pass.
- Packaged local PC/touch start, movement, input and 13 exact resource hashes pass.

Before/after room screenshots use the same positioned inspection fixtures. Tutorial screenshots come from the native live-input journey. There is no claim that all later episodes were played end-to-end under live AI in this change.
