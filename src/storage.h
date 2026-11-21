/*
 * storage.h - save and load the canteen to a plain text file
 */
#ifndef STORAGE_H
#define STORAGE_H

#include "canteen.h"

#define DATA_DIR   "data"
#define DATA_FILE  "data/campusbite.txt"

/* Write both queues (front to rear) and today's totals.      O(n)
 * Returns 1 on success, 0 if the file could not be written. */
int storage_save(const Canteen *c, const char *path);

/* Rebuild the canteen from the file by enqueueing each saved order
 * again, in order.                                             O(n)
 * Returns 1 if loaded, 0 if there is no file yet, -1 if the file
 * is damaged (the canteen is then left freshly initialised). */
int storage_load(Canteen *c, const char *path);

#endif /* STORAGE_H */
