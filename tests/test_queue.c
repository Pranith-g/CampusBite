/*
 * test_queue.c - checks every circular queue operation and edge case
 *
 * Build and run:  build.bat test
 * Each CHECK prints PASS or FAIL. The program exits with 1 if any fail.
 * All USNs below are invented demo values.
 */
#include <stdio.h>
#include <string.h>
#include "../src/queue.h"

static int passed = 0, failed = 0;

#define CHECK(cond, what)                                        \
    do {                                                         \
        if (cond) { passed++; printf("  PASS  %s\n", what); }    \
        else      { failed++; printf("  FAIL  %s  (line %d)\n", what, __LINE__); } \
    } while (0)

/* Build a small demo order with the given token and USN. */
static Order make_order(int token, const char *usn)
{
    Order o;
    memset(&o, 0, sizeof o);
    o.token = token;
    strncpy(o.usn, usn, USN_LEN - 1);
    strncpy(o.name, "Demo Student", NAME_LEN - 1);
    o.item_count = 1;
    o.items[0].item_id = 0;
    o.items[0].qty = 1;
    o.total = 45;
    return o;
}

static void test_init(void)
{
    Queue q;
    printf("\n[init]\n");
    CHECK(queue_init(&q, 50) == Q_OK, "init with capacity 50");
    CHECK(queue_is_empty(&q), "new queue is empty");
    CHECK(!queue_is_full(&q), "new queue is not full");
    CHECK(queue_size(&q) == 0, "new queue has size 0");
    CHECK(queue_init(&q, 0) == Q_INVALID, "capacity 0 is rejected");
    CHECK(queue_init(&q, -5) == Q_INVALID, "negative capacity is rejected");
    CHECK(queue_init(&q, MAX_QUEUE_SIZE + 1) == Q_INVALID, "capacity above MAX_QUEUE_SIZE is rejected");
    CHECK(queue_init(NULL, 10) == Q_INVALID, "NULL queue is rejected");
}

static void test_empty(void)
{
    Queue q;
    Order o;
    printf("\n[empty queue]\n");
    queue_init(&q, 5);
    CHECK(queue_dequeue(&q, &o) == Q_EMPTY, "dequeue on empty queue returns Q_EMPTY");
    CHECK(queue_peek(&q, &o) == Q_EMPTY, "peek on empty queue returns Q_EMPTY");
    CHECK(queue_at(&q, 0) == NULL, "queue_at(0) on empty queue is NULL");
    CHECK(queue_find_token(&q, 1) == -1, "search on empty queue finds nothing");
    CHECK(queue_remove_token(&q, 1, NULL) == Q_EMPTY, "cancel on empty queue returns Q_EMPTY");
}

static void test_fifo(void)
{
    Queue q;
    Order o, a = make_order(101, "1DS24CS017"), b = make_order(102, "1DS23EC141"), c = make_order(103, "1DS25IS108");
    printf("\n[FIFO order]\n");
    queue_init(&q, 5);
    queue_enqueue(&q, &a);
    queue_enqueue(&q, &b);
    queue_enqueue(&q, &c);
    CHECK(queue_size(&q) == 3, "three orders stored");
    CHECK(queue_peek(&q, &o) == Q_OK && o.token == 101, "peek shows the first token issued");
    CHECK(queue_size(&q) == 3, "peek does not remove anything");
    queue_dequeue(&q, &o);
    CHECK(o.token == 101, "first dequeue serves token 101");
    queue_dequeue(&q, &o);
    CHECK(o.token == 102, "second dequeue serves token 102");
    queue_dequeue(&q, &o);
    CHECK(o.token == 103, "third dequeue serves token 103");
    CHECK(queue_is_empty(&q), "queue is empty again");
}

static void test_full(void)
{
    Queue q;
    Order o = make_order(1, "1DS24ME112");
    int i, ok = 1;
    printf("\n[full queue]\n");
    queue_init(&q, 50);
    for (i = 0; i < 50; i++) {
        o.token = 200 + i;
        if (queue_enqueue(&q, &o) != Q_OK) ok = 0;
    }
    CHECK(ok, "50 orders fit in a capacity-50 queue");
    CHECK(queue_is_full(&q), "queue reports full at 50 / 50");
    o.token = 999;
    CHECK(queue_enqueue(&q, &o) == Q_FULL, "51st order is refused with Q_FULL");
    CHECK(queue_size(&q) == 50, "refused enqueue does not change the size");
    CHECK(queue_at(&q, 49)->token == 249, "rear is still the 50th order, not the refused one");
}

static void test_wrap(void)
{
    Queue q;
    Order o = make_order(0, "1DS25CV111");
    int i;
    printf("\n[wrap-around]\n");
    queue_init(&q, 5);
    for (i = 1; i <= 5; i++) { o.token = i; queue_enqueue(&q, &o); }   /* slots 0..4 */
    for (i = 0; i < 3; i++) queue_dequeue(&q, NULL);                     /* front -> 3 */
    CHECK(q.front == 3 && q.count == 2, "after 3 dequeues front = 3, count = 2");

    o.token = 6; queue_enqueue(&q, &o);
    CHECK(q.rear == 0, "next enqueue wraps rear from 4 to 0");
    o.token = 7; queue_enqueue(&q, &o);
    o.token = 8; queue_enqueue(&q, &o);
    CHECK(q.rear == 2 && queue_is_full(&q), "freed slots 0..2 are reused, queue full again");

    CHECK(queue_slot_of(&q, 0) == 3, "front is still slot 3");
    CHECK(queue_slot_of(&q, 4) == 2, "5th order sits in slot (3 + 4) % 5 = 2");
    for (i = 0; i < 5; i++) {
        queue_dequeue(&q, &o);
        if (o.token != 4 + i) break;
    }
    CHECK(i == 5, "tokens still come out in order 4, 5, 6, 7, 8 across the wrap");
    CHECK(q.front == 3 && queue_is_empty(&q), "front wrapped all the way round to slot 3");
}

static void test_search(void)
{
    Queue q;
    Order a = make_order(301, "1DS24CS017"), b = make_order(302, "1DS23EC141");
    printf("\n[search]\n");
    queue_init(&q, 5);
    queue_enqueue(&q, &a);
    queue_enqueue(&q, &b);
    CHECK(queue_find_token(&q, 302) == 1, "token 302 is 2nd from the front");
    CHECK(queue_find_token(&q, 999) == -1, "unknown token is not found");
    CHECK(queue_find_usn(&q, "1DS24CS017") == 0, "USN search finds the duplicate");
    CHECK(queue_find_usn(&q, "1DS25IS108") == -1, "unknown USN is not found");
    CHECK(queue_find_usn(&q, NULL) == -1, "NULL USN is handled");
}

static void test_cancel(void)
{
    Queue q;
    Order o = make_order(0, "1DS24EE146");
    int i;
    printf("\n[cancel token]\n");
    queue_init(&q, 5);
    for (i = 1; i <= 5; i++) { o.token = i; queue_enqueue(&q, &o); }
    queue_dequeue(&q, NULL);
    queue_dequeue(&q, NULL);                         /* front = 2 : tokens 3 4 5  */
    o.token = 6; queue_enqueue(&q, &o);              /* wraps to slot 0           */
    o.token = 7; queue_enqueue(&q, &o);              /* slot 1 : tokens 3 4 5 6 7 */

    CHECK(queue_remove_token(&q, 5, &o) == Q_OK && o.token == 5, "cancel token 5 from the middle");
    CHECK(queue_size(&q) == 4, "size drops to 4");
    CHECK(queue_at(&q, 0)->token == 3 && queue_at(&q, 1)->token == 4 &&
          queue_at(&q, 2)->token == 6 && queue_at(&q, 3)->token == 7,
          "remaining order is 3, 4, 6, 7 (shift crossed the wrap)");
    CHECK(q.rear == 0, "rear stepped back from slot 1 to slot 0");

    CHECK(queue_remove_token(&q, 3, NULL) == Q_OK && queue_at(&q, 0)->token == 4, "cancel the front token");
    CHECK(queue_remove_token(&q, 7, NULL) == Q_OK && queue_at(&q, queue_size(&q) - 1)->token == 6, "cancel the rear token");
    CHECK(queue_remove_token(&q, 42, NULL) == Q_NOT_FOUND, "cancel an unknown token returns Q_NOT_FOUND");

    o.token = 8;
    CHECK(queue_enqueue(&q, &o) == Q_OK && queue_at(&q, queue_size(&q) - 1)->token == 8,
          "enqueue after cancels still adds at the rear");
}

static void test_cancel_wrap_rear(void)
{
    Queue q;
    Order o = make_order(0, "1DS23IS172");
    printf("\n[cancel when rear is slot 0]\n");
    queue_init(&q, 3);
    o.token = 1; queue_enqueue(&q, &o);
    o.token = 2; queue_enqueue(&q, &o);
    o.token = 3; queue_enqueue(&q, &o);
    queue_dequeue(&q, NULL);
    o.token = 4; queue_enqueue(&q, &o);              /* rear wraps to slot 0 */
    CHECK(q.rear == 0, "rear is slot 0");
    queue_remove_token(&q, 4, NULL);
    CHECK(q.rear == 2, "removing the rear order steps rear back from 0 to 2");
}

int main(void)
{
    printf("CampusBite circular queue tests\n");
    test_init();
    test_empty();
    test_fifo();
    test_full();
    test_wrap();
    test_search();
    test_cancel();
    test_cancel_wrap_rear();
    printf("\n%d passed, %d failed\n", passed, failed);
    return failed ? 1 : 0;
}
