<?php
/**
 * JWT (JSON Web Token) creation, decoding, and validation
 */

class JWT {
    public static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }

    public static function sign(array $payload, string $secret, int $expiresInSec = 900): string {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $now = time();
        
        $payload['iat'] = $now;
        $payload['exp'] = $now + $expiresInSec;

        $encodedHeader = self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES));
        $encodedPayload = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));

        $signature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", $secret, true);
        $encodedSignature = self::base64UrlEncode($signature);

        return "$encodedHeader.$encodedPayload.$encodedSignature";
    }

    public static function verify(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $signature = self::base64UrlDecode($encodedSignature);
        $expectedSignature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", $secret, true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null; // Expired or malformed
        }

        return $payload;
    }
}

/**
 * Creates and stores a SHA-256 hashed refresh token in MySQL and returns the raw token string
 */
function issueRefreshToken(string $userId, int $days = 30): string {
    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $expiresAt = date('Y-m-d H:i:s', time() + ($days * 86400));

    dbInsert('RefreshToken', [
        'id'        => generateId(),
        'userId'    => $userId,
        'tokenHash' => $tokenHash,
        'expiresAt' => $expiresAt,
        'createdAt' => date('Y-m-d H:i:s'),
        'updatedAt' => date('Y-m-d H:i:s'),
    ]);

    return $rawToken;
}

/**
 * Hashes raw token with SHA-256
 */
function hashToken(string $raw): string {
    return hash('sha256', $raw);
}
