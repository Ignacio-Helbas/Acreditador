@echo off
chcp 65001 > nul
title Subir cambios a GitHub
echo ==========================================================
echo        SUBIENDO CAMBIOS A TU REPOSITORIO GITHUB
echo ==========================================================
echo.
echo Repositorio: https://github.com/Ignacio-Helbas/Acreditador.git
echo Rama: main
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ==========================================================
    echo  [OK] Cambios subidos a GitHub con exito.
    echo ==========================================================
) else (
    echo ==========================================================
    echo  [ERROR] Hubo un problema al subir. Revisa tus credenciales de GitHub arriba.
    echo ==========================================================
)
echo.
pause
