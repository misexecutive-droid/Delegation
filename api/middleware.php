<?php
/**
 * Middleware: CORS, Authentication, Authorization, Request Parsing, Response Helpers
 */

/**
 * Handle CORS headers and Pre-flight OPTIONS requests
 */
function handleCors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    $config = require __DIR__ . '/config.php';
    $clientUrl = rtrim($config['app']['client_url'], '/');

    // Allow requests from client URL, localhost, or any subdomain of vjsconnect.com
    if ($origin !== '*') {
        $parsed = parse_url($origin);
        $host = $parsed['host'] ?? '';
        if ($host === 'tasks.vjsconnect.com' || str_ends_with($host, 'vjsconnect.com') || $host === 'localhost' || $host === '127.0.0.1') {
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
        } else {
            header("Access-Control-Allow-Origin: $clientUrl");
            header('Access-Control-Allow-Credentials: true');
        }
    } else {
        header('Access-Control-Allow-Origin: *');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
    header('Access-Control-Expose-Headers: Content-Disposition');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Send JSON response
 */
function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send standard error JSON response
 */
function errorResponse(string $message, int $status = 400, $extra = null): void {
    $payload = [
        'success' => false,
        'message' => $message,
    ];
    if ($extra !== null) {
        $payload['data'] = $extra;
    }
    jsonResponse($payload, $status);
}

/**
 * Parse JSON request body or multipart form data
 */
function getRequestBody(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
    return $_POST ?: [];
}

/**
 * Extract authenticated user from Authorization header
 */
function authenticate(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $config = require __DIR__ . '/config.php';
    return JWT::verify($token, $config['jwt']['secret']);
}

/**
 * Require valid authenticated user, otherwise exit with 401
 */
function requireAuth(): array {
    $user = authenticate();
    if (!$user) {
        errorResponse('Session expired or unauthorized', 401);
    }
    return $user;
}

/**
 * Require user to possess one of the allowed roles
 */
function requireRole(array $allowedRoles): array {
    $user = requireAuth();
    if (!in_array($user['role'] ?? '', $allowedRoles, true)) {
        errorResponse('Forbidden: insufficient permissions', 403);
    }
    return $user;
}

/**
 * Set HTTP-Only Refresh Token Cookie
 */
function setRefreshTokenCookie(string $token): void {
    $config = require __DIR__ . '/config.php';
    $days = $config['jwt']['refresh_expires_days'] ?? 30;
    $expires = time() + ($days * 86400);
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($config['jwt']['cookie_secure'] ?? false);

    setcookie('refreshToken', $token, [
        'expires'  => $expires,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $config['jwt']['cookie_samesite'] ?? 'Lax',
    ]);
}

/**
 * Clear Refresh Token Cookie
 */
function clearRefreshTokenCookie(): void {
    $config = require __DIR__ . '/config.php';
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($config['jwt']['cookie_secure'] ?? false);

    setcookie('refreshToken', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $config['jwt']['cookie_samesite'] ?? 'Lax',
    ]);
}
