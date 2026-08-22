<?php
/**
 * TaskMatrix - Database Initializer & Admin Seeder
 * Run via CLI: php seed.php admin@vjsconnect.com MySecretPassword123
 * Or visit in browser: https://tasks.vjsconnect.com/api/seed.php?email=admin@vjsconnect.com&password=MySecretPassword123
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/db.php';

$isCli = (php_sapi_name() === 'cli');

$adminEmail = $isCli ? ($argv[1] ?? 'admin@vjsconnect.com') : ($_GET['email'] ?? 'admin@vjsconnect.com');
$adminPassword = $isCli ? ($argv[2] ?? 'Admin@12345') : ($_GET['password'] ?? 'Admin@12345');
$adminFirstName = $isCli ? ($argv[3] ?? 'Admin') : ($_GET['firstName'] ?? 'Admin');

$adminEmail = trim(strtolower($adminEmail));

echo "====================================================\n";
echo "TaskMatrix - Initial Setup & Admin Seeder\n";
echo "====================================================\n";

try {
    // Test Database connection
    $pdo = Database::getInstance();
    echo "[OK] Connected to MySQL successfully.\n";

    // 1. Ensure default settings exist
    $settings = dbFetchOne("SELECT `id` FROM `Settings` LIMIT 1");
    if (!$settings) {
        dbInsert('Settings', [
            'id'                => generateId(),
            'defaultTatHours'   => 24,
            'maxUploadSizeMb'   => 10,
            'maxUploadFiles'    => 10,
            'allowedImageTypes' => json_encode(['image/jpeg', 'image/png', 'image/webp']),
            'createdAt'         => date('Y-m-d H:i:s'),
            'updatedAt'         => date('Y-m-d H:i:s'),
        ]);
        echo "[OK] Default organization settings created.\n";
    }

    // 2. Ensure at least one store exists
    $store = dbFetchOne("SELECT `id` FROM `Store` LIMIT 1");
    $storeId = $store ? $store['id'] : null;
    if (!$store) {
        $storeId = generateId();
        dbInsert('Store', [
            'id'        => $storeId,
            'name'      => 'Main Store',
            'code'      => 'STR-01',
            'address'   => 'Headquarters',
            'isActive'  => 1,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);
        echo "[OK] Default Store 'Main Store' created.\n";
    }

    // 3. Ensure at least one department exists
    $dept = dbFetchOne("SELECT `id` FROM `Department` LIMIT 1");
    $deptId = $dept ? $dept['id'] : null;
    if (!$dept) {
        $deptId = generateId();
        dbInsert('Department', [
            'id'        => $deptId,
            'name'      => 'Operations',
            'storeId'   => $storeId,
            'isActive'  => 1,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);
        echo "[OK] Default Department 'Operations' created.\n";
    }

    // 4. Create or Promote Admin User
    $existing = dbFetchOne("SELECT `id` FROM `User` WHERE LOWER(TRIM(`email`)) = :email LIMIT 1", ['email' => $adminEmail]);
    $passwordHash = password_hash($adminPassword, PASSWORD_BCRYPT);

    if ($existing) {
        dbUpdate('User', [
            'role'         => 'ADMIN',
            'passwordHash' => $passwordHash,
            'firstName'    => $adminFirstName,
            'isActive'     => 1,
            'departmentId' => $deptId,
            'storeId'      => $storeId,
            'updatedAt'    => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $existing['id']]);
        echo "[OK] Updated existing user '$adminEmail' to role ADMIN.\n";
    } else {
        $adminId = generateId();
        dbInsert('User', [
            'id'           => $adminId,
            'email'        => $adminEmail,
            'passwordHash' => $passwordHash,
            'firstName'    => $adminFirstName,
            'lastName'     => 'User',
            'role'         => 'ADMIN',
            'departmentId' => $deptId,
            'storeId'      => $storeId,
            'isActive'     => 1,
            'rank'         => 1,
            'createdAt'    => date('Y-m-d H:i:s'),
            'updatedAt'    => date('Y-m-d H:i:s'),
        ]);
        echo "[OK] Created new ADMIN account: '$adminEmail'.\n";
    }

    echo "----------------------------------------------------\n";
    echo "SETUP SUCCESSFUL! You can now log in at:\n";
    echo "URL:      https://tasks.vjsconnect.com/login\n";
    echo "Email:    $adminEmail\n";
    echo "Password: $adminPassword\n";
    echo "Role:     ADMIN\n";
    echo "====================================================\n";

} catch (Throwable $e) {
    echo "[ERROR] Setup failed: " . $e->getMessage() . "\n";
}
