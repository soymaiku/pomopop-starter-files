Pomopop Offline - How to Run

Requirements (first time):

Install Node.js from https://nodejs.org (LTS version).
After install, open a terminal and run:
node -v and npm -v to confirm it’s installed.
Then you can run:

npx http-server -p 8000
If you want a zero‑install option, use the Windows built‑in Python launcher instead:

py -m http.server 8000 (only if Python is installed).

------------------------------------------------------------------------------------------------------

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

Option 3: No installs (PowerShell built-in server) (Most Recommended No install Needed)
1) Extract the ZIP.
2) Open PowerShell in the folder.
3) Run this command:
   powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Get-Location);$listener=New-Object System.Net.HttpListener;$listener.Prefixes.Add('http://localhost:8000/');$listener.Start();$mime=@{' .html'='text/html';'.js'='text/javascript';'.css'='text/css';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.gif'='image/gif';'.svg'='image/svg+xml';'.mp3'='audio/mpeg';'.mp4'='video/mp4';'.webmanifest'='application/manifest+json'};Write-Host 'Serving at http://localhost:8000/';while($listener.IsListening){$ctx=$listener.GetContext();$path=$ctx.Request.Url.LocalPath.TrimStart('/');if([string]::IsNullOrEmpty($path)){$path='index.html'};$file=Join-Path $root $path;if(Test-Path $file){$ext=[IO.Path]::GetExtension($file);if($mime.ContainsKey($ext)){$ctx.Response.ContentType=$mime[$ext]};$bytes=[IO.File]::ReadAllBytes($file);$ctx.Response.StatusCode=200}else{$bytes=[Text.Encoding]::UTF8.GetBytes('Not found');$ctx.Response.StatusCode=404};$ctx.Response.OutputStream.Write($bytes,0,$bytes.Length);$ctx.Response.Close()}"
4) Open: http://localhost:8000
5) Press Ctrl+C in the terminal to stop the server.

------------------------------------------------------------------------------------------------------
Notes
- The app uses ES modules, which often do not load from file://.
- Running a local server ensures all buttons and features work.
- If Python is not recognized, try the Windows launcher command: py -m http.server 8000
