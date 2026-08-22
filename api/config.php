<?php
/**
 * TaskMatrix - Backend Configuration for cPanel / BigRock Shared Hosting
 * tasks.vjsconnect.com
 */

// Timezone configuration (India Standard Time UTC+5:30)
date_default_timezone_set('Asia/Kolkata');

return [
    // Database credentials
    'db' => [
        'host'     => getenv('DB_HOST') ?: 'localhost',
        'port'     => getenv('DB_PORT') ?: 3306,
        'database' => getenv('DB_NAME') ?: 'vjsco9cf_task',
        'username' => getenv('DB_USER') ?: 'vjsco9cf_tasks_vjs_connect',
        'password' => getenv('DB_PASS') !== false && getenv('DB_PASS') !== '' ? getenv('DB_PASS') : 'Vjs@Verma@222454',
        'charset'  => 'utf8mb4',
    ],

    // JWT Auth configuration
    'jwt' => [
        'secret'               => getenv('JWT_ACCESS_SECRET') ?: 'vjs_taskmatrix_secret_key_change_me_in_production_2026_super_secure',
        'access_expires_sec'   => 15 * 60,               // 15 minutes
        'refresh_expires_days' => 30,                    // 30 days
        'cookie_secure'        => true,                  // Set true on HTTPS
        'cookie_samesite'      => 'Lax',
    ],

    // App & Domain URLs
    'app' => [
        'client_url' => getenv('CLIENT_URL') ?: 'https://tasks.vjsconnect.com',
        'timezone_offset_minutes' => 330, // UTC+5:30
    ],

    // File Uploads
    'upload' => [
        'max_size_mb' => 20,
        'dir'         => dirname(__DIR__) . '/uploads',
        'allowed_mimes' => [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv'
        ]
    ]
];
