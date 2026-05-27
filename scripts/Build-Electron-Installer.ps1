#!/usr/bin/env pwsh

# Electron Installer Builder - PowerShell Script
# Interactive Windows installer builder with branding support

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Electron Installer Builder with Branding Support        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Colors
$successColor = "Green"
$warningColor = "Yellow"
$errorColor = "Red"
$infoColor = "Blue"

function Show-Section {
    param([string]$title)
    Write-Host "`n► $title" -ForegroundColor $infoColor
    Write-Host "─" * 60 -ForegroundColor $infoColor
}

# Check prerequisites
Show-Section "Checking Prerequisites"

$prerequisites = @{
    "Node.js" = "node --version"
    "npm" = "npm --version"
    "electron-builder" = "npm list -g electron-builder 2>$null"
}

$allChecked = $true
foreach ($tool in $prerequisites.Keys) {
    try {
        $result = Invoke-Expression $prerequisites[$tool] 2>$null
        if ($result) {
            Write-Host "✓ $tool : $result" -ForegroundColor $successColor
        } else {
            Write-Host "✗ $tool : Not found" -ForegroundColor $errorColor
            $allChecked = $false
        }
    } catch {
        Write-Host "✗ $tool : Not found" -ForegroundColor $errorColor
        $allChecked = $false
    }
}

if (!$allChecked) {
    Write-Host "`n⚠ Some prerequisites are missing" -ForegroundColor $warningColor
    Write-Host "Install dependencies with: npm install" -ForegroundColor $warningColor
}

# Menu
Show-Section "Build Options"

$options = @(
    "Build All Installers (NSIS, MSI, Portable)",
    "Build NSIS Installer Only",
    "Build MSI Installer Only",
    "Build Portable Executable",
    "Full Build with Branding Integration",
    "Development Build (npm run dev:electron)",
    "Clean Build Artifacts",
    "Exit"
)

for ($i = 0; $i -lt $options.Count; $i++) {
    Write-Host "$($i + 1). $($options[$i])"
}

$selection = Read-Host "`nSelect option (1-$($options.Count))"

switch ($selection) {
    "1" {
        Show-Section "Building All Installers"
        npm run build:electron
    }
    "2" {
        Show-Section "Building NSIS Installer"
        npm run build:electron:nsis
    }
    "3" {
        Show-Section "Building MSI Installer"
        npm run build:electron:msi
    }
    "4" {
        Show-Section "Building Portable Executable"
        npm run build:electron:portable
    }
    "5" {
        Show-Section "Full Build with Branding"
        npm run build:installer
    }
    "6" {
        Show-Section "Starting Development Build"
        npm run dev:electron
    }
    "7" {
        Show-Section "Cleaning Build Artifacts"
        $dirsToClean = @("dist", "dist-electron")
        foreach ($dir in $dirsToClean) {
            if (Test-Path $dir) {
                Remove-Item -Recurse -Force $dir
                Write-Host "✓ Removed $dir" -ForegroundColor $successColor
            }
        }
    }
    "8" {
        Write-Host "`nGoodbye!`n" -ForegroundColor $infoColor
        exit
    }
    default {
        Write-Host "Invalid selection" -ForegroundColor $errorColor
        exit 1
    }
}

# Show results
if ($LASTEXITCODE -eq 0) {
    Show-Section "Build Complete"
    
    if (Test-Path "dist-electron") {
        $installers = Get-ChildItem "dist-electron" -Include "*.exe", "*.msi" -ErrorAction SilentlyContinue
        
        if ($installers) {
            Write-Host "✓ Installers created:" -ForegroundColor $successColor
            foreach ($installer in $installers) {
                $sizeMB = [math]::Round($installer.Length / 1MB, 2)
                Write-Host "  • $($installer.Name) ($sizeMB MB)" -ForegroundColor $successColor
            }
        }
    }
    
    Write-Host "`nOutput directory: dist-electron\" -ForegroundColor $infoColor
    Write-Host "`nNext steps:" -ForegroundColor $infoColor
    Write-Host "  1. Test the installers" -ForegroundColor $infoColor
    Write-Host "  2. Sign the installers (if needed)" -ForegroundColor $infoColor
    Write-Host "  3. Distribute to users" -ForegroundColor $infoColor
} else {
    Write-Host "`n✗ Build failed with exit code $LASTEXITCODE" -ForegroundColor $errorColor
}

Write-Host "`n" -ForegroundColor $infoColor
