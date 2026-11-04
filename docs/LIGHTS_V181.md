# v181 — room switches, physical fixtures and traversal presentation

The light pool was often also the interaction point. Work lights could receive
separate controls despite belonging to the same room. All indoor electric
fixtures now derive room circuits from the existing floor plan/walls, with one
reachable wall control per room. Doorways remain free. Inaccessible fixtures
do not advertise a control in the room centre. Light-pool coordinates/radii,
collision floors, mission routes and the original 2D engine are retained.

Ordinary light switches work with no learned skill. The existing electrical
node now describes building/area distribution-panel work only; the introductory
light lesson no longer loans that skill. A switch toggles its room's working
bulbs together. Broken bulbs stay broken, and a room switch cannot bypass a
building power cut. Migration rebuilds controls without resetting saved states.

Awake people in the affected room react to the darkness. One available guard,
or an adult resident, approaches the physical switch after a brief pause and
turns the room back on. Others look toward it. People in another room/floor do
not acquire the player's position. Fleeing, sleeping, captive and dead actors
do not perform repairs. Witnessed sabotage and ordinary detection keep their
existing rules. Coded doors keep priority over adjacent utility switches; the
action picker lists each room switch once.

Assets researched and verified at the official pages:

- [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit): CC0 wall lamp
  and ceiling-lamp candidates.
- [Kenney Retro Urban Kit](https://kenney.nl/assets/retro-urban-kit): CC0 street
  lamp.

The source models were already available in the project's art pipeline. The
new `tools/prerender/bake_lights.py` records exact source SHA-256 values and
copies licenses to `src/art/lights`. Eight wall/street views ship as baked 2D
sprites. Ceiling candidates remain in the source catalog; the cutaway interior
uses wall lights to avoid floating pendant props in walkways. Credits include
both official links. No model loader is added to the shipped game.

Ledge hanging now reverses the displayed profile at its shared hand anchor,
including the release-root calculation. Climbing input and wire traversal keep
their own directions. The duct network remains in the normal world view, with
a translucent route overlay and no additional full-screen darkness wash.

Validation:

- Core regression run: 76 checks passed, including native first-contract and
  five-lesson journeys, mobile controls, stairs, disguise, combat and saves.
- `t_room_switches.py`: 397 indoor fixtures, 154 controls, 89 shared circuits
  across 18 stages; guard/resident approach, cross-floor isolation and legacy
  saves. Ten fixtures with no reachable wall plate remain non-interactive.
- `t_light_fixtures.py`: 107 supported outdoor fixtures and legacy placement.
- `t_ledge_facing.py`: all four actual sprite rows, metadata hand anchors and
  matching release roots; existing native hanging-control tests also pass.
- `lights_vents_walk.py`: native keyboard and mobile touch for room off/on and
  duct entry/crawl/exit in normal browser time. Actors/cameras are removed and
  player positions set to isolate those interactions; this is not a mission
  clear or a novice usability study.
- Packaged mobile release checks in Chromium and WebKit at four viewport sizes
  retain the v180 visible departure footer, touch controls and rotation behavior.

Browser/device emulation is used; no physical iPhone test is claimed.
