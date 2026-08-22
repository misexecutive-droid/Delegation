<?php
/**
 * TodoController - Personal Todo Lists
 */

class TodoController {
    public static function getAll(): void {
        $user = requireAuth();
        $todos = dbFetchAll("SELECT * FROM `Todo` WHERE `userId` = :uId ORDER BY `createdAt` DESC", ['uId' => $user['sub']]);
        $data = array_map(fn($t) => [
            'id'        => $t['id'],
            'text'      => $t['text'],
            'completed' => (bool)$t['completed'],
            'dueDate'   => $t['dueDate'],
            'priority'  => $t['priority'],
            'createdAt' => $t['createdAt'],
        ], $todos);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function create(): void {
        $user = requireAuth();
        $body = getRequestBody();
        $text = trim($body['text'] ?? '');
        if (empty($text)) {
            errorResponse('Todo text is required', 400);
        }

        $id = generateId();
        dbInsert('Todo', [
            'id'        => $id,
            'userId'    => $user['sub'],
            'text'      => $text,
            'completed' => 0,
            'dueDate'   => !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null,
            'priority'  => in_array($body['priority'] ?? '', ['low', 'medium', 'high']) ? $body['priority'] : 'medium',
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `Todo` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'success' => true,
            'data'    => [
                'id'        => $created['id'],
                'text'      => $created['text'],
                'completed' => (bool)$created['completed'],
                'dueDate'   => $created['dueDate'],
                'priority'  => $created['priority'],
                'createdAt' => $created['createdAt'],
            ]
        ], 201);
    }

    public static function update(string $id): void {
        $user = requireAuth();
        $existing = dbFetchOne("SELECT * FROM `Todo` WHERE `id` = :id AND `userId` = :uId LIMIT 1", ['id' => $id, 'uId' => $user['sub']]);
        if (!$existing) {
            errorResponse('Todo not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];

        if (isset($body['text'])) $update['text'] = trim($body['text']);
        if (isset($body['completed'])) $update['completed'] = $body['completed'] ? 1 : 0;
        if (array_key_exists('dueDate', $body)) $update['dueDate'] = !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null;
        if (isset($body['priority'])) $update['priority'] = $body['priority'];

        dbUpdate('Todo', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `Todo` WHERE `id` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'        => $updated['id'],
                'text'      => $updated['text'],
                'completed' => (bool)$updated['completed'],
                'dueDate'   => $updated['dueDate'],
                'priority'  => $updated['priority'],
                'createdAt' => $updated['createdAt'],
            ]
        ]);
    }

    public static function delete(string $id): void {
        $user = requireAuth();
        dbDelete('Todo', "`id` = :id AND `userId` = :uId", ['id' => $id, 'uId' => $user['sub']]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
