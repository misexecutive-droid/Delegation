<?php
/**
 * ChecklistTemplateController - Reusable Checklist Template Management
 */

class ChecklistTemplateController {
    private static function populateTemplates(array $templates): array {
        if (empty($templates)) return [];
        $ids = array_column($templates, 'id');
        $inClause = implode(',', array_fill(0, count($ids), '?'));

        $items = dbFetchAll("SELECT * FROM `ChecklistTemplateItem` WHERE `templateId` IN ($inClause) ORDER BY `order` ASC", $ids);
        $itemsByTemplate = [];
        foreach ($items as $i) {
            $itemsByTemplate[$i['templateId']][] = [
                'id'                 => $i['id'],
                'label'              => $i['label'],
                'order'              => (int)$i['order'],
                'requiredImageCount' => (int)$i['requiredImageCount'],
                'maxImageCount'      => $i['maxImageCount'] !== null ? (int)$i['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$i['requiresLivePhoto'],
                'defaultAssigneeId'  => $i['defaultAssigneeId'] ?? null,
                'templateId'         => $i['templateId'],
            ];
        }

        return array_map(function($t) use ($itemsByTemplate) {
            return [
                'id'           => $t['id'],
                'name'         => $t['name'],
                'appliesTo'    => $t['appliesTo'],
                'departmentId' => $t['departmentId'] ?? null,
                'createdBy'    => $t['createdBy'],
                'items'        => $itemsByTemplate[$t['id']] ?? [],
                'createdAt'    => $t['createdAt'],
                'updatedAt'    => $t['updatedAt'],
            ];
        }, $templates);
    }

    public static function getAll(): void {
        requireAuth();
        $appliesTo = $_GET['appliesTo'] ?? null;
        $sql = "SELECT * FROM `ChecklistTemplate`";
        $params = [];

        if ($appliesTo) {
            $sql .= " WHERE `appliesTo` = :appliesTo";
            $params['appliesTo'] = $appliesTo;
        }
        $sql .= " ORDER BY `name` ASC";

        $templates = dbFetchAll($sql, $params);
        jsonResponse([
            'success' => true,
            'data'    => self::populateTemplates($templates),
        ]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $t = dbFetchOne("SELECT * FROM `ChecklistTemplate` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$t) {
            errorResponse('Template not found', 404);
        }

        $populated = self::populateTemplates([$t]);
        jsonResponse([
            'success' => true,
            'data'    => $populated[0] ?? null,
        ]);
    }

    public static function create(): void {
        $user = requireRole(['ADMIN', 'MANAGER', 'PC']);
        $body = getRequestBody();

        $name = trim($body['name'] ?? '');
        $appliesTo = $body['appliesTo'] ?? 'TASK';
        if (empty($name)) {
            errorResponse('Template name is required', 400);
        }

        $id = generateId();
        dbTransaction(function() use ($id, $name, $appliesTo, $body, $user) {
            dbInsert('ChecklistTemplate', [
                'id'           => $id,
                'name'         => $name,
                'appliesTo'    => in_array($appliesTo, ['TASK', 'TICKET']) ? $appliesTo : 'TASK',
                'departmentId' => !empty($body['departmentId']) ? $body['departmentId'] : null,
                'createdBy'    => $user['sub'],
                'createdAt'    => date('Y-m-d H:i:s'),
                'updatedAt'    => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['items']) && is_array($body['items'])) {
                foreach ($body['items'] as $idx => $item) {
                    dbInsert('ChecklistTemplateItem', [
                        'id'                 => generateId(),
                        'label'              => trim($item['label'] ?? ''),
                        'order'              => (int)($item['order'] ?? $idx),
                        'requiredImageCount' => (int)($item['requiredImageCount'] ?? 0),
                        'maxImageCount'      => isset($item['maxImageCount']) && $item['maxImageCount'] !== '' ? (int)$item['maxImageCount'] : null,
                        'requiresLivePhoto'  => !empty($item['requiresLivePhoto']) ? 1 : 0,
                        'defaultAssigneeId'  => !empty($item['defaultAssigneeId']) ? $item['defaultAssigneeId'] : null,
                        'templateId'         => $id,
                        'createdAt'          => date('Y-m-d H:i:s'),
                        'updatedAt'          => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getOne($id);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        $t = dbFetchOne("SELECT `id` FROM `ChecklistTemplate` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$t) {
            errorResponse('Template not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['name'])) $update['name'] = trim($body['name']);
        if (array_key_exists('departmentId', $body)) $update['departmentId'] = $body['departmentId'] ?: null;

        dbUpdate('ChecklistTemplate', $update, "`id` = :id", ['id' => $id]);
        self::getOne($id);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        dbDelete('ChecklistTemplate', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function addItem(string $templateId): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        $t = dbFetchOne("SELECT `id` FROM `ChecklistTemplate` WHERE `id` = :id LIMIT 1", ['id' => $templateId]);
        if (!$t) {
            errorResponse('Template not found', 404);
        }

        $body = getRequestBody();
        $itemId = generateId();

        dbInsert('ChecklistTemplateItem', [
            'id'                 => $itemId,
            'label'              => trim($body['label'] ?? ''),
            'order'              => (int)($body['order'] ?? 0),
            'requiredImageCount' => (int)($body['requiredImageCount'] ?? 0),
            'maxImageCount'      => isset($body['maxImageCount']) && $body['maxImageCount'] !== '' ? (int)$body['maxImageCount'] : null,
            'requiresLivePhoto'  => !empty($body['requiresLivePhoto']) ? 1 : 0,
            'defaultAssigneeId'  => !empty($body['defaultAssigneeId']) ? $body['defaultAssigneeId'] : null,
            'templateId'         => $templateId,
            'createdAt'          => date('Y-m-d H:i:s'),
            'updatedAt'          => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `ChecklistTemplateItem` WHERE `id` = :id", ['id' => $itemId]);
        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                 => $created['id'],
                'label'              => $created['label'],
                'order'              => (int)$created['order'],
                'requiredImageCount' => (int)$created['requiredImageCount'],
                'maxImageCount'      => $created['maxImageCount'] !== null ? (int)$created['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$created['requiresLivePhoto'],
                'defaultAssigneeId'  => $created['defaultAssigneeId'],
                'templateId'         => $created['templateId'],
            ]
        ], 201);
    }

    public static function updateItem(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        $item = dbFetchOne("SELECT * FROM `ChecklistTemplateItem` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$item) {
            errorResponse('Item not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];

        if (isset($body['label'])) $update['label'] = trim($body['label']);
        if (isset($body['order'])) $update['order'] = (int)$body['order'];
        if (isset($body['requiredImageCount'])) $update['requiredImageCount'] = (int)$body['requiredImageCount'];
        if (array_key_exists('maxImageCount', $body)) $update['maxImageCount'] = $body['maxImageCount'] !== null && $body['maxImageCount'] !== '' ? (int)$body['maxImageCount'] : null;
        if (isset($body['requiresLivePhoto'])) $update['requiresLivePhoto'] = $body['requiresLivePhoto'] ? 1 : 0;
        if (array_key_exists('defaultAssigneeId', $body)) $update['defaultAssigneeId'] = $body['defaultAssigneeId'] ?: null;

        dbUpdate('ChecklistTemplateItem', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `ChecklistTemplateItem` WHERE `id` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                 => $updated['id'],
                'label'              => $updated['label'],
                'order'              => (int)$updated['order'],
                'requiredImageCount' => (int)$updated['requiredImageCount'],
                'maxImageCount'      => $updated['maxImageCount'] !== null ? (int)$updated['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$updated['requiresLivePhoto'],
                'defaultAssigneeId'  => $updated['defaultAssigneeId'],
                'templateId'         => $updated['templateId'],
            ]
        ]);
    }

    public static function deleteItem(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        dbDelete('ChecklistTemplateItem', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
