# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Core: menu-driven C program (C99, MinGW gcc). It owns every data structure and every operation. No library containers.
- Bridge: Node.js `server.js` using only built-in modules. It forwards dashboard actions to the C program over stdin/stdout and returns the program's JSON.
- Dashboard: React + Vite (user's choice). It renders state from the C program and sends commands. It never holds its own queue.

## Users

- **Canteen counter staff** (primary): take a student's order, issue a token, mark orders ready when the kitchen finishes them, and hand food over at pickup. They use the staff console all through the lunch rush.
- **Students waiting in line** (secondary): read the student token board to see which tokens are being prepared and which are ready to collect.
- **Evaluator** (demo context): the course instructor watches a 5-minute live demo and checks that the circular queue is doing the real work.

## Product Purpose

CampusBite is a college canteen token management system built around a circular queue. Orders get FIFO tokens, the kitchen works through them in order, and the system shows every slot of the fixed-capacity queue as it fills, wraps, and drains. Success means no student gets skipped, the counter never accepts more orders than the kitchen can hold, and anyone can see the queue's state at a glance.

## Positioning

The kitchen's capacity is the queue's capacity. "Queue full" is a real business rule (stop issuing tokens), not an error, and the dashboard shows the actual circular buffer, front and rear moving and wrapping, instead of hiding it behind a list.

## Operating Context

- A college canteen counter at lunch: noisy, fast, a line of students, one staff member at a laptop.
- Two queues: a kitchen queue (capacity 50, orders being prepared) and a pickup shelf (capacity 20, orders ready to collect).
- The demo is shown on a laptop screen at a lab bench during a 5-minute evaluation (PPT, live demo, viva).

## Capabilities and Constraints

- Operations: place an order and issue a token (enqueue), mark ready (kitchen dequeue to pickup enqueue), hand over (pickup dequeue), peek next, search by token or USN, cancel a token (middle removal with shift), duplicate-USN check, estimated wait, end-of-day summary, save and load state to a file, and a rush-hour simulation that fills the queue to capacity.
- Edge cases the product must show: empty, full, not found, duplicate, invalid input.
- Full and empty are detected with a `count` variable; indices advance with `(i + 1) % CAPACITY`.
- Order fields: token number, student name, USN, items with quantities, bill total, time placed.
- USN format: 10 characters, college code + year + branch + roll number (pattern like `1DS24CS017`). Demo data uses invented USNs only. Never use a real student's USN.
- Currency: Indian rupees (₹). The menu is a realistic Indian college canteen menu with demo prices.
- Course rule: the program must be menu-driven C; the terminal menu works on its own without the dashboard.

## Evidence on Hand

- No real canteen data, menu, or student records. Every name, USN, price, and sales figure in the UI is synthetic demo data.

## Product Principles

1. The C queue is the source of truth. The UI only displays and requests.
2. Capacity limits are business rules, shown plainly rather than hidden.
3. A staff member mid-rush can read the next action in under a second.
4. Every operation is explainable in a viva: the screen can show what the queue just did.

## Accessibility & Inclusion

- Token numbers must be readable from a distance on the student board.
- State must never rely on colour alone (preparing vs ready vs full also differ in label and position).
