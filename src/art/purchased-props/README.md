# Owned office prop variants

Original pixels are from the purchased GuttyKreum Office Interior v3. The full
source sheet/ZIP is private. `props.json` records its SHA-256, exact source cuts,
roles, and carton assembly geometry. These are not hand-painted new artworks.

All runtime art uses **1.5x nearest-neighbour**: 32 source pixels occupy 48 world
pixels. A source cannot fit a target cell at that density → renderer returns
false and the existing renderer remains active. No random numbers are consumed.

`cargoStable0..2` use the complete individual top carton at source
`(1964,395)-(1975,404)`. Only its flat front-face area is extended. Original
one-pixel borders, four top bands, and 2x2 shipping-label pixels retain their
thickness. Each 32x32 sprite contains a broad lower carton and a fully supported
narrower upper carton, touching by one pixel. The visible height is 30 source
pixels / 45 world pixels. The original three-carton pile is never duplicated.

Bookcase/file-cabinet colours, two plant silhouettes and two board types dress
existing matching furniture. Hiding cabinets, freight shelves, explicitly
authored furniture and security monitor shelves are excluded. Printer art is
only used on explicitly assigned service counters and never over mission loot.
Wall extinguishers occupy existing exposed solid wall cells and avoid doors,
windows, lamps, wall decoration, furniture and stairs. They do not create a new
floor obstacle or interaction.

Runtime integration:

1. Embed `src/art/purchased-props/props.json` + `props.webp` as `A.purchasedProps`.
2. Load `graphics/purchased_props.js` after `graphics/office_interiors.js`.
3. Call `refreshPurchasedProps()` alongside other atlas refreshers each frame.
4. At the beginning of `drawPurchasedCargo`, call
   `if(drawPurchasedPropCargo(c,tx,ty))return true;`.
5. In `drawPropFurn`, before `drawOfficeFurn`, call
   `if(drawPurchasedPropFurn(x,it,shadow))return true;`.
6. At the end of `officeWallDecor`, call
   `drawPurchasedPropWallDetails(c,fl,x0,y0,x1,y1);` if the wall dressing is adopted.

The prop renderers do not modify stage data or physical geometry. Separate v247
cabinet-clearance fixes are documented in docs/purchased-v247. Printer locations
can optionally be assigned through
`STAGE.purchasedProps.counterPrinters=[{x,y,fl}]`, using existing 2+ cell service
counters only. Without an explicit assignment, the printer is not inserted.
