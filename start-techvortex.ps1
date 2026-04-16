# TechVortex IIITG - One-Click Startup Script
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Clear-Host
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "     TechVortex IIITG - Climate and Ocean Platform  " -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""

# Stop any leftover processes
Write-Host "  Stopping existing services..." -ForegroundColor Yellow
Get-Process python, node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Service list
$services = @(
    @{ Name = "HUB-BACKEND    port 8001"; Dir = "backend";                      Cmd = "python -m uvicorn main:app --port 8001";                      Color = "Magenta"  },
    @{ Name = "OCEANGUARD-API port 8002"; Dir = "OceanGuard\backend";           Cmd = ".\venv\Scripts\python.exe -m uvicorn main:app --port 8002";   Color = "Green"    },
    @{ Name = "WEATHER-API    port 8000"; Dir = "weather-module\backend\api";   Cmd = "python -m uvicorn forecast_api:app --port 8000";              Color = "Yellow"   },
    @{ Name = "CLIMATEBOT     port 5000"; Dir = "chatbot";                      Cmd = "python app.py";                                              Color = "Cyan"     },
    @{ Name = "HUB-FRONTEND   port 5173"; Dir = "weather-module\frontend";      Cmd = "npm run dev";                                                Color = "Blue"     },
    @{ Name = "OCEANGUARD-UI  port 3002"; Dir = "OceanGuard\frontend";          Cmd = "npm run dev";                                                Color = "Green"    },
    @{ Name = "OCEAN-RISK-UI  port 3000"; Dir = "frontend";                     Cmd = "npm start";                                                  Color = "DarkCyan" },
    @{ Name = "OCEAN-IQ-UI    port 3001"; Dir = "learning hub\ocean-iq";        Cmd = "npm run dev";                                                Color = "White"    }
)

Write-Host "  Launching all 8 services (each in minimised window)..." -ForegroundColor Yellow
Write-Host ""

foreach ($svc in $services) {
    $absDir = Join-Path $Root $svc.Dir
    $label  = $svc.Name
    $cmd    = $svc.Cmd
    $color  = $svc.Color

    $psCmd = "`$host.UI.RawUI.WindowTitle = '$label'; Set-Location '$absDir'; Write-Host '=== $label ===' -ForegroundColor $color; Write-Host ''; $cmd"

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $psCmd -WindowStyle Minimized

    Write-Host "  OK  $label" -ForegroundColor $color
    Start-Sleep -Milliseconds 400
}

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "  All 8 services are running (in taskbar)."          -ForegroundColor Green
Write-Host ""
Write-Host "  Main Dashboard : http://localhost:5173"            -ForegroundColor Cyan
Write-Host "  Ocean AI       : http://localhost:3000"            -ForegroundColor DarkCyan
Write-Host "  OceanGuard     : http://localhost:3002"            -ForegroundColor Green
Write-Host "  OceanIQ Hub    : http://localhost:3001"            -ForegroundColor White
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press any key to open the dashboard in your browser..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:5173"
