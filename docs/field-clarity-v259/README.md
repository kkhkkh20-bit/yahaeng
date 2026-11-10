# v259: readable briefings, physical fixtures and investigation causes

The departure sheet showed the protagonist introduction, story, caseboard prompt and
objectives in a long column. Required objectives and the map now share one viewport;
optional story/support dialogue is available in **현장 정보**, without dropping content.
The existing departure, Space shortcut, preparation, caseboard and checkpoint paths remain.

## World changes

- Operate an indoor light at its mounted fixture. Separate indoor/outdoor switch plates
  and the fallback office switch art no longer render. Existing room circuits, blackouts,
  guard relighting, emitters and occlusion rules remain authoritative.
- Replace the narrow blue/white fluorescent sprites used as wall markers with the owned
  Dotonbori wall luminaire. This is an existing purchased atlas cut, with no new asset purchase.
- Remove oversized sofas, including their physical footprints. Remember retired geometry
  when restoring older saved grids, so an invisible sofa cannot return after loading.
- Move six containers away from a dispatch corridor and doorway turning areas (tB, m4,
  m7, n1). Preserve hiding/storage and migrate saved occupants/bodies with their container.
- Correct single-cell desk sizing and face chairs toward a nearby work/dining surface.
  Actors behind a desk/chair are clipped by its actual opaque sprite pixels; actors in
  front remain visible. The cached mask reveals the already lit furniture, so depth does
  not accidentally repaint bright objects over dark rooms. Physical desk collision was
  already present and is retained.
- Remove extra stair entrance rectangles, floating roof-door plaques and intermediate
  connection-goal world markers. Keep the purchased door/stair image, interaction, floor
  information for real objectives, minimap and contextual controls. The stair source was
  not truncated; redundant entrance art was drawn across its lower area.
- A freed sofa cell could become an unlit civilian spawn in a workplace previously
  assumed fully lit. Occupancy lighting now checks those workplaces too, preserving
  intentional/saved blackouts and not lighting empty rooms.

## Why an idle-looking guard said “제보 조사”

The label grouped unrelated reasons: the player's radio decoy, loss of a visible patrol
partner, unanswered routine rollcall, and real witness communication. Separate reasons
now display **무전 지시 확인**, **동료 확인**, **무전 응답 확인**, or **목격 전달받음**.
Heard noises remain **소리 조사**; a confirmed body sighting remains distinct. Active
visual detection takes precedence over any stale previous reason. Investigation labels
change neither perception nor shared disguise knowledge.

A real sighting can reach nearby guards through an audible call; wider sharing requires
completion of the existing radio transmission. A missing colleague check does not reveal
the player's current location or identify their clothing. Routine rollcall with nobody
missing does not invent an investigation.

## Verification and boundaries

- `t_brief_one_page.py`: 8 campaign sheets × 5 viewports (1260×920, 1280×720, 390×844,
  320×568, 844×390), all required identities/map/actions contained with no scroll; native
  intel modal, Space/Escape/focus, checkpoint resume and PC/touch departure. Tutorial tB
  intentionally starts directly and does not have a departure sheet.
- `t_world_clarity.py`: all 9 public stages, direct fixture reach, all six moved bins,
  native light toggle and saved blackout, old-grid sofa cleanup, actual held movement
  stopped by a desk, actual actor raster masked behind it and unchanged in front, normal
  versus unanswered rollcall and cause priority. Controlled actor placement, not free play.
- Existing objective-access, walkway/save migration, 426 outdoor fixture approaches,
  occupied-light/save state, surface-lighting, scene-layer, security readout and disguise
  report tests passed. Objective access opens doors for a connectivity audit; it does not
  prove every stealth route or key sequence.
- Native `first_steps_live.py` PC and mobile completed tB through disguise, hiding,
  upstairs document recovery, descent and escape; no clock/state stepping or video.
- Four-size interface/font-failure checks, 8 build tests and 20 physical-interaction
  groups passed. Packaged HTML/scripts/font hashes and native input checked separately.

Legacy broad tests remain unsuitable as a release-wide green claim: `t_presentation`
requires an untrained 60px grab although current contact range is 48px (also reproduced
on v258); `t_security_response` reaches its old prepared-lure fixture without the current
ability setup; `t_opening_episode` stops on an old recovery-line expectation. These were
not weakened to claim all gameplay tests passed. Changed UI selectors/captions, removed
sofa lighting sample and the renamed partner reason were updated to the current contract.
