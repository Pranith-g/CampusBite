# CampusBite ordering app

Students order and pay from a phone. This is separate from the C circular-queue
project in the rest of this repository, which is unchanged.

## Run it

Needs Node 24 or newer. In the `app` folder:

    npm install
    npm run build
    npm start

Then open http://localhost:4000. Sign in with a demo account from
`server/seed.js`. All names, USNs and PINs there are invented.

`npm test` runs the server tests.

## What works now

**Students** (http://localhost:4000)

- Sign in, browse the menu with dish photos, add to cart
- Calories and protein for each dish, and a "High protein" filter (15 g or more)
- Pretend payment (no real money) and a token number
- Estimated time, and how many orders are ahead
- A live token board
- A "your food is ready" alert while the app is open
- Order history
- A dish that runs out after paying is refunded. The student chooses the
  canteen wallet (instant, spent only at this canteen) or the original UPI or
  card (a pretend refund that arrives in 2 to 3 days). The wallet can pay for
  the next order.
- "Only 3 left" and "Out of stock" on the menu, and a cart that says what to fix

**Canteen owner** (http://localhost:4000/#/owner, account in `server/seed.js`)

- Incoming orders as they arrive
- The kitchen queue drawn as a 50-slot dial with FRONT and REAR
- Mark the front order ready, hand orders over from the pickup shelf (20 places)
- "Add sample orders" to fill the kitchen for a demo (they use up stock)
- "Ran out?" on a waiting order: pick the dish that cannot be made. The
  student is refunded for it and the dish is marked out of stock. If nothing in
  the order can be made, the order is cancelled and leaves the kitchen queue;
  the orders behind it move up one slot, like the C queue.
- Stock screen: starting quantity and quantity left for each dish, and an
  out-of-stock switch. Every dish starts at 60. Paying takes stock, so two
  students cannot buy the same last plate.

For a demo, open the student side and the owner side in two tabs.

Marking a dish out of stock on the Stock screen stops new orders only. For
orders already paid, use "Ran out?" on the order.

Calories and protein are rough values for one serving from typical recipes.
Change them in `server/seed.js` to match your own canteen.

Not built yet: combos. The alert does not reach a phone when the app is closed.

## Dish photos

The photos in `web/public/food` are from Unsplash (unsplash.com) under the
Unsplash License: free to use, including in apps, with no permission or
payment needed. Credit is not required, but the photographers are still named
in `web/src/photo-credits.json` and on the app's Photo credits page. They are
not photos of this canteen's food. To use your own photo, replace the file
with the same name (any size; it is cropped to fit).

## Open it on a phone

With the phone on the same Wi-Fi as the laptop (PowerShell):

    $env:HOST = "0.0.0.0"; npm start

Then open `http://<laptop IP address>:4000` on the phone. Other people on that
Wi-Fi can reach the app while it runs.

## Folders

| Folder | What is in it |
|---|---|
| `server/` | Web server, sign-in, orders and the SQLite database |
| `web/` | The screens (React) |
| `test/` | Server tests |
| `data/` | The database file, created on first start. Delete it to reset the demo. |
