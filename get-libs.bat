@echo off
rem Run ONCE while online. Saves the 4 libraries into the libs folder so the app works with no internet.
if not exist libs mkdir libs
cd libs
set B=https://cdnjs.cloudflare.com/ajax/libs
curl -fLO %B%/xlsx/0.18.5/xlsx.full.min.js
curl -fLO %B%/jszip/3.10.1/jszip.min.js
curl -fLO %B%/pdf.js/3.11.174/pdf.min.js
curl -fLO %B%/pdf.js/3.11.174/pdf.worker.min.js
echo Done. You can now go offline.
pause
