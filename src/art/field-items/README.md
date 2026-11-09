# Field objects

Cloth and stationery use the existing offline field-item bake.
`cigarettes.webp`, `radio.webp`, `can.webp` and `smoke.webp` are original generated pixel props (2026-11-09), imported from a transparent two-cell sheet with `tools/prerender/import_field_tools.py`. The importer removes faint background alpha and uses nearest-neighbour sampling at 32 px high. The same cropped pixels are shared by world objects and quick-slot icons; there is no runtime image generation.

The cigarette pack is a lure for an available smoker; it does not create an artificial sound investigation. A guard bends down to pick it up, then smokes. A worn radio stays at the belt; a used radio moves to the caller's hand with a short acknowledgement. Existing ownership, charges, cooldowns and same-floor routing remain in force.

The can and smoke canister use the same 32 px import grid and source style. Their quick slots and in-flight objects share these exact pixels. Legacy SVG quick-item drawings remain as source references but are excluded from the build; field glyphs are embedded inline, without duplicate CSS-mask variables.
