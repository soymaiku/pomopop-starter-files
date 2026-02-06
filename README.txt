Pomopop Offline - How to Run

Option 1: Quick open (may not work in some browsers)
1) Extract the ZIP.
2) Open the folder.
3) Double-click index.html.

Option 2: Recommended (works everywhere)
1) Extract the ZIP.
2) Open a terminal in the folder.
3) Run one of these commands:
	- py -m http.server 8000
	- python -m http.server 8000
	- npx http-server -p 8000 (Recommended)
4) Open: http://localhost:8000

Notes
- The app uses ES modules, which often do not load from file://.
- Running a local server ensures all buttons and features work.
- If Python is not recognized, try the Windows launcher command: py -m http.server 8000
