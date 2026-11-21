/*
 * test_canteen.c - checks the canteen rules and save/load
 *
 * Build and run:  build.bat test
 * All names and USNs below are invented demo values.
 */
#include <stdio.h>
#include <string.h>
#include "../src/canteen.h"
#include "../src/storage.h"

static int passed = 0, failed = 0;

#define CHECK(cond, what)                                        \
    do {                                                         \
        if (cond) { passed++; printf("  PASS  %s\n", what); }    \
        else      { failed++; printf("  FAIL  %s  (line %d)\n", what, __LINE__); } \
    } while (0)

#define TEST_FILE "build/test_state.txt"

static OrderItem one(int id, int qty)
{
    OrderItem it;
    it.item_id = id;
    it.qty = qty;
    return it;
}

static void test_validation(void)
{
    char usn[16];
    printf("\n[input validation]\n");
    CHECK(canteen_valid_usn("1DS24CS017"), "1DS24CS017 is a valid USN");
    CHECK(!canteen_valid_usn("1DS24CS01"), "9 characters is rejected");
    CHECK(!canteen_valid_usn("1DS24CS0171"), "11 characters is rejected");
    CHECK(!canteen_valid_usn("XDS24CS017"), "letter where a digit belongs is rejected");
    CHECK(!canteen_valid_usn("1D524CS017"), "digit where a letter belongs is rejected");
    strcpy(usn, "1ds24cs017");
    canteen_normalize_usn(usn);
    CHECK(strcmp(usn, "1DS24CS017") == 0, "lower-case USN is upper-cased");
    CHECK(canteen_valid_name("Ananya Rao"), "normal name is accepted");
    CHECK(canteen_valid_name("D'Souza"), "apostrophe is accepted");
    CHECK(!canteen_valid_name("A"), "one-letter name is rejected");
    CHECK(!canteen_valid_name("Ravi|Kumar"), "'|' is rejected (it separates fields in the save file)");
    CHECK(!canteen_valid_name("R2D2"), "digits are rejected");
}

static void test_place_and_flow(void)
{
    Canteen c;
    OrderItem items[2];
    Order o;
    int t1 = 0, t2 = 0;
    printf("\n[order flow]\n");
    canteen_init(&c);
    items[0] = one(0, 2);   /* 2x masala dosa = 90, 6 min */
    items[1] = one(10, 1);  /* 1x filter coffee = 15, 1 min */

    CHECK(canteen_place_order(&c, "Ravi Kumar", "1DS24ME112", items, 2, &t1) == CB_OK, "first order is accepted");
    CHECK(t1 == FIRST_TOKEN, "first token is FIRST_TOKEN");
    CHECK(queue_at(&c.kitchen, 0)->total == 105, "bill is 2 x 45 + 15 = 105");
    CHECK(order_prep_minutes(queue_at(&c.kitchen, 0)) == 6, "prep time is the slowest item, 6 min");

    CHECK(canteen_place_order(&c, "Ravi Again", "1DS24ME112", items, 1, NULL) == CB_DUPLICATE_USN,
          "same USN again is refused as a duplicate");
    CHECK(canteen_place_order(&c, "Ananya Rao", "1DS24CS017", items, 1, &t2) == CB_OK && t2 == t1 + 1,
          "second student gets the next token");
    CHECK(canteen_place_order(&c, "Bad Usn", "12345", items, 1, NULL) == CB_INVALID_USN, "bad USN is refused");
    CHECK(canteen_place_order(&c, "No Items", "1DS23EC141", items, 0, NULL) == CB_INVALID_ITEMS, "order with no items is refused");
    items[0] = one(99, 1);
    CHECK(canteen_place_order(&c, "Bad Item", "1DS23EC141", items, 1, NULL) == CB_INVALID_ITEMS, "unknown menu item is refused");
    items[0] = one(0, 11);
    CHECK(canteen_place_order(&c, "Too Many", "1DS23EC141", items, 1, NULL) == CB_INVALID_ITEMS, "quantity 11 is refused");

    CHECK(canteen_hand_over(&c, NULL) == CB_SHELF_EMPTY, "hand over with an empty shelf is refused");
    CHECK(canteen_mark_ready(&c, &o) == CB_OK && o.token == t1, "mark ready moves the oldest order");
    CHECK(queue_size(&c.kitchen) == 1 && queue_size(&c.shelf) == 1, "kitchen 1, shelf 1");
    CHECK(canteen_find_usn(&c, "1DS24ME112", NULL) == WHERE_SHELF, "duplicate check also sees the shelf");
    CHECK(canteen_cancel(&c, t1, NULL) == CB_ALREADY_READY, "an order on the shelf can't be cancelled");

    CHECK(canteen_hand_over(&c, &o) == CB_OK && o.token == t1, "hand over serves the shelf front");
    CHECK(c.served == 1 && c.revenue == 105, "served 1, revenue 105");
    items[0] = one(1, 1);
    CHECK(canteen_place_order(&c, "Ravi Kumar", "1DS24ME112", items, 1, NULL) == CB_OK,
          "after hand over the same USN can order again");

    CHECK(canteen_cancel(&c, t2, &o) == CB_OK && o.token == t2, "cancel a kitchen order");
    CHECK(c.cancelled == 1, "cancelled count is 1");
    CHECK(canteen_cancel(&c, 9999, NULL) == CB_NOT_FOUND, "cancel an unknown token is not found");
}

static void test_capacity(void)
{
    Canteen c;
    OrderItem item = { 5, 1 };
    int added, i, ok = 1;
    printf("\n[capacity rules]\n");
    canteen_init(&c);
    added = canteen_rush_hour(&c);
    CHECK(added == KITCHEN_CAPACITY && queue_is_full(&c.kitchen), "rush hour fills the kitchen to 50 / 50");
    CHECK(canteen_place_order(&c, "Late Student", "1DS25CV111", &item, 1, NULL) == CB_KITCHEN_FULL,
          "a full kitchen refuses new tokens");

    for (i = 0; i < SHELF_CAPACITY; i++)
        if (canteen_mark_ready(&c, NULL) != CB_OK) ok = 0;
    CHECK(ok && queue_is_full(&c.shelf), "20 orders fill the pickup shelf");
    CHECK(canteen_mark_ready(&c, NULL) == CB_SHELF_FULL, "mark ready is refused when the shelf is full");
    CHECK(queue_size(&c.kitchen) == KITCHEN_CAPACITY - SHELF_CAPACITY, "refused mark ready leaves the kitchen untouched");
    CHECK(canteen_place_order(&c, "Late Student", "1DS25CV111", &item, 1, NULL) == CB_OK,
          "freed kitchen slots accept new tokens again");
    CHECK(canteen_estimated_wait(&c, 2) > 2, "wait time grows with orders ahead");
}

static void test_save_load(void)
{
    Canteen a, b;
    OrderItem items[2];
    int k, same = 1;
    printf("\n[save and load]\n");
    canteen_init(&a);
    items[0] = one(0, 2);
    items[1] = one(13, 1);
    canteen_place_order(&a, "Ravi Kumar", "1DS24ME112", items, 2, NULL);
    canteen_place_order(&a, "Ananya Rao", "1DS24CS017", items, 1, NULL);
    canteen_place_order(&a, "Mohit Jain", "1DS23EC141", items + 1, 1, NULL);
    canteen_mark_ready(&a, NULL);
    canteen_mark_ready(&a, NULL);
    canteen_hand_over(&a, NULL);

    CHECK(storage_save(&a, TEST_FILE), "state is saved");
    CHECK(storage_load(&b, TEST_FILE) == 1, "state is loaded");
    CHECK(queue_size(&b.kitchen) == queue_size(&a.kitchen) && queue_size(&b.shelf) == queue_size(&a.shelf),
          "queue sizes match after loading");
    for (k = 0; k < queue_size(&a.kitchen); k++)
        if (queue_at(&a.kitchen, k)->token != queue_at(&b.kitchen, k)->token) same = 0;
    for (k = 0; k < queue_size(&a.shelf); k++)
        if (strcmp(queue_at(&a.shelf, k)->name, queue_at(&b.shelf, k)->name) != 0) same = 0;
    CHECK(same, "orders come back in the same FIFO order, names with spaces intact");
    CHECK(b.next_token == a.next_token && b.served == a.served && b.revenue == a.revenue,
          "token counter, served and revenue survive");
    CHECK(queue_at(&b.kitchen, 0)->items[0].item_id == 13, "order items survive");
    CHECK(storage_load(&b, "build/does_not_exist.txt") == 0, "missing file means a fresh start");

    {
        FILE *f = fopen(TEST_FILE, "w");
        fputs("CAMPUSBITE 1\nSTATS 1 2 3\n", f);
        fclose(f);
    }
    CHECK(storage_load(&b, TEST_FILE) == -1 && queue_is_empty(&b.kitchen), "damaged file is rejected and the day starts clean");
    remove(TEST_FILE);
}

int main(void)
{
    printf("CampusBite canteen tests\n");
    test_validation();
    test_place_and_flow();
    test_capacity();
    test_save_load();
    printf("\n%d passed, %d failed\n", passed, failed);
    return failed ? 1 : 0;
}
