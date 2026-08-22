<?php
/**
 * SettingsController - Global Organization & Application Settings
 */

class SettingsController {
    public static function get(): void {
        requireAuth();
        $s = dbFetchOne("SELECT * FROM `Settings` LIMIT 1");
        if (!$s) {
            $id = generateId();
            $allowed = json_encode(['image/jpeg', 'image/png', 'image/webp']);
            dbInsert('Settings', [
                'id'                => $id,
                'defaultTatHours'   => 24,
                'maxUploadSizeMb'   => 5,
                'maxUploadFiles'    => 10,
                'allowedImageTypes' => $allowed,
                'createdAt'         => date('Y-m-d H:i:s'),
                'updatedAt'         => date('Y-m-d H:i:s'),
            ]);
            $s = dbFetchOne("SELECT * FROM `Settings` WHERE `id` = :id", ['id' => $id]);
        }

        jsonResponse([
            'success' => true,
            'data'    => [
                'defaultTatHours'   => (float)$s['defaultTatHours'],
                'maxUploadSizeMb'   => (float)$s['maxUploadSizeMb'],
                'maxUploadFiles'    => (int)$s['maxUploadFiles'],
                'allowedImageTypes' => !empty($s['allowedImageTypes']) ? json_decode($s['allowedImageTypes'], true) : ['image/jpeg', 'image/png', 'image/webp'],
            ]
        ]);
    }

    public static function update(): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $s = dbFetchOne("SELECT `id` FROM `Settings` LIMIT 1");
        $id = $s ? $s['id'] : generateId();

        $update = [
            'id'        => $id,
            'updatedAt' => date('Y-m-d H:i:s'),
        ];
        if (isset($body['defaultTatHours'])) $update['defaultTatHours'] = (float)$body['defaultTatHours'];
        if (isset($body['maxUploadSizeMb'])) $update['maxUploadSizeMb'] = (float)$body['maxUploadSizeMb'];
        if (isset($body['maxUploadFiles'])) $update['maxUploadFiles'] = (int)$body['maxUploadFiles'];
        if (isset($body['allowedImageTypes']) && is_array($body['allowedImageTypes'])) {
            $update['allowedImageTypes'] = json_encode($body['allowedImageTypes']);
        }

        if ($s) {
            unset($update['id']);
            dbUpdate('Settings', $update, "`id` = :id", ['id' => $id]);
        } else {
            $update['createdAt'] = date('Y-m-d H:i:s');
            if (!isset($update['defaultTatHours'])) $update['defaultTatHours'] = 24;
            if (!isset($update['maxUploadSizeMb'])) $update['maxUploadSizeMb'] = 5;
            if (!isset($update['maxUploadFiles'])) $update['maxUploadFiles'] = 10;
            if (!isset($update['allowedImageTypes'])) $update['allowedImageTypes'] = json_encode(['image/jpeg', 'image/png', 'image/webp']);
            dbInsert('Settings', $update);
        }

        self::get();
    }
}
