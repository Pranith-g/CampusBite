/*
 * queue.h - circular queue of Orders, implemented on a fixed array
 *
 * CampusBite uses two of these:
 *   kitchen queue : capacity 50  (orders being prepared)
 *   pickup shelf  : capacity 20  (orders ready to collect)
 *
 * How it works
 *   - items[] is a fixed array. front is the index of the oldest order,
 *     rear is the index of the newest order.
 *   - Indices move forward with  (index + 1) % capacity , so after the
 *     last slot they wrap back to slot 0. Slots freed at the front get
 *     reused, which a plain linear array queue cannot do.
 *   - count tells us how many orders are stored, so:
 *         empty  <=>  count == 0
 *         full   <=>  count == capacity
 */
#ifndef QUEUE_H
#define QUEUE_H

#include "order.h"

#define MAX_QUEUE_SIZE 50   /* largest capacity any queue may have */

/* Result of every queue operation. */
typedef enum {
    Q_OK = 0,       /* operation succeeded                         */
    Q_EMPTY,        /* nothing to dequeue / peek                   */
    Q_FULL,         /* no free slot: enqueue refused               */
    Q_NOT_FOUND,    /* search or remove found no matching order    */
    Q_INVALID       /* bad argument (NULL pointer, bad capacity)   */
} QueueStatus;

typedef struct {
    Order items[MAX_QUEUE_SIZE];  /* the circular buffer              */
    int   front;                  /* index of the oldest order        */
    int   rear;                   /* index of the newest order        */
    int   count;                  /* number of orders stored          */
    int   capacity;               /* slots in use: 1..MAX_QUEUE_SIZE  */
} Queue;

/* Set up an empty queue with the given capacity.            O(1) */
QueueStatus queue_init(Queue *q, int capacity);

int  queue_is_empty(const Queue *q);                      /* O(1) */
int  queue_is_full(const Queue *q);                       /* O(1) */
int  queue_size(const Queue *q);                          /* O(1) */

/* Add an order at the rear.                                  O(1) */
QueueStatus queue_enqueue(Queue *q, const Order *order);

/* Remove the order at the front and copy it into *out.
 * out may be NULL if the caller does not need the order.     O(1) */
QueueStatus queue_dequeue(Queue *q, Order *out);

/* Copy the front order into *out without removing it.        O(1) */
QueueStatus queue_peek(const Queue *q, Order *out);

/* Pointer to the k-th order counted from the front (k = 0 is the
 * front). Returns NULL if k is out of range. Used for display and
 * traversal.                                                  O(1) */
const Order *queue_at(const Queue *q, int k);

/* Array slot index of the k-th order from the front, or -1.  O(1) */
int queue_slot_of(const Queue *q, int k);

/* Linear search. Returns the position from the front (0-based) of
 * the first matching order, or -1 if there is none.           O(n) */
int queue_find_token(const Queue *q, int token);
int queue_find_usn(const Queue *q, const char *usn);

/* Remove the order with this token from anywhere in the queue
 * (used for "cancel token"). Every order behind it shifts one slot
 * toward the front, so FIFO order is kept for everyone else.  O(n) */
QueueStatus queue_remove_token(Queue *q, int token, Order *out);

/* Human-readable text for a status code. */
const char *queue_status_text(QueueStatus status);

#endif /* QUEUE_H */
