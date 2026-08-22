<?php
/**
 * StoreController - Store / Branch Management
 */

class StoreController {
    public static function getAll(): void {
        requireAuth();
        $stores = dbFetchAll("SELECT * FROM `Store` ORDER BY `name` ASC");
        $data = array_map(fn($s) => [
            'id'       => $s['id'],
            'name'     => $s['name'],
            'code'     => $s['code'] ?? null,
            'address'  => $s['address'] ?? null,
            'isActive' => (bool)$s['isActive'],
        ], $stores);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function create(): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $name = trim($body['name'] ?? '');

        if (empty($name)) {
            errorResponse('Store name is required', 400);
        }

        $id = generateId();
        dbInsert('Store', [
            'id'        => $id,
            'name'      => $name,
            'code'      => trim($body['code'] ?? '') ?: null,
            'address'   => trim($body['address'] ?? '') ?: null,
            'isActive'  => isset($body['isActive']) ? ($body['isActive'] ? 1 : 0) : 1,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `Store` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'success' => true,
            'data'    => [
                'id'       => $created['id'],
                'name'     => $created['name'],
                'code'     => $created['code'],
                'address'  => $created['address'],
                'isActive' => (bool)$created['isActive'],
            ]
        ], 201);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $existing = dbFetchOne("SELECT * FROM `Store` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Store not found', 404);
        }

        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['name'])) $update['name'] = trim($body['name']);
        if (array_key_exists('code', $body)) $update['code'] = trim($body['code']) ?: null;
        if (array_key_exists('address', $body)) $update['address'] = trim($body['address']) ?: null;
        if (isset($body['isActive'])) $update['isActive'] = $body['isActive'] ? 1 : 0;

        dbUpdate('Store', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `Store` WHERE `id` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'       => $updated['id'],
                'name'     => $updated['name'],
                'code'     => $updated['code'],
                'address'  => $updated['address'],
                'isActive' => (bool)$updated['isActive'],
            ]
        ]);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN']);
        $existing = dbFetchOne("SELECT `id` FROM `Store` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Store not found', 404);
        }

        dbDelete('Store', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
