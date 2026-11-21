/*
 * pipe.c - one-line commands in, one-line JSON out
 *
 * Commands (fields separated by '|'):
 *   STATE                         current state of both queues
 *   MENU                          the canteen menu
 *   PLACE|name|usn|id:qty,id:qty  issue a token        (enqueue)
 *   READY                         kitchen -> shelf     (dequeue + enqueue)
 *   HANDOVER                      shelf -> served      (dequeue)
 *   CANCEL|token                  cancel a kitchen order (remove + shift)
 *   SEARCH|token-or-usn           find an active order (linear search)
 *   RUSH                          fill the kitchen with demo orders
 *   SUMMARY                       end of day totals
 *   NEWDAY                        clear everything
 *
 * Every reply has the shape
 *   {"ok":true|false,"code":"...","message":"...","op":{...}|null,
 *    "result":{...}|null,"state":{...}}
 * where "op" describes what the queue just did, line by line, so the
 * dashboard can show it.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "pipe.h"
#include "storage.h"

#define CMD_LEN 1024

/* What the last operation did, for the "Last operation" panel. */
typedef struct {
    const char *name;        /* e.g. "enqueue"             */
    const char *target;      /* e.g. "kitchen"             */
    const char *complexity;  /* "O(1)" or "O(n)"           */
    char lines[4][120];      /* the arithmetic, step by step */
    int  n;
} OpInfo;

static const char *code_name(CanteenStatus s)
{
    switch (s) {
    case CB_OK:            return "OK";
    case CB_KITCHEN_FULL:  return "KITCHEN_FULL";
    case CB_SHELF_FULL:    return "SHELF_FULL";
    case CB_KITCHEN_EMPTY: return "KITCHEN_EMPTY";
    case CB_SHELF_EMPTY:   return "SHELF_EMPTY";
    case CB_DUPLICATE_USN: return "DUPLICATE_USN";
    case CB_INVALID_NAME:  return "INVALID_NAME";
    case CB_INVALID_USN:   return "INVALID_USN";
    case CB_INVALID_ITEMS: return "INVALID_ITEMS";
    case CB_NOT_FOUND:     return "NOT_FOUND";
    case CB_ALREADY_READY: return "ALREADY_READY";
    case CB_ERROR:         return "ERROR";
    }
    return "ERROR";
}

/* Print a JSON string with the characters JSON requires escaped. */
static void json_str(const char *s)
{
    putchar('"');
    for (; *s; s++) {
        unsigned char ch = (unsigned char)*s;
        if (ch == '"' || ch == '\\') { putchar('\\'); putchar(ch); }
        else if (ch < 0x20)          printf("\\u%04x", ch);
        else                         putchar(ch);
    }
    putchar('"');
}

static int minutes_since(time_t t)
{
    double secs = difftime(time(NULL), t);
    return secs < 0 ? 0 : (int)(secs / 60);
}

static void print_order(const Queue *q, int k)
{
    const Order *o = queue_at(q, k);
    int i;
    printf("{\"slot\":%d,\"token\":%d,\"name\":", queue_slot_of(q, k), o->token);
    json_str(o->name);
    printf(",\"usn\":");
    json_str(o->usn);
    printf(",\"total\":%d,\"prep\":%d,\"waitingMin\":%d,\"items\":[",
           o->total, order_prep_minutes(o), minutes_since(o->placed_at));
    for (i = 0; i < o->item_count; i++)
        printf("%s{\"id\":%d,\"qty\":%d}", i ? "," : "", o->items[i].item_id, o->items[i].qty);
    printf("]}");
}

static void print_queue(const char *key, const Queue *q)
{
    int k;
    printf("\"%s\":{\"capacity\":%d,\"front\":%d,\"rear\":%d,\"count\":%d,\"orders\":[",
           key, q->capacity, q->front, q->rear, q->count);
    for (k = 0; k < queue_size(q); k++) {
        if (k) putchar(',');
        print_order(q, k);
    }
    printf("]}");
}

static void print_state(const Canteen *c)
{
    int k, prep_ahead = 0;
    for (k = 0; k < queue_size(&c->kitchen); k++)
        prep_ahead += order_prep_minutes(queue_at(&c->kitchen, k));
    printf("{\"nextToken\":%d,\"served\":%d,\"cancelled\":%d,\"revenue\":%ld,\"prepAhead\":%d,\"cooks\":%d,",
           c->next_token, c->served, c->cancelled, c->revenue, prep_ahead, COOKS);
    print_queue("kitchen", &c->kitchen);
    putchar(',');
    print_queue("shelf", &c->shelf);
    putchar('}');
}

/* Write one complete reply line and flush it, so the bridge sees it now. */
static void reply(const Canteen *c, CanteenStatus s, const char *message,
                  const OpInfo *op, const char *result_json)
{
    int i;
    printf("{\"ok\":%s,\"code\":\"%s\",\"message\":", s == CB_OK ? "true" : "false", code_name(s));
    json_str(message ? message : canteen_status_text(s));
    printf(",\"op\":");
    if (op) {
        printf("{\"name\":");
        json_str(op->name);
        printf(",\"target\":");
        json_str(op->target);
        printf(",\"complexity\":");
        json_str(op->complexity);
        printf(",\"lines\":[");
        for (i = 0; i < op->n; i++) {
            if (i) putchar(',');
            json_str(op->lines[i]);
        }
        printf("]}");
    } else {
        printf("null");
    }
    printf(",\"result\":%s,\"state\":", result_json ? result_json : "null");
    print_state(c);
    printf("}\n");
    fflush(stdout);
}

static void op_start(OpInfo *op, const char *name, const char *target, const char *complexity)
{
    op->name = name;
    op->target = target;
    op->complexity = complexity;
    op->n = 0;
}

static void op_line(OpInfo *op, const char *text)
{
    if (op->n < 4) {
        strncpy(op->lines[op->n], text, sizeof op->lines[0] - 1);
        op->lines[op->n][sizeof op->lines[0] - 1] = '\0';
        op->n++;
    }
}

static void print_menu(void)
{
    int i;
    printf("{\"ok\":true,\"code\":\"OK\",\"menu\":[");
    for (i = 0; i < MENU_COUNT; i++) {
        printf("%s{\"id\":%d,\"name\":", i ? "," : "", i);
        json_str(MENU[i].name);
        printf(",\"section\":");
        json_str(MENU[i].section);
        printf(",\"price\":%d,\"prep\":%d}", MENU[i].price, MENU[i].prep_min);
    }
    printf("],\"maxQty\":%d,\"maxItems\":%d,\"kitchenCapacity\":%d,\"shelfCapacity\":%d}\n",
           MAX_QTY, MAX_ITEMS, KITCHEN_CAPACITY, SHELF_CAPACITY);
    fflush(stdout);
}

/* Parse "id:qty,id:qty" into items. Returns the count, or -1 if bad. */
static int parse_items(char *text, OrderItem *items)
{
    int n = 0;
    char *tok;
    for (tok = strtok(text, ","); tok != NULL; tok = strtok(NULL, ",")) {
        int id, qty;
        if (n >= MAX_ITEMS || sscanf(tok, "%d:%d", &id, &qty) != 2)
            return -1;
        items[n].item_id = id;
        items[n].qty = qty;
        n++;
    }
    return n;
}

/* ---------- one handler per command ---------- */

static void cmd_place(Canteen *c, char *args)
{
    char *name = args, *usn, *list;
    char usn_buf[32];
    OrderItem items[MAX_ITEMS];
    int count, token = 0, old_rear = c->kitchen.rear, old_count = c->kitchen.count;
    CanteenStatus s;
    OpInfo op;
    char text[120];

    usn = name ? strchr(name, '|') : NULL;
    if (usn) *usn++ = '\0';
    list = usn ? strchr(usn, '|') : NULL;
    if (list) *list++ = '\0';
    if (!name || !usn || !list) {
        reply(c, CB_INVALID_ITEMS, "PLACE needs name|usn|items.", NULL, NULL);
        return;
    }
    strncpy(usn_buf, usn, sizeof usn_buf - 1);
    usn_buf[sizeof usn_buf - 1] = '\0';
    canteen_normalize_usn(usn_buf);
    count = parse_items(list, items);
    if (count < 0) count = 0;

    s = canteen_place_order(c, name, usn_buf, items, count, &token);
    if (s == CB_DUPLICATE_USN) {
        int pos;
        Where w = canteen_find_usn(c, usn_buf, &pos);
        const Queue *q = w == WHERE_KITCHEN ? &c->kitchen : &c->shelf;
        sprintf(text, "%s already has token %d %s. Hand it over or cancel it first.",
                usn_buf, queue_at(q, pos)->token, w == WHERE_KITCHEN ? "in the kitchen" : "on the pickup shelf");
        reply(c, s, text, NULL, NULL);
        return;
    }
    if (s == CB_KITCHEN_FULL) {
        op_start(&op, "reject enqueue", "kitchen", "O(1)");
        sprintf(text, "count == %d, kitchen at capacity", c->kitchen.capacity);
        op_line(&op, text);
        reply(c, s, NULL, &op, NULL);
        return;
    }
    if (s != CB_OK) {
        reply(c, s, NULL, NULL, NULL);
        return;
    }
    storage_save(c, DATA_FILE);
    op_start(&op, "enqueue", "kitchen", "O(1)");
    sprintf(text, "rear  = (%d + 1) %% %d = %d", old_rear, c->kitchen.capacity, c->kitchen.rear);
    op_line(&op, text);
    sprintf(text, "count = %d + 1 = %d", old_count, c->kitchen.count);
    op_line(&op, text);
    sprintf(text, "token #%d stored in slot %d", token, c->kitchen.rear);
    op_line(&op, text);
    sprintf(text, "Token %d issued.", token);
    {
        char result[48];
        sprintf(result, "{\"token\":%d}", token);
        reply(c, s, text, &op, result);
    }
}

static void cmd_ready(Canteen *c)
{
    int old_front = c->kitchen.front, old_srear = c->shelf.rear;
    Order o;
    OpInfo op;
    char text[120];
    CanteenStatus s = canteen_mark_ready(c, &o);
    if (s != CB_OK) {
        reply(c, s, NULL, NULL, NULL);
        return;
    }
    storage_save(c, DATA_FILE);
    op_start(&op, "dequeue kitchen, enqueue shelf", "kitchen", "O(1)");
    sprintf(text, "kitchen front = (%d + 1) %% %d = %d", old_front, c->kitchen.capacity, c->kitchen.front);
    op_line(&op, text);
    sprintf(text, "shelf rear    = (%d + 1) %% %d = %d", old_srear, c->shelf.capacity, c->shelf.rear);
    op_line(&op, text);
    sprintf(text, "#%d moved to the pickup shelf", o.token);
    op_line(&op, text);
    sprintf(text, "Token %d is ready.", o.token);
    reply(c, s, text, &op, NULL);
}

static void cmd_handover(Canteen *c)
{
    int old_front = c->shelf.front;
    Order o;
    OpInfo op;
    char text[120];
    CanteenStatus s = canteen_hand_over(c, &o);
    if (s != CB_OK) {
        reply(c, s, NULL, NULL, NULL);
        return;
    }
    storage_save(c, DATA_FILE);
    op_start(&op, "dequeue shelf", "shelf", "O(1)");
    sprintf(text, "shelf front = (%d + 1) %% %d = %d", old_front, c->shelf.capacity, c->shelf.front);
    op_line(&op, text);
    sprintf(text, "served = %d, revenue = Rs%ld", c->served, c->revenue);
    op_line(&op, text);
    sprintf(text, "Token %d handed to %s.", o.token, o.name);
    reply(c, s, text, &op, NULL);
}

static void cmd_cancel(Canteen *c, const char *args)
{
    int token = args ? atoi(args) : 0;
    int pos = queue_find_token(&c->kitchen, token);
    int old_rear = c->kitchen.rear, behind = pos >= 0 ? c->kitchen.count - pos - 1 : 0;
    Order o;
    OpInfo op;
    char text[120];
    CanteenStatus s = canteen_cancel(c, token, &o);
    if (s != CB_OK) {
        reply(c, s, NULL, NULL, NULL);
        return;
    }
    storage_save(c, DATA_FILE);
    op_start(&op, "remove + shift", "kitchen", "O(n)");
    sprintf(text, "found #%d at position %d (linear search)", token, pos + 1);
    op_line(&op, text);
    sprintf(text, "%d order%s behind it shifted one slot forward", behind, behind == 1 ? "" : "s");
    op_line(&op, text);
    sprintf(text, "rear = (%d - 1 + %d) %% %d = %d", old_rear, c->kitchen.capacity, c->kitchen.capacity, c->kitchen.rear);
    op_line(&op, text);
    sprintf(text, "Token %d cancelled.", o.token);
    reply(c, s, text, &op, NULL);
}

static void cmd_search(Canteen *c, char *args)
{
    char query[32], *end;
    long token;
    int pos = -1;
    Where w;
    OpInfo op;
    char text[120], result[200];

    if (args == NULL || *args == '\0') {
        reply(c, CB_NOT_FOUND, "Type a token number or a USN.", NULL, NULL);
        return;
    }
    strncpy(query, args, sizeof query - 1);
    query[sizeof query - 1] = '\0';
    token = strtol(query, &end, 10);
    if (*end == '\0') {
        w = canteen_find_token(c, (int)token, &pos);
    } else {
        canteen_normalize_usn(query);
        if (!canteen_valid_usn(query)) {
            reply(c, CB_INVALID_USN, NULL, NULL, NULL);
            return;
        }
        w = canteen_find_usn(c, query, &pos);
    }
    op_start(&op, "linear search", w == WHERE_SHELF ? "shelf" : "kitchen", "O(n)");
    if (w == WHERE_NONE) {
        sprintf(text, "walked %d kitchen + %d shelf orders, no match", c->kitchen.count, c->shelf.count);
        op_line(&op, text);
        sprintf(text, "No active order matches %s. It may already be served or cancelled.", query);
        reply(c, CB_NOT_FOUND, text, &op, NULL);
        return;
    }
    {
        const Queue *q = w == WHERE_KITCHEN ? &c->kitchen : &c->shelf;
        const Order *o = queue_at(q, pos);
        sprintf(text, "match at position %d of %d, slot %d", pos + 1, queue_size(q), queue_slot_of(q, pos));
        op_line(&op, text);
        sprintf(result, "{\"where\":\"%s\",\"position\":%d,\"slot\":%d,\"token\":%d}",
                w == WHERE_KITCHEN ? "kitchen" : "shelf", pos, queue_slot_of(q, pos), o->token);
        sprintf(text, "Token %d, %s: %s, position %d of %d.", o->token, o->name,
                w == WHERE_KITCHEN ? "in the kitchen" : "on the pickup shelf", pos + 1, queue_size(q));
        reply(c, CB_OK, text, &op, result);
    }
}

static void cmd_rush(Canteen *c)
{
    OpInfo op;
    char text[120];
    int added;
    if (queue_is_full(&c->kitchen)) {
        op_start(&op, "reject enqueue", "kitchen", "O(1)");
        sprintf(text, "count == %d, kitchen at capacity", c->kitchen.capacity);
        op_line(&op, text);
        reply(c, CB_KITCHEN_FULL, NULL, &op, NULL);
        return;
    }
    added = canteen_rush_hour(c);
    storage_save(c, DATA_FILE);
    op_start(&op, "rush hour", "kitchen", "O(1) each");
    sprintf(text, "enqueue x %d, rear = %d", added, c->kitchen.rear);
    op_line(&op, text);
    sprintf(text, "count == %d == capacity, next enqueue refused", c->kitchen.count);
    op_line(&op, text);
    sprintf(text, "%d demo orders added. The kitchen is full.", added);
    reply(c, CB_OK, text, &op, NULL);
}

static void cmd_summary(Canteen *c)
{
    OpInfo op;
    char text[120];
    op_start(&op, "summary", "day", "O(1)");
    sprintf(text, "served  = %d, revenue = Rs%ld", c->served, c->revenue);
    op_line(&op, text);
    sprintf(text, "average = Rs%ld, cancelled = %d", c->served ? c->revenue / c->served : 0L, c->cancelled);
    op_line(&op, text);
    sprintf(text, "open: kitchen %d, shelf %d", c->kitchen.count, c->shelf.count);
    op_line(&op, text);
    reply(c, CB_OK, "End of day summary.", &op, NULL);
}

static void cmd_newday(Canteen *c)
{
    OpInfo op;
    canteen_init(c);
    storage_save(c, DATA_FILE);
    op_start(&op, "queue_init", "kitchen", "O(1)");
    op_line(&op, "front = 0, rear = -1, count = 0 (both queues)");
    reply(c, CB_OK, "New day started.", &op, NULL);
}

int pipe_run(Canteen *c, const char *data_file)
{
    char line[CMD_LEN];
    (void)data_file;
    while (fgets(line, sizeof line, stdin) != NULL) {
        char *args;
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
            line[--len] = '\0';
        if (len == 0)
            continue;
        args = strchr(line, '|');
        if (args) *args++ = '\0';

        if      (strcmp(line, "STATE") == 0)    reply(c, CB_OK, "OK", NULL, NULL);
        else if (strcmp(line, "MENU") == 0)     print_menu();
        else if (strcmp(line, "PLACE") == 0)    cmd_place(c, args);
        else if (strcmp(line, "READY") == 0)    cmd_ready(c);
        else if (strcmp(line, "HANDOVER") == 0) cmd_handover(c);
        else if (strcmp(line, "CANCEL") == 0)   cmd_cancel(c, args);
        else if (strcmp(line, "SEARCH") == 0)   cmd_search(c, args);
        else if (strcmp(line, "RUSH") == 0)     cmd_rush(c);
        else if (strcmp(line, "SUMMARY") == 0)  cmd_summary(c);
        else if (strcmp(line, "NEWDAY") == 0)   cmd_newday(c);
        else                                    reply(c, CB_ERROR, "Unknown command.", NULL, NULL);
    }
    return 0;
}
