---
name: "야행 — Front End"
description: "픽셀 골목·네온·간결한 메뉴: the playable Korean night alley as the game's entrance."
colors:
  alley-night: "#080e16"
  panel-ink: "#10171d"
  title-ivory: "#f2f0e6"
  mission-muted: "#c6c6bc"
  menu-muted: "#c6cbd0"
  menu-hover-ink: "#f6f0df"
  action-ivory: "#e6e3d6"
  action-border: "#faf4dc"
  action-ink: "#101820"
  action-warm: "#f3d5a3"
  focus-amber: "#ecb66e"
  frame-steel: "#63717c"
  control-ground: "#17212a"
  control-line: "#52636e"
  ui-ink: "#f0eee5"
  ui-muted: "#babdc0"
  ui-line: "#4e5359"
  ui-accent: "#e6e2d7"
typography:
  display:
    fontFamily: '"Yahaeng Title", "Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "clamp(74px, 7.5vw, 96px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Yahaeng Title", "Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "30px"
    fontWeight: 400
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "15px"
    fontWeight: 400
  menu:
    fontFamily: '"Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  primary-action:
    fontFamily: '"Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  mission-label:
    fontFamily: '"Yahaeng UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
rounded:
  square: "0"
spacing:
  menu-gap: "3px"
  brand-gap: "12px"
  action-separation: "16px"
  panel-gap: "34px"
  mobile-panel-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-ivory}"
    textColor: "{colors.action-ink}"
    typography: "{typography.primary-action}"
    rounded: "{rounded.square}"
    padding: "14px 44px 14px 18px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.action-warm}"
    textColor: "{colors.action-ink}"
  button-menu:
    backgroundColor: "transparent"
    textColor: "{colors.menu-muted}"
    typography: "{typography.menu}"
    rounded: "{rounded.square}"
    padding: "10px 18px"
    width: "100%"
  button-menu-hover:
    backgroundColor: "#d4deea12"
    textColor: "{colors.menu-hover-ink}"
    padding: "10px 18px 10px 24px"
  button-back:
    backgroundColor: "{colors.control-ground}"
    textColor: "#e1e3dd"
    rounded: "{rounded.square}"
    padding: "10px 16px"
  framed-panel:
    backgroundColor: "{colors.panel-ink}"
    padding: "24px 30px"
  menu-navigation:
    width: "100%"
  setting-range:
    width: "100%"
---

# Design System: 야행 — Front End

## Overview

**Creative North Star: "픽셀 골목·네온·간결한 메뉴"**

The entrance belongs to the game's Korean night alley. Pixel buildings, Hangul shop neon, a warm outdoor lamp, and the small player character establish the place. A compact ivory title and a quiet vertical menu occupy its shadow. The player's next action is immediate and legible.

This is a scan of the implemented main menu, its settings surface, and restart confirmation. It is not a specification for every existing game screen. The current game HUD, skill tree, mission screens, and simulation behavior retain their own implementation; their incidental defects are not visual rules. The user's chosen world and the existing game assets constrain this front end.

**Key Characteristics:**

- Actual game scenery with crisp pixel rendering.
- Dark opaque reading surfaces and pale Korean typography.
- One prominent ivory action, with warm interaction feedback.
- Square controls and a restrained steel frame on utility surfaces.
- Responsive composition that keeps starting or continuing accessible.

Source authority is [src/front-end.css](src/front-end.css), loaded after the shared interface styles in [src/template.html](src/template.html). Shared control values are resolved from [src/interface.css](src/interface.css) and [src/ink-interface.css](src/ink-interface.css); the frame is [src/art/hud/frames/menu-frame.svg](src/art/hud/frames/menu-frame.svg). Product constraints live in [PRODUCT.md](PRODUCT.md), and this surface's composition contract lives in [.impeccable/surfaces/front-end.md](.impeccable/surfaces/front-end.md).

## Colors

Cool night tones hold the scenery and reading surfaces; ivory and restrained amber make the interactive layer readable.

### Primary

- **Action Ivory:** the filled start/continue action, paired with Action Ink and a thin Action Border.
- **Warm Lamplight:** Action Warm is the primary hover/focus fill; Focus Amber marks keyboard focus in the main menu. The scenery's warm lamp and neon are raster artwork, not extra UI accents.

### Neutral

- **Alley Night:** the menu's base and directional darkness over the background.
- **Panel Ink:** the opaque settings and restart panel interior.
- **Title Ivory:** the wordmark. Mission Muted and Menu Muted distinguish its short mission line and auxiliary actions.
- **Menu Hover Ink:** brighter auxiliary action text on the subtle translucent hover plane.
- **Frame Steel, Control Ground, and Control Line:** beveled utility framing and the bordered return control.
- **UI Ink, UI Muted, UI Line, and UI Accent:** the inherited settings text, dividers, native range controls, and focus treatment.

**The Reading Surface Rule.** Keep utility text on the opaque ink panel. Let scenery remain visible around it; do not let its details compete through the reading surface.

## Typography

**Display Font:** Black Han Sans, self-hosted as "Yahaeng Title"; Korean UI fallbacks follow it.

**Body Font:** IBM Plex Sans KR Regular, self-hosted as "Yahaeng UI", with Apple SD Gothic Neo, Malgun Gothic, and sans-serif fallbacks.

**Character:** The substantial Hangul title identifies the game. The regular body face keeps menus, settings, and explanatory copy calm and easy to scan. Use the real regular face rather than synthetic bold.

### Hierarchy

- **Display:** the main menu wordmark uses the responsive display token. Portrait mobile uses 76px, compact portrait 64px, and short landscape 78px.
- **Headline:** utility headings use the display face at the headline token size. Restart copy has its existing 1.4 line height; the settings heading inherits 1.3.
- **Body:** settings labels use the body token. Restart explanatory copy uses 14px with 1.7 line height.
- **Menu:** auxiliary main menu entries use the menu token; portrait uses 16px and short landscape 15px.
- **Primary action:** the filled main menu action uses the primary-action token; portrait uses 18px and short landscape 17px.
- **Mission label:** the short line under the title uses the mission-label token; portrait reduces it to 12px.
- **Footer:** low-priority genre/version metadata uses 10px with 1.5 line height.

Font sources and licenses: [title-blackhansans.ttf](src/fonts/title-blackhansans.ttf), [OFL-BlackHanSans.txt](src/fonts/OFL-BlackHanSans.txt), [ui-regular.woff2](src/fonts/ui-regular.woff2), and [ui-font.json](src/fonts/ui-font.json).

## Layout

The main menu is a full-height scene with a two-row grid: the title/menu block and a separate footer. Desktop content is left aligned in a column capped at 390px, with horizontal inset clamped between 30px and 100px at 6vw. Title and menu are separated by the panel-gap token. The scene is cropped toward its right side to retain the character and lamp; an asymmetric dark overlay protects the left reading area.

At widths of 700px or less, use the portrait source, crop toward the upper alley, and place the title/menu near the bottom. The menu fills the available width with at least 28px side clearance and device safe-area accommodation. A viewport height of 680px or less reduces the top reserve and title size. At widths of at least 701px and heights of at most 500px, switch to a compact two-column title/menu arrangement with a 48px gap. These are observed breakpoints, not a general grid for unrelated game screens.

Main menu auxiliary rows have minimum heights of 48px on desktop, 46px in portrait, and 42px in short landscape. The filled action uses 60px, 56px, and 50px respectively; line box and padding may make its rendered height larger. Returning-player state reveals the restart row beneath the continue action without changing this hierarchy. Allow vertical scrolling when content exceeds the viewport.

Settings use a panel capped at 920px. Desktop panel padding follows the framed-panel token; portrait uses 22px 24px. Range settings use a label, flexible track, and right-aligned four-character output column with tabular numbers. Restart confirmation is capped at 460px and viewport-minus-32px in both dimensions; its actions stack below 360px width.

Rendered references are the staged browser UI captures in [build/front-end-v210/ui](build/front-end-v210/ui), including desktop/mobile/small/short/landscape title, returning, and settings views. [layout.json](build/front-end-v210/ui/layout.json) records measured title/menu bounds and successful hit targets for the initial title view at those five sizes. These records document the front end, not a guarantee about all game screens.

## Elevation & Depth

Scenery supplies environmental depth through pixels, lighting, and camera framing. The main title/menu container has no card background, border, or box shadow. Its directional dark overlay is structural contrast. Utility panels use an opaque interior, a small steel bevel, and one dark ambient shadow.

### Shadow Vocabulary

- **Title separation** (`text-shadow: 0 4px 16px #0008`): soft separation for the wordmark over the alley.
- **Utility panel depth** (`box-shadow: 0 18px 48px #0008`): settings and restart framing.
- **Restart backdrop** (`background: #06090fd9`): modal separation inherited by the restart dialog.

## Shapes

Main menu controls have square corners and broad rectangular hit areas. The primary action has a single thin pale border; secondary menu rows are unboxed at rest. Utility containers use the existing 64×64 steel SVG as a 12px sliced border image, with small cut corners and restrained highlight/shadow strokes. Preserve that asset's bevel geometry rather than approximating it with a rounded card.

## Components

### Main action

An ivory slab with a small right chevron. Use it once for starting or continuing. Hover and keyboard focus warm the fill and move left padding inward; focus also adds a two-pixel amber outline with a three-pixel offset. Active uses the existing translucent pressed fill. Disabled uses the implemented slate fill and border with dark text, full opacity, and default cursor.

### Main menu navigation

A vertical, left-aligned list of auxiliary actions. Rows are transparent at rest; hover/focus introduce a faint light plane, brighter text, inward padding, and a right chevron. Preserve visible keyboard focus and the semantic navigation label. The restart action is state-dependent; it does not replace the prominent continue action.

### Utility panels

Settings and restart confirmation share the steel frame and ink interior. Settings have a heading/return row and divided disclosure sections. Restart keeps a descriptive heading, explicit reset explanation, cancel action, and confirm action. Its confirm fill is the existing muted warm tan (`#d0bb93`) with pale tan border (`#e7d8b6`) and dark text (`#111820`); this contextual variant does not replace the main action token.

### Return control

A square, steel-bordered control on a dark ground, with a compact left chevron. It retains shared hover feedback and a visible pale keyboard-focus outline. Keep its label readable beside the utility heading.

### Settings ranges and disclosures

Use native range inputs with the inherited pale UI accent, visible numeric output, and keyboard focus. Track/thumb geometry is browser-native; do not claim a custom slider design. Use semantic details/summary for advanced settings, controls, and credits, separated by thin rules. The current front end has no text input, chip, or generic content-card primitive to standardize.

### Alley artwork

Use [alley-wide.webp](src/art/title/alley-wide.webp) and [alley-portrait.webp](src/art/title/alley-portrait.webp), selected by the picture source at the portrait breakpoint, with pixelated rendering. The provenance sidecars [wide](src/art/title/alley-wide.webp.json) and [portrait](src/art/title/alley-portrait.webp.json) identify staged rendering of stage m2 via [tools/capture_noir_title.py](tools/capture_noir_title.py): existing licensed game assets, camera and hero posed for title artwork, UI hidden, shop neon drawn after roofs, and one engine-rendered warm pole light. These are composed title assets, not unmodified gameplay captures or evidence that simulated lighting, visibility, cameras, or roofs behave a particular way. No generated character illustration is part of this front end.

Motion is limited to brief menu color/padding/chevron feedback (0.16s). The existing reduced-motion media query removes those transitions. Keep the artwork itself static.

## Do's and Don'ts

### Do:

- **Do** preserve the confirmed pixel alley, Hangul neon, and concise menu direction.
- **Do** keep the title fully readable and the start/continue action visible at supported viewport sizes.
- **Do** use the actual two title assets, preserve pixel edges, and retain their staged-render provenance.
- **Do** keep utility reading surfaces opaque and keyboard focus visible.
- **Do** preserve the current save-state menu hierarchy and PC/touch access.

### Don't:

- **Don't** replace the alley with a newly illustrated character poster or oversized clipped title.
- **Don't** add rounded floating cards around the main menu; its current container is open over the scene.
- **Don't** treat staged title lighting or roof composition as proof of gameplay behavior.
- **Don't** apply this front-end scan wholesale to the older HUD, skill tree, mission screens, or simulation defects.
