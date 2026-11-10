# v260 — approved ivory/ink title buttons

Apply the approved button proposal to the real main menu. The campaign action uses
an ivory plate and the logo face; the three secondary actions share an ink plate
with an ivory edge and matching icon strokes. The existing night background,
logo layout, campaign selection, saved progress and destination actions remain.

## Assets

Eight original transparent SVG frames live in `src/art/hud/frames/menu-*.svg`:
primary/secondary × normal/hover/pressed/disabled. They use the existing asset
bundler and 12px nine-slice corners, so stretching a button does not stretch its
corner geometry. Text and icons remain actual UI elements. Hover is limited to
fine pointers; touch uses press/release. Focus retains a visible rust outline.

The old title TTF contained only 야 and 행, so assigning it to the action initially
fell back to the regular UI face. The subset now includes all bounded primary
labels (21 codepoints, about 12KB) from the existing OFL Black Han Sans source.
`tools/subset_title_font.py` reproduces it and checks that the two original wordmark
outlines are unchanged. All secondary labels, descriptions and other screens keep
IBM Plex Sans KR. Font verification therefore samples a secondary title action.
No image-generated letters or text are used in the runtime.

## Validation

- Existing front-end capture: fresh and controlled returning states at desktop,
  mobile, 320×568, landscape and short mobile. Button centres hit their native
  elements; returning controls fit the viewport; no horizontal overflow.
- Actual normal/hover/pressed/disabled SVG switching, release outside the button,
  and keyboard Tab/Enter organization entry checked in the native browser.
- CDP inspected real rendered font faces: Black Han Sans in the logo and primary
  action; IBM Plex Sans KR in a secondary action.
- Four-size interface regression plus failed-UI-font boot fallback passed.
- Eight build pipeline checks passed. Local packaged hashes and real PC/touch
  campaign entry, movement, objective pause/resume and menu return passed.

This is a title-menu presentation change. No full mission-playthrough claim is
made for this release.
