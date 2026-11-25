# AI usage log

**Project:** CampusBite, a college canteen token management system (circular queue)
**Course:** 1BAI303 Capstone AAT

## Tools used

| Tool | Used for |
|---|---|
| **Claude Code** (Claude desktop app, Code tab; models Claude Opus 5.5 and Claude Sonnet 5.5) | Analysis of the brief, design options, all C / Node / React code, tests, docs |
| **impeccable** design skill (inside Claude Code) | Dashboard redesign process, design review, `DESIGN.md` |

## How we worked

We gave the AI the brief, made every product decision ourselves, and had it build one phase at a time. We checked each phase by running the tests and the program, then committed and pushed it ourselves with `git`.

## Key prompts and what came back

| # | Our prompt (summary) | What the AI did | Our decision |
|---|---|---|---|
| 1 | Shared the capstone PDF and our idea, *CampusBite, menu-driven C with a circular queue*: "don't write code, just analyse and ask questions" | Summarised the marking scheme, flagged that the PDF and the instructor's message disagree on PPT length, explained why a circular queue fits, proposed three scope levels and asked 9 questions | Chose **Option C** (two queues, cancel, file saving, rush hour), team of 3, **`count` variable** for full/empty, realistic capacities |
| 2 | Answered the questions: interactive dashboard, VS Code, multiple files | Proposed the architecture (C core + Node bridge + web dashboard), file layout, team split and build order | Accepted it, keeping the rule that **all queue logic stays in C** |
| 3 | "Should we build the UI first with hardcoded data, or the backend first? Give UI options" | Recommended backend first (a hardcoded UI tempts a fake JS queue) and built 4 visual directions as previews | **Rejected** the AI's recommended neon "cyber 3D" option as looking AI-generated. **Picked the kitchen-display direction** |
| 4 | "Use the design skills and redesign the kitchen display" | Ran the impeccable skill's process: product questions, a redesign around a **clock dial** (FRONT and REAR as hands), an automatic design check, two rounds of independent review, `DESIGN.md` | Chose **staff console + student board**, **React + Vite**, demo on a laptop |
| 5 | "Don't use my real USN. Use the format only" | Used only invented USNs in the `1DS24CS017` pattern everywhere | Privacy rule kept for all demo data |
| 6 | "Start Phase 1" | Wrote `order.h`, `queue.h`, `queue.c`, 47 tests and `build.bat` | We pushed it after the tests passed |
| 7 | "Continue" (Phase 2) | Canteen rules, text-file save/load, the 12-option terminal menu and 47 more tests. Drove the real menu with scripted input | Reviewed and pushed it |
| 8 | "Start Phase 3" | `--pipe` JSON mode, Node bridge, React dashboard and `start.bat`. Tested every flow in a browser | Asked the AI to commit and push this phase |
| 9 | "Continue the next phase" | README, this log, screenshots and the presentation | Fill in team names, USNs and roles |

## Bugs found and fixed during development

| Found by | Problem | Fix |
|---|---|---|
| AI test run | A slip printed by the terminal program was misaligned by one character | Widened the item column |
| AI test run | A message read "on the kitchen queue" | Changed it to "in the kitchen queue" / "on the pickup shelf" |
| Design review | The student board showed a different count from the counter | Every view now renders from one state object |
| Design review | Every pickup-shelf row had a Hand over button, which implied removing from the middle of a queue | Only the front order can be handed over |
| Design review | No "kitchen full" state was designed | Added the full state: red dial, Issue token disabled, a plain message |
| Browser test | FRONT and REAR labels overlapped when the two pointers were close | The REAR label moves outward when they are close |
| Browser test | The search icon covered the placeholder text | Fixed a CSS ordering bug |

## Part 2: the ordering app (`app/` folder)

After the capstone version was finished, we discussed a bigger idea at home: a canteen ordering app where students order and pay on their phones and the token system runs underneath. The capstone code in `src/`, `server/` and `dashboard/` was left unchanged and tagged `capstone-v1`; the app is a separate folder.

| # | Our prompt (summary) | What the AI did | Our decision |
|---|---|---|---|
| 10 | Pasted our feature list: menu, cart, pay in app, estimated time, owner login, stock, "order ready" alert, refunds to a canteen wallet; nice-to-haves photos, veg filter, calories, high protein, combos. "Start with the must-haves, one at a time" | Asked where to build it and whether to keep the queue. Built a first student slice (sign in, menu, cart, pretend payment, status) with Node's built-in web server and SQLite, so nothing extra to install | Keep the capstone untouched, build beside it in `app/`. **Skip the veg / non-veg filter**: our canteen sells no non-veg |
| 11 | "This is much poorer than the old dashboard. Bring back the token system, make it interactive, add dish photos like Zomato" | Brought back the token system as a 50-slot circular queue (same idea as the C code), the owner screen with the clock dial, the token board and a "ready" alert. Downloaded free food photos | Approved the full token set and the photo download |
| 12 | "Do the next step" (owner stock) | Stock screen: starting quantity, quantity left, out-of-stock switch. Paying takes stock inside one database transaction, so two students cannot buy the last plate | Accepted |
| 13 | "The photos are not good. Use free photos with no copyright issue" | Replaced every photo with Unsplash photos (free licence, credit not required), checked each one is vegetarian and has no brand name, added one-line dish descriptions and a veg mark | Accepted. Credits are still listed on the app's Photo credits page |
| 14 | "Change the sign-in page and make it good, and do the next" | Redesigned sign-in with a large dish photo. Built refunds: the owner marks a dish that ran out, the student chooses the canteen wallet (instant) or the original UPI / card (2 to 3 days), and the wallet can pay for later orders. A fully cancelled order leaves the queue and the orders behind it move up one slot, like `queue_remove_token` in the C code | Accepted |
| 15 | "Add calories and a high-protein filter" | Calories and protein for each dish (rough values from typical recipes), a "High protein" badge and filter (15 g or more) | Accepted. Combos left for later |

### Bugs found and fixed in the app

| Found by | Problem | Fix |
|---|---|---|
| Browser test | A "payment failed" message stayed on screen after the owner restocked the dish | The message clears when the cart or stock changes |
| Browser test | On a 320 px phone the stock rows squeezed the dish names | Kept the small photo and let the text wrap |
| Photo check | A photo found for "paneer roll" was really a chicken wrap; one biryani photo had chicken | Replaced with vegetarian photos |
| Photo check | The filter coffee photo showed a brand name | Replaced it |
| Our own screenshot | Saved logins painted the sign-in boxes blue | Kept the boxes dark when the browser fills them |
| Code review while building refunds | Cancelling an order from the middle could leave a gap in the circular queue | Orders behind it now move up one slot and REAR steps back, as in the C version |

## What we did ourselves

- Chose the problem and the data structure, and wrote the original idea
- Made every scope, design and technology decision listed above, including rejecting the AI's own recommended design
- Ran the program and tests on our machines, and made the Git commits and pushes for Phases 1 and 2
- For the ordering app: chose the features with our own canteen in mind (no non-veg, egg items at most), asked for the token system back, rejected the first photos, and ran every commit and push ourselves
- _Add here: anything each member changed by hand, extra test cases, menu or price changes made in the lab_

## Verification

- 94 automated tests pass (47 queue, 47 canteen), compiled with `-Wall -Wextra -pedantic` and no warnings
- The ordering app has 48 automated tests (`npm test` in `app/`): sign-in, prices, tokens and the circular queue, stock, refunds and the wallet, calories
- Every menu option and dashboard flow was run end to end: empty, full, duplicate, not found and invalid input
- Each member has read and can explain every file before the viva
