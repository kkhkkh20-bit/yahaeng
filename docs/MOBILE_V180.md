# v180 — departure stays visible

The briefing previously placed departure inside the information column. Its
sticky positioning could not keep it visible before the reader scrolled down.
The release check also auto-scrolled that button into view before tapping it.

Departure now lives in a separate, non-scrolling footer with safe-area padding.
The button is 48px tall with a light graphite finish. The content area scrolls
independently. Target/item portraits use compact horizontal rows, the title is
smaller, and the map starts collapsed on phones. Desktop keeps the map open.
Opening a different briefing resets the content scroll and map state.

The mobile release check asserts initial visibility and hit testing without
auto-scroll, then rechecks after expanding information/map, scrolling to the
bottom, showing a checkpoint action fixture, and reducing available height. It
departs with a trusted touchscreen tap at the button's visible coordinates.

Validation uses packaged output in Chromium and WebKit at 390×664, 375×568,
390×600 and 844×390, plus VIP and later-contract briefings at 320×480. Relevant
interface, mobile flow, identity, clarity, opening-contract, input-boundary and
mission-flow regression checks pass. The opening contract is also replayed
with ordinary keyboard and native touch input through the next VIP briefing.
These are browser emulation checks, not physical iPhone testing.
