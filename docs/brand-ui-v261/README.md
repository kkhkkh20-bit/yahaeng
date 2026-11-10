# v261 — ivory/ink family across the interface

Extend the approved title-menu style to organization intelligence, the original
skill tree, settings, preparation, pause, results and utility dialogs. Filled ivory
marks a primary action or selection; ink frames are secondary, muted frames are
unavailable, and rust marks focus or a destructive choice. Current prerequisite
navigation stays outlined so it does not compete with the Learn action.

The existing three-branch, 27-node circular skill graph, its prerequisite rails,
mobile inspector, purchase/refund rules and progress storage remain. Case knowledge,
mission objectives and settings behavior are unchanged. Tree nodes use new original
SVG states; panels and inset surfaces use the same fixed chamfer geometry as the
menu assets. The shared button states reuse the existing approved frame sources.
Descriptive text remains IBM Plex Sans KR. Only the three main screen headings add
the existing wordmark face; its subset generator preserves the original wordmark
outlines while adding those exact heading glyphs.

`src/brand-ui.css` is the final visual layer, after the existing layout styles.
Original assets are in `src/art/hud/frames/brand-*.svg` and `menu-danger-*.svg`.
No generated screenshot text or purchased-asset attribution is used for these new
original UI frames. Gameplay HUD targeting and detection colors retain their roles.

## Evidence and scope

- Actual before/after screenshots: caseboard, skill overview/detail, settings,
  briefing and pause at 1280×800, 390×844 and 320×568. Captures use controlled
  returning-player data; they are not earned game progress or a usability study.
- Existing skill-tree verification: five viewports, all three branches/27 nodes,
  locked paths, focus and real purchase/refund. No layout overflow and 44px targets.
- Existing settings verification: five viewports, native range/mute inputs,
  saved settings, fonts, guide scrolling, and return to the paused mission.
- Existing caseboard verification: discovery and checkpoint logic, hidden identities,
  seven evidence/completion cases, and four-size modal keyboard/focus containment.
- One-page preparation: 8 mission sheets × 5 sizes, optional intel, checkpoint resume
  and native departure. Four-size interface and font-failure fallback passed.
- Eight build checks passed. Local packaged HTML/scripts/font hashes and native
  PC/touch start, movement and pause/menu return verified separately.

This release changes interface presentation; it does not claim a complete replay
of every mission or new content.
