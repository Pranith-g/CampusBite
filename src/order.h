/*
 * order.h - one canteen order (the element stored in each queue slot)
 *
 * CampusBite: College Canteen Token Management System
 */
#ifndef ORDER_H
#define ORDER_H

#include <time.h>

#define NAME_LEN   40   /* student name, including the '\0'           */
#define USN_LEN    11   /* 10-character USN like 1DS24CS017, plus '\0' */
#define MAX_ITEMS  10   /* different menu items allowed in one order   */

/* One line of an order: which menu item, and how many. */
typedef struct {
    int item_id;        /* index into the canteen menu */
    int qty;            /* 1 to 10                     */
} OrderItem;

/* One order = one token. This whole struct is copied into a queue slot. */
typedef struct {
    int       token;                /* token number printed for the student */
    char      name[NAME_LEN];       /* student name                         */
    char      usn[USN_LEN];         /* student USN                          */
    OrderItem items[MAX_ITEMS];     /* what they ordered                    */
    int       item_count;           /* how many entries of items[] are used */
    int       total;                /* bill in rupees (whole rupees)        */
    time_t    placed_at;            /* when the token was issued            */
} Order;

#endif /* ORDER_H */
