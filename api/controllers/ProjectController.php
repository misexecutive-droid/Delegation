<?php
/**
 * ProjectController - Project Workspace and Team Members
 */

class ProjectController {
    private static function populateProjects(array $projects): array {
        if (empty($projects)) return [];
        $ids = array_column($projects, 'id');
        $inClause = implode(',', array_fill(0, count($ids), '?'));

        $memberRows = dbFetchAll("SELECT * FROM `ProjectMember` WHERE `projectId` IN ($inClause)", $ids);
        $membersByProject = [];
        foreach ($memberRows as $m) {
            $membersByProject[$m['projectId']][] = $m['userId'];
        }

        return array_map(function($p) use ($membersByProject) {
            return [
                'id'          => $p['id'],
                'name'        => $p['name'],
                'description' => $p['description'],
                'ownerId'     => $p['ownerId'],
                'memberIds'   => $membersByProject[$p['id']] ?? [],
                'createdAt'   => $p['createdAt'],
            ];
        }, $projects);
    }

    public static function getAll(): void {
        $user = requireAuth();
        $sub = Database::getInstance()->quote($user['sub']);

        $projects = dbFetchAll("
            SELECT * FROM `Project` 
            WHERE `ownerId` = $sub OR `id` IN (SELECT `projectId` FROM `ProjectMember` WHERE `userId` = $sub)
            ORDER BY `name` ASC
        ");

        jsonResponse(['success' => true, 'data' => self::populateProjects($projects)]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $p = dbFetchOne("SELECT * FROM `Project` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$p) {
            errorResponse('Project not found', 404);
        }

        $populated = self::populateProjects([$p]);
        jsonResponse(['success' => true, 'data' => $populated[0] ?? null]);
    }

    public static function create(): void {
        $user = requireAuth();
        $body = getRequestBody();
        $name = trim($body['name'] ?? '');
        if (empty($name)) {
            errorResponse('Project name is required', 400);
        }

        $id = generateId();
        dbTransaction(function() use ($id, $name, $body, $user) {
            dbInsert('Project', [
                'id'          => $id,
                'name'        => $name,
                'description' => trim($body['description'] ?? '') ?: null,
                'ownerId'     => $user['sub'],
                'createdAt'   => date('Y-m-d H:i:s'),
                'updatedAt'   => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['memberIds']) && is_array($body['memberIds'])) {
                foreach ($body['memberIds'] as $mId) {
                    dbInsert('ProjectMember', [
                        'id'        => generateId(),
                        'projectId' => $id,
                        'userId'    => $mId,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getOne($id);
    }

    public static function update(string $id): void {
        $user = requireAuth();
        $p = dbFetchOne("SELECT * FROM `Project` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$p) {
            errorResponse('Project not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['name'])) $update['name'] = trim($body['name']);
        if (array_key_exists('description', $body)) $update['description'] = trim($body['description'] ?? '') ?: null;

        dbTransaction(function() use ($id, $update, $body) {
            dbUpdate('Project', $update, "`id` = :id", ['id' => $id]);

            if (isset($body['memberIds']) && is_array($body['memberIds'])) {
                dbDelete('ProjectMember', "`projectId` = :id", ['id' => $id]);
                foreach ($body['memberIds'] as $mId) {
                    dbInsert('ProjectMember', [
                        'id'        => generateId(),
                        'projectId' => $id,
                        'userId'    => $mId,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getOne($id);
    }

    public static function delete(string $id): void {
        requireAuth();
        dbDelete('Project', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
