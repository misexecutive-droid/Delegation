<?php
/**
 * TaskChecklistController - Task Checklist Items, Completion, and Photo Proofs
 */

class TaskChecklistController {
    public static function createChecklist(string $taskId): void {
        requireAuth();
        $task = dbFetchOne("SELECT `id` FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $taskId]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        $body = getRequestBody();
        $title = trim($body['title'] ?? '');
        if (empty($title)) {
            errorResponse('Checklist title is required', 400);
        }

        $checklistId = generateId();
        dbTransaction(function() use ($checklistId, $taskId, $title, $body) {
            dbInsert('TaskChecklist', [
                'id'        => $checklistId,
                'title'     => $title,
                'taskId'    => $taskId,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['items']) && is_array($body['items'])) {
                foreach ($body['items'] as $item) {
                    dbInsert('TaskChecklistItem', [
                        'id'                 => generateId(),
                        'label'              => trim($item['label'] ?? ''),
                        'isDone'             => 0,
                        'assigneeId'         => !empty($item['assigneeId']) ? $item['assigneeId'] : null,
                        'dueAt'              => !empty($item['dueAt']) ? date('Y-m-d H:i:s', strtotime($item['dueAt'])) : null,
                        'taskChecklistId'    => $checklistId,
                        'requiredImageCount' => (int)($item['requiredImageCount'] ?? 0),
                        'maxImageCount'      => isset($item['maxImageCount']) && $item['maxImageCount'] !== '' ? (int)$item['maxImageCount'] : null,
                        'requiresLivePhoto'  => !empty($item['requiresLivePhoto']) ? 1 : 0,
                        'remarks'            => trim($item['remarks'] ?? '') ?: null,
                        'createdAt'          => date('Y-m-d H:i:s'),
                        'updatedAt'          => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        $checklist = dbFetchOne("SELECT * FROM `TaskChecklist` WHERE `id` = :id", ['id' => $checklistId]);
        $items = dbFetchAll("SELECT * FROM `TaskChecklistItem` WHERE `taskChecklistId` = :id", ['id' => $checklistId]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'     => $checklist['id'],
                'title'  => $checklist['title'],
                'taskId' => $checklist['taskId'],
                'items'  => array_map(fn($i) => [
                    'id'                 => $i['id'],
                    'label'              => $i['label'],
                    'isDone'             => (bool)$i['isDone'],
                    'assigneeId'         => $i['assigneeId'],
                    'dueAt'              => $i['dueAt'],
                    'completedAt'        => $i['completedAt'],
                    'taskChecklistId'    => $i['taskChecklistId'],
                    'requiredImageCount' => (int)$i['requiredImageCount'],
                    'maxImageCount'      => $i['maxImageCount'] !== null ? (int)$i['maxImageCount'] : null,
                    'requiresLivePhoto'  => (bool)$i['requiresLivePhoto'],
                    'remarks'            => $i['remarks'],
                    'images'             => [],
                ], $items),
            ]
        ], 201);
    }

    public static function deleteChecklist(string $id): void {
        requireAuth();
        $cl = dbFetchOne("SELECT `id` FROM `TaskChecklist` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$cl) {
            errorResponse('Checklist not found', 404);
        }

        dbDelete('TaskChecklist', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function updateItem(string $id): void {
        requireAuth();
        $item = dbFetchOne("SELECT * FROM `TaskChecklistItem` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$item) {
            errorResponse('Checklist item not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];

        if (isset($body['label'])) $update['label'] = trim($body['label']);
        if (array_key_exists('assigneeId', $body)) $update['assigneeId'] = $body['assigneeId'] ?: null;
        if (array_key_exists('dueAt', $body)) $update['dueAt'] = !empty($body['dueAt']) ? date('Y-m-d H:i:s', strtotime($body['dueAt'])) : null;
        if (isset($body['requiredImageCount'])) $update['requiredImageCount'] = (int)$body['requiredImageCount'];
        if (array_key_exists('maxImageCount', $body)) $update['maxImageCount'] = $body['maxImageCount'] !== null && $body['maxImageCount'] !== '' ? (int)$body['maxImageCount'] : null;
        if (isset($body['requiresLivePhoto'])) $update['requiresLivePhoto'] = $body['requiresLivePhoto'] ? 1 : 0;
        if (isset($body['isDone'])) {
            $update['isDone'] = $body['isDone'] ? 1 : 0;
            $update['completedAt'] = $body['isDone'] ? date('Y-m-d H:i:s') : null;
        }

        dbUpdate('TaskChecklistItem', $update, "`id` = :id", ['id' => $id]);
        $updated = dbFetchOne("SELECT * FROM `TaskChecklistItem` WHERE `id` = :id", ['id' => $id]);

        $images = dbFetchAll("SELECT * FROM `TaskImage` WHERE `taskChecklistItemId` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                 => $updated['id'],
                'label'              => $updated['label'],
                'isDone'             => (bool)$updated['isDone'],
                'assigneeId'         => $updated['assigneeId'],
                'dueAt'              => $updated['dueAt'],
                'completedAt'        => $updated['completedAt'],
                'taskChecklistId'    => $updated['taskChecklistId'],
                'requiredImageCount' => (int)$updated['requiredImageCount'],
                'maxImageCount'      => $updated['maxImageCount'] !== null ? (int)$updated['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$updated['requiresLivePhoto'],
                'remarks'            => $updated['remarks'],
                'images'             => $images,
            ]
        ]);
    }

    public static function updateRemarks(string $id): void {
        requireAuth();
        $body = getRequestBody();
        $remarks = trim($body['remarks'] ?? '');

        dbUpdate('TaskChecklistItem', [
            'remarks'   => $remarks ?: null,
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $id]);

        self::getItemWithImages($id);
    }

    public static function completeItem(string $id): void {
        requireAuth();
        $item = dbFetchOne("SELECT * FROM `TaskChecklistItem` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$item) {
            errorResponse('Item not found', 404);
        }

        $newDone = !(bool)$item['isDone'];
        dbUpdate('TaskChecklistItem', [
            'isDone'      => $newDone ? 1 : 0,
            'completedAt' => $newDone ? date('Y-m-d H:i:s') : null,
            'updatedAt'   => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $id]);

        self::getItemWithImages($id);
    }

    public static function deleteItem(string $id): void {
        requireAuth();
        dbDelete('TaskChecklistItem', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function uploadImages(string $itemId): void {
        $user = requireAuth();
        $item = dbFetchOne("SELECT `id` FROM `TaskChecklistItem` WHERE `id` = :id LIMIT 1", ['id' => $itemId]);
        if (!$item) {
            errorResponse('Checklist item not found', 404);
        }

        $captureMethod = $_POST['captureMethod'] ?? 'GALLERY';
        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/task-images';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $createdImages = [];
        $files = $_FILES['images'] ?? null;

        if ($files && isset($files['name'])) {
            $isMulti = is_array($files['name']);
            $count = $isMulti ? count($files['name']) : 1;

            for ($i = 0; $i < $count; $i++) {
                $tmpName = $isMulti ? $files['tmp_name'][$i] : $files['tmp_name'];
                $origName = $isMulti ? $files['name'][$i] : $files['name'];
                $size = $isMulti ? $files['size'][$i] : $files['size'];
                $mime = $isMulti ? $files['type'][$i] : $files['type'];
                $error = $isMulti ? $files['error'][$i] : $files['error'];

                if ($error === UPLOAD_ERR_OK && is_uploaded_file($tmpName)) {
                    $ext = pathinfo($origName, PATHINFO_EXTENSION);
                    $newFilename = generateId() . '.' . ($ext ?: 'jpg');
                    $dest = "$uploadDir/$newFilename";

                    if (move_uploaded_file($tmpName, $dest)) {
                        $imgId = generateId();
                        $url = "/uploads/task-images/$newFilename";

                        dbInsert('TaskImage', [
                            'id'                  => $imgId,
                            'url'                 => $url,
                            'originalFilename'    => $origName,
                            'sizeBytes'           => $size,
                            'mimeType'            => $mime,
                            'captureMethod'       => in_array($captureMethod, ['LIVE', 'GALLERY']) ? $captureMethod : 'GALLERY',
                            'taskChecklistItemId' => $itemId,
                            'uploadedBy'          => $user['sub'],
                            'createdAt'           => date('Y-m-d H:i:s'),
                            'updatedAt'           => date('Y-m-d H:i:s'),
                        ]);

                        $createdImages[] = [
                            'id'                  => $imgId,
                            'url'                 => $url,
                            'originalFilename'    => $origName,
                            'sizeBytes'           => $size,
                            'mimeType'            => $mime,
                            'captureMethod'       => $captureMethod,
                            'taskChecklistItemId' => $itemId,
                            'uploadedBy'          => $user['sub'],
                            'createdAt'           => date('Y-m-d H:i:s'),
                        ];
                    }
                }
            }
        }

        jsonResponse(['success' => true, 'data' => $createdImages]);
    }

    public static function deleteImage(string $id): void {
        requireAuth();
        $img = dbFetchOne("SELECT * FROM `TaskImage` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$img) {
            errorResponse('Image not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $filePath = dirname(__DIR__, 2) . $img['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        dbDelete('TaskImage', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function applyTemplate(string $taskId, string $templateId): void {
        requireAuth();
        $template = dbFetchOne("SELECT * FROM `ChecklistTemplate` WHERE `id` = :id LIMIT 1", ['id' => $templateId]);
        if (!$template) {
            errorResponse('Template not found', 404);
        }

        $templateItems = dbFetchAll("SELECT * FROM `ChecklistTemplateItem` WHERE `templateId` = :id ORDER BY `order` ASC", ['id' => $templateId]);

        $checklistId = generateId();
        dbTransaction(function() use ($checklistId, $taskId, $template, $templateItems) {
            dbInsert('TaskChecklist', [
                'id'        => $checklistId,
                'title'     => $template['name'],
                'taskId'    => $taskId,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
            ]);

            foreach ($templateItems as $ti) {
                dbInsert('TaskChecklistItem', [
                    'id'                 => generateId(),
                    'label'              => $ti['label'],
                    'isDone'             => 0,
                    'assigneeId'         => $ti['defaultAssigneeId'],
                    'taskChecklistId'    => $checklistId,
                    'requiredImageCount' => (int)$ti['requiredImageCount'],
                    'maxImageCount'      => $ti['maxImageCount'] !== null ? (int)$ti['maxImageCount'] : null,
                    'requiresLivePhoto'  => (bool)$ti['requiresLivePhoto'],
                    'createdAt'          => date('Y-m-d H:i:s'),
                    'updatedAt'          => date('Y-m-d H:i:s'),
                ]);
            }
        });

        jsonResponse(['success' => true, 'data' => ['applied' => true]]);
    }

    private static function getItemWithImages(string $id): void {
        $item = dbFetchOne("SELECT * FROM `TaskChecklistItem` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$item) {
            errorResponse('Item not found', 404);
        }
        $images = dbFetchAll("SELECT * FROM `TaskImage` WHERE `taskChecklistItemId` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                 => $item['id'],
                'label'              => $item['label'],
                'isDone'             => (bool)$item['isDone'],
                'assigneeId'         => $item['assigneeId'],
                'dueAt'              => $item['dueAt'],
                'completedAt'        => $item['completedAt'],
                'taskChecklistId'    => $item['taskChecklistId'],
                'requiredImageCount' => (int)$item['requiredImageCount'],
                'maxImageCount'      => $item['maxImageCount'] !== null ? (int)$item['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$item['requiresLivePhoto'],
                'remarks'            => $item['remarks'],
                'images'             => $images,
            ]
        ]);
    }
}
