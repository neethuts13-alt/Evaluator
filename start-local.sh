#!/bin/sh
# Starts the app at http://localhost:8000 (needs Python 3)
echo "Open http://localhost:8000 in your browser. Press Ctrl+C to stop."
python3 -m http.server 8000
