"""Simple HTTP server with no-cache headers for development."""
import argparse
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    # Keep-alive, against SimpleHTTPRequestHandler's HTTP/1.0 default. Under HTTP/1.0 the
    # server closes after every response, so one calculator page load opens ~41 TCP
    # connections and one `npm test` run opened 5879 — all of them contending for a listen
    # backlog of `request_queue_size = 5` while Chrome opens six connections per host. A SYN
    # dropped by a full accept queue is retransmitted by Windows and, past the retry limit,
    # fails the fetch outright; a script that never arrives is invisible in this log, because
    # the status line is written before the body and an unaccepted connection logs nothing.
    # Measured over one 30-test segment: 1410 new connections against 147, mean page load
    # 496 ms against 342 ms. `timeout` bounds an idle kept-alive connection so its handler
    # thread cannot linger: BaseHTTPRequestHandler turns the read timeout into a close.
    protocol_version = 'HTTP/1.1'
    timeout = 5

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def log_error(self, fmt, *args):
        # An idle kept-alive connection hitting `timeout` is the intended close, and
        # BaseHTTPRequestHandler reports it through log_error. Left alone it writes a
        # "Request timed out" line into the run log a reader is scanning for the cause of a
        # real failure — 13 of them in one `npm test` run. Everything else still reports.
        if fmt.startswith('Request timed out'):
            return
        super().log_error(fmt, *args)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Serve the calculator without browser caching.')
    parser.add_argument('--host', default=os.environ.get('NOCACHE_HOST', '127.0.0.1'))
    parser.add_argument(
        '--port',
        type=int,
        default=int(os.environ.get('NOCACHE_PORT', os.environ.get('PORT', '8080'))),
    )
    args = parser.parse_args()

    # Threaded: the matrix modal spawns many web workers that importScripts
    # engine.js/combat.js in parallel; a single-threaded server can stall them.
    # Host and port are explicit so parallel agent worktrees never have to
    # attach to a server owned by another checkout.
    ThreadingHTTPServer((args.host, args.port), NoCacheHandler).serve_forever()
