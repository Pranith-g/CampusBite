/*
 * queue.c - circular queue operations (see queue.h for the idea)
 *
 * No library containers are used: the array, the indices and every
 * operation are written here by hand.
 */
#include <string.h>
#include "queue.h"

QueueStatus queue_init(Queue *q, int capacity)
{
    if (q == NULL || capacity <= 0 || capacity > MAX_QUEUE_SIZE)
        return Q_INVALID;

    q->capacity = capacity;
    q->front = 0;       /* the first order will be stored in slot 0      */
    q->rear = -1;       /* (rear + 1) % capacity gives 0 on first insert */
    q->count = 0;       /* empty                                         */
    return Q_OK;
}

int queue_is_empty(const Queue *q)
{
    return q == NULL || q->count == 0;
}

int queue_is_full(const Queue *q)
{
    return q != NULL && q->count == q->capacity;
}

int queue_size(const Queue *q)
{
    return q == NULL ? 0 : q->count;
}

QueueStatus queue_enqueue(Queue *q, const Order *order)
{
    if (q == NULL || order == NULL)
        return Q_INVALID;
    if (queue_is_full(q))
        return Q_FULL;                      /* kitchen at capacity */

    q->rear = (q->rear + 1) % q->capacity;  /* step forward, wrap to 0 */
    q->items[q->rear] = *order;             /* copy the order in       */
    q->count++;
    return Q_OK;
}

QueueStatus queue_dequeue(Queue *q, Order *out)
{
    if (q == NULL)
        return Q_INVALID;
    if (queue_is_empty(q))
        return Q_EMPTY;                     /* nothing to serve */

    if (out != NULL)
        *out = q->items[q->front];          /* copy the oldest order out */
    q->front = (q->front + 1) % q->capacity;
    q->count--;
    return Q_OK;
}

QueueStatus queue_peek(const Queue *q, Order *out)
{
    if (q == NULL || out == NULL)
        return Q_INVALID;
    if (queue_is_empty(q))
        return Q_EMPTY;

    *out = q->items[q->front];
    return Q_OK;
}

int queue_slot_of(const Queue *q, int k)
{
    if (q == NULL || k < 0 || k >= q->count)
        return -1;
    return (q->front + k) % q->capacity;    /* k steps after front, wrapped */
}

const Order *queue_at(const Queue *q, int k)
{
    int slot = queue_slot_of(q, k);
    return slot < 0 ? NULL : &q->items[slot];
}

int queue_find_token(const Queue *q, int token)
{
    int k;
    if (q == NULL)
        return -1;
    for (k = 0; k < q->count; k++)          /* walk front -> rear */
        if (queue_at(q, k)->token == token)
            return k;
    return -1;
}

int queue_find_usn(const Queue *q, const char *usn)
{
    int k;
    if (q == NULL || usn == NULL)
        return -1;
    for (k = 0; k < q->count; k++)
        if (strcmp(queue_at(q, k)->usn, usn) == 0)
            return k;
    return -1;
}

QueueStatus queue_remove_token(Queue *q, int token, Order *out)
{
    int k, j;
    if (q == NULL)
        return Q_INVALID;
    if (queue_is_empty(q))
        return Q_EMPTY;

    k = queue_find_token(q, token);
    if (k < 0)
        return Q_NOT_FOUND;

    if (out != NULL)
        *out = *queue_at(q, k);

    /* Shift every order behind position k one slot toward the front. */
    for (j = k; j < q->count - 1; j++) {
        int to   = (q->front + j) % q->capacity;
        int from = (q->front + j + 1) % q->capacity;
        q->items[to] = q->items[from];
    }

    /* The last slot is now unused: rear steps back (wrapping below 0). */
    q->rear = (q->rear - 1 + q->capacity) % q->capacity;
    q->count--;
    return Q_OK;
}

const char *queue_status_text(QueueStatus status)
{
    switch (status) {
    case Q_OK:        return "OK";
    case Q_EMPTY:     return "queue is empty";
    case Q_FULL:      return "queue is full";
    case Q_NOT_FOUND: return "not found";
    case Q_INVALID:   return "invalid input";
    }
    return "unknown status";
}
