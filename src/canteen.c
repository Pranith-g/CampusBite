/*
 * canteen.c - menu, order rules and the kitchen -> shelf -> served flow
 *
 * All names, USNs and prices here are demo data.
 */
#include <ctype.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "canteen.h"

const MenuItem MENU[] = {
    { "Masala dosa",      "Meals",  45, 6 },
    { "Idli vada",        "Meals",  35, 3 },
    { "Veg thali",        "Meals",  70, 4 },
    { "Chole bhature",    "Meals",  60, 7 },
    { "Veg biryani",      "Meals",  80, 5 },
    { "Samosa (2)",       "Snacks", 20, 2 },
    { "Vada pav",         "Snacks", 25, 2 },
    { "Gobi manchurian",  "Snacks", 50, 6 },
    { "Paneer roll",      "Snacks", 55, 5 },
    { "Bhel puri",        "Snacks", 30, 3 },
    { "Filter coffee",    "Drinks", 15, 1 },
    { "Masala chai",      "Drinks", 12, 1 },
    { "Fresh lime soda",  "Drinks", 30, 2 },
    { "Mango lassi",      "Drinks", 40, 2 },
    { "Badam milk",       "Drinks", 35, 1 }
};
const int MENU_COUNT = (int)(sizeof MENU / sizeof MENU[0]);

void canteen_init(Canteen *c)
{
    queue_init(&c->kitchen, KITCHEN_CAPACITY);
    queue_init(&c->shelf, SHELF_CAPACITY);
    c->next_token = FIRST_TOKEN;
    c->served = 0;
    c->cancelled = 0;
    c->revenue = 0;
}

/* ---------- input checks ---------- */

int canteen_valid_name(const char *name)
{
    size_t i, len;
    int letters = 0;
    if (name == NULL)
        return 0;
    len = strlen(name);
    if (len < 2 || len >= NAME_LEN)
        return 0;
    for (i = 0; i < len; i++) {
        unsigned char ch = (unsigned char)name[i];
        if (isalpha(ch))
            letters++;
        else if (ch != ' ' && ch != '.' && ch != '\'' && ch != '-')
            return 0;              /* digits, '|' and symbols are not allowed */
    }
    return letters >= 2;
}

void canteen_normalize_usn(char *usn)
{
    for (; usn != NULL && *usn; usn++)
        *usn = (char)toupper((unsigned char)*usn);
}

/* USN pattern: 1 digit, 2 letters, 2 digits, 2 letters, 3 digits.
 * Example: 1DS24CS017  (college code, year, branch, roll number). */
int canteen_valid_usn(const char *usn)
{
    static const char pattern[] = "9AA99AA999";   /* 9 = digit, A = letter */
    int i;
    if (usn == NULL || strlen(usn) != 10)
        return 0;
    for (i = 0; i < 10; i++) {
        unsigned char ch = (unsigned char)usn[i];
        if (pattern[i] == '9' && !isdigit(ch)) return 0;
        if (pattern[i] == 'A' && !isupper(ch)) return 0;
    }
    return 1;
}

/* ---------- order helpers ---------- */

int order_total(const Order *o)
{
    int i, total = 0;
    for (i = 0; i < o->item_count; i++)
        total += MENU[o->items[i].item_id].price * o->items[i].qty;
    return total;
}

/* The order is ready when its slowest item is ready. */
int order_prep_minutes(const Order *o)
{
    int i, longest = 0;
    for (i = 0; i < o->item_count; i++)
        if (MENU[o->items[i].item_id].prep_min > longest)
            longest = MENU[o->items[i].item_id].prep_min;
    return longest;
}

/* ---------- searches ---------- */

Where canteen_find_token(const Canteen *c, int token, int *pos)
{
    int k = queue_find_token(&c->kitchen, token);
    if (k >= 0) { if (pos) *pos = k; return WHERE_KITCHEN; }
    k = queue_find_token(&c->shelf, token);
    if (k >= 0) { if (pos) *pos = k; return WHERE_SHELF; }
    return WHERE_NONE;
}

Where canteen_find_usn(const Canteen *c, const char *usn, int *pos)
{
    int k = queue_find_usn(&c->kitchen, usn);
    if (k >= 0) { if (pos) *pos = k; return WHERE_KITCHEN; }
    k = queue_find_usn(&c->shelf, usn);
    if (k >= 0) { if (pos) *pos = k; return WHERE_SHELF; }
    return WHERE_NONE;
}

/* ---------- the three queue moves ---------- */

CanteenStatus canteen_place_order(Canteen *c, const char *name, const char *usn,
                                  const OrderItem *items, int item_count, int *token_out)
{
    Order o;
    int i;

    if (queue_is_full(&c->kitchen))        return CB_KITCHEN_FULL;   /* check first: no point asking more */
    if (!canteen_valid_name(name))         return CB_INVALID_NAME;
    if (!canteen_valid_usn(usn))           return CB_INVALID_USN;
    if (items == NULL || item_count < 1 || item_count > MAX_ITEMS)
        return CB_INVALID_ITEMS;
    for (i = 0; i < item_count; i++)
        if (items[i].item_id < 0 || items[i].item_id >= MENU_COUNT ||
            items[i].qty < 1 || items[i].qty > MAX_QTY)
            return CB_INVALID_ITEMS;
    if (canteen_find_usn(c, usn, NULL) != WHERE_NONE)
        return CB_DUPLICATE_USN;           /* one active order per student */

    memset(&o, 0, sizeof o);
    o.token = c->next_token;
    strncpy(o.name, name, NAME_LEN - 1);
    strncpy(o.usn, usn, USN_LEN - 1);
    for (i = 0; i < item_count; i++)
        o.items[i] = items[i];
    o.item_count = item_count;
    o.total = order_total(&o);
    o.placed_at = time(NULL);

    if (queue_enqueue(&c->kitchen, &o) != Q_OK)
        return CB_KITCHEN_FULL;

    c->next_token++;
    if (token_out)
        *token_out = o.token;
    return CB_OK;
}

CanteenStatus canteen_mark_ready(Canteen *c, Order *out)
{
    Order o;
    if (queue_is_empty(&c->kitchen)) return CB_KITCHEN_EMPTY;
    if (queue_is_full(&c->shelf))    return CB_SHELF_FULL;    /* check before removing anything */

    queue_dequeue(&c->kitchen, &o);  /* oldest order leaves the kitchen */
    queue_enqueue(&c->shelf, &o);    /* and joins the back of the shelf */
    if (out) *out = o;
    return CB_OK;
}

CanteenStatus canteen_hand_over(Canteen *c, Order *out)
{
    Order o;
    if (queue_dequeue(&c->shelf, &o) != Q_OK)
        return CB_SHELF_EMPTY;
    c->served++;
    c->revenue += o.total;
    if (out) *out = o;
    return CB_OK;
}

CanteenStatus canteen_cancel(Canteen *c, int token, Order *out)
{
    QueueStatus qs;
    if (queue_find_token(&c->shelf, token) >= 0)
        return CB_ALREADY_READY;   /* food is made: hand it over instead */
    qs = queue_remove_token(&c->kitchen, token, out);
    if (qs != Q_OK)
        return CB_NOT_FOUND;
    c->cancelled++;
    return CB_OK;
}

/* ---------- wait time and demo data ---------- */

int canteen_estimated_wait(const Canteen *c, int own_prep_min)
{
    int k, ahead = 0;
    for (k = 0; k < queue_size(&c->kitchen); k++)
        ahead += order_prep_minutes(queue_at(&c->kitchen, k));
    /* COOKS share the work ahead, then our own order is cooked. */
    return (ahead + COOKS - 1) / COOKS + own_prep_min;
}

int canteen_rush_hour(Canteen *c)
{
    static const char *first[] = { "Ravi", "Ananya", "Mohit", "Sneha", "Arjun", "Fatima", "Vikram", "Pooja",
                                   "Nikhil", "Sana", "Tejas", "Isha", "Karthik", "Lavanya", "Harsh", "Deepa" };
    static const char *last[]  = { "Kumar", "Rao", "Jain", "Patil", "Nair", "Shaikh", "Reddy", "Hegde",
                                   "Desai", "Khan", "Bhat", "Menon", "Gowda", "Iyer", "Shetty", "Naik" };
    static const char *branch[] = { "CS", "IS", "EC", "ME", "CV", "EE" };
    int added = 0, tries = 0;

    srand((unsigned)time(NULL));
    while (!queue_is_full(&c->kitchen) && tries < 1000) {
        char name[NAME_LEN], usn[USN_LEN];
        OrderItem item;
        tries++;
        strcpy(name, first[rand() % 16]);
        strcat(name, " ");
        strcat(name, last[rand() % 16]);
        /* demo USN: 1DS + year 23-25 + branch + roll 100-279 */
        usn[0] = '1'; usn[1] = 'D'; usn[2] = 'S';
        usn[3] = '2'; usn[4] = (char)('3' + rand() % 3);
        strcpy(usn + 5, branch[rand() % 6]);
        {
            int roll = 100 + rand() % 180;
            usn[7] = (char)('0' + roll / 100);
            usn[8] = (char)('0' + roll / 10 % 10);
            usn[9] = (char)('0' + roll % 10);
            usn[10] = '\0';
        }
        item.item_id = rand() % MENU_COUNT;
        item.qty = 1 + rand() % 2;
        if (canteen_place_order(c, name, usn, &item, 1, NULL) == CB_OK)
            added++;               /* a random duplicate USN is simply skipped */
    }
    return added;
}

const char *canteen_status_text(CanteenStatus s)
{
    switch (s) {
    case CB_OK:            return "Done.";
    case CB_KITCHEN_FULL:  return "Kitchen full: stop issuing tokens. Mark the front order ready to free a slot.";
    case CB_SHELF_FULL:    return "Pickup shelf full: hand over the front order first.";
    case CB_KITCHEN_EMPTY: return "No orders in the kitchen.";
    case CB_SHELF_EMPTY:   return "Nothing on the pickup shelf.";
    case CB_DUPLICATE_USN: return "This USN already has an active order. Hand it over or cancel it first.";
    case CB_INVALID_NAME:  return "Name must be 2-39 characters: letters, spaces, '.', '-' or an apostrophe.";
    case CB_INVALID_USN:   return "USN must be 10 characters like 1DS24CS017.";
    case CB_INVALID_ITEMS: return "Order needs 1-10 menu items, each with quantity 1-10.";
    case CB_NOT_FOUND:     return "Token not found.";
    case CB_ALREADY_READY: return "That order is already on the pickup shelf, so it can't be cancelled.";
    case CB_ERROR:         return "Something went wrong.";
    }
    return "Unknown result.";
}
