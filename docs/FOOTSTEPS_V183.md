# v183 — ordinary walking is not evidence of an intruder

An ordinary step on a restricted floor could queue a hearing investigation when
no uniform authorized the floor. Guards then turned toward the source and could
visually identify the intruder. Walking while a guard was already investigating
could also replace its investigation point with the player's current position.
The screenshot's office upper floor exposed that chain particularly clearly.

Human NPCs now treat ordinary walking and crouching on normal flooring as
ambient sound. This applies without consulting an unseen player's clothing or
clearance. These footsteps neither interrupt patrols nor retarget investigations.
The audible footstep and sound-event data remain; dogs retain their hearing.
Running, noisy material clatter and dragging a body remain distinctive sounds.
Whistles, thrown cans, impacts and actual visual witnesses retain their own
rules. Quiet-step skills still reduce the actual hearing radius for dogs and
noisy surfaces. Pending legacy footstep investigations with no distinctive
sound classification are discarded on resume.

Calm ordinary guards now accept an otherwise valid uniform. Generic close
identity checks require heightened security; marked enforcers, elite guards and
targets retain their identity checks. Physical vision still detects crime,
known suspects and unauthorized entry. A secure floor is still not authorized
by clothing. Its initial visible trespass warning now explicitly says
`퇴거 경고 · N초` and names the access restriction, instead of just saying
that an unidentified person is suspicious.

Validation:

- `t_ordinary_footsteps.py`: actual VIP office floor, ordinary walking/crouching
  across different outfits, investigation non-retargeting, legacy save queue,
  retained running/glass/whistle hearing, and visible secure-entry warning.
  This is a controlled fixture, not a mission clear.
- `ordinary_footsteps_walk.py`: actual authored spare jacket acquired through
  the action UI, followed by keyboard/CDP touch walking on the office upper
  floor with all actors and cameras active, normal RAF and randomness. Only
  player location/floor/facing is positioned to isolate this encounter. Both
  desktop and mobile reproduced attraction in v182; both passed in v183 with
  normal patrol, intact disguise, no alarm, detection or damage. This is not
  a full mission clear or an unassisted novice usability test.
- Skill regressions now check actual running hearing through smoke and the
  quiet-step reduction of canine hearing, rather than requiring normal shoes
  to trigger human investigations.
- Disguise regressions cover calm uniform acceptance, heightened identity
  checks, distance escape, marked enforcers, crime and compromised appearance.

Mobile tests use browser/device emulation, not physical iPhone hardware.
