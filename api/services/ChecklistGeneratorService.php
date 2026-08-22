<?php
/**
 * ChecklistGeneratorService - Automatically generates recurring checklist instances
 */

class ChecklistGeneratorService {
    public static function computePeriod(string $recurrence, DateTime $now): array {
        $year = (int)$now->format('Y');
        $month = (int)$now->format('m');
        $day = (int)$now->format('d');

        switch ($recurrence) {
            case 'DAILY':
                $periodKey = $now->format('Y-m-d');
                $start = (clone $now)->setTime(0, 0, 0);
                $end = (clone $now)->setTime(23, 59, 59);
                break;

            case 'WEEKLY':
                $week = (int)$now->format('W');
                $periodKey = sprintf('%04d-W%02d', $year, $week);
                $start = (clone $now)->modify('monday this week')->setTime(0, 0, 0);
                $end = (clone $now)->modify('sunday this week')->setTime(23, 59, 59);
                break;

            case 'MONTHLY':
                $periodKey = sprintf('%04d-%02d', $year, $month);
                $start = new DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $month));
                $end = (clone $start)->modify('last day of this month')->setTime(23, 59, 59);
                break;

            case 'QUARTERLY':
                $quarter = ceil($month / 3);
                $periodKey = sprintf('%04d-Q%d', $year, $quarter);
                $qStartMonth = ($quarter - 1) * 3 + 1;
                $start = new DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $qStartMonth));
                $end = (clone $start)->modify('+2 months')->modify('last day of this month')->setTime(23, 59, 59);
                break;

            case 'YEARLY':
                $periodKey = sprintf('%04d', $year);
                $start = new DateTime(sprintf('%04d-01-01 00:00:00', $year));
                $end = new DateTime(sprintf('%04d-12-31 23:59:59', $year));
                break;

            case 'ONE_TIME':
            default:
                $periodKey = 'ONE_TIME';
                $start = (clone $now)->setTime(0, 0, 0);
                $end = (clone $now)->modify('+10 years');
                break;
        }

        return [
            'periodKey'   => $periodKey,
            'periodStart' => $start->format('Y-m-d H:i:s'),
            'periodEnd'   => $end->format('Y-m-d H:i:s'),
        ];
    }

    public static function generateForDefinition(string $definitionId, ?DateTime $now = null): void {
        $now = $now ?? new DateTime();
        $def = dbFetchOne("SELECT * FROM `ChecklistDefinition` WHERE `id` = :id AND `isActive` = 1 LIMIT 1", ['id' => $definitionId]);
        if (!$def) return;

        $stores = dbFetchAll("SELECT `storeId` FROM `ChecklistDefinitionStore` WHERE `definitionId` = :id", ['id' => $definitionId]);
        if (empty($stores)) return;

        $assignees = dbFetchAll("SELECT `userId` FROM `ChecklistDefinitionAssignee` WHERE `definitionId` = :id", ['id' => $definitionId]);
        $assigneeIds = array_column($assignees, 'userId');

        $items = dbFetchAll("SELECT * FROM `ChecklistDefinitionItem` WHERE `definitionId` = :id ORDER BY `order` ASC", ['id' => $definitionId]);
        $itemIds = array_column($items, 'id');

        $auditUsersByItem = [];
        if (!empty($itemIds)) {
            $iInClause = implode(',', array_fill(0, count($itemIds), '?'));
            $auditRows = dbFetchAll("SELECT * FROM `ChecklistDefinitionItemAuditUser` WHERE `itemId` IN ($iInClause)", $itemIds);
            foreach ($auditRows as $ar) {
                $auditUsersByItem[$ar['itemId']][] = $ar['userId'];
            }
        }

        $period = self::computePeriod($def['recurrence'], $now);

        foreach ($stores as $s) {
            $storeId = $s['storeId'];

            // Check if instance already exists
            $existing = dbFetchOne("
                SELECT `id` FROM `ChecklistInstance` 
                WHERE `definitionId` = :defId AND `storeId` = :storeId AND `periodKey` = :pKey
                LIMIT 1
            ", [
                'defId'   => $definitionId,
                'storeId' => $storeId,
                'pKey'    => $period['periodKey']
            ]);

            if ($existing) continue;

            $instanceId = generateId();
            dbTransaction(function() use ($instanceId, $def, $storeId, $period, $assigneeIds, $items, $auditUsersByItem) {
                dbInsert('ChecklistInstance', [
                    'id'                 => $instanceId,
                    'definitionId'       => $def['id'],
                    'title'              => $def['name'],
                    'recurrence'         => $def['recurrence'],
                    'storeId'            => $storeId,
                    'opensTime'          => $def['opensTime'],
                    'cutoffTime'         => $def['cutoffTime'],
                    'periodKey'          => $period['periodKey'],
                    'periodStart'        => $period['periodStart'],
                    'periodEnd'          => $period['periodEnd'],
                    'verificationStatus' => 'NOT_SUBMITTED',
                    'generatedAt'        => date('Y-m-d H:i:s'),
                    'createdAt'          => date('Y-m-d H:i:s'),
                    'updatedAt'          => date('Y-m-d H:i:s'),
                ]);

                foreach ($assigneeIds as $uId) {
                    dbInsert('ChecklistInstanceAssignee', [
                        'id'         => generateId(),
                        'instanceId' => $instanceId,
                        'userId'     => $uId,
                        'createdAt'  => date('Y-m-d H:i:s'),
                    ]);
                }

                foreach ($items as $item) {
                    $instItemId = generateId();
                    dbInsert('ChecklistInstanceItem', [
                        'id'                 => $instItemId,
                        'label'              => $item['label'],
                        'order'              => (int)$item['order'],
                        'isDone'             => 0,
                        'requiredImageCount' => (int)$item['requiredImageCount'],
                        'maxImageCount'      => $item['maxImageCount'] !== null ? (int)$item['maxImageCount'] : null,
                        'requiresLivePhoto'  => (bool)$item['requiresLivePhoto'],
                        'itemType'           => $item['itemType'],
                        'accessories'        => $item['accessories'],
                        'numberEntryUnit'    => $item['numberEntryUnit'],
                        'numberEntryMin'     => $item['numberEntryMin'],
                        'numberEntryMax'     => $item['numberEntryMax'],
                        'ratingScale'        => $item['ratingScale'],
                        'options'            => $item['options'],
                        'gpsTargetLat'       => $item['gpsTargetLat'],
                        'gpsTargetLng'       => $item['gpsTargetLng'],
                        'gpsRadiusMeters'    => $item['gpsRadiusMeters'],
                        'signatureLabels'    => $item['signatureLabels'],
                        'qrExpectedValue'    => $item['qrExpectedValue'],
                        'cashExpectedAmount' => $item['cashExpectedAmount'],
                        'conditionalTrigger' => $item['conditionalTrigger'],
                        'conditionalActions' => $item['conditionalActions'],
                        'instanceId'         => $instanceId,
                        'createdAt'          => date('Y-m-d H:i:s'),
                        'updatedAt'          => date('Y-m-d H:i:s'),
                    ]);

                    // If AUDIT item, create submissions for audit users
                    if ($item['itemType'] === 'AUDIT' && !empty($auditUsersByItem[$item['id']])) {
                        $accessoriesArr = !empty($item['accessories']) ? json_decode($item['accessories'], true) : [];
                        foreach ($auditUsersByItem[$item['id']] as $auditorId) {
                            $subId = generateId();
                            dbInsert('ChecklistInstanceItemSubmission', [
                                'id'        => $subId,
                                'itemId'    => $instItemId,
                                'userId'    => $auditorId,
                                'isDone'    => 0,
                                'createdAt' => date('Y-m-d H:i:s'),
                                'updatedAt' => date('Y-m-d H:i:s'),
                            ]);

                            foreach ($accessoriesArr as $accName) {
                                dbInsert('ChecklistInstanceItemSubmissionAccessory', [
                                    'id'           => generateId(),
                                    'submissionId' => $subId,
                                    'name'         => is_string($accName) ? $accName : ($accName['name'] ?? ''),
                                    'checked'      => 0,
                                    'createdAt'    => date('Y-m-d H:i:s'),
                                    'updatedAt'    => date('Y-m-d H:i:s'),
                                ]);
                            }
                        }
                    }
                }
            });
        }
    }

    public static function generateAllDue(): void {
        $now = new DateTime();
        $definitions = dbFetchAll("SELECT `id` FROM `ChecklistDefinition` WHERE `isActive` = 1");
        foreach ($definitions as $d) {
            self::generateForDefinition($d['id'], $now);
        }
    }
}
