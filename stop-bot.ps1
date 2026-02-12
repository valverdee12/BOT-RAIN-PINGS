<#
  stop-bot.ps1
  Detiene el bot iniciado por run-bot.ps1 usando el PID en run-bot.pid
  Uso: Ejecutar desde la carpeta del proyecto: .\stop-bot.ps1
#>

$project = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$pidFile = Join-Path $project 'run-bot.pid'

if (-not (Test-Path $pidFile)) {
  Write-Host "No se encontró run-bot.pid. ¿Está corriendo el bot?"
  exit 1
}

$pid = Get-Content $pidFile -ErrorAction SilentlyContinue
if (-not $pid) { Write-Host "PID vacío. Eliminando run-bot.pid."; Remove-Item $pidFile -Force; exit 0 }

try {
  Stop-Process -Id $pid -ErrorAction Stop
  Write-Host "Proceso $pid detenido."
  Remove-Item $pidFile -Force
} catch {
  Write-Warning "No pude detener el proceso $pid: $_. Exception.Message"
  Write-Host "Eliminando run-bot.pid de todos modos.";
  Remove-Item $pidFile -Force
}
