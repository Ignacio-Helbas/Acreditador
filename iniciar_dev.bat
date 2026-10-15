@echo off
chcp 65001 > nul
title Acreditador de Eventos (Modo Desarrollo)
echo ==========================================================
echo    🎫 INICIANDO MODO DESARROLLO (Vite + Express)
echo ==========================================================
echo.
echo  Abriendo el navegador en http://localhost:5173 ...
echo.

start http://localhost:5173
call npm.cmd run dev
pause
