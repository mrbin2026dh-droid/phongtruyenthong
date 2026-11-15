@echo off
rem Mo trang quan tri phong truyen thong (chi chay tren may nay).
cd /d "%~dp0"
start "" http://127.0.0.1:4173/
call npm run admin
pause
