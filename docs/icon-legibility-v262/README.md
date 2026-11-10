# v262: solid icons and readable interface

The skill tree kept its three branches, 27 skills, prerequisites, costs, purchase/refund behavior and detail panel. Thin wire figures were replaced with original filled SVG silhouettes: 27 skill emblems, 11 interface symbols and 14 field controls. The same source geometry appears in nodes, detail panels, loadout and mission radio thumbnails. Purchased pixel item thumbnails remain in their existing slots.

## Assets and typography

Editable originals live in `src/art/hud/skills`, `src/art/hud/ui`, and `src/art/hud/field`; provenance and inventory are in `src/art/hud/silhouette-icons.json`. All use a 48×48 viewBox, currentColor and transparent cuts. `icon-sheet.png` is a browser rendering of the actual 27 source SVGs on both dark and cream backgrounds.

Added the official OFL IBM Plex Sans KR SemiBold face at weight 600, with all 12,224 mapped characters. Body text keeps the same family; logo headings keep Black Han Sans. Metadata, source URL, hashes and the conversion script are checked in. Browser checks verify the real SemiBold face instead of synthesized bold. Labels are larger and brighter, including locked skills. Panel edges, node rings, focus states and branch connections were strengthened together.

## Validation

- Skill tree: 320×568, 390×844, 844×390, 1024×768, 1440×900; native purchase/refund, prerequisite routes, focus and mobile detail overlays.
- Settings: five sizes, real font selection, audio range/mute/persistence, guide, scroll and menu/pause return.
- Interface: desktop, phone, landscape, small phone and blocked-font fallback.
- Caseboard: all knowledge rules and four viewport sizes.
- Field HUD: five phone/landscape sizes with quiet/danger/reading overlays.
- Briefings: eight mission sheets at five sizes, intel and resume/departure.
- Build pipeline: eight checks. Six UI screens captured at three sizes with no page errors.

These checks cover the changed rendering and navigation surfaces; they are not a full campaign playthrough. Before and after screenshots use the same controlled save and viewport.
