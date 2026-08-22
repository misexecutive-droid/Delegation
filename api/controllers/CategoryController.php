<?php
/**
 * CategoryController - Ticket Category Management & Assignee Mappings
 */

class CategoryController {
    private static function populateCategories(array $categories): array {
        if (empty($categories)) return [];
        $catIds = array_column($categories, 'id');
        $inClause = implode(',', array_fill(0, count($catIds), '?'));

        $assigneeRows = dbFetchAll("
            SELECT ca.`categoryId`, u.`id`, u.`firstName`, u.`lastName`, u.`email`
            FROM `CategoryAssignee` ca
            JOIN `User` u ON u.`id` = ca.`userId`
            WHERE ca.`categoryId` IN ($inClause)
        ", $catIds);

        $assigneesByCat = [];
        foreach ($assigneeRows as $row) {
            $assigneesByCat[$row['categoryId']][] = [
                'id'        => $row['id'],
                'firstName' => $row['firstName'],
                'lastName'  => $row['lastName'] ?? null,
                'email'     => $row['email'],
            ];
        }

        return array_map(function($c) use ($assigneesByCat) {
            return [
                'id'           => $c['id'],
                'name'         => $c['name'],
                'isActive'     => (bool)$c['isActive'],
                'departmentId' => [
                    'id'   => $c['departmentId'],
                    'name' => $c['departmentName'] ?? '',
                ],
                'assigneeIds'  => $assigneesByCat[$c['id']] ?? [],
                'tatHours'     => $c['tatHours'] !== null ? (float)$c['tatHours'] : null,
            ];
        }, $categories);
    }

    public static function getAll(): void {
        requireAuth();
        $cats = dbFetchAll("
            SELECT c.*, d.`name` AS departmentName
            FROM `Category` c
            LEFT JOIN `Department` d ON d.`id` = c.`departmentId`
            ORDER BY c.`name` ASC
        ");

        jsonResponse([
            'success' => true,
            'data'    => self::populateCategories($cats),
        ]);
    }

    public static function create(): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $name = trim($body['name'] ?? '');
        $departmentId = $body['departmentId'] ?? '';
        $tatHours = isset($body['tatHours']) && $body['tatHours'] !== '' ? (float)$body['tatHours'] : null;
        $assigneeIds = $body['assigneeIds'] ?? [];

        if (empty($name) || empty($departmentId)) {
            errorResponse('Name and departmentId are required', 400);
        }

        $id = generateId();
        dbTransaction(function() use ($id, $name, $departmentId, $tatHours, $assigneeIds) {
            dbInsert('Category', [
                'id'           => $id,
                'name'         => $name,
                'departmentId' => $departmentId,
                'tatHours'     => $tatHours,
                'isActive'     => 1,
                'createdAt'    => date('Y-m-d H:i:s'),
                'updatedAt'    => date('Y-m-d H:i:s'),
            ]);

            foreach ($assigneeIds as $userId) {
                dbInsert('CategoryAssignee', [
                    'id'         => generateId(),
                    'categoryId' => $id,
                    'userId'     => $userId,
                    'createdAt'  => date('Y-m-d H:i:s'),
                ]);
            }
        });

        $created = dbFetchAll("
            SELECT c.*, d.`name` AS departmentName
            FROM `Category` c
            LEFT JOIN `Department` d ON d.`id` = c.`departmentId`
            WHERE c.`id` = :id
        ", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => self::populateCategories($created)[0] ?? null,
        ], 201);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();
        $existing = dbFetchOne("SELECT * FROM `Category` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Category not found', 404);
        }

        dbTransaction(function() use ($id, $body) {
            $update = ['updatedAt' => date('Y-m-d H:i:s')];
            if (isset($body['name'])) $update['name'] = trim($body['name']);
            if (isset($body['departmentId'])) $update['departmentId'] = $body['departmentId'];
            if (array_key_exists('tatHours', $body)) $update['tatHours'] = $body['tatHours'] !== null && $body['tatHours'] !== '' ? (float)$body['tatHours'] : null;
            if (isset($body['isActive'])) $update['isActive'] = $body['isActive'] ? 1 : 0;

            dbUpdate('Category', $update, "`id` = :id", ['id' => $id]);

            if (isset($body['assigneeIds']) && is_array($body['assigneeIds'])) {
                dbDelete('CategoryAssignee', "`categoryId` = :id", ['id' => $id]);
                foreach ($body['assigneeIds'] as $userId) {
                    dbInsert('CategoryAssignee', [
                        'id'         => generateId(),
                        'categoryId' => $id,
                        'userId'     => $userId,
                        'createdAt'  => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        $updated = dbFetchAll("
            SELECT c.*, d.`name` AS departmentName
            FROM `Category` c
            LEFT JOIN `Department` d ON d.`id` = c.`departmentId`
            WHERE c.`id` = :id
        ", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => self::populateCategories($updated)[0] ?? null,
        ]);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN']);
        $existing = dbFetchOne("SELECT `id` FROM `Category` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Category not found', 404);
        }

        dbDelete('Category', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
