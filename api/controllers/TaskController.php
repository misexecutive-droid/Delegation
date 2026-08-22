<?php
/**
 * TaskController - Task / Delegation Management, Scoping, and Compliance Reports
 */

class TaskController {
    public static function getVisibilityCondition(array $user, ?string $filterUserId = null): string {
        $role = $user['role'];
        $sub = Database::getInstance()->quote($user['sub']);

        if ($role === 'ADMIN' || $role === 'PC') {
            if ($filterUserId) {
                $fId = Database::getInstance()->quote($filterUserId);
                return "(`t`.`userId` = $fId OR `t`.`assigneeId` = $fId OR `t`.`id` IN (SELECT `taskId` FROM `TaskAdditionalAssignee` WHERE `userId` = $fId))";
            }
            return "1 = 1";
        }

        $selfCond = "(`t`.`userId` = $sub OR `t`.`assigneeId` = $sub OR `t`.`id` IN (SELECT `taskId` FROM `TaskAdditionalAssignee` WHERE `userId` = $sub))";

        if ($role === 'MANAGER' && !empty($user['departmentId'])) {
            $deptId = Database::getInstance()->quote($user['departmentId']);
            return "(`t`.`departmentId` = $deptId OR $selfCond)";
        }

        return $selfCond;
    }

    public static function getAll(): void {
        $user = requireAuth();
        $status = $_GET['status'] ?? null;
        $userIdFilter = $_GET['userId'] ?? null;

        $vis = self::getVisibilityCondition($user, $userIdFilter);
        $where = [$vis];
        $params = [];

        if ($status) {
            $where[] = "`t`.`status` = :status";
            $params['status'] = $status;
        }

        $sql = "SELECT `t`.* FROM `Task` `t` WHERE " . implode(' AND ', $where) . " ORDER BY `t`.`createdAt` DESC LIMIT 250";
        $tasks = dbFetchAll($sql, $params);

        if (empty($tasks)) {
            jsonResponse(['success' => true, 'data' => []]);
        }

        // Populate attachments for list thumbnails
        $taskIds = array_column($tasks, 'id');
        $inClause = implode(',', array_fill(0, count($taskIds), '?'));
        $attachmentRows = dbFetchAll("SELECT `taskId`, `url`, `mimeType` FROM `TaskAttachment` WHERE `taskId` IN ($inClause)", $taskIds);
        
        $attachmentsByTask = [];
        foreach ($attachmentRows as $a) {
            $attachmentsByTask[$a['taskId']][] = [
                'url'      => $a['url'],
                'mimeType' => $a['mimeType']
            ];
        }

        // Additional assignees
        $addlRows = dbFetchAll("SELECT `taskId`, `userId` FROM `TaskAdditionalAssignee` WHERE `taskId` IN ($inClause)", $taskIds);
        $addlByTask = [];
        foreach ($addlRows as $r) {
            $addlByTask[$r['taskId']][] = $r['userId'];
        }

        $data = array_map(function($t) use ($attachmentsByTask, $addlByTask) {
            return [
                'id'                    => $t['id'],
                'title'                 => $t['title'],
                'description'           => $t['description'],
                'status'                => $t['status'],
                'category'              => $t['category'],
                'priority'              => $t['priority'],
                'startDate'             => $t['startDate'],
                'dueDate'               => $t['dueDate'],
                'reminderMinutesBefore' => $t['reminderMinutesBefore'] !== null ? (int)$t['reminderMinutesBefore'] : null,
                'reminderChannel'       => $t['reminderChannel'],
                'projectId'             => $t['projectId'],
                'userId'                => $t['userId'],
                'assigneeId'            => $t['assigneeId'],
                'additionalAssigneeIds' => $addlByTask[$t['id']] ?? [],
                'departmentId'          => $t['departmentId'],
                'verifiedBy'            => $t['verifiedBy'],
                'verifiedAt'            => $t['verifiedAt'],
                'verificationNote'      => $t['verificationNote'],
                'submittedAt'           => $t['submittedAt'],
                'submissionNote'        => $t['submissionNote'],
                'aiMeta'                => !empty($t['aiMeta']) ? json_decode($t['aiMeta'], true) : null,
                'attachments'           => $attachmentsByTask[$t['id']] ?? [],
                'createdAt'             => $t['createdAt'],
                'updatedAt'             => $t['updatedAt'],
            ];
        }, $tasks);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function getOne(string $id): void {
        $user = requireAuth();
        $task = dbFetchOne("SELECT * FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        // Additional assignees
        $addlRows = dbFetchAll("SELECT `userId` FROM `TaskAdditionalAssignee` WHERE `taskId` = :taskId", ['taskId' => $id]);
        $additionalAssigneeIds = array_column($addlRows, 'userId');

        // Checklists -> Items -> Images
        $checklists = dbFetchAll("SELECT * FROM `TaskChecklist` WHERE `taskId` = :taskId", ['taskId' => $id]);
        $checklistIds = array_column($checklists, 'id');

        $items = [];
        $imagesByItem = [];
        if (!empty($checklistIds)) {
            $inClause = implode(',', array_fill(0, count($checklistIds), '?'));
            $itemRows = dbFetchAll("SELECT * FROM `TaskChecklistItem` WHERE `taskChecklistId` IN ($inClause)", $checklistIds);
            
            $itemIds = array_column($itemRows, 'id');
            if (!empty($itemIds)) {
                $imgInClause = implode(',', array_fill(0, count($itemIds), '?'));
                $imageRows = dbFetchAll("SELECT * FROM `TaskImage` WHERE `taskChecklistItemId` IN ($imgInClause)", $itemIds);
                foreach ($imageRows as $img) {
                    $imagesByItem[$img['taskChecklistItemId']][] = [
                        'id'                  => $img['id'],
                        'url'                 => $img['url'],
                        'originalFilename'    => $img['originalFilename'],
                        'mimeType'            => $img['mimeType'],
                        'sizeBytes'           => (int)$img['sizeBytes'],
                        'captureMethod'       => $img['captureMethod'],
                        'taskChecklistItemId' => $img['taskChecklistItemId'],
                        'uploadedBy'          => $img['uploadedBy'],
                        'createdAt'           => $img['createdAt'],
                    ];
                }
            }

            foreach ($itemRows as $item) {
                $items[$item['taskChecklistId']][] = [
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
                    'images'             => $imagesByItem[$item['id']] ?? [],
                ];
            }
        }

        $formattedChecklists = array_map(function($c) use ($items) {
            return [
                'id'     => $c['id'],
                'title'  => $c['title'],
                'taskId' => $c['taskId'],
                'items'  => $items[$c['id']] ?? [],
            ];
        }, $checklists);

        // Attachments + Uploader Info
        $attachmentRows = dbFetchAll("
            SELECT a.*, u.`email`, u.`firstName`, u.`role`
            FROM `TaskAttachment` a
            LEFT JOIN `User` u ON u.`id` = a.`uploadedBy`
            WHERE a.`taskId` = :taskId
        ", ['taskId' => $id]);

        $formattedAttachments = array_map(function($a) {
            return [
                'id'               => $a['id'],
                'url'              => $a['url'],
                'originalFilename' => $a['originalFilename'],
                'mimeType'         => $a['mimeType'],
                'sizeBytes'        => (int)$a['sizeBytes'],
                'taskId'           => $a['taskId'],
                'uploadedBy'       => $a['uploadedBy'] ? [
                    'id'        => $a['uploadedBy'],
                    'email'     => $a['email'] ?? '',
                    'firstName' => $a['firstName'] ?? '',
                    'role'      => $a['role'] ?? '',
                ] : null,
                'createdAt'        => $a['createdAt'],
            ];
        }, $attachmentRows);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                    => $task['id'],
                'title'                 => $task['title'],
                'description'           => $task['description'],
                'status'                => $task['status'],
                'category'              => $task['category'],
                'priority'              => $task['priority'],
                'startDate'             => $task['startDate'],
                'dueDate'               => $task['dueDate'],
                'reminderMinutesBefore' => $task['reminderMinutesBefore'] !== null ? (int)$task['reminderMinutesBefore'] : null,
                'reminderChannel'       => $task['reminderChannel'],
                'projectId'             => $task['projectId'],
                'userId'                => $task['userId'],
                'assigneeId'            => $task['assigneeId'],
                'additionalAssigneeIds' => $additionalAssigneeIds,
                'departmentId'          => $task['departmentId'],
                'verifiedBy'            => $task['verifiedBy'],
                'verifiedAt'            => $task['verifiedAt'],
                'verificationNote'      => $task['verificationNote'],
                'submittedAt'           => $task['submittedAt'],
                'submissionNote'        => $task['submissionNote'],
                'aiMeta'                => !empty($task['aiMeta']) ? json_decode($task['aiMeta'], true) : null,
                'checklists'            => $formattedChecklists,
                'attachments'           => $formattedAttachments,
                'createdAt'             => $task['createdAt'],
                'updatedAt'             => $task['updatedAt'],
            ]
        ]);
    }

    public static function create(): void {
        $user = requireAuth();
        $body = getRequestBody();

        $title = trim($body['title'] ?? '');
        if (empty($title)) {
            errorResponse('Title is required', 400);
        }

        $id = generateId();
        $startDate = !empty($body['startDate']) ? date('Y-m-d H:i:s', strtotime($body['startDate'])) : null;
        $dueDate = !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null;

        dbTransaction(function() use ($id, $title, $startDate, $dueDate, $body, $user) {
            dbInsert('Task', [
                'id'                    => $id,
                'title'                 => $title,
                'description'           => trim($body['description'] ?? '') ?: null,
                'status'                => $body['status'] ?? 'todo',
                'category'              => $body['category'] ?? 'delegation',
                'priority'              => $body['priority'] ?? 'medium',
                'startDate'             => $startDate,
                'dueDate'               => $dueDate,
                'reminderMinutesBefore' => isset($body['reminderMinutesBefore']) ? (int)$body['reminderMinutesBefore'] : null,
                'reminderChannel'       => $body['reminderChannel'] ?? 'notification',
                'projectId'             => !empty($body['projectId']) ? $body['projectId'] : null,
                'userId'                => $user['sub'],
                'assigneeId'            => !empty($body['assigneeId']) ? $body['assigneeId'] : null,
                'departmentId'          => !empty($body['departmentId']) ? $body['departmentId'] : null,
                'createdAt'             => date('Y-m-d H:i:s'),
                'updatedAt'             => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['additionalAssigneeIds']) && is_array($body['additionalAssigneeIds'])) {
                foreach ($body['additionalAssigneeIds'] as $addlUserId) {
                    dbInsert('TaskAdditionalAssignee', [
                        'id'        => generateId(),
                        'taskId'    => $id,
                        'userId'    => $addlUserId,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getOne($id);
    }

    public static function update(string $id): void {
        $user = requireAuth();
        if ($user['role'] === 'PC') {
            errorResponse('PC role can only act through the verification queue', 403);
        }

        $task = dbFetchOne("SELECT * FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];

        if (isset($body['title'])) $update['title'] = trim($body['title']);
        if (array_key_exists('description', $body)) $update['description'] = trim($body['description'] ?? '') ?: null;
        if (isset($body['status'])) {
            if ($body['status'] === 'done' && $task['status'] !== 'done' && $user['role'] !== 'ADMIN') {
                errorResponse('Only a verifier can mark a delegation done — send it for review instead', 403);
            }
            $update['status'] = $body['status'];
        }
        if (isset($body['priority'])) $update['priority'] = $body['priority'];
        if (array_key_exists('startDate', $body)) $update['startDate'] = !empty($body['startDate']) ? date('Y-m-d H:i:s', strtotime($body['startDate'])) : null;
        if (array_key_exists('dueDate', $body)) $update['dueDate'] = !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null;
        if (array_key_exists('reminderMinutesBefore', $body)) $update['reminderMinutesBefore'] = $body['reminderMinutesBefore'] !== null ? (int)$body['reminderMinutesBefore'] : null;
        if (isset($body['reminderChannel'])) $update['reminderChannel'] = $body['reminderChannel'];
        if (array_key_exists('assigneeId', $body)) $update['assigneeId'] = $body['assigneeId'] ?: null;
        if (array_key_exists('departmentId', $body)) $update['departmentId'] = $body['departmentId'] ?: null;

        dbTransaction(function() use ($id, $update, $body) {
            dbUpdate('Task', $update, "`id` = :id", ['id' => $id]);

            if (isset($body['additionalAssigneeIds']) && is_array($body['additionalAssigneeIds'])) {
                dbDelete('TaskAdditionalAssignee', "`taskId` = :taskId", ['taskId' => $id]);
                foreach ($body['additionalAssigneeIds'] as $addlUserId) {
                    dbInsert('TaskAdditionalAssignee', [
                        'id'        => generateId(),
                        'taskId'    => $id,
                        'userId'    => $addlUserId,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getOne($id);
    }

    public static function verify(string $id): void {
        $user = requireAuth();
        $task = dbFetchOne("SELECT * FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        if ($task['status'] !== 'pending_verification') {
            errorResponse("This task isn't pending verification", 400);
        }

        $body = getRequestBody();
        $action = strtoupper($body['action'] ?? '');
        $note = trim($body['note'] ?? '') ?: null;

        $update = [
            'verificationNote' => $note,
            'updatedAt'        => date('Y-m-d H:i:s'),
        ];

        if ($action === 'APPROVE') {
            $update['status'] = 'done';
            $update['verifiedBy'] = $user['sub'];
            $update['verifiedAt'] = date('Y-m-d H:i:s');
        } else {
            $update['status'] = 'in_progress';
        }

        dbUpdate('Task', $update, "`id` = :id", ['id' => $id]);

        // Insert notification for creator & assignee
        $recipientId = $task['assigneeId'] ?: $task['userId'];
        dbInsert('Notification', [
            'id'          => generateId(),
            'recipientId' => $recipientId,
            'type'        => 'TASK_VERIFICATION',
            'title'       => "Task " . ($action === 'APPROVE' ? 'Approved' : 'Rejected') . ": {$task['title']}",
            'message'     => $note ?: ($action === 'APPROVE' ? 'Your task has been approved and marked done.' : 'Your task was rejected and moved back to in progress.'),
            'taskId'      => $id,
            'isRead'      => 0,
            'createdAt'   => date('Y-m-d H:i:s'),
            'updatedAt'   => date('Y-m-d H:i:s'),
        ]);

        self::getOne($id);
    }

    public static function delete(string $id): void {
        $user = requireAuth();
        $task = dbFetchOne("SELECT * FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        dbDelete('Task', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function uploadAttachments(string $taskId): void {
        $user = requireAuth();
        $task = dbFetchOne("SELECT `id` FROM `Task` WHERE `id` = :id LIMIT 1", ['id' => $taskId]);
        if (!$task) {
            errorResponse('Task not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/task-attachments';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $createdAttachments = [];
        $files = $_FILES['files'] ?? null;

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
                    $newFilename = generateId() . '.' . ($ext ?: 'bin');
                    $dest = "$uploadDir/$newFilename";

                    if (move_uploaded_file($tmpName, $dest)) {
                        $attId = generateId();
                        $url = "/uploads/task-attachments/$newFilename";

                        dbInsert('TaskAttachment', [
                            'id'               => $attId,
                            'url'              => $url,
                            'originalFilename' => $origName,
                            'sizeBytes'        => $size,
                            'mimeType'         => $mime,
                            'taskId'           => $taskId,
                            'uploadedBy'       => $user['sub'],
                            'createdAt'        => date('Y-m-d H:i:s'),
                            'updatedAt'        => date('Y-m-d H:i:s'),
                        ]);

                        $createdAttachments[] = [
                            'id'               => $attId,
                            'url'              => $url,
                            'originalFilename' => $origName,
                            'sizeBytes'        => $size,
                            'mimeType'         => $mime,
                            'taskId'           => $taskId,
                            'uploadedBy'       => [
                                'id'        => $user['sub'],
                                'email'     => $user['email'] ?? '',
                                'firstName' => $user['firstName'] ?? '',
                                'role'      => $user['role'] ?? '',
                            ],
                            'createdAt'        => date('Y-m-d H:i:s'),
                        ];
                    }
                }
            }
        }

        jsonResponse(['success' => true, 'data' => $createdAttachments]);
    }

    public static function deleteAttachment(string $id): void {
        requireAuth();
        $att = dbFetchOne("SELECT * FROM `TaskAttachment` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$att) {
            errorResponse('Attachment not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $filePath = dirname(__DIR__, 2) . $att['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        dbDelete('TaskAttachment', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function complianceReport(): void {
        $user = requireAuth();
        $groupBy = $_GET['groupBy'] ?? 'month';
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $departmentId = $_GET['departmentId'] ?? null;
        $filterUserId = $_GET['userId'] ?? null;

        $dateFormats = [
            'hour'  => '%Y-%m-%d %H:00',
            'day'   => '%Y-%m-%d',
            'week'  => '%X-W%V',
            'month' => '%Y-%m',
            'year'  => '%Y',
        ];
        $dateFormat = $dateFormats[$groupBy] ?? '%Y-%m';

        $where = [];
        $params = [];

        if ($from) {
            $where[] = "tci.`createdAt` >= :from";
            $params['from'] = date('Y-m-d H:i:s', strtotime($from));
        }
        if ($to) {
            $where[] = "tci.`createdAt` <= :to";
            $params['to'] = date('Y-m-d H:i:s', strtotime($to));
        }
        if ($departmentId) {
            $where[] = "t.`departmentId` = :deptId";
            $params['deptId'] = $departmentId;
        }
        if ($filterUserId) {
            $where[] = "(t.`userId` = :uId OR t.`assigneeId` = :uId OR taa.`userId` = :uId)";
            $params['uId'] = $filterUserId;
        }

        $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";

        $sql = "
            SELECT
                DATE_FORMAT(tci.`createdAt`, '$dateFormat') AS bucket,
                COUNT(*) AS totalItems,
                SUM(tci.`isDone`) AS doneItems,
                SUM(tci.`requiredImageCount` > 0) AS itemsRequiringPhotos,
                SUM(
                    CASE WHEN tci.`requiredImageCount` > 0
                        AND (CASE WHEN tci.`requiresLivePhoto` THEN COALESCE(img.liveCount, 0) ELSE COALESCE(img.totalCount, 0) END) >= tci.`requiredImageCount`
                    THEN 1 ELSE 0 END
                ) AS photoCompliantItems
            FROM `TaskChecklistItem` tci
            JOIN `TaskChecklist` tc ON tc.`id` = tci.`taskChecklistId`
            JOIN `Task` t ON t.`id` = tc.`taskId`
            LEFT JOIN (
                SELECT `taskChecklistItemId`, COUNT(*) AS totalCount, SUM(`captureMethod` = 'LIVE') AS liveCount
                FROM `TaskImage` GROUP BY `taskChecklistItemId`
            ) img ON img.`taskChecklistItemId` = tci.`id`
            LEFT JOIN `TaskAdditionalAssignee` taa ON taa.`taskId` = t.`id`
            $whereSql
            GROUP BY bucket
            ORDER BY bucket ASC
        ";

        $rows = dbFetchAll($sql, $params);
        $data = array_map(function($r) {
            $total = (int)$r['totalItems'];
            $done = (int)$r['doneItems'];
            $reqPhotos = (int)$r['itemsRequiringPhotos'];
            $photoCompliant = (int)$r['photoCompliantItems'];

            return [
                'bucket'               => (string)$r['bucket'],
                'totalItems'           => $total,
                'doneItems'            => $done,
                'completionRate'       => $total > 0 ? round(($done / $total) * 100, 1) : null,
                'itemsRequiringPhotos' => $reqPhotos,
                'qualityRate'          => $reqPhotos > 0 ? round(($photoCompliant / $reqPhotos) * 100, 1) : null,
            ];
        }, $rows);

        jsonResponse(['success' => true, 'data' => $data]);
    }
}
