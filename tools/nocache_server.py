"""Simple HTTP server with no-cache headers for development."""
import argparse
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

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
