<?php
/**
 * DepartmentController - Department Management
 */

class DepartmentController {
    public static function getAll(): void {
        requireAuth();
        $depts = dbFetchAll("SELECT * FROM `Department` ORDER BY `name` ASC");
        $data = array_map(fn($d) => [
            'id'       => $d['id'],
            'name'     => $d['name'],
            'isActive' => (bool)$d['isActive'],
            'storeId'  => $d['storeId'] ?? null,
        ], $depts);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function create(): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $name = trim($body['name'] ?? '');

        if (empty($name)) {
            errorResponse('Department name is required', 400);
        }

        $id = generateId();
        dbInsert('Department', [
            'id'        => $id,
            'name'      => $name,
            'storeId'   => !empty($body['storeId']) ? $body['storeId'] : null,
            'isActive'  => isset($body['isActive']) ? ($body['isActive'] ? 1 : 0) : 1,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `Department` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'success' => true,
            'data'    => [
                'id'       => $created['id'],
                'name'     => $created['name'],
                'isActive' => (bool)$created['isActive'],
                'storeId'  => $created['storeId'],
            ]
        ], 201);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $existing = dbFetchOne("SELECT * FROM `Department` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Department not found', 404);
        }

        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['name'])) $update['name'] = trim($body['name']);
        if (array_key_exists('storeId', $body)) $update['storeId'] = $body['storeId'] ?: null;
        if (isset($body['isActive'])) $update['isActive'] = $body['isActive'] ? 1 : 0;

        dbUpdate('Department', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `Department` WHERE `id` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'       => $updated['id'],
                'name'     => $updated['name'],
                'isActive' => (bool)$updated['isActive'],
                'storeId'  => $updated['storeId'],
            ]
        ]);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN']);
        $existing = dbFetchOne("SELECT `id` FROM `Department` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Department not found', 404);
        }

        dbDelete('Department', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
