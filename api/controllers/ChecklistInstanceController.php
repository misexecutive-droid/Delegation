<?php
/**
 * ChecklistInstanceController - Scheduled Checklist Execution, Answers, Submissions & Verification
 */

class ChecklistInstanceController {
    public static function populateInstances(array $instances): array {
        if (empty($instances)) return [];
        $ids = array_column($instances, 'id');
        $inClause = implode(',', array_fill(0, count($ids), '?'));

        // Assignees
        $assigneeLinks = dbFetchAll("SELECT * FROM `ChecklistInstanceAssignee` WHERE `instanceId` IN ($inClause)", $ids);
        $assigneesByInst = [];
        foreach ($assigneeLinks as $l) {
            $assigneesByInst[$l['instanceId']][] = $l['userId'];
        }

        // Items
        $items = dbFetchAll("SELECT * FROM `ChecklistInstanceItem` WHERE `instanceId` IN ($inClause) ORDER BY `order` ASC", $ids);
        $itemIds = array_column($items, 'id');

        $imagesByItem = [];
        $subsByItem = [];

        if (!empty($itemIds)) {
            $iInClause = implode(',', array_fill(0, count($itemIds), '?'));
            
            // Item Images
            $itemImages = dbFetchAll("SELECT * FROM `ChecklistInstanceImage` WHERE `checklistInstanceItemId` IN ($iInClause)", $itemIds);
            foreach ($itemImages as $img) {
                $imagesByItem[$img['checklistInstanceItemId']][] = [
                    'id'                      => $img['id'],
                    'url'                     => $img['url'],
                    'originalFilename'        => $img['originalFilename'],
                    'mimeType'                => $img['mimeType'],
                    'sizeBytes'               => (int)$img['sizeBytes'],
                    'captureMethod'           => $img['captureMethod'],
                    'checklistInstanceItemId' => $img['checklistInstanceItemId'],
                    'uploadedBy'              => $img['uploadedBy'],
                    'createdAt'               => $img['createdAt'],
                ];
            }

            // Submissions
            $submissions = dbFetchAll("
                SELECT s.*, u.`firstName`, u.`lastName`, u.`storeId`
                FROM `ChecklistInstanceItemSubmission` s
                LEFT JOIN `User` u ON u.`id` = s.`userId`
                WHERE s.`itemId` IN ($iInClause)
            ", $itemIds);

            $subIds = array_column($submissions, 'id');
            $accessoriesBySub = [];
            $imagesBySub = [];

            if (!empty($subIds)) {
                $sInClause = implode(',', array_fill(0, count($subIds), '?'));
                $accRows = dbFetchAll("SELECT * FROM `ChecklistInstanceItemSubmissionAccessory` WHERE `submissionId` IN ($sInClause)", $subIds);
                foreach ($accRows as $acc) {
                    $accessoriesBySub[$acc['submissionId']][] = [
                        'name'    => $acc['name'],
                        'checked' => (bool)$acc['checked'],
                    ];
                }

                $subImgRows = dbFetchAll("SELECT * FROM `ChecklistInstanceItemSubmissionImage` WHERE `submissionId` IN ($sInClause)", $subIds);
                foreach ($subImgRows as $sImg) {
                    $imagesBySub[$sImg['submissionId']][] = [
                        'id'               => $sImg['id'],
                        'url'              => $sImg['url'],
                        'originalFilename' => $sImg['originalFilename'],
                        'mimeType'         => $sImg['mimeType'],
                        'sizeBytes'        => (int)$sImg['sizeBytes'],
                        'captureMethod'    => $sImg['captureMethod'],
                        'submissionId'     => $sImg['submissionId'],
                        'uploadedBy'       => $sImg['uploadedBy'],
                        'createdAt'        => $sImg['createdAt'],
                    ];
                }
            }

            foreach ($submissions as $sub) {
                $subsByItem[$sub['itemId']][] = [
                    'id'          => $sub['id'],
                    'itemId'      => $sub['itemId'],
                    'userId'      => [
                        'id'        => $sub['userId'],
                        'firstName' => $sub['firstName'] ?? '',
                        'lastName'  => $sub['lastName'] ?? null,
                        'storeId'   => $sub['storeId'] ?? null,
                    ],
                    'accessories' => $accessoriesBySub[$sub['id']] ?? [],
                    'remarks'     => $sub['remarks'],
                    'isDone'      => (bool)$sub['isDone'],
                    'completedAt' => $sub['completedAt'],
                    'images'      => $imagesBySub[$sub['id']] ?? [],
                ];
            }
        }

        $itemsByInst = [];
        foreach ($items as $item) {
            $itemsByInst[$item['instanceId']][] = [
                'id'                     => $item['id'],
                'label'                  => $item['label'],
                'order'                  => (int)$item['order'],
                'isDone'                 => (bool)$item['isDone'],
                'completedAt'            => $item['completedAt'],
                'completedBy'            => $item['completedBy'],
                'requiredImageCount'     => (int)$item['requiredImageCount'],
                'maxImageCount'          => $item['maxImageCount'] !== null ? (int)$item['maxImageCount'] : null,
                'requiresLivePhoto'      => (bool)$item['requiresLivePhoto'],
                'itemType'               => $item['itemType'],
                'accessories'            => !empty($item['accessories']) ? json_decode($item['accessories'], true) : [],
                'numberEntryUnit'        => $item['numberEntryUnit'],
                'numberEntryMin'         => $item['numberEntryMin'] !== null ? (float)$item['numberEntryMin'] : null,
                'numberEntryMax'         => $item['numberEntryMax'] !== null ? (float)$item['numberEntryMax'] : null,
                'ratingScale'            => $item['ratingScale'] !== null ? (int)$item['ratingScale'] : null,
                'numericValue'           => $item['numericValue'] !== null ? (float)$item['numericValue'] : null,
                'options'                => !empty($item['options']) ? json_decode($item['options'], true) : [],
                'booleanAnswer'          => $item['booleanAnswer'],
                'textValue'              => $item['textValue'],
                'dateValue'              => $item['dateValue'],
                'gpsTargetLat'           => $item['gpsTargetLat'] !== null ? (float)$item['gpsTargetLat'] : null,
                'gpsTargetLng'           => $item['gpsTargetLng'] !== null ? (float)$item['gpsTargetLng'] : null,
                'gpsRadiusMeters'        => $item['gpsRadiusMeters'] !== null ? (float)$item['gpsRadiusMeters'] : null,
                'gpsLat'                 => $item['gpsLat'] !== null ? (float)$item['gpsLat'] : null,
                'gpsLng'                 => $item['gpsLng'] !== null ? (float)$item['gpsLng'] : null,
                'gpsAccuracy'            => $item['gpsAccuracy'] !== null ? (float)$item['gpsAccuracy'] : null,
                'gpsCapturedAt'          => $item['gpsCapturedAt'],
                'signatureLabels'        => !empty($item['signatureLabels']) ? json_decode($item['signatureLabels'], true) : [],
                'signatureValue'         => $item['signatureValue'],
                'secondSignatureValue'   => $item['secondSignatureValue'],
                'qrExpectedValue'        => $item['qrExpectedValue'],
                'cashExpectedAmount'     => $item['cashExpectedAmount'] !== null ? (float)$item['cashExpectedAmount'] : null,
                'conditionalTrigger'     => $item['conditionalTrigger'],
                'conditionalActions'     => !empty($item['conditionalActions']) ? json_decode($item['conditionalActions'], true) : [],
                'conditionalReasonValue' => $item['conditionalReasonValue'],
                'issueId'                => $item['issueId'],
                'instanceId'             => $item['instanceId'],
                'images'                 => $imagesByItem[$item['id']] ?? [],
                'submissions'            => $subsByItem[$item['id']] ?? [],
            ];
        }

        return array_map(function($ci) use ($assigneesByInst, $itemsByInst) {
            return [
                'id'                 => $ci['id'],
                'definitionId'       => $ci['definitionId'],
                'title'              => $ci['title'],
                'recurrence'         => $ci['recurrence'],
                'storeId'            => $ci['storeId'],
                'opensTime'          => $ci['opensTime'],
                'cutoffTime'         => $ci['cutoffTime'],
                'assigneeIds'        => $assigneesByInst[$ci['id']] ?? [],
                'periodKey'          => $ci['periodKey'],
                'periodStart'        => $ci['periodStart'],
                'periodEnd'          => $ci['periodEnd'],
                'generatedAt'        => $ci['generatedAt'],
                'verificationStatus' => $ci['verificationStatus'],
                'verifiedBy'         => $ci['verifiedBy'],
                'verifiedAt'         => $ci['verifiedAt'],
                'verificationNote'   => $ci['verificationNote'],
                'items'              => $itemsByInst[$ci['id']] ?? [],
            ];
        }, $instances);
    }

    public static function getMine(): void {
        $user = requireAuth();
        $status = $_GET['status'] ?? null;

        $where = [];
        $params = [];

        if ($user['role'] !== 'ADMIN' && $user['role'] !== 'PC') {
            if (!empty($user['storeId'])) {
                $where[] = "`storeId` = :storeId";
                $params['storeId'] = $user['storeId'];
            } else {
                $where[] = "`id` IN (SELECT `instanceId` FROM `ChecklistInstanceAssignee` WHERE `userId` = :uId)";
                $params['uId'] = $user['sub'];
            }
        }

        if ($status === 'COMPLETED') {
            $where[] = "`verificationStatus` IN ('APPROVED', 'PENDING')";
        } elseif ($status === 'OPEN') {
            $where[] = "`verificationStatus` NOT IN ('APPROVED')";
        }

        $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
        $instances = dbFetchAll("SELECT * FROM `ChecklistInstance` $whereSql ORDER BY `periodStart` DESC LIMIT 100", $params);

        jsonResponse([
            'success' => true,
            'data'    => self::populateInstances($instances),
        ]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $ci = dbFetchOne("SELECT * FROM `ChecklistInstance` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$ci) {
            errorResponse('Checklist instance not found', 404);
        }

        $populated = self::populateInstances([$ci]);
        jsonResponse([
            'success' => true,
            'data'    => $populated[0] ?? null,
        ]);
    }

    public static function getForDefinition(): void {
        requireAuth();
        $defId = $_GET['definitionId'] ?? '';
        if (empty($defId)) {
            errorResponse('definitionId is required', 400);
        }

        $instances = dbFetchAll("SELECT * FROM `ChecklistInstance` WHERE `definitionId` = :defId ORDER BY `periodStart` DESC", ['defId' => $defId]);
        jsonResponse([
            'success' => true,
            'data'    => self::populateInstances($instances),
        ]);
    }

    public static function getPendingVerification(): void {
        requireRole(['ADMIN', 'MANAGER', 'PC', 'SENIOR']);
        $instances = dbFetchAll("SELECT * FROM `ChecklistInstance` WHERE `verificationStatus` = 'PENDING' ORDER BY `updatedAt` DESC");
        jsonResponse([
            'success' => true,
            'data'    => self::populateInstances($instances),
        ]);
    }

    public static function setItemDone(string $itemId): void {
        $user = requireAuth();
        $item = dbFetchOne("SELECT * FROM `ChecklistInstanceItem` WHERE `id` = :id LIMIT 1", ['id' => $itemId]);
        if (!$item) {
            errorResponse('Item not found', 404);
        }

        $body = getRequestBody();
        $isDone = isset($body['isDone']) ? ($body['isDone'] ? 1 : 0) : 1;

        $update = [
            'isDone'      => $isDone,
            'completedAt' => $isDone ? date('Y-m-d H:i:s') : null,
            'completedBy' => $isDone ? $user['sub'] : null,
            'updatedAt'   => date('Y-m-d H:i:s'),
        ];

        if (array_key_exists('numericValue', $body)) $update['numericValue'] = $body['numericValue'] !== null && $body['numericValue'] !== '' ? (float)$body['numericValue'] : null;
        if (array_key_exists('booleanAnswer', $body)) $update['booleanAnswer'] = $body['booleanAnswer'] ?: null;
        if (array_key_exists('textValue', $body)) $update['textValue'] = $body['textValue'] ?: null;
        if (array_key_exists('dateValue', $body)) $update['dateValue'] = !empty($body['dateValue']) ? date('Y-m-d H:i:s', strtotime($body['dateValue'])) : null;
        if (array_key_exists('gpsLat', $body)) $update['gpsLat'] = $body['gpsLat'] !== null ? (float)$body['gpsLat'] : null;
        if (array_key_exists('gpsLng', $body)) $update['gpsLng'] = $body['gpsLng'] !== null ? (float)$body['gpsLng'] : null;
        if (array_key_exists('gpsAccuracy', $body)) $update['gpsAccuracy'] = $body['gpsAccuracy'] !== null ? (float)$body['gpsAccuracy'] : null;
        if (isset($body['gpsLat']) && isset($body['gpsLng'])) $update['gpsCapturedAt'] = date('Y-m-d H:i:s');
        if (array_key_exists('signatureValue', $body)) $update['signatureValue'] = $body['signatureValue'] ?: null;
        if (array_key_exists('secondSignatureValue', $body)) $update['secondSignatureValue'] = $body['secondSignatureValue'] ?: null;
        if (array_key_exists('conditionalReasonValue', $body)) $update['conditionalReasonValue'] = $body['conditionalReasonValue'] ?: null;

        dbUpdate('ChecklistInstanceItem', $update, "`id` = :id", ['id' => $itemId]);

        // Check if all items in instance are done -> update verificationStatus to PENDING
        $remaining = dbFetchOne("
            SELECT COUNT(*) AS cnt FROM `ChecklistInstanceItem` 
            WHERE `instanceId` = :instId AND `isDone` = 0
        ", ['instId' => $item['instanceId']]);

        if ((int)($remaining['cnt'] ?? 0) === 0) {
            dbUpdate('ChecklistInstance', [
                'verificationStatus' => 'PENDING',
                'updatedAt'          => date('Y-m-d H:i:s'),
            ], "`id` = :id AND `verificationStatus` = 'NOT_SUBMITTED'", ['id' => $item['instanceId']]);
        }

        $updated = dbFetchOne("SELECT * FROM `ChecklistInstanceItem` WHERE `id` = :id", ['id' => $itemId]);
        $images = dbFetchAll("SELECT * FROM `ChecklistInstanceImage` WHERE `checklistInstanceItemId` = :id", ['id' => $itemId]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'                     => $updated['id'],
                'label'                  => $updated['label'],
                'order'                  => (int)$updated['order'],
                'isDone'                 => (bool)$updated['isDone'],
                'completedAt'            => $updated['completedAt'],
                'completedBy'            => $updated['completedBy'],
                'requiredImageCount'     => (int)$updated['requiredImageCount'],
                'maxImageCount'          => $updated['maxImageCount'] !== null ? (int)$updated['maxImageCount'] : null,
                'requiresLivePhoto'      => (bool)$updated['requiresLivePhoto'],
                'itemType'               => $updated['itemType'],
                'accessories'            => !empty($updated['accessories']) ? json_decode($updated['accessories'], true) : [],
                'numberEntryUnit'        => $updated['numberEntryUnit'],
                'numberEntryMin'         => $updated['numberEntryMin'] !== null ? (float)$updated['numberEntryMin'] : null,
                'numberEntryMax'         => $updated['numberEntryMax'] !== null ? (float)$updated['numberEntryMax'] : null,
                'ratingScale'            => $updated['ratingScale'] !== null ? (int)$updated['ratingScale'] : null,
                'numericValue'           => $updated['numericValue'] !== null ? (float)$updated['numericValue'] : null,
                'options'                => !empty($updated['options']) ? json_decode($updated['options'], true) : [],
                'booleanAnswer'          => $updated['booleanAnswer'],
                'textValue'              => $updated['textValue'],
                'dateValue'              => $updated['dateValue'],
                'gpsTargetLat'           => $updated['gpsTargetLat'] !== null ? (float)$updated['gpsTargetLat'] : null,
                'gpsTargetLng'           => $updated['gpsTargetLng'] !== null ? (float)$updated['gpsTargetLng'] : null,
                'gpsRadiusMeters'        => $updated['gpsRadiusMeters'] !== null ? (float)$updated['gpsRadiusMeters'] : null,
                'gpsLat'                 => $updated['gpsLat'] !== null ? (float)$updated['gpsLat'] : null,
                'gpsLng'                 => $updated['gpsLng'] !== null ? (float)$updated['gpsLng'] : null,
                'gpsAccuracy'            => $updated['gpsAccuracy'] !== null ? (float)$updated['gpsAccuracy'] : null,
                'gpsCapturedAt'          => $updated['gpsCapturedAt'],
                'signatureLabels'        => !empty($updated['signatureLabels']) ? json_decode($updated['signatureLabels'], true) : [],
                'signatureValue'         => $updated['signatureValue'],
                'secondSignatureValue'   => $updated['secondSignatureValue'],
                'qrExpectedValue'        => $updated['qrExpectedValue'],
                'cashExpectedAmount'     => $updated['cashExpectedAmount'] !== null ? (float)$updated['cashExpectedAmount'] : null,
                'conditionalTrigger'     => $updated['conditionalTrigger'],
                'conditionalActions'     => !empty($updated['conditionalActions']) ? json_decode($updated['conditionalActions'], true) : [],
                'conditionalReasonValue' => $updated['conditionalReasonValue'],
                'issueId'                => $updated['issueId'],
                'instanceId'             => $updated['instanceId'],
                'images'                 => $images,
                'submissions'            => [],
            ]
        ]);
    }

    public static function verify(string $id): void {
        $user = requireRole(['ADMIN', 'MANAGER', 'PC', 'SENIOR']);
        $instance = dbFetchOne("SELECT * FROM `ChecklistInstance` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$instance) {
            errorResponse('Instance not found', 404);
        }

        $body = getRequestBody();
        $action = strtoupper($body['action'] ?? '');
        $note = trim($body['note'] ?? '') ?: null;

        $update = [
            'verificationNote' => $note,
            'updatedAt'        => date('Y-m-d H:i:s'),
        ];

        if ($action === 'APPROVE') {
            $update['verificationStatus'] = 'APPROVED';
            $update['verifiedBy'] = $user['sub'];
            $update['verifiedAt'] = date('Y-m-d H:i:s');
        } else {
            $update['verificationStatus'] = 'REJECTED';
        }

        dbUpdate('ChecklistInstance', $update, "`id` = :id", ['id' => $id]);
        self::getOne($id);
    }

    public static function uploadImages(string $itemId): void {
        $user = requireAuth();
        $item = dbFetchOne("SELECT `id` FROM `ChecklistInstanceItem` WHERE `id` = :id LIMIT 1", ['id' => $itemId]);
        if (!$item) {
            errorResponse('Item not found', 404);
        }

        $captureMethod = $_POST['captureMethod'] ?? 'GALLERY';
        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/checklist-instance-images';
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
                        $url = "/uploads/checklist-instance-images/$newFilename";

                        dbInsert('ChecklistInstanceImage', [
                            'id'                      => $imgId,
                            'url'                     => $url,
                            'originalFilename'        => $origName,
                            'sizeBytes'               => $size,
                            'mimeType'                => $mime,
                            'captureMethod'           => in_array($captureMethod, ['LIVE', 'GALLERY']) ? $captureMethod : 'GALLERY',
                            'checklistInstanceItemId' => $itemId,
                            'uploadedBy'              => $user['sub'],
                            'createdAt'               => date('Y-m-d H:i:s'),
                            'updatedAt'               => date('Y-m-d H:i:s'),
                        ]);

                        $createdImages[] = [
                            'id'                      => $imgId,
                            'url'                     => $url,
                            'originalFilename'        => $origName,
                            'sizeBytes'               => $size,
                            'mimeType'                => $mime,
                            'captureMethod'           => $captureMethod,
                            'checklistInstanceItemId' => $itemId,
                            'uploadedBy'              => $user['sub'],
                            'createdAt'               => date('Y-m-d H:i:s'),
                        ];
                    }
                }
            }
        }

        jsonResponse(['success' => true, 'data' => $createdImages]);
    }

    public static function deleteImage(string $id): void {
        requireAuth();
        $img = dbFetchOne("SELECT * FROM `ChecklistInstanceImage` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$img) {
            errorResponse('Image not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $filePath = dirname(__DIR__, 2) . $img['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        dbDelete('ChecklistInstanceImage', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public static function complianceReport(): void {
        requireAuth();
        $groupBy = $_GET['groupBy'] ?? 'month';
        $storeId = $_GET['storeId'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

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
            $where[] = "ci.`periodStart` >= :from";
            $params['from'] = date('Y-m-d H:i:s', strtotime($from));
        }
        if ($to) {
            $where[] = "ci.`periodStart` <= :to";
            $params['to'] = date('Y-m-d H:i:s', strtotime($to));
        }
        if ($storeId) {
            $where[] = "ci.`storeId` = :storeId";
            $params['storeId'] = $storeId;
        }

        $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";

        $sql = "
            SELECT
                DATE_FORMAT(ci.`periodStart`, '$dateFormat') AS bucket,
                COUNT(*) AS totalItems,
                SUM(cii.`isDone`) AS doneItems,
                SUM(cii.`requiredImageCount` > 0) AS itemsRequiringPhotos,
                SUM(
                    CASE WHEN cii.`requiredImageCount` > 0
                        AND (CASE WHEN cii.`requiresLivePhoto` THEN COALESCE(img.liveCount, 0) ELSE COALESCE(img.totalCount, 0) END) >= cii.`requiredImageCount`
                    THEN 1 ELSE 0 END
                ) AS photoCompliantItems
            FROM `ChecklistInstanceItem` cii
            JOIN `ChecklistInstance` ci ON ci.`id` = cii.`instanceId`
            LEFT JOIN (
                SELECT `checklistInstanceItemId`, COUNT(*) AS totalCount, SUM(`captureMethod` = 'LIVE') AS liveCount
                FROM `ChecklistInstanceImage` GROUP BY `checklistInstanceItemId`
            ) img ON img.`checklistInstanceItemId` = cii.`id`
            $whereSql
            GROUP BY bucket
            ORDER BY bucket ASC
        ";

        $rows = dbFetchAll($sql, $params);
        $data = array_map(function($r) {
            $total = (int)$r['totalItems'];
            $done = (int)$r['doneItems'];
            $reqPhotos = (int)$r['itemsRequiringPhotos'];
            $compliant = (int)$r['photoCompliantItems'];

            return [
                'bucket'               => (string)$r['bucket'],
                'totalItems'           => $total,
                'doneItems'            => $done,
                'completionRate'       => $total > 0 ? round(($done / $total) * 100, 1) : null,
                'itemsRequiringPhotos' => $reqPhotos,
                'qualityRate'          => $reqPhotos > 0 ? round(($compliant / $reqPhotos) * 100, 1) : null,
            ];
        }, $rows);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    // --- Submissions handlers (for AUDIT item types) ---
    public static function setSubmissionDone(string $id): void {
        requireAuth();
        $sub = dbFetchOne("SELECT * FROM `ChecklistInstanceItemSubmission` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$sub) {
            errorResponse('Submission not found', 404);
        }

        $body = getRequestBody();
        $isDone = isset($body['isDone']) ? ($body['isDone'] ? 1 : 0) : 1;

        dbUpdate('ChecklistInstanceItemSubmission', [
            'isDone'      => $isDone,
            'completedAt' => $isDone ? date('Y-m-d H:i:s') : null,
            'updatedAt'   => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $id]);

        self::getSubmission($id);
    }

    public static function updateSubmissionAccessories(string $id): void {
        requireAuth();
        $sub = dbFetchOne("SELECT * FROM `ChecklistInstanceItemSubmission` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$sub) {
            errorResponse('Submission not found', 404);
        }

        $body = getRequestBody();
        if (isset($body['accessories']) && is_array($body['accessories'])) {
            dbDelete('ChecklistInstanceItemSubmissionAccessory', "`submissionId` = :id", ['id' => $id]);
            foreach ($body['accessories'] as $acc) {
                dbInsert('ChecklistInstanceItemSubmissionAccessory', [
                    'id'           => generateId(),
                    'submissionId' => $id,
                    'name'         => $acc['name'] ?? '',
                    'checked'      => !empty($acc['checked']) ? 1 : 0,
                    'createdAt'    => date('Y-m-d H:i:s'),
                    'updatedAt'    => date('Y-m-d H:i:s'),
                ]);
            }
        }

        self::getSubmission($id);
    }

    public static function updateSubmissionRemarks(string $id): void {
        requireAuth();
        $body = getRequestBody();
        $remarks = trim($body['remarks'] ?? '');

        dbUpdate('ChecklistInstanceItemSubmission', [
            'remarks'   => $remarks ?: null,
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $id]);

        self::getSubmission($id);
    }

    public static function uploadSubmissionImages(string $submissionId): void {
        $user = requireAuth();
        $sub = dbFetchOne("SELECT `id` FROM `ChecklistInstanceItemSubmission` WHERE `id` = :id LIMIT 1", ['id' => $submissionId]);
        if (!$sub) {
            errorResponse('Submission not found', 404);
        }

        $captureMethod = $_POST['captureMethod'] ?? 'GALLERY';
        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/checklist-submission-images';
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
                        $url = "/uploads/checklist-submission-images/$newFilename";

                        dbInsert('ChecklistInstanceItemSubmissionImage', [
                            'id'               => $imgId,
                            'url'              => $url,
                            'originalFilename' => $origName,
                            'sizeBytes'        => $size,
                            'mimeType'         => $mime,
                            'captureMethod'    => in_array($captureMethod, ['LIVE', 'GALLERY']) ? $captureMethod : 'GALLERY',
                            'submissionId'     => $submissionId,
                            'uploadedBy'       => $user['sub'],
                            'createdAt'        => date('Y-m-d H:i:s'),
                            'updatedAt'        => date('Y-m-d H:i:s'),
                        ]);

                        $createdImages[] = [
                            'id'               => $imgId,
                            'url'              => $url,
                            'originalFilename' => $origName,
                            'sizeBytes'        => $size,
                            'mimeType'         => $mime,
                            'captureMethod'    => $captureMethod,
                            'submissionId'     => $submissionId,
                            'uploadedBy'       => $user['sub'],
                            'createdAt'        => date('Y-m-d H:i:s'),
                        ];
                    }
                }
            }
        }

        jsonResponse(['success' => true, 'data' => $createdImages]);
    }

    public static function deleteSubmissionImage(string $id): void {
        requireAuth();
        $img = dbFetchOne("SELECT * FROM `ChecklistInstanceItemSubmissionImage` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$img) {
            errorResponse('Image not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $filePath = dirname(__DIR__, 2) . $img['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        dbDelete('ChecklistInstanceItemSubmissionImage', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    private static function getSubmission(string $id): void {
        $sub = dbFetchOne("
            SELECT s.*, u.`firstName`, u.`lastName`, u.`storeId`
            FROM `ChecklistInstanceItemSubmission` s
            LEFT JOIN `User` u ON u.`id` = s.`userId`
            WHERE s.`id` = :id
        ", ['id' => $id]);

        if (!$sub) {
            errorResponse('Submission not found', 404);
        }

        $accessories = dbFetchAll("SELECT * FROM `ChecklistInstanceItemSubmissionAccessory` WHERE `submissionId` = :id", ['id' => $id]);
        $images = dbFetchAll("SELECT * FROM `ChecklistInstanceItemSubmissionImage` WHERE `submissionId` = :id", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'          => $sub['id'],
                'itemId'      => $sub['itemId'],
                'userId'      => [
                    'id'        => $sub['userId'],
                    'firstName' => $sub['firstName'] ?? '',
                    'lastName'  => $sub['lastName'] ?? null,
                    'storeId'   => $sub['storeId'] ?? null,
                ],
                'accessories' => array_map(fn($a) => ['name' => $a['name'], 'checked' => (bool)$a['checked']], $accessories),
                'remarks'     => $sub['remarks'],
                'isDone'      => (bool)$sub['isDone'],
                'completedAt' => $sub['completedAt'],
                'images'      => $images,
            ]
        ]);
    }
}
