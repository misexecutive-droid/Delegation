<?php
/**
 * ChecklistDefinitionController - Recurring Checklist Builder and Definitions
 */

class ChecklistDefinitionController {
    public static function hydrateDefinitions(array $definitions): array {
        if (empty($definitions)) return [];
        $ids = array_column($definitions, 'id');
        $inClause = implode(',', array_fill(0, count($ids), '?'));

        // Stores
        $storeLinks = dbFetchAll("SELECT * FROM `ChecklistDefinitionStore` WHERE `definitionId` IN ($inClause)", $ids);
        $storesByDef = [];
        foreach ($storeLinks as $l) {
            $storesByDef[$l['definitionId']][] = $l['storeId'];
        }

        // Assignees
        $assigneeLinks = dbFetchAll("SELECT * FROM `ChecklistDefinitionAssignee` WHERE `definitionId` IN ($inClause)", $ids);
        $assigneesByDef = [];
        foreach ($assigneeLinks as $l) {
            $assigneesByDef[$l['definitionId']][] = $l['userId'];
        }

        // Items + Audit Users
        $items = dbFetchAll("SELECT * FROM `ChecklistDefinitionItem` WHERE `definitionId` IN ($inClause) ORDER BY `order` ASC", $ids);
        $itemIds = array_column($items, 'id');
        $auditUsersByItem = [];
        if (!empty($itemIds)) {
            $iInClause = implode(',', array_fill(0, count($itemIds), '?'));
            $auditLinks = dbFetchAll("SELECT * FROM `ChecklistDefinitionItemAuditUser` WHERE `itemId` IN ($iInClause)", $itemIds);
            foreach ($auditLinks as $al) {
                $auditUsersByItem[$al['itemId']][] = $al['userId'];
            }
        }

        $itemsByDef = [];
        foreach ($items as $item) {
            $itemsByDef[$item['definitionId']][] = [
                'id'                 => $item['id'],
                'label'              => $item['label'],
                'order'              => (int)$item['order'],
                'requiredImageCount' => (int)$item['requiredImageCount'],
                'maxImageCount'      => $item['maxImageCount'] !== null ? (int)$item['maxImageCount'] : null,
                'requiresLivePhoto'  => (bool)$item['requiresLivePhoto'],
                'itemType'           => $item['itemType'],
                'auditUserIds'       => $auditUsersByItem[$item['id']] ?? [],
                'accessories'        => !empty($item['accessories']) ? json_decode($item['accessories'], true) : [],
                'numberEntryUnit'    => $item['numberEntryUnit'],
                'numberEntryMin'     => $item['numberEntryMin'] !== null ? (float)$item['numberEntryMin'] : null,
                'numberEntryMax'     => $item['numberEntryMax'] !== null ? (float)$item['numberEntryMax'] : null,
                'ratingScale'        => $item['ratingScale'] !== null ? (int)$item['ratingScale'] : null,
                'options'            => !empty($item['options']) ? json_decode($item['options'], true) : [],
                'gpsTargetLat'       => $item['gpsTargetLat'] !== null ? (float)$item['gpsTargetLat'] : null,
                'gpsTargetLng'       => $item['gpsTargetLng'] !== null ? (float)$item['gpsTargetLng'] : null,
                'gpsRadiusMeters'    => $item['gpsRadiusMeters'] !== null ? (float)$item['gpsRadiusMeters'] : null,
                'signatureLabels'    => !empty($item['signatureLabels']) ? json_decode($item['signatureLabels'], true) : [],
                'qrExpectedValue'    => $item['qrExpectedValue'],
                'cashExpectedAmount' => $item['cashExpectedAmount'] !== null ? (float)$item['cashExpectedAmount'] : null,
                'conditionalTrigger' => $item['conditionalTrigger'],
                'conditionalActions' => !empty($item['conditionalActions']) ? json_decode($item['conditionalActions'], true) : [],
                'definitionId'       => $item['definitionId'],
            ];
        }

        // Stats: completionRate & qualityRate across generated instances
        $statsRows = dbFetchAll("
            SELECT
                ci.`definitionId`,
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
            WHERE ci.`definitionId` IN ($inClause)
            GROUP BY ci.`definitionId`
        ", $ids);

        $statsByDef = [];
        foreach ($statsRows as $sr) {
            $total = (int)$sr['totalItems'];
            $done = (int)$sr['doneItems'];
            $reqPhotos = (int)$sr['itemsRequiringPhotos'];
            $compliant = (int)$sr['photoCompliantItems'];

            $statsByDef[$sr['definitionId']] = [
                'completionRate' => $total > 0 ? round(($done / $total) * 100, 1) : null,
                'qualityRate'    => $reqPhotos > 0 ? round(($compliant / $reqPhotos) * 100, 1) : null,
            ];
        }

        return array_map(function($d) use ($storesByDef, $assigneesByDef, $itemsByDef, $statsByDef) {
            $stats = $statsByDef[$d['id']] ?? null;
            return [
                'id'             => $d['id'],
                'name'           => $d['name'],
                'description'    => $d['description'],
                'storeIds'       => $storesByDef[$d['id']] ?? [],
                'recurrence'     => $d['recurrence'],
                'startDate'      => $d['startDate'],
                'opensTime'      => $d['opensTime'],
                'cutoffTime'     => $d['cutoffTime'],
                'isActive'       => (bool)$d['isActive'],
                'assigneeIds'    => $assigneesByDef[$d['id']] ?? [],
                'assigneeRoles'  => !empty($d['assigneeRoles']) ? json_decode($d['assigneeRoles'], true) : [],
                'proofRequired'  => !empty($d['proofRequired']) ? json_decode($d['proofRequired'], true) : [],
                'icon'           => $d['icon'],
                'version'        => (int)$d['version'],
                'createdBy'      => $d['createdBy'],
                'items'          => $itemsByDef[$d['id']] ?? [],
                'completionRate' => $stats['completionRate'] ?? null,
                'qualityRate'    => $stats['qualityRate'] ?? null,
                'createdAt'      => $d['createdAt'],
                'updatedAt'      => $d['updatedAt'],
            ];
        }, $definitions);
    }

    public static function getAll(): void {
        requireAuth();
        $storeId = $_GET['storeId'] ?? null;
        $recurrence = $_GET['recurrence'] ?? null;
        $isActive = isset($_GET['isActive']) ? ($_GET['isActive'] === 'true' || $_GET['isActive'] === '1') : null;

        $where = [];
        $params = [];

        if ($recurrence) {
            $where[] = "`recurrence` = :rec";
            $params['rec'] = $recurrence;
        }
        if ($isActive !== null) {
            $where[] = "`isActive` = :active";
            $params['active'] = $isActive ? 1 : 0;
        }
        if ($storeId) {
            $where[] = "`id` IN (SELECT `definitionId` FROM `ChecklistDefinitionStore` WHERE `storeId` = :storeId)";
            $params['storeId'] = $storeId;
        }

        $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
        $definitions = dbFetchAll("SELECT * FROM `ChecklistDefinition` $whereSql ORDER BY `name` ASC", $params);

        jsonResponse([
            'success' => true,
            'data'    => self::hydrateDefinitions($definitions),
        ]);
    }

    public static function getOne(string $id): void {
        requireAuth();
        $d = dbFetchOne("SELECT * FROM `ChecklistDefinition` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$d) {
            errorResponse('Checklist definition not found', 404);
        }

        $hydrated = self::hydrateDefinitions([$d]);
        jsonResponse([
            'success' => true,
            'data'    => $hydrated[0] ?? null,
        ]);
    }

    public static function create(): void {
        $user = requireRole(['ADMIN', 'MANAGER', 'PC']);
        $body = getRequestBody();

        $name = trim($body['name'] ?? '');
        $recurrence = $body['recurrence'] ?? 'DAILY';
        $startDate = !empty($body['startDate']) ? date('Y-m-d H:i:s', strtotime($body['startDate'])) : date('Y-m-d H:i:s');

        if (empty($name)) {
            errorResponse('Definition name is required', 400);
        }

        $id = generateId();
        dbTransaction(function() use ($id, $name, $recurrence, $startDate, $body, $user) {
            dbInsert('ChecklistDefinition', [
                'id'            => $id,
                'name'          => $name,
                'description'   => trim($body['description'] ?? '') ?: null,
                'recurrence'    => $recurrence,
                'startDate'     => $startDate,
                'opensTime'     => !empty($body['opensTime']) ? $body['opensTime'] : null,
                'cutoffTime'    => !empty($body['cutoffTime']) ? $body['cutoffTime'] : null,
                'isActive'      => 1,
                'assigneeRoles' => !empty($body['assigneeRoles']) ? json_encode($body['assigneeRoles']) : null,
                'proofRequired' => !empty($body['proofRequired']) ? json_encode($body['proofRequired']) : null,
                'icon'          => $body['icon'] ?? 'store',
                'version'       => 1,
                'createdBy'     => $user['sub'],
                'createdAt'     => date('Y-m-d H:i:s'),
                'updatedAt'     => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['storeIds']) && is_array($body['storeIds'])) {
                foreach ($body['storeIds'] as $sId) {
                    dbInsert('ChecklistDefinitionStore', [
                        'id'           => generateId(),
                        'definitionId' => $id,
                        'storeId'      => $sId,
                        'createdAt'    => date('Y-m-d H:i:s'),
                    ]);
                }
            }

            if (!empty($body['assigneeIds']) && is_array($body['assigneeIds'])) {
                foreach ($body['assigneeIds'] as $uId) {
                    dbInsert('ChecklistDefinitionAssignee', [
                        'id'           => generateId(),
                        'definitionId' => $id,
                        'userId'       => $uId,
                        'createdAt'    => date('Y-m-d H:i:s'),
                    ]);
                }
            }

            if (!empty($body['items']) && is_array($body['items'])) {
                foreach ($body['items'] as $idx => $item) {
                    $itemId = generateId();
                    dbInsert('ChecklistDefinitionItem', [
                        'id'                 => $itemId,
                        'label'              => trim($item['label'] ?? ''),
                        'order'              => (int)($item['order'] ?? $idx),
                        'requiredImageCount' => (int)($item['requiredImageCount'] ?? 0),
                        'maxImageCount'      => isset($item['maxImageCount']) && $item['maxImageCount'] !== '' ? (int)$item['maxImageCount'] : null,
                        'requiresLivePhoto'  => !empty($item['requiresLivePhoto']) ? 1 : 0,
                        'itemType'           => $item['itemType'] ?? 'STANDARD',
                        'accessories'        => !empty($item['accessories']) ? json_encode($item['accessories']) : null,
                        'numberEntryUnit'    => $item['numberEntryUnit'] ?? null,
                        'numberEntryMin'     => isset($item['numberEntryMin']) && $item['numberEntryMin'] !== '' ? (float)$item['numberEntryMin'] : null,
                        'numberEntryMax'     => isset($item['numberEntryMax']) && $item['numberEntryMax'] !== '' ? (float)$item['numberEntryMax'] : null,
                        'ratingScale'        => isset($item['ratingScale']) && $item['ratingScale'] !== '' ? (int)$item['ratingScale'] : null,
                        'options'            => !empty($item['options']) ? json_encode($item['options']) : null,
                        'gpsTargetLat'       => isset($item['gpsTargetLat']) && $item['gpsTargetLat'] !== '' ? (float)$item['gpsTargetLat'] : null,
                        'gpsTargetLng'       => isset($item['gpsTargetLng']) && $item['gpsTargetLng'] !== '' ? (float)$item['gpsTargetLng'] : null,
                        'gpsRadiusMeters'    => isset($item['gpsRadiusMeters']) && $item['gpsRadiusMeters'] !== '' ? (float)$item['gpsRadiusMeters'] : null,
                        'signatureLabels'    => !empty($item['signatureLabels']) ? json_encode($item['signatureLabels']) : null,
                        'qrExpectedValue'    => $item['qrExpectedValue'] ?? null,
                        'cashExpectedAmount' => isset($item['cashExpectedAmount']) && $item['cashExpectedAmount'] !== '' ? (float)$item['cashExpectedAmount'] : null,
                        'conditionalTrigger' => $item['conditionalTrigger'] ?? null,
                        'conditionalActions' => !empty($item['conditionalActions']) ? json_encode($item['conditionalActions']) : null,
                        'definitionId'       => $id,
                        'createdAt'          => date('Y-m-d H:i:s'),
                        'updatedAt'          => date('Y-m-d H:i:s'),
                    ]);

                    if (($item['itemType'] ?? '') === 'AUDIT' && !empty($item['auditUserIds']) && is_array($item['auditUserIds'])) {
                        foreach ($item['auditUserIds'] as $auditorId) {
                            dbInsert('ChecklistDefinitionItemAuditUser', [
                                'id'        => generateId(),
                                'itemId'    => $itemId,
                                'userId'    => $auditorId,
                                'createdAt' => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
        });

        // Trigger immediate instance creation if active
        require_once dirname(__DIR__) . '/services/ChecklistGeneratorService.php';
        ChecklistGeneratorService::generateForDefinition($id);

        self::getOne($id);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        $existing = dbFetchOne("SELECT * FROM `ChecklistDefinition` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Checklist definition not found', 404);
        }

        $body = getRequestBody();
        $name = trim($body['name'] ?? $existing['name']);
        $recurrence = $body['recurrence'] ?? $existing['recurrence'];
        $startDate = !empty($body['startDate']) ? date('Y-m-d H:i:s', strtotime($body['startDate'])) : $existing['startDate'];

        dbTransaction(function() use ($id, $existing, $name, $recurrence, $startDate, $body) {
            dbUpdate('ChecklistDefinition', [
                'name'          => $name,
                'description'   => array_key_exists('description', $body) ? (trim($body['description'] ?? '') ?: null) : $existing['description'],
                'recurrence'    => $recurrence,
                'startDate'     => $startDate,
                'opensTime'     => array_key_exists('opensTime', $body) ? ($body['opensTime'] ?: null) : $existing['opensTime'],
                'cutoffTime'    => array_key_exists('cutoffTime', $body) ? ($body['cutoffTime'] ?: null) : $existing['cutoffTime'],
                'assigneeRoles' => isset($body['assigneeRoles']) ? json_encode($body['assigneeRoles']) : $existing['assigneeRoles'],
                'proofRequired' => isset($body['proofRequired']) ? json_encode($body['proofRequired']) : $existing['proofRequired'],
                'icon'          => $body['icon'] ?? $existing['icon'],
                'version'       => (int)$existing['version'] + 1,
                'updatedAt'     => date('Y-m-d H:i:s'),
            ], "`id` = :id", ['id' => $id]);

            if (isset($body['storeIds']) && is_array($body['storeIds'])) {
                dbDelete('ChecklistDefinitionStore', "`definitionId` = :id", ['id' => $id]);
                foreach ($body['storeIds'] as $sId) {
                    dbInsert('ChecklistDefinitionStore', [
                        'id'           => generateId(),
                        'definitionId' => $id,
                        'storeId'      => $sId,
                        'createdAt'    => date('Y-m-d H:i:s'),
                    ]);
                }
            }

            if (isset($body['assigneeIds']) && is_array($body['assigneeIds'])) {
                dbDelete('ChecklistDefinitionAssignee', "`definitionId` = :id", ['id' => $id]);
                foreach ($body['assigneeIds'] as $uId) {
                    dbInsert('ChecklistDefinitionAssignee', [
                        'id'           => generateId(),
                        'definitionId' => $id,
                        'userId'       => $uId,
                        'createdAt'    => date('Y-m-d H:i:s'),
                    ]);
                }
            }

            if (isset($body['items']) && is_array($body['items'])) {
                dbDelete('ChecklistDefinitionItem', "`definitionId` = :id", ['id' => $id]);
                foreach ($body['items'] as $idx => $item) {
                    $itemId = generateId();
                    dbInsert('ChecklistDefinitionItem', [
                        'id'                 => $itemId,
                        'label'              => trim($item['label'] ?? ''),
                        'order'              => (int)($item['order'] ?? $idx),
                        'requiredImageCount' => (int)($item['requiredImageCount'] ?? 0),
                        'maxImageCount'      => isset($item['maxImageCount']) && $item['maxImageCount'] !== '' ? (int)$item['maxImageCount'] : null,
                        'requiresLivePhoto'  => !empty($item['requiresLivePhoto']) ? 1 : 0,
                        'itemType'           => $item['itemType'] ?? 'STANDARD',
                        'accessories'        => !empty($item['accessories']) ? json_encode($item['accessories']) : null,
                        'numberEntryUnit'    => $item['numberEntryUnit'] ?? null,
                        'numberEntryMin'     => isset($item['numberEntryMin']) && $item['numberEntryMin'] !== '' ? (float)$item['numberEntryMin'] : null,
                        'numberEntryMax'     => isset($item['numberEntryMax']) && $item['numberEntryMax'] !== '' ? (float)$item['numberEntryMax'] : null,
                        'ratingScale'        => isset($item['ratingScale']) && $item['ratingScale'] !== '' ? (int)$item['ratingScale'] : null,
                        'options'            => !empty($item['options']) ? json_encode($item['options']) : null,
                        'gpsTargetLat'       => isset($item['gpsTargetLat']) && $item['gpsTargetLat'] !== '' ? (float)$item['gpsTargetLat'] : null,
                        'gpsTargetLng'       => isset($item['gpsTargetLng']) && $item['gpsTargetLng'] !== '' ? (float)$item['gpsTargetLng'] : null,
                        'gpsRadiusMeters'    => isset($item['gpsRadiusMeters']) && $item['gpsRadiusMeters'] !== '' ? (float)$item['gpsRadiusMeters'] : null,
                        'signatureLabels'    => !empty($item['signatureLabels']) ? json_encode($item['signatureLabels']) : null,
                        'qrExpectedValue'    => $item['qrExpectedValue'] ?? null,
                        'cashExpectedAmount' => isset($item['cashExpectedAmount']) && $item['cashExpectedAmount'] !== '' ? (float)$item['cashExpectedAmount'] : null,
                        'conditionalTrigger' => $item['conditionalTrigger'] ?? null,
                        'conditionalActions' => !empty($item['conditionalActions']) ? json_encode($item['conditionalActions']) : null,
                        'definitionId'       => $id,
                        'createdAt'          => date('Y-m-d H:i:s'),
                        'updatedAt'          => date('Y-m-d H:i:s'),
                    ]);

                    if (($item['itemType'] ?? '') === 'AUDIT' && !empty($item['auditUserIds']) && is_array($item['auditUserIds'])) {
                        foreach ($item['auditUserIds'] as $auditorId) {
                            dbInsert('ChecklistDefinitionItemAuditUser', [
                                'id'        => generateId(),
                                'itemId'    => $itemId,
                                'userId'    => $auditorId,
                                'createdAt' => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
        });

        if ($existing['isActive']) {
            require_once dirname(__DIR__) . '/services/ChecklistGeneratorService.php';
            ChecklistGeneratorService::generateForDefinition($id);
        }

        self::getOne($id);
    }

    public static function setActive(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        $body = getRequestBody();
        $isActive = !empty($body['isActive']) ? 1 : 0;

        dbUpdate('ChecklistDefinition', [
            'isActive'  => $isActive,
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id", ['id' => $id]);

        if ($isActive) {
            require_once dirname(__DIR__) . '/services/ChecklistGeneratorService.php';
            ChecklistGeneratorService::generateForDefinition($id);
        }

        self::getOne($id);
    }

    public static function remove(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC']);
        dbDelete('ChecklistDefinition', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
