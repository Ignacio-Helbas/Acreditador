@echo off
chcp 65001 > nul
title Acreditador de Eventos
echo ==========================================================
echo        🎫 INICIANDO ACREDITADOR GENÉRICO DE EVENTOS
echo ==========================================================
echo.
echo  Abriendo el navegador en http://localhost:3001 ...
echo  Para cerrar el servidor, cerrá esta ventana o presioná Ctrl + C.
echo.

start http://localhost:3001
node server/index.js
pause
