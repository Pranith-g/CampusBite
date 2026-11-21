/*
 * main.c - CampusBite terminal menu
 *
 * CampusBite: College Canteen Token Management System
 * Data structure: circular queue (see queue.h)
 *
 * Every change is saved to data/campusbite.txt straight away, and the
 * saved state is loaded again when the program starts.
 */
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "canteen.h"
#include "storage.h"
#include "pipe.h"

static Canteen canteen;

/* ================= input helpers ================= */

/* Read one line into buf (newline removed). Returns 0 on end of input. */
static int read_line(const char *prompt, char *buf, int size)
{
    size_t len;
    printf("%s", prompt);
    fflush(stdout);
    if (fgets(buf, size, stdin) == NULL)
        return 0;
    len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';
    } else {                            /* line longer than buf: drop the rest */
        int ch;
        while ((ch = getchar()) != '\n' && ch != EOF) { }
    }
    /* trim spaces at both ends */
    while (buf[0] == ' ') memmove(buf, buf + 1, strlen(buf));
    len = strlen(buf);
    while (len > 0 && buf[len - 1] == ' ') buf[--len] = '\0';
    return 1;
}

/* Keep asking until the user types a whole number in [min, max].
 * Returns 0 on end of input. */
static int read_int(const char *prompt, int min, int max, int *out)
{
    char buf[64], *end;
    long v;
    for (;;) {
        if (!read_line(prompt, buf, sizeof buf))
            return 0;
        v = strtol(buf, &end, 10);
        if (buf[0] != '\0' && *end == '\0' && v >= min && v <= max) {
            *out = (int)v;
            return 1;
        }
        printf("  Enter a whole number from %d to %d.\n", min, max);
    }
}

static int read_yes_no(const char *prompt)
{
    char buf[16];
    for (;;) {
        if (!read_line(prompt, buf, sizeof buf))
            return 0;
        if (buf[0] == 'y' || buf[0] == 'Y') return 1;
        if (buf[0] == 'n' || buf[0] == 'N') return 0;
        printf("  Type y or n.\n");
    }
}

static void pause_for_enter(void)
{
    char buf[8];
    read_line("\nPress Enter to continue...", buf, sizeof buf);
}

static void save_now(void)
{
    if (!storage_save(&canteen, DATA_FILE))
        printf("  Warning: could not save to %s\n", DATA_FILE);
}

/* ================= display helpers ================= */

static void line(void)
{
    printf("------------------------------------------------------------------------\n");
}

static int minutes_since(time_t t)
{
    double secs = difftime(time(NULL), t);
    return secs < 0 ? 0 : (int)(secs / 60);
}

static void print_items(const Order *o)
{
    int i;
    for (i = 0; i < o->item_count; i++)
        printf("%s%dx %s", i ? ", " : "", o->items[i].qty, MENU[o->items[i].item_id].name);
}

/* Draw the circular buffer as one row: # = used slot, . = free slot,
 * with F (front) and R (rear) marked underneath. */
static void print_ring(const Queue *q, const char *label)
{
    int i;
    printf("\n%s  %d / %d slots used", label, queue_size(q), q->capacity);
    if (queue_is_full(q)) printf("  [FULL]");
    if (queue_is_empty(q)) printf("  [EMPTY]");
    printf("\n\n  slot ");
    for (i = 0; i < q->capacity; i++) putchar(i % 10 == 0 ? '0' + (i / 10) % 10 : ' ');
    printf("\n       ");
    for (i = 0; i < q->capacity; i++) {
        int used = 0, k;
        for (k = 0; k < queue_size(q); k++)
            if (queue_slot_of(q, k) == i) { used = 1; break; }
        putchar(used ? '#' : '.');
    }
    printf("\n       ");
    for (i = 0; i < q->capacity; i++) {
        int f = !queue_is_empty(q) && i == q->front;
        int r = !queue_is_empty(q) && i == q->rear;
        putchar(f && r ? '*' : f ? 'F' : r ? 'R' : ' ');
    }
    printf("\n  front = %d   rear = %d   count = %d   next rear = (rear + 1) %% %d = %d\n",
           q->front, q->rear, q->count, q->capacity, (q->rear + 1) % q->capacity);
}

static void print_table(const Queue *q, const char *title)
{
    int k;
    printf("\n%s (front to rear)\n", title);
    line();
    if (queue_is_empty(q)) {
        printf("  (empty)\n");
        line();
        return;
    }
    printf("  %-4s %-5s %-6s %-20s %-11s %-6s %s\n", "pos", "slot", "token", "name", "usn", "bill", "waiting");
    line();
    for (k = 0; k < queue_size(q); k++) {
        const Order *o = queue_at(q, k);
        printf("  %-4d %-5d %-6d %-20.20s %-11s Rs%-4d %d min\n",
               k + 1, queue_slot_of(q, k), o->token, o->name, o->usn, o->total, minutes_since(o->placed_at));
    }
    line();
}

static void print_menu_card(void)
{
    int i;
    const char *section = "";
    printf("\n  No.  Item                 Price   Prep\n");
    for (i = 0; i < MENU_COUNT; i++) {
        if (strcmp(section, MENU[i].section) != 0) {
            section = MENU[i].section;
            printf("  -- %s --\n", section);
        }
        printf("  %2d.  %-20s Rs%-4d  %d min\n", i + 1, MENU[i].name, MENU[i].price, MENU[i].prep_min);
    }
}

static void print_slip(const Order *o, int wait)
{
    int i;
    printf("\n  +--------------------------------------+\n");
    printf("  |  CampusBite canteen                  |\n");
    printf("  |  TOKEN  %-6d                       |\n", o->token);
    printf("  |  %-36.36s|\n", o->name);
    printf("  |  %-36s|\n", o->usn);
    printf("  +--------------------------------------+\n");
    for (i = 0; i < o->item_count; i++) {
        const MenuItem *m = &MENU[o->items[i].item_id];
        printf("  |  %2dx %-23.23s Rs%-5d |\n", o->items[i].qty, m->name, m->price * o->items[i].qty);
    }
    printf("  +--------------------------------------+\n");
    printf("  |  Total                    Rs%-5d    |\n", o->total);
    printf("  |  Estimated wait           %-3d min    |\n", wait);
    printf("  +--------------------------------------+\n");
}

/* ================= menu actions ================= */

static void do_place_order(void)
{
    char name[NAME_LEN + 8], usn[32];
    OrderItem items[MAX_ITEMS];
    int count = 0, token, pos, wait, prep, i;
    Where w;
    Order draft;

    printf("\n=== New order ===\n");
    if (queue_is_full(&canteen.kitchen)) {
        printf("  %s\n", canteen_status_text(CB_KITCHEN_FULL));
        return;
    }

    for (;;) {
        if (!read_line("Student name (blank to go back): ", name, sizeof name) || name[0] == '\0')
            return;
        if (canteen_valid_name(name)) break;
        printf("  %s\n", canteen_status_text(CB_INVALID_NAME));
    }

    for (;;) {
        if (!read_line("USN (blank to go back): ", usn, sizeof usn) || usn[0] == '\0')
            return;
        canteen_normalize_usn(usn);
        if (!canteen_valid_usn(usn)) {
            printf("  %s\n", canteen_status_text(CB_INVALID_USN));
            continue;
        }
        w = canteen_find_usn(&canteen, usn, &pos);
        if (w != WHERE_NONE) {
            const Queue *q = w == WHERE_KITCHEN ? &canteen.kitchen : &canteen.shelf;
            printf("  %s already has token %d %s. Hand it over or cancel it first.\n",
                   usn, queue_at(q, pos)->token, w == WHERE_KITCHEN ? "in the kitchen queue" : "on the pickup shelf");
            continue;
        }
        break;
    }

    print_menu_card();
    for (;;) {
        int choice, qty, found = -1;
        if (!read_int("\nItem number (0 when done): ", 0, MENU_COUNT, &choice))
            return;
        if (choice == 0) {
            if (count > 0) break;
            printf("  Add at least one item.\n");
            continue;
        }
        if (!read_int("Quantity (1-10): ", 1, MAX_QTY, &qty))
            return;
        for (i = 0; i < count; i++)
            if (items[i].item_id == choice - 1) found = i;
        if (found >= 0) {
            items[found].qty = items[found].qty + qty > MAX_QTY ? MAX_QTY : items[found].qty + qty;
            printf("  %s is now x%d.\n", MENU[choice - 1].name, items[found].qty);
        } else if (count == MAX_ITEMS) {
            printf("  An order can have at most %d different items.\n", MAX_ITEMS);
        } else {
            items[count].item_id = choice - 1;
            items[count].qty = qty;
            count++;
            printf("  Added %dx %s.\n", qty, MENU[choice - 1].name);
        }
    }

    memset(&draft, 0, sizeof draft);
    for (i = 0; i < count; i++) draft.items[i] = items[i];
    draft.item_count = count;
    prep = order_prep_minutes(&draft);
    wait = canteen_estimated_wait(&canteen, prep);
    printf("\nBill: ");
    print_items(&draft);
    printf("\nTotal Rs%d, estimated wait about %d min.\n", order_total(&draft), wait);
    if (!read_yes_no("Issue token? (y/n): ")) {
        printf("  Order discarded. No token issued.\n");
        return;
    }

    {
        CanteenStatus s = canteen_place_order(&canteen, name, usn, items, count, &token);
        if (s != CB_OK) {
            printf("  %s\n", canteen_status_text(s));
            return;
        }
    }
    save_now();
    print_slip(queue_at(&canteen.kitchen, queue_size(&canteen.kitchen) - 1), wait);
    printf("  enqueue -> kitchen slot %d (rear), O(1)\n", canteen.kitchen.rear);
}

static void do_mark_ready(void)
{
    Order o;
    int from = canteen.kitchen.front;
    CanteenStatus s = canteen_mark_ready(&canteen, &o);
    printf("\n=== Mark ready ===\n");
    if (s != CB_OK) {
        printf("  %s\n", canteen_status_text(s));
        return;
    }
    save_now();
    printf("  Token %d (%s) is ready.\n", o.token, o.name);
    printf("  dequeue kitchen slot %d -> enqueue shelf slot %d, O(1)\n", from, canteen.shelf.rear);
    printf("  Kitchen %d/%d, shelf %d/%d\n", queue_size(&canteen.kitchen), KITCHEN_CAPACITY,
           queue_size(&canteen.shelf), SHELF_CAPACITY);
}

static void do_hand_over(void)
{
    Order o;
    CanteenStatus s = canteen_hand_over(&canteen, &o);
    printf("\n=== Hand over ===\n");
    if (s != CB_OK) {
        printf("  %s\n", canteen_status_text(s));
        return;
    }
    save_now();
    printf("  Token %d handed to %s. Rs%d collected.\n", o.token, o.name, o.total);
    printf("  dequeue shelf, O(1). Served today: %d\n", canteen.served);
}

static void do_peek(void)
{
    Order o;
    printf("\n=== Next up ===\n");
    if (queue_peek(&canteen.kitchen, &o) == Q_OK) {
        printf("  Kitchen: token %d, %s (", o.token, o.name);
        print_items(&o);
        printf("), waiting %d min\n", minutes_since(o.placed_at));
    } else {
        printf("  Kitchen: %s\n", canteen_status_text(CB_KITCHEN_EMPTY));
    }
    if (queue_peek(&canteen.shelf, &o) == Q_OK)
        printf("  Shelf:   token %d, %s is waiting to collect\n", o.token, o.name);
    else
        printf("  Shelf:   %s\n", canteen_status_text(CB_SHELF_EMPTY));
}

static void do_show_kitchen(void)
{
    print_ring(&canteen.kitchen, "KITCHEN QUEUE");
    print_table(&canteen.kitchen, "Kitchen orders");
}

static void do_show_shelf(void)
{
    print_ring(&canteen.shelf, "PICKUP SHELF");
    print_table(&canteen.shelf, "Ready to collect");
}

static void do_search(void)
{
    char buf[32], *end;
    long token;
    int pos;
    Where w;
    const Queue *q;
    const Order *o;

    printf("\n=== Search ===\n");
    if (!read_line("Token number or USN: ", buf, sizeof buf) || buf[0] == '\0')
        return;
    token = strtol(buf, &end, 10);
    if (*end == '\0') {
        w = canteen_find_token(&canteen, (int)token, &pos);
    } else {
        canteen_normalize_usn(buf);
        if (!canteen_valid_usn(buf)) {
            printf("  %s\n", canteen_status_text(CB_INVALID_USN));
            return;
        }
        w = canteen_find_usn(&canteen, buf, &pos);
    }
    if (w == WHERE_NONE) {
        printf("  No active order matches \"%s\". It may already be served or cancelled.\n", buf);
        return;
    }
    q = w == WHERE_KITCHEN ? &canteen.kitchen : &canteen.shelf;
    o = queue_at(q, pos);
    printf("  Token %d, %s (%s)\n  ", o->token, o->name, o->usn);
    print_items(o);
    printf("\n  %s, position %d of %d (slot %d). Linear search, O(n).\n",
           w == WHERE_KITCHEN ? "In the kitchen queue" : "On the pickup shelf", pos + 1, queue_size(q), queue_slot_of(q, pos));
}

static void do_cancel(void)
{
    int token;
    Order o;
    CanteenStatus s;
    printf("\n=== Cancel token ===\n");
    if (queue_is_empty(&canteen.kitchen)) {
        printf("  %s\n", canteen_status_text(CB_KITCHEN_EMPTY));
        return;
    }
    if (!read_int("Token to cancel: ", 0, 1000000, &token))
        return;
    s = canteen_cancel(&canteen, token, &o);
    if (s != CB_OK) {
        printf("  %s\n", canteen_status_text(s));
        return;
    }
    save_now();
    printf("  Token %d (%s) cancelled. Orders behind it moved up one slot, O(n).\n", o.token, o.name);
}

static void do_rush_hour(void)
{
    int added;
    printf("\n=== Rush hour ===\n");
    if (queue_is_full(&canteen.kitchen)) {
        printf("  %s\n", canteen_status_text(CB_KITCHEN_FULL));
        return;
    }
    added = canteen_rush_hour(&canteen);
    save_now();
    printf("  %d demo orders added. The next enqueue is refused:\n", added);
    printf("  %s\n", canteen_status_text(CB_KITCHEN_FULL));
    print_ring(&canteen.kitchen, "KITCHEN QUEUE");
}

static void do_summary(void)
{
    printf("\n=== End of day summary ===\n");
    printf("  Orders served      %d\n", canteen.served);
    printf("  Revenue            Rs%ld\n", canteen.revenue);
    printf("  Average bill       Rs%ld\n", canteen.served ? canteen.revenue / canteen.served : 0L);
    printf("  Cancelled          %d\n", canteen.cancelled);
    printf("  Still in kitchen   %d / %d\n", queue_size(&canteen.kitchen), KITCHEN_CAPACITY);
    printf("  Still on shelf     %d / %d\n", queue_size(&canteen.shelf), SHELF_CAPACITY);
    printf("  Next token         %d\n", canteen.next_token);
}

static void do_new_day(void)
{
    printf("\n=== Start a new day ===\n");
    printf("  This clears both queues and resets tokens, sales and counts.\n");
    if (!read_yes_no("  Are you sure? (y/n): ")) {
        printf("  Nothing changed.\n");
        return;
    }
    canteen_init(&canteen);
    save_now();
    printf("  New day started. First token is %d.\n", FIRST_TOKEN);
}

/* ================= main loop ================= */

static void print_main_menu(void)
{
    printf("\n========================================================================\n");
    printf("  CAMPUSBITE  canteen token system      kitchen %2d/%d   shelf %2d/%d\n",
           queue_size(&canteen.kitchen), KITCHEN_CAPACITY, queue_size(&canteen.shelf), SHELF_CAPACITY);
    printf("========================================================================\n");
    printf("   1. Place order (issue token)        8. Cancel a token\n");
    printf("   2. Mark next order ready            9. Show canteen menu\n");
    printf("   3. Hand over next ready order      10. Rush hour (fill the kitchen)\n");
    printf("   4. Show next token                 11. End of day summary\n");
    printf("   5. Show kitchen queue              12. Start a new day\n");
    printf("   6. Show pickup shelf\n");
    printf("   7. Search by token or USN           0. Save and exit\n");
}

int main(int argc, char **argv)
{
    int choice;
    int loaded = storage_load(&canteen, DATA_FILE);

    /* Dashboard mode: no menu, one JSON line per command (see pipe.h). */
    if (argc > 1 && strcmp(argv[1], "--pipe") == 0)
        return pipe_run(&canteen, DATA_FILE);

    printf("CampusBite: College Canteen Token Management System\n");
    if (loaded == 1)
        printf("Loaded saved state: %d in kitchen, %d on shelf, next token %d.\n",
               queue_size(&canteen.kitchen), queue_size(&canteen.shelf), canteen.next_token);
    else if (loaded == -1)
        printf("Saved file was damaged, starting a fresh day.\n");
    else
        printf("No saved state yet, starting a fresh day.\n");

    for (;;) {
        print_main_menu();
        if (!read_int("\nChoose an option: ", 0, 12, &choice))
            break;                       /* end of input: save and quit */
        switch (choice) {
        case 1:  do_place_order();  break;
        case 2:  do_mark_ready();   break;
        case 3:  do_hand_over();    break;
        case 4:  do_peek();         break;
        case 5:  do_show_kitchen(); break;
        case 6:  do_show_shelf();   break;
        case 7:  do_search();       break;
        case 8:  do_cancel();       break;
        case 9:  print_menu_card(); break;
        case 10: do_rush_hour();    break;
        case 11: do_summary();      break;
        case 12: do_new_day();      break;
        case 0:
            save_now();
            printf("Saved to %s. Goodbye.\n", DATA_FILE);
            return 0;
        }
        pause_for_enter();
    }
    save_now();
    return 0;
}
