#!/usr/bin/env python3
"""Simple SPA server with fallback to index.html for deep links."""

from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, unquote

HOST = "127.0.0.1"
PORT = 3000
ROOT = Path(__file__).resolve().parent


class SPARequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        # Keep default static file behavior for real files.
        translated = super().translate_path(path)
        requested = Path(translated)

        if requested.exists() or requested.suffix:
            return translated

        # If route points to a folder with index.html, serve it.
        route_path = Path(unquote(urlparse(path).path).lstrip("/"))
        folder_index = ROOT / route_path / "index.html"
        if folder_index.exists():
            return str(folder_index)

        # SPA fallback for client-side routes like /profile/
        return str(ROOT / "index.html")

    def log_message(self, fmt: str, *args) -> None:
        # Keep default logging format, but show cleaner timestamps/messages.
        super().log_message(fmt, *args)


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), SPARequestHandler)
    print(f"SPA server running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
