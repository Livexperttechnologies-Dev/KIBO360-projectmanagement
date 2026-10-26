#!/usr/bin/env bash
# ==============================================================================
# KIBO360 Project Hub — Automated Backup Script (Linux Cron)
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/../.."
BACKUP_DIR="${ROOT_DIR}/backups"
LOG_FILE="${BACKUP_DIR}/backup-cron.log"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

NOW_STR="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[${NOW_STR}] Starting automated database backup snapshot..." >> "${LOG_FILE}"

# Execute backup tool
cd "${ROOT_DIR}"
if npx tsx backend/scripts/backup-restore.ts backup >> "${LOG_FILE}" 2>&1; then
    # Move any root snapshot files into backups/
    find "${ROOT_DIR}" -maxdepth 1 -name "kibo360_backup_*.json" -exec mv -t "${BACKUP_DIR}/" {} + 2>/dev/null || true

    # Retention Pruning: Delete snapshots older than RETENTION_DAYS
    find "${BACKUP_DIR}" -name "kibo360_backup_*.json" -mtime "+${RETENTION_DAYS}" -exec rm -f {} +

    END_STR="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[${END_STR}] Automated backup completed successfully." >> "${LOG_FILE}"
    echo "✅ Automated backup completed successfully."
else
    ERR_STR="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[${ERR_STR}] ❌ Backup execution failed." >> "${LOG_FILE}"
    echo "❌ Backup execution failed." >&2
    exit 1
fi
