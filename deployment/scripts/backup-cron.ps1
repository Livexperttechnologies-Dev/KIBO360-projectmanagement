# ==============================================================================
# KIBO360 Project Hub — Automated Backup Script (Windows Task Scheduler)
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

param (
    [string]$RootDir = "$PSScriptRoot\..\..",
    [int]$RetentionDays = 7
)

$backupDir = Join-Path $RootDir "backups"
$logFile = Join-Path $backupDir "backup-cron.log"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$nowStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$nowStr] Starting automated database backup snapshot..."

try {
    # Execute database backup tool
    Push-Location $RootDir
    $output = & npx.cmd tsx backend/scripts/backup-restore.ts backup 2>&1
    Pop-Location

    Add-Content -Path $logFile -Value "[$nowStr] Backup tool output: $output"

    # Move any root snapshot files into backups/
    Get-ChildItem -Path $RootDir -Filter "kibo360_backup_*.json" | ForEach-Object {
        $dest = Join-Path $backupDir $_.Name
        Move-Item -Path $_.FullName -Destination $dest -Force
        Add-Content -Path $logFile -Value "[$nowStr] Archived snapshot: $($_.Name) -> backups/"
    }

    # Retention Policy Pruning: Remove backups older than $RetentionDays days
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $backupDir -Filter "kibo360_backup_*.json" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Remove-Item -Path $_.FullName -Force
        Add-Content -Path $logFile -Value "[$nowStr] Pruned expired snapshot: $($_.Name)"
    }

    $endStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$endStr] Automated backup completed successfully."
    Write-Host "✅ Automated backup completed successfully." -ForegroundColor Green
} catch {
    $errStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$errStr] ❌ Backup failed: $($_.Exception.Message)"
    Write-Error "Backup failed: $($_.Exception.Message)"
    exit 1
}
