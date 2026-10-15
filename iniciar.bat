@echo off
chcp 65001 > nul
title Acreditador de Eventos
echo ==========================================================
echo        🎫 INICIANDO ACREDITADOR GENÉRICO DE EVENTOS
echo ==========================================================
echo.
echo  Iniciando servidor local en http://localhost:3001 ...
echo.
echo  IMPORTANTE:
echo  - Mantén esta ventana abierta mientras uses la aplicación.
echo  - Si la cierras, el servidor se detendrá.
echo.

timeout /t 2 /nobreak > nul
start http://localhost:3001
node server/index.js
pause
