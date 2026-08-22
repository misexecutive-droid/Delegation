<?php
/**
 * Cron task for cPanel Scheduled Jobs
 * Runs every hour or daily:
 * 1. Generates due recurring checklist instances
 * 2. Checks overdue ticket TAT SLAs
 * 
 * Usage in cPanel Cron:
 * php /home/<username>/public_html/api/cron.php
 * or via browser / curl: https://tasks.vjsconnect.com/api/cron.php?key=vjs_cron_secret
 */

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/services/ChecklistGeneratorService.php';

$isCli = (php_sapi_name() === 'cli');
$cronKey = $_GET['key'] ?? '';

// Allow CLI execution or optional key authentication via HTTP
if (!$isCli && !empty($cronKey) && $cronKey !== 'vjs_cron_secret') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

echo "[" . date('Y-m-d H:i:s') . "] Starting TaskMatrix Cron Execution...\n";

// 1. Generate Recurring Checklists
try {
    echo "Generating recurring checklists...\n";
    ChecklistGeneratorService::generateAllDue();
    echo "Checklist generation completed successfully.\n";
} catch (Throwable $e) {
    echo "ERROR in checklist generation: " . $e->getMessage() . "\n";
}

// 2. Check Overdue Ticket SLAs
try {
    echo "Checking overdue tickets...\n";
    $now = date('Y-m-d H:i:s');
    $affected = dbExecute("
        UPDATE `Ticket` 
        SET `isOverdue` = 1, `updatedAt` = NOW()
        WHERE `tatDueAt` IS NOT NULL 
          AND `tatDueAt` < :now 
          AND `status` NOT IN ('CLOSED', 'ON_HOLD')
          AND `isOverdue` = 0
    ", ['now' => $now]);
    echo "Overdue check completed. $affected tickets marked overdue.\n";
} catch (Throwable $e) {
    echo "ERROR in overdue SLA check: " . $e->getMessage() . "\n";
}

echo "[" . date('Y-m-d H:i:s') . "] Cron Execution Finished.\n";
