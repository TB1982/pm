#!/usr/bin/env python3
"""Dev server for Tauri — sends Cache-Control: no-store on every response."""
import http.server
import os
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass  # suppress access logs

if __name__ == '__main__':
    directory = sys.argv[1] if len(sys.argv) > 1 else '.'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8085
    os.chdir(directory)
    http.server.HTTPServer(('', port), NoCacheHandler).serve_forever()
