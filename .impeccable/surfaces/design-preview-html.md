---
version: 1
slug: "design-preview-html"
primary_target: "design/preview.html"
related_targets: ["dashboard"]
---

## Scope

CampusBite dashboard: the staff console (Counter view) and the student token board. Visitor mode: Operate. Static design preview first (`design/preview.html`), then rebuilt in React + Vite under `dashboard/` and wired to the C program through the Node bridge.

## Audience, job, constraints

- Counter staff at a laptop during the lunch rush: issue tokens, mark ready, hand over. Must read the next action in under a second.
- Students: read Preparing and Ready token numbers from a distance on the board view.
- Demo on a laptop screen in a 5-minute evaluation; the queue's state must be explainable from the screen.
- All data is synthetic. USNs are invented in the `1DS24CS017` pattern; never a real student's USN.

## Direction contract

THESIS: The circular queue is the kitchen's wall clock: 50 numbered slots around a dial, FRONT and REAR as two hands, so modulo arithmetic is something you can see. It refuses the category default of a ticket list under hero stat cards and neon glow.

OWN-WORLD: Seasoned cast-iron tawa ground (warm brown-black), cream ink, turmeric amber for preparing and FRONT, curry-leaf green for ready, chilli red for full and errors, warm steel hairlines. Archivo variable: condensed heavy numerals for tokens, normal width for UI. Monospace only for the C operation readout. Offset soft shadows, never glow halos. Standard web controls.

STORY: Staff see what the queue holds and what to do next, issue a token from the order form, mark the front order ready, hand over from the shelf. Students see two big columns: Preparing and Ready.

FIRST VIEWPORT: Top bar with brand, Counter / Student board tabs, service clock, and inline readouts (kitchen 16/50, shelf 4/20, served, revenue). Left: the new-order form with menu, qty steppers, live bill, and Issue token as the one primary button. Centre: the dial with the next token inside and Mark ready under it, then the queue strip from front to rear. Right: the pickup shelf with Hand over, and the last C operation.

FORM: Direction A (kitchen display), user-pinned and refined; position 1 of 1. seed: none. No roll ran: the user pinned this direction, and a pinned direction beats the roll. Signature move: the dial's FRONT and REAR hands sweep one slot per operation (200 ms ease-out) and visibly wrap past slot 0.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Final menu items and prices: team will revise in the lab.
