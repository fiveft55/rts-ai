# Windows PowerShell: set $env:ROOM_CODE before running this script.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not $env:ROOM_CODE) { throw 'Set $env:ROOM_CODE to a private room code first.' }
if (-not $env:HOST) { $env:HOST = '0.0.0.0' }
if (-not $env:PORT) { $env:PORT = '8080' }
node javascript/server.mjs @args
exit $LASTEXITCODE
