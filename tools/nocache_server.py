"""Simple HTTP server with no-cache headers for development."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

if __name__ == '__main__':
    # Threaded: the matrix modal spawns many web workers that importScripts
    # engine.js/combat.js in parallel; a single-threaded server can stall them.
    ThreadingHTTPServer(('', 8080), NoCacheHandler).serve_forever()
