<?php
/**
 * Database connection & query helper routines
 */

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];

    public static function init(array $config): void {
        self::$config = $config;
    }

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $cfg = self::$config['db'] ?? (require __DIR__ . '/config.php')['db'];
            $host = $cfg['host'] ?? 'localhost';
            $port = $cfg['port'] ?? 3306;
            $dbName = $cfg['database'] ?? $cfg['name'] ?? 'vjsco9cf_task';
            $user = $cfg['username'] ?? $cfg['user'] ?? '';
            $pass = $cfg['password'] ?? $cfg['pass'] ?? '';
            $charset = $cfg['charset'] ?? 'utf8mb4';

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // If localhost failed, try 127.0.0.1 (or vice versa)
                $altHost = ($host === 'localhost') ? '127.0.0.1' : 'localhost';
                try {
                    $dsnAlt = "mysql:host={$altHost};port={$port};dbname={$dbName};charset={$charset}";
                    self::$instance = new PDO($dsnAlt, $user, $pass, $options);
                } catch (PDOException $e2) {
                    if (!headers_sent()) {
                        http_response_code(500);
                        header('Content-Type: application/json');
                    }
                    echo json_encode([
                        'success' => false,
                        'message' => 'Database connection failed: ' . $e2->getMessage(),
                        'error'   => $e2->getMessage()
                    ]);
                    exit;
                }
            }
        }
        return self::$instance;
    }
}

/**
 * Generate a unique URL-safe string ID (24 chars) compatible with CUID / MongoDB ObjectIds
 */
function generateId(): string {
    // Format: 24 lowercase alphanumeric chars
    $bytes = random_bytes(12);
    return bin2hex($bytes);
}

/**
 * Run a parameterized query and return PDOStatement
 */
function dbQuery(string $sql, array $params = []): PDOStatement {
    $pdo = Database::getInstance();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

/**
 * Fetch a single row as associative array
 */
function dbFetchOne(string $sql, array $params = []): ?array {
    $stmt = dbQuery($sql, $params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * Fetch all rows as associative array
 */
function dbFetchAll(string $sql, array $params = []): array {
    $stmt = dbQuery($sql, $params);
    return $stmt->fetchAll() ?: [];
}

/**
 * Execute an INSERT, UPDATE, or DELETE query and return affected rows
 */
function dbExecute(string $sql, array $params = []): int {
    $stmt = dbQuery($sql, $params);
    return $stmt->rowCount();
}

/**
 * Insert a row into a table
 */
function dbInsert(string $table, array $data): string {
    $pdo = Database::getInstance();
    if (!isset($data['id'])) {
        $data['id'] = generateId();
    }
    $columns = array_keys($data);
    $placeholders = array_map(fn($col) => ":$col", $columns);
    
    $sql = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($data);
    
    return $data['id'];
}

/**
 * Update a table with key-value data
 */
function dbUpdate(string $table, array $data, string $whereSql, array $whereParams = []): int {
    $pdo = Database::getInstance();
    $setParts = [];
    $params = [];
    
    foreach ($data as $col => $val) {
        $paramName = "set_" . str_replace(['.', '-', ' '], '_', $col);
        $setParts[] = "`$col` = :$paramName";
        $params[$paramName] = $val;
    }
    
    $sql = "UPDATE `$table` SET " . implode(', ', $setParts) . " WHERE $whereSql";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($params, $whereParams));
    
    return $stmt->rowCount();
}

/**
 * Delete from a table
 */
function dbDelete(string $table, string $whereSql, array $whereParams = []): int {
    $sql = "DELETE FROM `$table` WHERE $whereSql";
    return dbExecute($sql, $whereParams);
}

/**
 * Execute operations within a database transaction
 */
function dbTransaction(callable $callback) {
    $pdo = Database::getInstance();
    $pdo->beginTransaction();
    try {
        $res = $callback($pdo);
        $pdo->commit();
        return $res;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
