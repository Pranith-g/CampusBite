---
version: 1
slug: "app-web"
primary_target: "app/web"
related_targets: ["app/server"]
---

---
version: 1
slug: "app-web"
primary_target: "app/web"
related_targets: ["app/server"]
---

## Scope

Ordering app. Students, phone first: sign in, menu with dish photos (words left, photo with Add on the right), cart, pretend payment, token status, token board, my orders, ready alert. Canteen owner, laptop first: incoming orders, the 50-slot kitchen dial carried over from the C dashboard, pickup shelf, "Ran out?" on waiting orders (refunds the student), and a Stock tab (starting quantity, left now, out-of-stock switch). Students also get a refund choice (canteen wallet or original method) and can pay from the wallet. Sign-in has a full-bleed dish photo with a sample token ticket. Visitor mode: Operate. Inherits the DESIGN.md world (warm dark ground, Archivo, turmeric = preparing and the one primary action, leaf = ready, chilli = errors). Separate from the C circular-queue dashboard, which stays unchanged.

## Audience, job, constraints

- Students on their own phones: pick food, pay, know their token and how long it takes. Laptop width docks the cart beside the menu.
- The owner moves tokens: only the front order can be marked ready, as in the queue.
- The user wants it as rich and interactive as the earlier dashboard; keep tokens and the dial.
- Token numbers in condensed heavy numerals are the signature element.
- Dish photos are Wikimedia Commons files with credits shown in the app.
- All data is synthetic. Never a real student USN. Payments are pretend and labelled so.
- No veg/non-veg filter for now: the canteen sells vegetarian food (egg items at most).

## Unresolved

- Calories, high-protein filter, combos, online hosting.
