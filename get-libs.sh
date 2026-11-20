#!/bin/sh
# Run ONCE while online. Saves the 4 libraries into ./libs so the app works with no internet.
mkdir -p libs && cd libs || exit 1
B=https://cdnjs.cloudflare.com/ajax/libs
curl -fLO $B/xlsx/0.18.5/xlsx.full.min.js
curl -fLO $B/jszip/3.10.1/jszip.min.js
curl -fLO $B/pdf.js/3.11.174/pdf.min.js
curl -fLO $B/pdf.js/3.11.174/pdf.worker.min.js
echo "Done. You can now go offline."
