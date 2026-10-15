@echo off
chcp 65001 > nul
title Subir cambios a GitHub
echo ==========================================================
echo        🚀 SUBIENDO CAMBIOS A TU REPOSITORIO GITHUB
echo ==========================================================
echo.
echo Repositorio: https://github.com/Ignacio-Helbas/Acreditador.git
echo Rama: main
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ==========================================================
    echo  ✅ ¡Cambios subidos a GitHub con éxito!
    echo ==========================================================
) else (
    echo ==========================================================
    echo  ❌ Hubo un detalle al subir. Revisá tus credenciales de GitHub arriba.
    echo ==========================================================
)
echo.
pause
