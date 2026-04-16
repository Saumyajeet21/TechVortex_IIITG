@echo off
title TechVortex IIITG - Stopping...
echo.
echo  Stopping all TechVortex services...
echo.
PowerShell -ExecutionPolicy Bypass -Command "Get-Process python, node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host '  All services stopped.' -ForegroundColor Green"
echo.
echo  Done. Press any key to close.
pause > nul
