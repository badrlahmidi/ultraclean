# RitajPOS Lavage - Dev Servers
# Usage: .\start-dev.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "  RitajPOS Lavage - Dev Servers" -ForegroundColor Cyan
Write-Host "  Backend  : http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Reverb   : ws://localhost:8080   (WebSocket)" -ForegroundColor Magenta
Write-Host "  Frontend : http://localhost:5173  (Vite HMR)" -ForegroundColor Yellow
Write-Host "  Ctrl+C pour tout arreter." -ForegroundColor DarkGray
Write-Host ""

$phpJob = Start-Job -Name "PHP" -ScriptBlock {
    param($dir)
    Set-Location $dir
    php artisan serve --host=127.0.0.1 --port=8000 2>&1
} -ArgumentList $root

$reverbJob = Start-Job -Name "Reverb" -ScriptBlock {
    param($dir)
    Set-Location $dir
    php artisan reverb:start --host=0.0.0.0 --port=8080 2>&1
} -ArgumentList $root

$viteJob = Start-Job -Name "Vite" -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev 2>&1
} -ArgumentList $root

try {
    while ($true) {
        $phpOut = Receive-Job -Job $phpJob
        if ($phpOut) { $phpOut | ForEach-Object { Write-Host "[PHP]    $_" -ForegroundColor Green } }

        $reverbOut = Receive-Job -Job $reverbJob
        if ($reverbOut) { $reverbOut | ForEach-Object { Write-Host "[Reverb] $_" -ForegroundColor Magenta } }

        $viteOut = Receive-Job -Job $viteJob
        if ($viteOut) { $viteOut | ForEach-Object { Write-Host "[Vite]   $_" -ForegroundColor Yellow } }

        if ($phpJob.State -eq 'Failed') {
            Write-Host "[PHP] Job failed." -ForegroundColor Red
            Receive-Job -Job $phpJob | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            break
        }
        if ($reverbJob.State -eq 'Failed') {
            Write-Host "[Reverb] Job failed." -ForegroundColor Red
            Receive-Job -Job $reverbJob | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            break
        }
        if ($viteJob.State -eq 'Failed') {
            Write-Host "[Vite] Job failed." -ForegroundColor Red
            Receive-Job -Job $viteJob | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            break
        }

        Start-Sleep -Milliseconds 300
    }
}
finally {
    Write-Host ""
    Write-Host "  Stopping servers..." -ForegroundColor DarkGray
    Stop-Job  -Job $phpJob, $reverbJob, $viteJob -ErrorAction SilentlyContinue
    Remove-Job -Job $phpJob, $reverbJob, $viteJob -Force -ErrorAction SilentlyContinue
    Write-Host "  Done." -ForegroundColor DarkGray
    Write-Host ""
}