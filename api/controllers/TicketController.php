<?php
/**
 * TicketController - Ticket Operations, TAT SLA tracking, Verification, and Analytics
 */

class TicketController {
    public static function getVisibilityCondition(array $user): ?string {
        $role = $user['role'];
        $sub = Database::getInstance()->quote($user['sub']);

        if ($role === 'ADMIN' || $role === 'PC') {
            return null;
        }

        if ($role === 'MANAGER') {
            $conds = ["`userId` = $sub"];
            if (!empty($user['departmentId'])) {
                $conds[] = "`departmentId` = " . Database::getInstance()->quote($user['departmentId']);
            }
            if (!empty($user['storeId'])) {
                $conds[] = "`storeId` = " . Database::getInstance()->quote($user['storeId']);
            }
            return "(" . implode(' OR ', $conds) . ")";
        }

        if ($role === 'SENIOR') {
            return !empty($user['storeId']) 
                ? "`storeId` = " . Database::getInstance()->quote($user['storeId'])
                : "`userId` = $sub";
        }

        if ($role === 'AGENT' || $role === 'USER') {
            $own = "(`assigneeId` = $sub OR `userId` = $sub)";
            return !empty($user['departmentId'])
                ? "($own AND `departmentId` = " . Database::getInstance()->quote($user['departmentId']) . ")"
                : $own;
        }

        return "`userId` = $sub";
    }

    public static function populateTickets(array $tickets): array {
        if (empty($tickets)) return [];

        $ticketIds = array_column($tickets, 'id');
        $inClause = implode(',', array_fill(0, count($ticketIds), '?'));

        // Users lookup
        $userIds = [];
        foreach ($tickets as $t) {
            if (!empty($t['assigneeId'])) $userIds[] = $t['assigneeId'];
            if (!empty($t['userId'])) $userIds[] = $t['userId'];
            if (!empty($t['verifiedBy'])) $userIds[] = $t['verifiedBy'];
        }
        $userIds = array_unique(array_filter($userIds));
        $userMap = [];
        if (!empty($userIds)) {
            $uInClause = implode(',', array_fill(0, count($userIds), '?'));
            $userRows = dbFetchAll("SELECT `id`, `email`, `firstName`, `lastName`, `role` FROM `User` WHERE `id` IN ($uInClause)", array_values($userIds));
            foreach ($userRows as $u) {
                $userMap[$u['id']] = $u;
            }
        }

        // Checklists -> Items -> Images
        $checklistRows = dbFetchAll("SELECT * FROM `Checklist` WHERE `ticketId` IN ($inClause)", $ticketIds);
        $checklistIds = array_column($checklistRows, 'id');
        $itemsByChecklist = [];
        if (!empty($checklistIds)) {
            $cInClause = implode(',', array_fill(0, count($checklistIds), '?'));
            $itemRows = dbFetchAll("SELECT * FROM `ChecklistItem` WHERE `checklistId` IN ($cInClause)", $checklistIds);
            
            $itemIds = array_column($itemRows, 'id');
            $imagesByItem = [];
            if (!empty($itemIds)) {
                $iInClause = implode(',', array_fill(0, count($itemIds), '?'));
                $imageRows = dbFetchAll("SELECT * FROM `ChecklistImage` WHERE `checklistItemId` IN ($iInClause)", $itemIds);
                foreach ($imageRows as $img) {
                    $imagesByItem[$img['checklistItemId']][] = [
                        'id'               => $img['id'],
                        'url'              => $img['url'],
                        'originalFilename' => $img['originalFilename'],
                        'mimeType'         => $img['mimeType'],
                        'sizeBytes'        => (int)$img['sizeBytes'],
                        'captureMethod'    => $img['captureMethod'],
                        'checklistItemId'  => $img['checklistItemId'],
                        'uploadedBy'       => $img['uploadedBy'],
                        'createdAt'        => $img['createdAt'],
                    ];
                }
            }

            foreach ($itemRows as $item) {
                $itemsByChecklist[$item['checklistId']][] = [
                    'id'                 => $item['id'],
                    'label'              => $item['label'],
                    'isDone'             => (bool)$item['isDone'],
                    'assigneeId'         => $item['assigneeId'],
                    'dueAt'              => $item['dueAt'],
                    'completedAt'        => $item['completedAt'],
                    'checklistId'        => $item['checklistId'],
                    'requiredImageCount' => (int)$item['requiredImageCount'],
                    'maxImageCount'      => $item['maxImageCount'] !== null ? (int)$item['maxImageCount'] : null,
                    'requiresLivePhoto'  => (bool)$item['requiresLivePhoto'],
                    'remarks'            => $item['remarks'],
                    'images'             => $imagesByItem[$item['id']] ?? [],
                ];
            }
        }

        $checklistsByTicket = [];
        foreach ($checklistRows as $c) {
            $checklistsByTicket[$c['ticketId']][] = [
                'id'       => $c['id'],
                'title'    => $c['title'],
                'ticketId' => $c['ticketId'],
                'items'    => $itemsByChecklist[$c['id']] ?? [],
            ];
        }

        // Attachments
        $attachmentRows = dbFetchAll("
            SELECT a.*, u.`email`, u.`firstName`, u.`role`
            FROM `TicketAttachment` a
            LEFT JOIN `User` u ON u.`id` = a.`uploadedBy`
            WHERE a.`ticketId` IN ($inClause)
        ", $ticketIds);

        $attachmentsByTicket = [];
        $photosByStatusUpdate = [];
        foreach ($attachmentRows as $a) {
            $obj = [
                'id'               => $a['id'],
                'url'              => $a['url'],
                'originalFilename' => $a['originalFilename'],
                'mimeType'         => $a['mimeType'],
                'sizeBytes'        => (int)$a['sizeBytes'],
                'captureMethod'    => $a['captureMethod'] ?? 'GALLERY',
                'ticketId'         => $a['ticketId'],
                'uploadedBy'       => $a['uploadedBy'] ? [
                    'id'        => $a['uploadedBy'],
                    'email'     => $a['email'] ?? '',
                    'firstName' => $a['firstName'] ?? '',
                    'role'      => $a['role'] ?? '',
                ] : null,
                'createdAt'        => $a['createdAt'],
            ];

            if ($a['statusUpdateId']) {
                $photosByStatusUpdate[$a['statusUpdateId']][] = $obj;
            } else {
                $attachmentsByTicket[$a['ticketId']][] = $obj;
            }
        }

        // Comments
        $commentRows = dbFetchAll("
            SELECT c.*, u.`email`, u.`firstName`, u.`role`
            FROM `TicketComment` c
            LEFT JOIN `User` u ON u.`id` = c.`authorId`
            WHERE c.`ticketId` IN ($inClause)
            ORDER BY c.`createdAt` ASC
        ", $ticketIds);
        $commentsByTicket = [];
        foreach ($commentRows as $c) {
            $commentsByTicket[$c['ticketId']][] = [
                'id'        => $c['id'],
                'body'      => $c['body'],
                'ticketId'  => $c['ticketId'],
                'authorId'  => $c['authorId'],
                'author'    => $c['authorId'] ? [
                    'id'        => $c['authorId'],
                    'email'     => $c['email'] ?? '',
                    'firstName' => $c['firstName'] ?? '',
                    'role'      => $c['role'] ?? '',
                ] : null,
                'createdAt' => $c['createdAt'],
            ];
        }

        // Status Updates
        $statusRows = dbFetchAll("
            SELECT su.*, u.`email`, u.`firstName`, u.`role`
            FROM `TicketStatusUpdate` su
            LEFT JOIN `User` u ON u.`id` = su.`changedBy`
            WHERE su.`ticketId` IN ($inClause)
            ORDER BY su.`createdAt` DESC
        ", $ticketIds);
        $statusByTicket = [];
        foreach ($statusRows as $su) {
            $statusByTicket[$su['ticketId']][] = [
                'id'         => $su['id'],
                'ticketId'   => $su['ticketId'],
                'fromStatus' => $su['fromStatus'],
                'toStatus'   => $su['toStatus'],
                'remark'     => $su['remark'],
                'changedBy'  => $su['changedBy'] ? [
                    'id'        => $su['changedBy'],
                    'email'     => $su['email'] ?? '',
                    'firstName' => $su['firstName'] ?? '',
                    'role'      => $su['role'] ?? '',
                ] : null,
                'photos'     => $photosByStatusUpdate[$su['id']] ?? [],
                'createdAt'  => $su['createdAt'],
            ];
        }

        return array_map(function($t) use ($userMap, $checklistsByTicket, $attachmentsByTicket, $commentsByTicket, $statusByTicket) {
            return [
                'id'               => $t['id'],
                'title'            => $t['title'],
                'description'      => $t['description'],
                'status'           => $t['status'],
                'priority'         => $t['priority'],
                'assignmentMode'   => $t['assignmentMode'],
                'tatHours'         => $t['tatHours'] !== null ? (float)$t['tatHours'] : null,
                'tatDueAt'         => $t['tatDueAt'],
                'isOverdue'        => (bool)$t['isOverdue'],
                'closedAt'         => $t['closedAt'],
                'userId'           => $t['userId'],
                'assigneeId'       => $t['assigneeId'],
                'storeId'          => $t['storeId'],
                'categoryId'       => $t['categoryId'],
                'departmentId'     => $t['departmentId'],
                'verifiedBy'       => $t['verifiedBy'],
                'verifiedAt'       => $t['verifiedAt'],
                'verificationNote' => $t['verificationNote'],
                'assignee'         => !empty($t['assigneeId']) ? ($userMap[$t['assigneeId']] ?? null) : null,
                'raisedBy'         => !empty($t['userId']) ? ($userMap[$t['userId']] ?? null) : null,
                'verifier'         => !empty($t['verifiedBy']) ? ($userMap[$t['verifiedBy']] ?? null) : null,
                'checklists'       => $checklistsByTicket[$t['id']] ?? [],
                'attachments'      => $attachmentsByTicket[$t['id']] ?? [],
                'comments'         => $commentsByTicket[$t['id']] ?? [],
                'statusUpdates'    => $statusByTicket[$t['id']] ?? [],
                'createdAt'        => $t['createdAt'],
                'updatedAt'        => $t['updatedAt'],
            ];
        }, $tickets);
    }

    public static function getAll(): void {
        $user = requireAuth();
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $status = $_GET['status'] ?? null;
        $assigneeId = $_GET['assigneeId'] ?? null;

        $where = [];
        $params = [];

        $vis = self::getVisibilityCondition($user);
        if ($vis) {
            $where[] = $vis;
        }

        if ($status) {
            $where[] = "`status` = :status";
            $params['status'] = $status;
        }

        if ($assigneeId && ($user['role'] === 'ADMIN' || $user['role'] === 'PC')) {
            $where[] = "(`userId` = :assigneeId OR `assigneeId` = :assigneeId)";
            $params['assigneeId'] = $assigneeId;
        }

        $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";

        $totalRow = dbFetchOne("SELECT COUNT(*) AS cnt FROM `Ticket` $whereSql", $params);
        $total = (int)($totalRow['cnt'] ?? 0);

        $sql = "SELECT * FROM `Ticket` $whereSql ORDER BY `createdAt` DESC LIMIT $offset, $limit";
        $tickets = dbFetchAll($sql, $params);
        $populated = self::populateTickets($tickets);

        jsonResponse([
            'success' => true,
            'data'    => $populated,
            'meta'    => [
                'page'       => $page,
                'limit'      => $limit,
                'total'      => $total,
                'totalPages' => ceil($total / $limit),
                'hasNext'    => ($page * $limit) < $total,
            ]
        ]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $ticket = dbFetchOne("SELECT * FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        $populated = self::populateTickets([$ticket]);
        jsonResponse([
            'success' => true,
            'data'    => $populated[0] ?? null,
        ]);
    }

    public static function create(): void {
        $user = requireAuth();
        $body = getRequestBody();

        $title = trim($body['title'] ?? '');
        $description = trim($body['description'] ?? '');
        if (empty($title) || empty($description)) {
            errorResponse('Title and description are required', 400);
        }

        // Get default TAT from settings or payload
        $settings = dbFetchOne("SELECT `defaultTatHours` FROM `Settings` LIMIT 1");
        $defaultTat = $settings ? (float)$settings['defaultTatHours'] : 24.0;
        $tatHours = isset($body['tatHours']) && $body['tatHours'] !== '' ? (float)$body['tatHours'] : $defaultTat;

        $now = time();
        $tatDueAt = $tatHours ? date('Y-m-d H:i:s', $now + ($tatHours * 3600)) : null;

        $assigneeId = !empty($body['assigneeId']) ? $body['assigneeId'] : null;

        // Auto assignment logic if category assignees exist
        if (empty($assigneeId) && !empty($body['categoryId']) && ($body['assignmentMode'] ?? '') === 'AUTO') {
            $catAssignees = dbFetchAll("SELECT `userId` FROM `CategoryAssignee` WHERE `categoryId` = :cid", ['cid' => $body['categoryId']]);
            if (!empty($catAssignees)) {
                $assigneeId = $catAssignees[array_rand($catAssignees)]['userId'];
            }
        }

        $id = generateId();
        dbInsert('Ticket', [
            'id'             => $id,
            'title'          => $title,
            'description'    => $description,
            'status'         => 'OPEN',
            'priority'       => $body['priority'] ?? 'MEDIUM',
            'assignmentMode' => $body['assignmentMode'] ?? 'MANUAL',
            'tatHours'       => $tatHours,
            'tatDueAt'       => $tatDueAt,
            'isOverdue'      => 0,
            'userId'         => $user['sub'],
            'assigneeId'     => $assigneeId,
            'storeId'        => !empty($body['storeId']) ? $body['storeId'] : null,
            'categoryId'     => !empty($body['categoryId']) ? $body['categoryId'] : null,
            'departmentId'   => !empty($body['departmentId']) ? $body['departmentId'] : null,
            'createdAt'      => date('Y-m-d H:i:s'),
            'updatedAt'      => date('Y-m-d H:i:s'),
        ]);

        if ($assigneeId) {
            dbInsert('Notification', [
                'id'          => generateId(),
                'recipientId' => $assigneeId,
                'type'        => 'TICKET_ASSIGNED',
                'title'       => "New Ticket Assigned: $title",
                'message'     => "You have been assigned to ticket: $title",
                'ticketId'    => $id,
                'isRead'      => 0,
                'createdAt'   => date('Y-m-d H:i:s'),
                'updatedAt'   => date('Y-m-d H:i:s'),
            ]);
        }

        self::getOne($id);
    }

    public static function update(string $id): void {
        $user = requireAuth();
        $ticket = dbFetchOne("SELECT * FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];

        if (isset($body['title'])) $update['title'] = trim($body['title']);
        if (isset($body['description'])) $update['description'] = trim($body['description']);
        if (isset($body['priority'])) $update['priority'] = $body['priority'];
        if (isset($body['assignmentMode'])) $update['assignmentMode'] = $body['assignmentMode'];
        if (array_key_exists('assigneeId', $body)) $update['assigneeId'] = $body['assigneeId'] ?: null;
        if (array_key_exists('storeId', $body)) $update['storeId'] = $body['storeId'] ?: null;
        if (array_key_exists('categoryId', $body)) $update['categoryId'] = $body['categoryId'] ?: null;
        if (array_key_exists('departmentId', $body)) $update['departmentId'] = $body['departmentId'] ?: null;

        if (isset($body['status'])) {
            $newStatus = $body['status'];
            if ($newStatus === 'CLOSED' && $ticket['status'] !== 'CLOSED') {
                if ($user['role'] !== 'ADMIN' && $user['role'] !== 'PC') {
                    errorResponse('Only verifiers can close a ticket — send it for review instead', 403);
                }
                $update['closedAt'] = date('Y-m-d H:i:s');
            } elseif ($newStatus !== 'CLOSED' && $ticket['status'] === 'CLOSED') {
                $update['closedAt'] = null;
            }
            $update['status'] = $newStatus;
        }

        if (isset($body['tatHours'])) {
            $newTat = $body['tatHours'] !== null && $body['tatHours'] !== '' ? (float)$body['tatHours'] : null;
            $update['tatHours'] = $newTat;
            $update['tatDueAt'] = $newTat ? date('Y-m-d H:i:s', time() + ($newTat * 3600)) : null;
            $update['isOverdue'] = 0;
        }

        dbUpdate('Ticket', $update, "`id` = :id", ['id' => $id]);
        self::getOne($id);
    }

    public static function addStatusUpdate(string $id): void {
        $user = requireAuth();
        $ticket = dbFetchOne("SELECT * FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        $newStatus = $_POST['status'] ?? 'IN_PROGRESS';
        $remark = trim($_POST['remark'] ?? '');
        $captureMethod = $_POST['captureMethod'] ?? 'GALLERY';

        if (empty($remark)) {
            errorResponse('Remark is required', 400);
        }

        $statusUpdateId = generateId();
        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/ticket-attachments';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        dbTransaction(function() use ($statusUpdateId, $id, $ticket, $newStatus, $remark, $captureMethod, $user, $uploadDir) {
            dbInsert('TicketStatusUpdate', [
                'id'         => $statusUpdateId,
                'ticketId'   => $id,
                'changedBy'  => $user['sub'],
                'fromStatus' => $ticket['status'],
                'toStatus'   => $newStatus,
                'remark'     => $remark,
                'createdAt'  => date('Y-m-d H:i:s'),
                'updatedAt'  => date('Y-m-d H:i:s'),
            ]);

            dbUpdate('Ticket', [
                'status'    => $newStatus,
                'updatedAt' => date('Y-m-d H:i:s'),
            ], "`id` = :id", ['id' => $id]);

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
                            dbInsert('TicketAttachment', [
                                'id'               => generateId(),
                                'url'              => "/uploads/ticket-attachments/$newFilename",
                                'originalFilename' => $origName,
                                'mimeType'         => $mime,
                                'sizeBytes'        => $size,
                                'captureMethod'    => in_array($captureMethod, ['LIVE', 'GALLERY']) ? $captureMethod : 'GALLERY',
                                'statusUpdateId'   => $statusUpdateId,
                                'ticketId'         => $id,
                                'uploadedBy'       => $user['sub'],
                                'createdAt'        => date('Y-m-d H:i:s'),
                                'updatedAt'        => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
        });

        self::getOne($id);
    }

    public static function verify(string $id): void {
        $user = requireAuth();
        $ticket = dbFetchOne("SELECT * FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        if ($ticket['status'] !== 'IN_REVIEW') {
            errorResponse("This ticket isn't pending verification", 400);
        }

        $body = getRequestBody();
        $action = strtoupper($body['action'] ?? '');
        $note = trim($body['note'] ?? '') ?: null;

        $update = [
            'verificationNote' => $note,
            'updatedAt'        => date('Y-m-d H:i:s'),
        ];

        if ($action === 'APPROVE') {
            $update['status'] = 'CLOSED';
            $update['closedAt'] = date('Y-m-d H:i:s');
            $update['verifiedBy'] = $user['sub'];
            $update['verifiedAt'] = date('Y-m-d H:i:s');
        } else {
            $update['status'] = 'IN_PROGRESS';
        }

        dbUpdate('Ticket', $update, "`id` = :id", ['id' => $id]);

        $recipientId = $ticket['assigneeId'] ?: $ticket['userId'];
        dbInsert('Notification', [
            'id'          => generateId(),
            'recipientId' => $recipientId,
            'type'        => 'TICKET_VERIFICATION',
            'title'       => "Ticket " . ($action === 'APPROVE' ? 'Closed' : 'Returned to Progress') . ": {$ticket['title']}",
            'message'     => $note ?: ($action === 'APPROVE' ? 'Your ticket was verified and closed.' : 'Your ticket was rejected and moved back to in progress.'),
            'ticketId'    => $id,
            'isRead'      => 0,
            'createdAt'   => date('Y-m-d H:i:s'),
            'updatedAt'   => date('Y-m-d H:i:s'),
        ]);

        self::getOne($id);
    }

    public static function delete(string $id): void {
        requireAuth();
        $ticket = dbFetchOne("SELECT `id` FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        dbDelete('Ticket', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function addComment(string $ticketId): void {
        $user = requireAuth();
        $ticket = dbFetchOne("SELECT `id` FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $ticketId]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        $body = getRequestBody();
        $commentBody = trim($body['body'] ?? '');
        if (empty($commentBody)) {
            errorResponse('Comment body is required', 400);
        }

        $commentId = generateId();
        dbInsert('TicketComment', [
            'id'        => $commentId,
            'body'      => $commentBody,
            'ticketId'  => $ticketId,
            'authorId'  => $user['sub'],
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("
            SELECT c.*, u.`email`, u.`firstName`, u.`role`
            FROM `TicketComment` c
            LEFT JOIN `User` u ON u.`id` = c.`authorId`
            WHERE c.`id` = :id
        ", ['id' => $commentId]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'        => $created['id'],
                'body'      => $created['body'],
                'ticketId'  => $created['ticketId'],
                'authorId'  => $created['authorId'],
                'author'    => [
                    'id'        => $user['sub'],
                    'email'     => $created['email'] ?? '',
                    'firstName' => $created['firstName'] ?? '',
                    'role'      => $created['role'] ?? '',
                ],
                'createdAt' => $created['createdAt'],
            ]
        ], 201);
    }

    public static function tatReport(): void {
        requireAuth();
        $groupBy = $_GET['groupBy'] ?? 'day';
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $departmentId = $_GET['departmentId'] ?? null;
        $storeId = $_GET['storeId'] ?? null;

        $dateFormats = [
            'hour'  => '%Y-%m-%d %H:00',
            'day'   => '%Y-%m-%d',
            'week'  => '%X-W%V',
            'month' => '%Y-%m',
            'year'  => '%Y',
        ];
        $dateFormat = $dateFormats[$groupBy] ?? '%Y-%m-%d';

        $closedWhere = ["`closedAt` IS NOT NULL"];
        $createdWhere = [];
        $params = [];

        if ($from) {
            $fromDt = date('Y-m-d H:i:s', strtotime($from));
            $closedWhere[] = "`closedAt` >= :from_c";
            $createdWhere[] = "`createdAt` >= :from_cr";
            $params['from_c'] = $fromDt;
            $params['from_cr'] = $fromDt;
        }
        if ($to) {
            $toDt = date('Y-m-d H:i:s', strtotime($to));
            $closedWhere[] = "`closedAt` <= :to_c";
            $createdWhere[] = "`createdAt` <= :to_cr";
            $params['to_c'] = $toDt;
            $params['to_cr'] = $toDt;
        }
        if ($departmentId) {
            $closedWhere[] = "`departmentId` = :deptId";
            $createdWhere[] = "`departmentId` = :deptId";
            $params['deptId'] = $departmentId;
        }
        if ($storeId) {
            $closedWhere[] = "`storeId` = :storeId";
            $createdWhere[] = "`storeId` = :storeId";
            $params['storeId'] = $storeId;
        }

        $closedSql = "
            SELECT
                DATE_FORMAT(`closedAt`, '$dateFormat') AS bucket,
                COUNT(*) AS closedCount,
                AVG(TIMESTAMPDIFF(SECOND, `createdAt`, `closedAt`) / 3600) AS avgTatHours,
                SUM(`isOverdue`) AS overdueCount
            FROM `Ticket`
            WHERE " . implode(' AND ', $closedWhere) . "
            GROUP BY bucket
        ";
        $closedRows = dbFetchAll($closedSql, $params);

        $createdSql = "
            SELECT
                DATE_FORMAT(`createdAt`, '$dateFormat') AS bucket,
                COUNT(*) AS createdCount
            FROM `Ticket`
            " . (!empty($createdWhere) ? "WHERE " . implode(' AND ', $createdWhere) : "") . "
            GROUP BY bucket
        ";
        $createdRows = dbFetchAll($createdSql, $params);

        $closedByBucket = [];
        foreach ($closedRows as $r) {
            $closedByBucket[$r['bucket']] = [
                'closedCount'  => (int)$r['closedCount'],
                'avgTatHours'  => $r['avgTatHours'] !== null ? (float)$r['avgTatHours'] : null,
                'overdueCount' => (int)$r['overdueCount'],
            ];
        }

        $createdByBucket = [];
        foreach ($createdRows as $r) {
            $createdByBucket[$r['bucket']] = (int)$r['createdCount'];
        }

        $allBuckets = array_unique(array_merge(array_keys($closedByBucket), array_keys($createdByBucket)));
        sort($allBuckets);

        $data = array_map(function($b) use ($closedByBucket, $createdByBucket) {
            $closed = $closedByBucket[$b] ?? null;
            $createdCount = $createdByBucket[$b] ?? 0;
            $closedCount = $closed['closedCount'] ?? 0;
            $avgTat = $closed['avgTatHours'] ?? null;

            return [
                'bucket'         => $b,
                'createdCount'   => $createdCount,
                'closedCount'    => $closedCount,
                'avgTatHours'    => $avgTat !== null ? round($avgTat, 1) : null,
                'overdueCount'   => $closed['overdueCount'] ?? 0,
                'completionRate' => $createdCount > 0 ? round(($closedCount / $createdCount) * 100, 1) : null,
            ];
        }, $allBuckets);

        jsonResponse(['success' => true, 'data' => $data]);
    }
}
