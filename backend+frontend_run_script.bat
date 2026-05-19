@echo off

:: 1. Uruchomienie Backend w nowym oknie
start "Backend - FastAPI" cmd /k "cd /d C:\Users\Przemek\.gemini\antigravity\scratch\courier_system\backend && py -m uvicorn main:app --reload"

:: 2. Uruchomienie Frontend w nowym oknie
start "Frontend - Vite/React" cmd /k "cd /d C:\Users\Przemek\.gemini\antigravity\scratch\courier_system\frontend && npm run dev"

:: 3. Odczekanie chwili (opcjonalnie) i otwarcie przeglądarki
timeout /t 3 /nobreak >nul
start http://localhost:5173/