/*
 * pipe.h - machine mode for the dashboard
 *
 * Started as:  campusbite.exe --pipe
 * Reads one command per line on stdin and answers with one line of
 * JSON on stdout. The Node bridge (server/server.js) talks to this.
 * All queue work still happens in C; the dashboard only displays it.
 */
#ifndef PIPE_H
#define PIPE_H

#include "canteen.h"

/* Run the command loop until stdin closes. Returns the exit code. */
int pipe_run(Canteen *c, const char *data_file);

#endif /* PIPE_H */
