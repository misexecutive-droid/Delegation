<?php
/**
 * UserController - User Management and Directory Operations
 */

class UserController {
    public static function getAll(): void {
        requireAuth();
        $users = dbFetchAll("
            SELECT u.`id`, u.`email`, u.`firstName`, u.`lastName`, u.`role`, 
                   u.`departmentId`, u.`storeId`, u.`isActive`, u.`rank`, u.`phone`, u.`createdAt`,
                   d.`name` AS departmentName, s.`name` AS storeName
            FROM `User` u
            LEFT JOIN `Department` d ON d.`id` = u.`departmentId`
            LEFT JOIN `Store` s ON s.`id` = u.`storeId`
            ORDER BY u.`createdAt` DESC
        ");

        $data = array_map(function($u) {
            return [
                'id'           => $u['id'],
                'email'        => $u['email'],
                'firstName'    => $u['firstName'],
                'lastName'     => $u['lastName'] ?? null,
                'role'         => $u['role'],
                'departmentId' => $u['departmentId'] ?? null,
                'storeId'      => $u['storeId'] ?? null,
                'department'   => $u['departmentName'] ? ['id' => $u['departmentId'], 'name' => $u['departmentName']] : null,
                'store'        => $u['storeName'] ? ['id' => $u['storeId'], 'name' => $u['storeName']] : null,
                'isActive'     => (bool)$u['isActive'],
                'rank'         => (int)($u['rank'] ?? 6),
                'phone'        => $u['phone'] ?? null,
                'createdAt'    => $u['createdAt'],
            ];
        }, $users);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $u = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$u) {
            errorResponse('User not found', 404);
        }

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'           => $u['id'],
                'email'        => $u['email'],
                'firstName'    => $u['firstName'],
                'lastName'     => $u['lastName'] ?? null,
                'role'         => $u['role'],
                'departmentId' => $u['departmentId'] ?? null,
                'storeId'      => $u['storeId'] ?? null,
                'isActive'     => (bool)$u['isActive'],
                'createdAt'    => $u['createdAt'],
            ]
        ]);
    }

    public static function getAssignable(): void {
        requireAuth();
        $deptId = $_GET['departmentId'] ?? null;
        $storeId = $_GET['storeId'] ?? null;

        $sql = "SELECT `id`, `firstName`, `lastName`, `email`, `role`, `departmentId`, `storeId` FROM `User` WHERE `isActive` = 1";
        $params = [];

        if ($deptId) {
            $sql .= " AND `departmentId` = :deptId";
            $params['deptId'] = $deptId;
        }
        if ($storeId) {
            $sql .= " AND `storeId` = :storeId";
            $params['storeId'] = $storeId;
        }

        $sql .= " ORDER BY `firstName` ASC";
        $users = dbFetchAll($sql, $params);

        jsonResponse([
            'success' => true,
            'data'    => array_map(fn($u) => [
                'id'           => $u['id'],
                'firstName'    => $u['firstName'],
                'lastName'     => $u['lastName'] ?? null,
                'email'        => $u['email'],
                'role'         => $u['role'],
                'departmentId' => $u['departmentId'] ?? null,
            ], $users)
        ]);
    }

    public static function create(): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();

        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $firstName = trim($body['firstName'] ?? '');
        $lastName = trim($body['lastName'] ?? '');
        $role = $body['role'] ?? 'USER';
        $departmentId = !empty($body['departmentId']) ? $body['departmentId'] : null;
        $storeId = !empty($body['storeId']) ? $body['storeId'] : null;

        if (empty($email) || empty($password) || empty($firstName)) {
            errorResponse('Email, password, and first name are required', 400);
        }

        $existing = dbFetchOne("SELECT `id` FROM `User` WHERE LOWER(TRIM(`email`)) = :email LIMIT 1", ['email' => $email]);
        if ($existing) {
            errorResponse('Email already in use', 409);
        }

        $id = generateId();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        dbInsert('User', [
            'id'           => $id,
            'email'        => $email,
            'passwordHash' => $passwordHash,
            'firstName'    => $firstName,
            'lastName'     => $lastName ?: null,
            'role'         => $role,
            'departmentId' => $departmentId,
            'storeId'      => $storeId,
            'isActive'     => 1,
            'createdAt'    => date('Y-m-d H:i:s'),
            'updatedAt'    => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'success' => true,
            'data'    => [
                'id'           => $created['id'],
                'email'        => $created['email'],
                'firstName'    => $created['firstName'],
                'lastName'     => $created['lastName'],
                'role'         => $created['role'],
                'departmentId' => $created['departmentId'],
                'storeId'      => $created['storeId'],
                'isActive'     => (bool)$created['isActive'],
                'createdAt'    => $created['createdAt'],
            ]
        ], 201);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN']);
        $body = getRequestBody();

        $existing = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('User not found', 404);
        }

        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['firstName'])) $update['firstName'] = trim($body['firstName']);
        if (isset($body['lastName'])) $update['lastName'] = trim($body['lastName']) ?: null;
        if (isset($body['role'])) $update['role'] = $body['role'];
        if (array_key_exists('departmentId', $body)) $update['departmentId'] = $body['departmentId'] ?: null;
        if (array_key_exists('storeId', $body)) $update['storeId'] = $body['storeId'] ?: null;
        if (isset($body['isActive'])) $update['isActive'] = $body['isActive'] ? 1 : 0;
        if (!empty($body['password'])) $update['passwordHash'] = password_hash($body['password'], PASSWORD_BCRYPT);

        dbUpdate('User', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `User` WHERE `id` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'           => $updated['id'],
                'email'        => $updated['email'],
                'firstName'    => $updated['firstName'],
                'lastName'     => $updated['lastName'],
                'role'         => $updated['role'],
                'departmentId' => $updated['departmentId'],
                'storeId'      => $updated['storeId'],
                'isActive'     => (bool)$updated['isActive'],
                'createdAt'    => $updated['createdAt'],
            ]
        ]);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN']);
        $existing = dbFetchOne("SELECT `id` FROM `User` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('User not found', 404);
        }

        dbDelete('User', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
