<?php
/**
 * Database Diagnostic & Test Tool
 * Visit in browser: https://tasks.vjsconnect.com/api/test_db.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/html; charset=utf-8');

$config = require __DIR__ . '/config.php';
$dbCfg = $config['db'];

?>
<!DOCTYPE html>
<html>
<head>
    <title>TaskMatrix Database Connection Test</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
        .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
        h2 { margin-top: 0; color: #38bdf8; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; }
        .label { color: #94a3b8; font-weight: 500; }
        .val { font-family: monospace; color: #e2e8f0; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; }
        .badge-success { background: #065f46; color: #34d399; }
        .badge-danger { background: #881337; color: #fb7185; }
        .error-box { margin-top: 20px; background: #4c0519; border: 1px solid #be123c; padding: 16px; border-radius: 8px; font-family: monospace; color: #fecdd3; }
        .tables-list { margin-top: 15px; font-family: monospace; font-size: 13px; color: #cbd5e1; }
    </style>
</head>
<body>

<div class="card">
    <h2>TaskMatrix Database Diagnostic</h2>
    
    <div class="row">
        <span class="label">Host</span>
        <span class="val"><?php echo htmlspecialchars($dbCfg['host']); ?></span>
    </div>
    <div class="row">
        <span class="label">Port</span>
        <span class="val"><?php echo htmlspecialchars($dbCfg['port']); ?></span>
    </div>
    <div class="row">
        <span class="label">Database Name</span>
        <span class="val"><?php echo htmlspecialchars($dbCfg['database'] ?? $dbCfg['name']); ?></span>
    </div>
    <div class="row">
        <span class="label">Username</span>
        <span class="val"><?php echo htmlspecialchars($dbCfg['username'] ?? $dbCfg['user']); ?></span>
    </div>

    <?php
    $dbName = $dbCfg['database'] ?? $dbCfg['name'];
    $user = $dbCfg['username'] ?? $dbCfg['user'];
    $pass = $dbCfg['password'] ?? $dbCfg['pass'];
    $port = $dbCfg['port'] ?? 3306;

    $connected = false;
    $errorMsg = '';
    $tables = [];
    $activeHost = $dbCfg['host'];

    foreach ([$dbCfg['host'], 'localhost', '127.0.0.1'] as $tryHost) {
        try {
            $pdo = new PDO("mysql:host=$tryHost;port=$port;dbname=$dbName;charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $connected = true;
            $activeHost = $tryHost;

            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            break;
        } catch (PDOException $e) {
            $errorMsg = $e->getMessage();
        }
    }
    ?>

    <div class="row" style="margin-top: 15px;">
        <span class="label">Connection Status</span>
        <span class="val">
            <?php if ($connected): ?>
                <span class="badge badge-success">CONNECTED (via <?php echo htmlspecialchars($activeHost); ?>)</span>
            <?php else: ?>
                <span class="badge badge-danger">FAILED</span>
            <?php endif; ?>
        </span>
    </div>

    <?php if ($connected): ?>
        <div style="margin-top: 20px;">
            <strong style="color: #38bdf8;">Tables Found (<?php echo count($tables); ?>):</strong>
            <div class="tables-list">
                <?php echo implode(', ', $tables); ?>
            </div>
            <?php
            $usersCount = 0;
            if (in_array('User', $tables) || in_array('user', $tables)) {
                $uStmt = $pdo->query("SELECT COUNT(*) FROM `User`");
                $usersCount = $uStmt->fetchColumn();
            }
            ?>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155; color: #a7f3d0;">
                ✓ Found <?php echo $usersCount; ?> registered users in database.
            </div>
        </div>
    <?php else: ?>
        <div class="error-box">
            <strong>Error Details:</strong><br>
            <?php echo htmlspecialchars($errorMsg); ?>
        </div>
        <div style="margin-top: 15px; font-size: 13px; color: #94a3b8;">
            <strong>Troubleshooting Checklist:</strong>
            <ol style="padding-left: 20px; margin-top: 8px;">
                <li>Verify database name and username in cPanel -> <strong>MySQL Databases</strong>.</li>
                <li>Ensure you added the user to the database with <strong>ALL PRIVILEGES</strong>.</li>
                <li>Verify the password matches exactly (no accidental spaces).</li>
            </ol>
        </div>
    <?php endif; ?>

</div>

</body>
</html>
