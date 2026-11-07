# Mobile field HUD v211 — implementation comparison

This is a scoped record of the approved extension into the playable HUD. It is not a replacement design system. [DESIGN.md](../../DESIGN.md) and [.impeccable/design.json](../../.impeccable/design.json) remain unchanged and retain their main-menu, settings, and restart scope. The approved HUD composition is recorded in [mobile-hud.md](../../.impeccable/surfaces/mobile-hud.md).

The documenter finish pass compared the current implementation with PRODUCT.md, the confirmed main-menu principles, the sidecar, and the HUD surface brief. An ordinary extension does not authorize refreshing the root design scan or promoting older interface defects into design rules.

## Comparison with the confirmed world

| Confirmed principle | Evidence in the HUD extension |
| --- | --- |
| The actual Korean pixel scene establishes the world. | The before/after fixtures retain the game scene, characters, buildings, and lighting. No new raster illustration was added. The new control rims and symbols are authored SVG geometry. |
| Ink reading surfaces and pale Korean text protect legibility. | `src/field-hud.css` reuses panel ink (`#10171d`) and title ivory (`#f2f0e6`). Objectives, expanded reading, equipment, and pause use dark reading grounds; equipment and expanded reading have opaque interiors. Compact readouts use near-opaque grounds where needed. |
| Restrained steel frames identify utility surfaces. | Objectives, equipment, target selection, and pause reuse `menu-frame.svg` through the existing border-image asset. The former brush treatment is removed from these HUD surfaces. |
| A clear ivory action establishes hierarchy. | A ready nonlethal primary control uses the main-menu action ivory (`#e6e3d6`); inactive secondary controls remain ink and steel. The separate lethal state uses a muted red rim and blade symbol. This adapts hierarchy to contextual play. |
| Calm regular Korean UI typography and visible focus. | HUD labels use the inherited body face; button labels explicitly use regular weight. HUD focus uses a two-pixel warm outline with a three-pixel offset. Reduced-motion rules remove HUD transitions and animation. |
| Composition responds to available space. | Objective and status sit at the upper left, pause/minimap at the upper right, and touch actions at the lower right. Compact landscape rearranges the controls. The left movement area and central scene remain open. |

## Surface-specific adaptations

The approved circular touch controls are a deliberate HUD adaptation of the restrained steel material. The main menu's square control rule remains scoped to that menu. Four new field rim SVGs share concentric circles and a small upper highlight; fourteen field symbols share current-color strokes, rounded joins, and a common stroke width. Equipment options retain compact, slightly rounded rectangles. These shapes are not added to the root rounded scale.

The HUD's observed type sizes (including small 10–12px labels), muted steel variations, warm status text, and red danger states serve this denser play surface. They are implementation facts, not additions to the front-end token ramp. The main-menu display face is not repurposed as the equipment heading.

Reading is a distinct state: the objective's pause/continue instruction stays above its scrolling content. Equipment keeps its title, close control, pause indication, and movement footer outside its scrolling body. The overflow indicator is derived from measured body overflow. These finish changes are visible in the current source and compact captures; they do not by themselves establish complete behavioral acceptance.

Source changes also shorten contextual labels and the movement hint, avoid a duplicate dress control when the main action already owns it, and remove the duplicate touch target caption from the canvas. Accessible action captions remain separate from the compact visible wording. This pass documents those presentation changes; preservation of combat rules, saves, and earned progression belongs to the regression evidence.

## Evidence checked and limits

- [Before captures](../../build/field-hud-v211/before) record v210; [after captures](../../build/field-hud-v211/after) record the extension. Each folder contains 36 PNGs: walk, approach, wardrobe, danger, reading, and equipment at 390×844, 390×640, 320×568, 844×390, 568×320, and 1280×800.
- Direct visual comparison covered before portrait walk/approach and compact equipment; current portrait walk/approach/danger, small wardrobe/equipment, compact reading/equipment, landscape walk, and desktop reading were inspected. The capture inventory was checked for all six sizes and states.
- Both geometry files contain 24 play-state records (the four play scenes at six sizes), with zero recorded page errors. They do not measure the reading/equipment states. Visible measured controls have a minimum dimension of 44px in those records; this does not prove successful hit testing, content fit, or simultaneous touch behavior.
- `tools/capture_field_hud.py` explicitly poses actors/camera and controls time. These are presentation fixtures, not evidence of live gameplay lighting, visibility, progression, or multi-touch behavior.
- Current source checked: `src/field-hud.css`, the relevant changes in `src/template.html`, `src/js/76_episode_radio.js`, `src/js/78_controls.js`, `src/js/80_hud.js`, `src/js/82_hud_loadout.js`, `src/js/90_input.js`, `src/js/render/frame.js`, and `build.py`; the new field SVGs and reused menu frame were also checked.
- [detector.json](../../build/field-hud-v211/detector.json) contains 160 findings. The 57 findings in `field-hud.css` are advisories: 39 type-size, 15 color, and 3 radius notices. The current root scan explicitly excludes the HUD, so these notices are not grounds to widen its scope. The remaining 103 findings concern the legacy shared template. Neither those warnings nor their incidental styles are canonized here. The detector file is a recorded scan and does not certify the later finish changes.

The comparison supports continuity with the confirmed ink, ivory, steel, and actual-game-scene principles. Small type, status colors, circular touch geometry, and compact scrolling behavior remain explicitly scoped adaptations. The [engineering summary](README.md) records the independent finish review: all four requested fixes resolved, with a ship disposition limited to those fixes. That scoped verdict does not expand the root design system or certify the entire game. Behavioral validation and the additional presentation measurements are recorded in that summary and [presentation-geometry.json](presentation-geometry.json).
