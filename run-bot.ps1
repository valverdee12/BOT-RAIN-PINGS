<#
  run-bot.ps1
  Inicia el bot en background, guarda el PID en run-bot.pid y redirige stdout/stderr a logs
  Uso: Ejecutar desde la carpeta del proyecto: .\run-bot.ps1
#>

$project = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $project

# Preferir npm (usa npm start) para arrancar el bot
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Error "npm no está en PATH. Asegúrate de instalar Node.js (incluye npm) y abrir una nueva terminal."
  exit 1
}

$logDir = Join-Path $project 'logs'
if (-not (Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory | Out-Null }

$outLog = Join-Path $logDir 'bot.out.log'
$errLog = Join-Path $logDir 'bot.err.log'
$pidFile = Join-Path $project 'run-bot.pid'

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($existingPid) {
    Write-Host "Parece que ya hay un bot corriendo con PID $existingPid. Si no es así, elimina run-bot.pid y vuelve a intentarlo."
    exit 1
  }
}

$startInfo = @{FilePath = $npm.Path; ArgumentList = 'start'; RedirectStandardOutput = $outLog; RedirectStandardError = $errLog; NoNewWindow = $true; PassThru = $true}
$proc = Start-Process @startInfo

if ($proc) {
  $proc.Id | Out-File -FilePath $pidFile -Encoding ascii
  Write-Host "Bot iniciado en background (PID: $($proc.Id)). Logs: $outLog, $errLog"
} else {
  Write-Error "No se pudo iniciar el proceso del bot."
}
