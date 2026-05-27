# Light Distributor installer (PowerShell)
param()
$zipPath = Join-Path $PSScriptRoot 'LightDistributor.zip'
if (-not (Test-Path $zipPath)) { Write-Error "Missing $zipPath. Ensure LightDistributor.zip is next to this script." ; exit 1 }
$installPath = Read-Host "Enter install path (e.g. C:\Program Files\Light Distributor)"
if (-not $installPath) { Write-Host "Cancelled"; exit }
if (-not (Test-Path $installPath)) { New-Item -ItemType Directory -Path $installPath -Force | Out-Null }
Expand-Archive -Path $zipPath -DestinationPath $installPath -Force
# Create desktop shortcut
try {
  $WshShell = New-Object -ComObject WScript.Shell
  $lnk = $WshShell.CreateShortcut((Join-Path $env:USERPROFILE 'Desktop\Light Distributor.lnk'))
  $lnk.TargetPath = Join-Path $installPath 'LightDistributor.exe'
  $lnk.WorkingDirectory = $installPath
  $lnk.Save()
} catch {
  Write-Host "Failed to create shortcut: $_"
}
Write-Host "Installed to $installPath"
$run = Read-Host "Run the app now? (Y/N)"
if ($run -match '^(y|Y)') { Start-Process -WorkingDirectory $installPath (Join-Path $installPath 'LightDistributor.exe') }
