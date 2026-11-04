# v184 — a uniform must permit ordinary office circulation

The follow-up screenshot shows the VIP contract's office second floor. Its HUD
correctly reported the old rule, but the rule itself made the disguise confusing:
the entire office floor was forbidden even in the guards' own uniform. A public
v183 detector probe also reproduced automatic identity discovery by ordinary
guards at alert levels 1 and 2, and by marked checkers looking at the back of
the player's head. The earlier 330 ms walking check did not cover those cases.

VIP's normal office floors and stairs now accept the guard uniform. The physical
first-floor vault room and private club upper floor retain their clearance.
Neither desk/console work nor theft gains immunity from witnesses or cameras.
The existing floor plan, guards, collisions and objective locations are retained.

An unrelated alarm no longer gives ordinary guards a timer that automatically
exposes an otherwise unreported outfit. Actual witness memories and completed
appearance reports still detect their known suspect. Marked enforcers, elites
and targets check faces when the player stops and faces them within range.
Normal walking suspends that timer, and turning away or walking out resets its
progress; a hidden face cannot be identified from the back of the head. The
existing three-second uninterrupted stationary face check remains dangerous.
Its world label and tutorial describe this rule. The pause menu now shows the
runtime version so an already-open older game can be distinguished from an
updated page.

Validation:

- Live v183 controlled detector matrix reproduced automatic discovery at
  raised alert and by marked face/back checks. This is detector evidence,
  not proof of the user's exact saved state.
- `disguise_pass_walk.py`: equip the actual spare office jacket through UI,
  then perform two walking laps in the reported office. All authored actors
  and cameras remain active under normal browser RAF/randomness. Only player
  location/floor/facing is positioned to isolate the room. PC and native touch
  completed 18.0 and 19.3 seconds locally, including 146 and 182 samples in
  actual guard sight, with peak suspicion and identity progress both zero,
  no alarm, no damage and no exposed disguise. The same route on live v183
  reproduces visual suspicion. This is not a complete mission clear.
- `t_disguise_passers.py`: twelve-second normal-uniform checks at all alert
  levels; marked walking/front/back cases; starting and interrupting actual
  stationary face checks; real suspect memory and witnessed attacks; office,
  vault and private-club access; visible runtime version.
- Existing security readout, building search, lighting, camera, disguise and
  ordinary-footstep tests cover the revised policy. The rehearsal still uses
  its real detectors; no immunity, skill or scripted completion is granted.

Mobile checks use device/browser emulation rather than physical iPhone hardware.
