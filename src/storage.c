/*
 * storage.c - text file persistence
 *
 * File layout (one order per line, fields separated by '|'):
 *
 *   CAMPUSBITE 1
 *   STATS <next_token> <served> <cancelled> <revenue>
 *   KITCHEN <count>
 *   <token>|<name>|<usn>|<placed_at>|<total>|<item_id>:<qty>,<item_id>:<qty>
 *   ...
 *   SHELF <count>
 *   ...
 *
 * Orders are written from front to rear, so loading them back with
 * enqueue rebuilds each queue in exactly the same FIFO order.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "storage.h"

#ifdef _WIN32
#include <direct.h>
#define MAKE_DIR(p) _mkdir(p)
#else
#include <sys/stat.h>
#define MAKE_DIR(p) mkdir(p, 0755)
#endif

static void write_queue(FILE *f, const char *label, const Queue *q)
{
    int k, i;
    fprintf(f, "%s %d\n", label, queue_size(q));
    for (k = 0; k < queue_size(q); k++) {
        const Order *o = queue_at(q, k);
        fprintf(f, "%d|%s|%s|%ld|%d|", o->token, o->name, o->usn, (long)o->placed_at, o->total);
        for (i = 0; i < o->item_count; i++)
            fprintf(f, "%s%d:%d", i ? "," : "", o->items[i].item_id, o->items[i].qty);
        fputc('\n', f);
    }
}

int storage_save(const Canteen *c, const char *path)
{
    FILE *f;
    MAKE_DIR(DATA_DIR);                 /* fine if it already exists */
    f = fopen(path, "w");
    if (f == NULL)
        return 0;
    fprintf(f, "CAMPUSBITE 1\n");
    fprintf(f, "STATS %d %d %d %ld\n", c->next_token, c->served, c->cancelled, c->revenue);
    write_queue(f, "KITCHEN", &c->kitchen);
    write_queue(f, "SHELF", &c->shelf);
    return fclose(f) == 0;
}

/* Parse one order line. Returns 1 if it is valid. */
static int parse_order(char *line, Order *o)
{
    char items[256];
    long placed;
    char *tok;

    memset(o, 0, sizeof *o);
    if (sscanf(line, "%d|%39[^|]|%10[^|]|%ld|%d|%255[^\n]",
               &o->token, o->name, o->usn, &placed, &o->total, items) != 6)
        return 0;
    o->placed_at = (time_t)placed;

    for (tok = strtok(items, ","); tok != NULL; tok = strtok(NULL, ",")) {
        int id, qty;
        if (o->item_count >= MAX_ITEMS || sscanf(tok, "%d:%d", &id, &qty) != 2)
            return 0;
        if (id < 0 || id >= MENU_COUNT || qty < 1 || qty > MAX_QTY)
            return 0;
        o->items[o->item_count].item_id = id;
        o->items[o->item_count].qty = qty;
        o->item_count++;
    }
    return o->item_count > 0 && canteen_valid_usn(o->usn);
}

static int read_queue(FILE *f, const char *label, Queue *q)
{
    char line[512], name[16];
    int n, k;
    if (fgets(line, sizeof line, f) == NULL ||
        sscanf(line, "%15s %d", name, &n) != 2 || strcmp(name, label) != 0 ||
        n < 0 || n > q->capacity)
        return 0;
    for (k = 0; k < n; k++) {
        Order o;
        if (fgets(line, sizeof line, f) == NULL || !parse_order(line, &o))
            return 0;
        if (queue_enqueue(q, &o) != Q_OK)
            return 0;
    }
    return 1;
}

int storage_load(Canteen *c, const char *path)
{
    char line[512];
    FILE *f = fopen(path, "r");
    canteen_init(c);
    if (f == NULL)
        return 0;                       /* first run: nothing saved yet */

    if (fgets(line, sizeof line, f) == NULL || strncmp(line, "CAMPUSBITE 1", 12) != 0 ||
        fgets(line, sizeof line, f) == NULL ||
        sscanf(line, "STATS %d %d %d %ld", &c->next_token, &c->served, &c->cancelled, &c->revenue) != 4 ||
        !read_queue(f, "KITCHEN", &c->kitchen) ||
        !read_queue(f, "SHELF", &c->shelf)) {
        fclose(f);
        canteen_init(c);                /* damaged file: start clean */
        return -1;
    }
    fclose(f);
    return 1;
}
