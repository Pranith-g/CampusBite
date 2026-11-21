---
name: CampusBite
description: Canteen token console where the circular queue is the kitchen's wall clock.
colors:
  ground: "#15100c"
  surface: "#1e1813"
  surface-2: "#272019"
  surface-3: "#31281f"
  line: "#3a2f25"
  line-strong: "#54463a"
  line-hover: "#6a5a4b"
  ink: "#f4eadb"
  ink-2: "#cdbfaa"
  ink-3: "#a3937e"
  turmeric: "#f0a531"
  turmeric-hover: "#f6b44c"
  turmeric-soft: "#3a2a12"
  turmeric-ink: "#2a1a04"
  leaf: "#8cc764"
  leaf-soft: "#1f2c15"
  leaf-soft-hover: "#283a1b"
  leaf-line: "#3d5a29"
  chilli: "#ec5b42"
  chilli-text: "#ff9a86"
  dial-face: "#1a1410"
  dial-ring: "#2c241c"
  tick-empty: "#3e3329"
  tick-filled: "#c98a2a"
  tick-full: "#c8432e"
typography:
  token-display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(96px, 14vw, 200px)"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
    fontFeature: "'tnum' 1"
  token-dial:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(64px, 8.5vw, 104px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
    fontFeature: "'tnum' 1"
  token-board:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
    fontFeature: "'tnum' 1"
  token-row:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
    fontFeature: "'tnum' 1"
  token-chip:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.15
  headline-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.45
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.45
  brand:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    fontVariation: "'wdth' 85"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  ui:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  xs: "6px"
  tab: "7px"
  control: "8px"
  track: "9px"
  chip: "10px"
  tile: "12px"
  panel: "14px"
  banner: "18px"
spacing:
  "2": "2px"
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "24": "24px"
components:
  button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
  button-hover:
    backgroundColor: "{colors.surface-3}"
  button-disabled:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-3}"
  button-primary:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.turmeric-ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.turmeric-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-3}"
  button-go:
    backgroundColor: "{colors.leaf-soft}"
    textColor: "{colors.leaf}"
    rounded: "{rounded.control}"
    height: "38px"
  button-go-hover:
    backgroundColor: "{colors.leaf-soft-hover}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "38px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.chilli}"
    rounded: "{rounded.control}"
    height: "38px"
  input-text:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "38px"
  tab:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.tab}"
    padding: "7px 14px"
  tab-selected:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px 18px 18px"
  token-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "8px 10px"
    width: "96px"
  token-chip-front:
    backgroundColor: "{colors.turmeric-soft}"
    textColor: "{colors.turmeric}"
  board-tile:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.token-board}"
    rounded: "{rounded.tile}"
    padding: "10px 16px"
  board-tile-ready:
    backgroundColor: "{colors.leaf-soft}"
    textColor: "{colors.leaf}"
  calling-banner:
    backgroundColor: "{colors.leaf-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.banner}"
    padding: "22px 32px"
  op-readout:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
    typography: "{typography.mono}"
    rounded: "{rounded.chip}"
    padding: "12px 14px"
---

# Design System: CampusBite

## Overview

**Creative North Star: "The Kitchen Wall Clock"**

The circular queue is drawn as the canteen's wall clock: fifty numbered slots around a dial, FRONT and REAR as two hands that sweep one slot per operation and visibly wrap past slot 0. Everything else on the screen is the counter around that clock. The material is a seasoned cast-iron tawa: a warm brown-black ground, cream ink, and three spice colours that each carry exactly one meaning. Turmeric is "in the kitchen / next up / the one action", curry-leaf green is "ready to collect", chilli red is "full or wrong".

Density is a working console, not a showcase. Three columns at the counter (order form, kitchen dial, pickup shelf plus C readout), compact 38px controls, 13px labels, hairline dividers in warm steel. The student board inverts that density: two columns of huge condensed token numbers built to be read from across the canteen. Numbers are the heroes of both views, set in Archivo's condensed heavy cut with tabular figures; the UI around them stays at normal width so the two never compete.

Depth is soft and offset: panels sit on the ground with a long, dark, downward shadow and a faint top-edge highlight, like iron plates on a counter. Nothing glows. Motion is mechanical and short: the hands sweep at 200ms on an ease-out and always move forward around the dial.

**Key Characteristics:**
- One dial signature: 50 slots, FRONT (turmeric) and REAR (cream) hands, forward-only sweep with wrap.
- Warm brown-black ground with three surface steps; cream ink in three steps.
- Spice colours are semantic, never decorative: turmeric = preparing / next / primary action, leaf = ready, chilli = full / error.
- Condensed heavy tabular numerals for every token number; normal-width Archivo for UI.
- Monospace appears only in the C operation readout.
- Soft offset shadows on panels and banners; no glow, no blur halos.

## Colors

A dark, warm, low-chroma iron ground carrying three saturated spice signals whose meaning never changes.

### Primary
- **Turmeric Amber** (turmeric): the queue's working colour. The FRONT hand, the front tick, the next token in the dial, the front chip, the "Next" board tile, the single primary button (Issue token), selection highlight, the focus outline, and "busy" readouts at 60% capacity or more. Turmeric Hover brightens the primary button on hover only.
- **Turmeric Soft** (turmeric-soft): the tinted fill behind a turmeric-bordered element (front chip, "Next" tile).
- **Turmeric Ink** (turmeric-ink): text on solid turmeric (primary button label, FRONT hand tag, text selection).

### Secondary
- **Curry-Leaf Green** (leaf): ready. Shelf token numbers, Ready-to-collect board numbers, the calling-banner number, Mark ready and Hand over labels, the O(1) complexity mark in the readout.
- **Leaf Soft / Leaf Soft Hover / Leaf Line** (leaf-soft, leaf-soft-hover, leaf-line): the fill, hover fill and border of every green surface: go buttons, the first shelf row, ready tiles, the calling banner.

### Tertiary
- **Chilli Red** (chilli): capacity reached and errors. "Full" readouts, the invalid-input border, error message icons, the danger button label.
- **Chilli Text** (chilli-text): the lighter red used for error message text and "full" counts on dark panels, where chilli itself would be too heavy at small sizes.

### Neutral
- **Tawa Ground** (ground): page background, input wells, segmented-control tracks, the C readout block.
- **Surface / Surface 2 / Surface 3** (surface, surface-2, surface-3): panels and the top bar; buttons, chips and tiles; hover and selected states. Each step is a small lift in lightness, never a hue shift.
- **Warm Steel Line / Line Strong / Line Hover** (line, line-strong, line-hover): hairline dividers and panel borders; control borders and the dashed bill rule; control borders on hover.
- **Cream Ink / Ink 2 / Ink 3** (ink, ink-2, ink-3): primary text and REAR hand; labels and secondary text; meta text, placeholders, dial numerals, disabled labels.
- **Dial Face / Dial Ring** (dial-face, dial-ring): the inner disc and guide rings of the dial.
- **Tick Empty / Tick Filled / Tick Full** (tick-empty, tick-filled, tick-full): slot ticks for an empty slot (3px), an occupied slot (9px), and every slot when the kitchen is full. The front slot's tick uses turmeric (chilli-text family when full).

### Named Rules
**The One Meaning Rule.** Each spice colour owns one state: turmeric is preparing, next and the primary action; leaf is ready; chilli is full or wrong. A spice colour never appears as decoration or brand flourish.

**The Never Colour Alone Rule.** Every coloured state is also stated in words and position: "50 of 50 slots · full", "Next", the first shelf row, the FRONT tag. Remove the colour and the screen must still say the same thing.

## Typography

**Display Font:** Archivo variable, condensed cut (width 68%, weight 800, with system-ui fallback)
**Body Font:** Archivo variable, normal width (with system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (400, 600), only in the C operation readout

**Character:** One family split by width: condensed heavy numerals read like kitchen ticket stamps, normal-width Archivo carries the calm UI around them. The mono face is the C program speaking, and nothing else gets it.

### Hierarchy
- **Token Display** (800, condensed, clamp(96px, 14vw, 200px), 0.85): the calling-banner number on the student board.
- **Token Dial** (800, condensed, clamp(64px, 8.5vw, 104px), 0.92): the next token inside the dial; 50px on narrow screens.
- **Token Board** (800, condensed, 64px, 1): board tiles in Preparing and Ready; 40px on narrow screens.
- **Token Row / Token Chip** (800, condensed, 34px and 26px): shelf rows and the front-to-rear strip.
- **Headline** (700, clamp(26px, 3vw, 36px), 1.15): the calling banner sentence; its sub-line drops to 0.6em, 500, ink-2. Board column headings use Headline Small (700, 22px).
- **Title** (700, 17px): panel headings (New order, Kitchen queue, Pickup shelf, Last operation) and top-bar readout values.
- **Body / UI** (400 at 15px; 500-600 at 14px): running text, menu item names, buttons, inputs, tabs.
- **Label** (500, 13px): field labels, panel counts, readout captions, dial "Next up". **Meta** (400, 12.5px): prices, prep times, slot indexes, "2nd in line".

### Named Rules
**The Tabular Token Rule.** Every number that can change (tokens, counts, slots, rupees, clock) uses tabular figures so values never jitter as they update. Token numbers are always condensed heavy; captions inside a token tile reset to normal width and weight 500.

**The Mono Is the C Program Rule.** JetBrains Mono appears only where the screen quotes the C program's operation (`enqueue(&kitchen, #213)`, index arithmetic, O(1)). UI text is never set in mono.

## Layout

The counter is a three-column grid: 360px order form, a fluid centre for the dial, 360px for shelf and readout, 20px gaps, 20px/24px outer padding, capped at 1640px. Below 1320px it becomes 340px plus fluid, with the right column spanning full width as two side-by-side panels and the Served and Revenue readouts hidden. Below 1100px the top-bar search hides. Below 860px everything stacks in one column with the dial first, then the order form, then shelf and readout; the top bar wraps with readouts on their own full-width row.

The top bar is sticky, 64px tall, on surface with a bottom hairline: brand, view tabs, then readouts pushed right, search, service clock. Panels use a heading row (16px 18px 0) and a body pad (16px 18px 18px). Rhythm steps are 2, 4, 6, 8, 12, 16, 18, 20, 24px; list rows use 9-12px vertical padding with hairline separators. The dial is a square capped at 540px wide, centred in its panel, with the next token, its owner and Mark ready stacked in the dial's centre.

The student board uses a full-width calling banner, then two columns at 1.4fr and 1fr (Preparing wider than Ready), each an auto-fill grid of tiles at least 150px wide (96px on narrow screens). Preparing shows at most 12 tiles, the last becoming "+N more".

## Elevation & Depth

A hybrid: tonal surface steps carry most layering, and one soft offset shadow lifts the major plates (panels and the calling banner) off the ground. The shadow is long, dark and downward with a 1px inset top highlight, so the plates read as heavy iron rather than floating cards. Selected tabs take a small 1-2px shadow. Nothing uses a coloured or blurred halo.

### Shadow Vocabulary
- **Plate** (`box-shadow: 0 1px 0 rgba(255, 240, 220, .05) inset, 0 14px 28px -10px rgba(0, 0, 0, .85), 0 2px 4px rgba(0, 0, 0, .45)`): every panel and the calling banner.
- **Selected tab** (`box-shadow: 0 1px 2px rgba(0,0,0,.4)`): the active tab inside the tab track.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(240, 165, 49, .18)`; chilli at .2 when invalid): text inputs on focus. A hard spread, not a blur.

### Named Rules
**The Iron Plate Rule.** Shadows fall down and away, dark and offset, never outward and coloured. Depth inside a plate comes from surface steps and hairlines, not more shadows.

## Shapes

Gently rounded throughout, scaled with the size of the thing: 6px for segment buttons and the hand tags, 7px for tabs, 8px for buttons, inputs and steppers, 9px for tab and segment tracks, 10px for token chips and the readout block, 12px for board tiles, 14px for panels, 18px for the calling banner. Borders are 1px warm steel hairlines everywhere; the bill uses a dashed rule, and the empty-state board tile a dashed border. The dial is the one circular form: thin guide rings, round-capped ticks, triangular hand tips, and pill-tagged hand labels that stay upright as the hands rotate.

## Components

### Buttons
Tactile, compact, square-shouldered with gentle corners.
- **Shape:** gently rounded (8px), 38px tall, 14px horizontal padding, 14px weight 600, icon at 17px with an 8px gap.
- **Primary:** solid turmeric with turmeric-ink label, 46px tall, 15px weight 700. Exactly one per view: Issue token. When blocked (kitchen full, invalid form) it drops to surface-3 with ink-3 text and its label changes ("Kitchen full").
- **Default:** surface-2 fill, line-strong border, cream label. Hover lifts to surface-3 with line-hover border; active presses down 1px.
- **Go:** leaf-soft fill, leaf-line border, leaf label, for the forward queue actions Mark ready and Hand over.
- **Ghost:** no fill or border, ink-2 label; hover adds surface-2. Used for secondary tools (Rush hour, End of day, Reset).
- **Danger:** default button with a chilli label (Cancel token).
- **Disabled:** surface-2, line border, ink-3 label, no press; never faded with opacity.
- Transitions: background, border and colour at 150ms; press at 100ms.

### Chips
- **Token chip:** surface-2 tile, line border, 10px radius, min 96px wide: "slot N" meta, condensed token number, student name. The front chip takes a turmeric border, turmeric-soft fill and turmeric number. The strip shows the first six from front to rear, then a "+N more" chip.

### Cards / Containers
- **Corner Style:** 14px panels, 18px calling banner, 12px board tiles.
- **Background:** surface for panels; leaf-soft for the calling banner when someone is being called, surface when idle.
- **Shadow Strategy:** Plate shadow (see Elevation & Depth).
- **Border:** 1px line (leaf-line on green surfaces).
- **Internal Padding:** 16px 18px 18px; heading row 16px 18px 0 with the title left and a 13px count right. Counts turn chilli-text and weight 600 when full.

### Inputs / Fields
- **Style:** ground-coloured well, 1px line-strong border, 8px radius, 38px tall, 14px text, ink-3 placeholder; label above at 13px weight 500 ink-2 with a 6px gap.
- **Focus:** border turns turmeric with a 3px translucent turmeric spread ring.
- **Error:** border turns chilli (chilli ring on focus), and a message row appears below: chilli alert icon plus chilli-text sentence that names the value and the fix ("1DS24CS017 already has token #199 on the kitchen. Hand it over or cancel it first.").
- **Stepper:** bordered 8px pill with 30px minus and plus cells on surface-2 and a bold tabular count between.
- **Segmented control:** ground track with 3px padding and 9px radius; the pressed segment takes surface-3 and cream text.

### Navigation
- **Tabs:** Counter / Student board in a ground track (3px padding, 9px radius, line border). Unselected tabs are ink-2 at 14px weight 500; hover goes to ink; selected takes surface-3, ink, and the selected-tab shadow.
- **Readouts:** caption at 13px ink-3 above a 17px bold tabular value. Value turns turmeric at 60% capacity or more and chilli when full.

### Kitchen Dial (signature)
The circular queue as a wall clock, drawn in SVG. Fifty round-capped ticks between radii 186 and 216 of a 600-unit dial: 3px tick-empty for free slots, 9px tick-filled for occupied slots, turmeric for the front slot; when the kitchen is full every tick turns tick-full and the front tick brightens. Slot numerals sit outside every 5 slots in ink-3 (600, tabular); on narrow screens only every 10th remains. Two hands share the centre: FRONT in turmeric with a turmeric-ink tag, REAR in cream with a ground-coloured tag. Each hand is a short shaft, a triangular tip pointing at its slot, and a 64 by 24 tag (6px radius) that counter-rotates to stay upright. Hands rotate at 200ms on the ease-out curve (cubic-bezier(.2, .8, .2, 1)) and always sweep forward, so a step from slot 49 to slot 0 visibly passes the top. When the queue is empty both hands dim to 35% opacity and the centre reads "Empty" in ink-3 with a one-line instruction. Ticks recolour at 200ms. Under reduced motion, hands and ticks jump without transition.

### Pickup Shelf
Rows of condensed leaf token number, name with items and wait as meta, and position ("2nd in line"). The first row takes a leaf-soft fill and carries the Hand over go button; when empty, one ink-3 sentence explains what will appear.

### C Operation Readout
A ground block with 10px radius in JetBrains Mono 12.5px at 1.75 line height: the operation name in turmeric (chilli-text for a rejection like "queue full"), the index arithmetic below it, and the complexity mark in leaf aligned right. A short ink-3 history list follows, rejections in chilli-text.

### Student Board
A calling banner (leaf-soft, leaf-line border, 18px radius, plate shadow) names the student and token in a headline, with the token number at display size in leaf; idle, it falls back to surface and ink-3 with "No orders ready yet". Below, Preparing tiles (first tile turmeric with a "Next" caption) and Ready tiles (all leaf). Empty columns show a dashed full-width tile with one sentence.

## Do's and Don'ts

### Do:
- **Do** draw the kitchen queue as the 50-slot dial with FRONT and REAR hands; the strip and board are views of the same order, front first.
- **Do** keep turmeric for preparing, next and the single primary action, leaf for ready, and chilli for full and errors.
- **Do** set every token number in condensed heavy Archivo (width 68%, weight 800) with tabular figures.
- **Do** state capacity in words beside the colour: "50 of 50 slots · full", "Kitchen full: stop issuing tokens."
- **Do** write error messages that name the value and the next step, with a chilli icon and chilli-text sentence under the field or action.
- **Do** sweep the hands forward at 200ms on cubic-bezier(.2, .8, .2, 1) and drop the transition under prefers-reduced-motion.
- **Do** lift panels with the Plate shadow and layer within them using surface steps and 1px warm steel hairlines.

### Don't:
- **Don't** replace the dial with a ticket list under hero stat cards.
- **Don't** use glow halos or coloured blurred shadows; the only coloured shadow is the 3px focus spread on inputs.
- **Don't** use JetBrains Mono anywhere outside the C operation readout.
- **Don't** fade disabled buttons with opacity; switch them to surface-2 or surface-3 with ink-3 text.
- **Don't** show more than one turmeric primary button in a view.
- **Don't** signal preparing, ready or full by colour alone.
