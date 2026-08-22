<?php
/**
 * AuthController - Handles Login, Registration, Token Refresh, Logout, Password Reset
 */

class AuthController {
    private static function publicUser(array $user): array {
        return [
            'id'           => $user['id'],
            'email'        => $user['email'],
            'role'         => $user['role'],
            'firstName'    => $user['firstName'],
            'lastName'     => $user['lastName'] ?? null,
            'departmentId' => $user['departmentId'] ?? null,
            'storeId'      => $user['storeId'] ?? null,
        ];
    }

    public static function login(): void {
        $body = getRequestBody();
        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            errorResponse('Email and password are required', 400);
        }

        $user = dbFetchOne("SELECT * FROM `User` WHERE LOWER(TRIM(`email`)) = :email LIMIT 1", ['email' => $email]);
        if (!$user || !(int)$user['isActive']) {
            errorResponse('Invalid credentials', 401);
        }

        if (!password_verify($password, $user['passwordHash'])) {
            errorResponse('Invalid credentials', 401);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $accessToken = JWT::sign([
            'sub'          => $user['id'],
            'role'         => $user['role'],
            'departmentId' => $user['departmentId'],
            'storeId'      => $user['storeId'],
        ], $config['jwt']['secret'], $config['jwt']['access_expires_sec']);

        $refreshToken = issueRefreshToken($user['id'], $config['jwt']['refresh_expires_days']);
        setRefreshTokenCookie($refreshToken);

        jsonResponse([
            'accessToken' => $accessToken,
            'user'        => self::publicUser($user),
        ]);
    }

    public static function register(): void {
        $body = getRequestBody();
        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $firstName = trim($body['firstName'] ?? '');
        $lastName = trim($body['lastName'] ?? '');

        if (empty($email) || empty($password) || empty($firstName)) {
            errorResponse('First name, email, and password are required', 400);
        }

        $existing = dbFetchOne("SELECT `id` FROM `User` WHERE LOWER(TRIM(`email`)) = :email LIMIT 1", ['email' => $email]);
        if ($existing) {
            errorResponse('Email already registered', 409);
        }

        $userId = generateId();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $role = 'USER';

        dbInsert('User', [
            'id'           => $userId,
            'email'        => $email,
            'passwordHash' => $passwordHash,
            'firstName'    => $firstName,
            'lastName'     => $lastName ?: null,
            'role'         => $role,
            'isActive'     => 1,
            'rank'         => 6,
            'createdAt'    => date('Y-m-d H:i:s'),
            'updatedAt'    => date('Y-m-d H:i:s'),
        ]);

        $user = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id", ['id' => $userId]);
        $config = require dirname(__DIR__) . '/config.php';
        $accessToken = JWT::sign([
            'sub'          => $user['id'],
            'role'         => $user['role'],
            'departmentId' => null,
            'storeId'      => null,
        ], $config['jwt']['secret'], $config['jwt']['access_expires_sec']);

        $refreshToken = issueRefreshToken($user['id'], $config['jwt']['refresh_expires_days']);
        setRefreshTokenCookie($refreshToken);

        jsonResponse([
            'accessToken' => $accessToken,
            'user'        => self::publicUser($user),
        ], 201);
    }

    public static function refresh(): void {
        $rawToken = $_COOKIE['refreshToken'] ?? null;
        if (!$rawToken) {
            errorResponse('Missing refresh token', 401);
        }

        $tokenHash = hashToken($rawToken);
        $stored = dbFetchOne("SELECT * FROM `RefreshToken` WHERE `tokenHash` = :hash LIMIT 1", ['hash' => $tokenHash]);

        if (!$stored || !empty($stored['revokedAt']) || strtotime($stored['expiresAt']) < time()) {
            clearRefreshTokenCookie();
            errorResponse('Invalid or expired refresh token', 401);
        }

        $user = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $stored['userId']]);
        if (!$user || !(int)$user['isActive']) {
            clearRefreshTokenCookie();
            errorResponse('User inactive or not found', 401);
        }

        // Single-use token rotation: revoke old token
        dbUpdate('RefreshToken', [
            'revokedAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $stored['id']]);

        // Issue new token pair
        $config = require dirname(__DIR__) . '/config.php';
        $accessToken = JWT::sign([
            'sub'          => $user['id'],
            'role'         => $user['role'],
            'departmentId' => $user['departmentId'],
            'storeId'      => $user['storeId'],
        ], $config['jwt']['secret'], $config['jwt']['access_expires_sec']);

        $newRefreshToken = issueRefreshToken($user['id'], $config['jwt']['refresh_expires_days']);
        setRefreshTokenCookie($newRefreshToken);

        jsonResponse([
            'accessToken' => $accessToken,
            'user'        => self::publicUser($user),
        ]);
    }

    public static function logout(): void {
        $rawToken = $_COOKIE['refreshToken'] ?? null;
        if ($rawToken) {
            $tokenHash = hashToken($rawToken);
            dbUpdate('RefreshToken', [
                'revokedAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
            ], "`tokenHash` = :hash", ['hash' => $tokenHash]);
        }
        clearRefreshTokenCookie();
        jsonResponse(['success' => true]);
    }

    public static function forgotPassword(): void {
        $body = getRequestBody();
        $email = trim(strtolower($body['email'] ?? ''));
        if (empty($email)) {
            errorResponse('Email is required', 400);
        }

        $user = dbFetchOne("SELECT `id`, `email` FROM `User` WHERE LOWER(TRIM(`email`)) = :email AND `isActive` = 1 LIMIT 1", ['email' => $email]);
        if ($user) {
            $rawToken = bin2hex(random_bytes(32));
            $tokenHash = hashToken($rawToken);
            $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            dbInsert('PasswordResetToken', [
                'id'        => generateId(),
                'userId'    => $user['id'],
                'tokenHash' => $tokenHash,
                'expiresAt' => $expiresAt,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
            ]);

            // Attempt to send email if mail is configured
            $config = require dirname(__DIR__) . '/config.php';
            $resetLink = rtrim($config['app']['client_url'], '/') . "/reset-password?token=$rawToken";
            @mail(
                $user['email'],
                'Reset your Task Matrix password',
                "Please click the link below to reset your password (valid for 1 hour):\n\n$resetLink\n\nIf you did not request this, please ignore.",
                "From: no-reply@vjsconnect.com\r\nReply-To: no-reply@vjsconnect.com\r\nX-Mailer: PHP/" . phpversion()
            );
        }

        jsonResponse([
            'success' => true,
            'message' => 'If an account exists with that email, a password reset link has been sent.'
        ]);
    }

    public static function resetPassword(): void {
        $body = getRequestBody();
        $token = $body['token'] ?? '';
        $newPassword = $body['password'] ?? '';

        if (empty($token) || empty($newPassword)) {
            errorResponse('Token and new password are required', 400);
        }

        $tokenHash = hashToken($token);
        $stored = dbFetchOne("SELECT * FROM `PasswordResetToken` WHERE `tokenHash` = :hash LIMIT 1", ['hash' => $tokenHash]);

        if (!$stored || !empty($stored['usedAt']) || strtotime($stored['expiresAt']) < time()) {
            errorResponse('Invalid or expired reset link', 400);
        }

        $user = dbFetchOne("SELECT `id`, `isActive` FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $stored['userId']]);
        if (!$user || !(int)$user['isActive']) {
            errorResponse('Invalid or expired reset link', 400);
        }

        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
        dbUpdate('User', [
            'passwordHash' => $passwordHash,
            'updatedAt'    => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $user['id']]);

        dbUpdate('PasswordResetToken', [
            'usedAt'    => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $stored['id']]);

        // Revoke all existing sessions
        dbUpdate('RefreshToken', [
            'revokedAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`userId` = :userId AND `revokedAt` IS NULL", ['userId' => $user['id']]);

        jsonResponse(['success' => true]);
    }

    public static function me(): void {
        $authUser = requireAuth();
        $user = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $authUser['sub']]);
        if (!$user) {
            errorResponse('User not found', 404);
        }
        jsonResponse([
            'success' => true,
            'data'    => self::publicUser($user),
        ]);
    }
}
