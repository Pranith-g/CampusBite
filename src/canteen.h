/*
 * canteen.h - canteen rules built on top of the circular queue
 *
 * Two queues model the real flow of an order:
 *
 *   place order ──enqueue──> [ kitchen queue, 50 ] ──mark ready──> [ pickup shelf, 20 ] ──hand over──> served
 *                                                   (dequeue + enqueue)                 (dequeue)
 */
#ifndef CANTEEN_H
#define CANTEEN_H

#include "queue.h"

#define KITCHEN_CAPACITY  50   /* orders the kitchen can hold at once   */
#define SHELF_CAPACITY    20   /* ready orders the counter shelf holds  */
#define COOKS              3   /* used for the estimated wait time      */
#define MAX_QTY           10   /* most of one item in a single order    */
#define FIRST_TOKEN      101   /* token numbers start here each day     */

/* One dish on the canteen menu. */
typedef struct {
    const char *name;
    const char *section;   /* "Meals", "Snacks" or "Drinks" */
    int         price;     /* rupees                        */
    int         prep_min;  /* minutes to prepare            */
} MenuItem;

extern const MenuItem MENU[];
extern const int MENU_COUNT;

/* Everything the canteen knows. */
typedef struct {
    Queue kitchen;         /* orders being prepared         */
    Queue shelf;           /* orders ready to collect       */
    int   next_token;      /* number the next order gets    */
    int   served;          /* orders handed over today      */
    int   cancelled;       /* orders cancelled today        */
    long  revenue;         /* rupees from served orders     */
} Canteen;

/* Result of a canteen action. Each one maps to a message for the user. */
typedef enum {
    CB_OK = 0,
    CB_KITCHEN_FULL,       /* kitchen queue at capacity: no new tokens   */
    CB_SHELF_FULL,         /* pickup shelf full: cannot mark ready       */
    CB_KITCHEN_EMPTY,      /* nothing to mark ready                      */
    CB_SHELF_EMPTY,        /* nothing to hand over                       */
    CB_DUPLICATE_USN,      /* this USN already has an active order       */
    CB_INVALID_NAME,
    CB_INVALID_USN,
    CB_INVALID_ITEMS,
    CB_NOT_FOUND,
    CB_ALREADY_READY,      /* cancel refused: order is on the shelf      */
    CB_ERROR
} CanteenStatus;

/* Where a search found an order. */
typedef enum { WHERE_NONE = 0, WHERE_KITCHEN, WHERE_SHELF } Where;

void canteen_init(Canteen *c);

/* Input checks. usn is upper-cased in place first by canteen_normalize_usn. */
int  canteen_valid_name(const char *name);
void canteen_normalize_usn(char *usn);
int  canteen_valid_usn(const char *usn);

/* Build an order's total and prep time from its items. */
int  order_total(const Order *o);
int  order_prep_minutes(const Order *o);

/* Issue a token: validate, check duplicate USN, enqueue into the kitchen.
 * On success *token_out holds the new token number.                O(n) */
CanteenStatus canteen_place_order(Canteen *c, const char *name, const char *usn,
                                  const OrderItem *items, int item_count, int *token_out);

/* Kitchen front -> shelf rear.                                      O(1) */
CanteenStatus canteen_mark_ready(Canteen *c, Order *out);

/* Shelf front -> served. Adds the bill to today's revenue.          O(1) */
CanteenStatus canteen_hand_over(Canteen *c, Order *out);

/* Cancel a token that is still in the kitchen.                      O(n) */
CanteenStatus canteen_cancel(Canteen *c, int token, Order *out);

/* Search both queues. Returns where it was found and its position
 * from the front (via *pos), or WHERE_NONE.                         O(n) */
Where canteen_find_token(const Canteen *c, int token, int *pos);
Where canteen_find_usn(const Canteen *c, const char *usn, int *pos);

/* Minutes a new order with this prep time would wait.               O(n) */
int canteen_estimated_wait(const Canteen *c, int own_prep_min);

/* Fill the kitchen with demo orders until it is full.
 * Returns how many orders were added.                               O(n) */
int canteen_rush_hour(Canteen *c);

const char *canteen_status_text(CanteenStatus s);

#endif /* CANTEEN_H */
