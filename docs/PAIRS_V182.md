# v182 — basic counterplay against a pair

Two guards could react to a lure by watching the same spot, leaving little
room to approach. The lookout now covers its original post while one guard
investigates. Repeating the same lure still makes the investigator approach
cautiously and makes the lookout turn toward the sound. Separate groups and
special responders retain their own reactions; feedback does not incorrectly
promise one responder when an elite also investigates.

The first main contract, VIP (`m2`), gives its investigator six seconds to
search, and its lookout holds the post for seven seconds. Whistles reach 380
world pixels instead of 230 in this contract, allowing a call from outside a
room instead of requiring entry into its watched doorway. Walls still attenuate
sound, and hearing still does not identify an unseen player. Later contracts
retain their existing range and timings.

An unskilled player seeing the authored pair receives a one-time reminder to
separate them with the existing basic empty can or whistle. A successful
single-investigator whistle explains moving quietly away from the sound to
approach from behind; a whistle heard by nobody reports that explicitly.
Empty cans already work without learned abilities. No free combat skills,
health, disguise immunity or reduced vision have been added. Secure floors
still require stealth regardless of clothing.

Validation:

- `t_pair_counterplay.py` checks the actual market pair, first-call post
  coverage, repeat-call caution, first-contract timing/range, skill-free help,
  truthful feedback with an additional special responder, local sound memory
  across saves, and isolation from final-contract difficulty.
- `pair_lure_walk.py` uses native keyboard and mobile touch input to throw a
  starting can, approach the remaining guard from behind and knock him out.
  Both runs retain full health, zero detection and no learned skills, consuming
  one can. All authored actors/cameras remain active and browser time runs
  normally. Only the player's initial location/facing is positioned. This is
  an isolated encounter, not a full mission clear or a novice usability study.
- The core regression suite and packaged deployment checks cover existing
  controls, combat, mission flow, stairs, disguise, saves and mobile briefing.

This creates an opening rather than making two guards safe to attack together.
It does not establish that every secure room is easy for a first-time player.
Mobile testing uses browser/device emulation, not a physical iPhone.
