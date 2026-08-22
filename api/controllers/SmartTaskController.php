<?php
/**
 * SmartTaskController - Natural Language Task Extraction & Assistant Conversations
 */

class SmartTaskController {
    public static function parseSmart(): void {
        requireAuth();
        $body = getRequestBody();
        $text = trim($body['text'] ?? '');

        if (empty($text)) {
            errorResponse('Text is required', 400);
        }

        // Rule-based heuristic extraction
        $priority = 'medium';
        if (preg_match('/\b(urgent|critical|high priority|asap)\b/i', $text)) {
            $priority = 'high';
        } elseif (preg_match('/\b(low priority|whenever|minor)\b/i', $text)) {
            $priority = 'low';
        }

        $category = 'delegated_task';
        if (preg_match('/\b(broken|error|bug|issue|defect|leak|damaged)\b/i', $text)) {
            $category = 'issue';
        }

        // Due date heuristic
        $dueDate = date('Y-m-d H:i:s', time() + 86400); // default tomorrow
        if (preg_match('/\btoday\b/i', $text)) {
            $dueDate = date('Y-m-d 23:59:59');
        } elseif (preg_match('/\btomorrow\b/i', $text)) {
            $dueDate = date('Y-m-d 23:59:59', time() + 86400);
        } elseif (preg_match('/\bnext week\b/i', $text)) {
            $dueDate = date('Y-m-d 23:59:59', time() + (7 * 86400));
        }

        // Try to match assignee name against users in db
        $assignee = null;
        $users = dbFetchAll("SELECT `id`, `firstName`, `lastName` FROM `User` WHERE `isActive` = 1");
        foreach ($users as $u) {
            $fName = preg_quote($u['firstName'], '/');
            if (preg_match("/\b$fName\b/i", $text)) {
                $assignee = [
                    'id'   => $u['id'],
                    'name' => trim($u['firstName'] . ' ' . ($u['lastName'] ?? '')),
                ];
                break;
            }
        }

        $cleanTitle = trim(preg_replace('/^(please|can you|task:|todo:)\s+/i', '', $text));
        if (strlen($cleanTitle) > 80) {
            $cleanTitle = substr($cleanTitle, 0, 77) . '...';
        }

        jsonResponse([
            'title'         => $cleanTitle ?: 'New Task',
            'context'       => $text,
            'category'      => $category,
            'assignee'      => $assignee,
            'assigneeRaw'   => $assignee ? $assignee['name'] : '',
            'departmentRaw' => '',
            'dueDate'       => $dueDate,
            'priority'      => $priority,
            'confidence'    => 0.85,
            'wonBy'         => 'rule_engine',
            'rawInput'      => $text,
        ]);
    }

    public static function createFromSmart(): void {
        $user = requireAuth();
        $body = getRequestBody();

        $title = trim($body['title'] ?? '');
        if (empty($title)) {
            errorResponse('Title is required', 400);
        }

        $id = generateId();
        $category = ($body['category'] ?? '') === 'issue' ? 'issue' : 'delegation';

        dbInsert('Task', [
            'id'           => $id,
            'title'        => $title,
            'description'  => trim($body['context'] ?? '') ?: null,
            'category'     => $category,
            'priority'     => in_array($body['priority'] ?? '', ['low', 'medium', 'high']) ? $body['priority'] : 'medium',
            'dueDate'      => !empty($body['dueDate']) ? date('Y-m-d H:i:s', strtotime($body['dueDate'])) : null,
            'userId'       => $user['sub'],
            'assigneeId'   => !empty($body['assigneeId']) ? $body['assigneeId'] : null,
            'departmentId' => !empty($body['departmentId']) ? $body['departmentId'] : null,
            'aiMeta'       => json_encode([
                'rawInput'              => $body['rawInput'] ?? '',
                'inputMode'             => $body['inputMode'] ?? 'text',
                'channel'               => $body['channel'] ?? 'web',
                'extractedAssigneeName' => $body['assigneeRaw'] ?? null,
                'extractedDepartment'   => $body['departmentRaw'] ?? null,
                'confidence'            => isset($body['confidence']) ? (float)$body['confidence'] : null,
                'model'                 => $body['wonBy'] ?? null,
            ]),
            'createdAt'    => date('Y-m-d H:i:s'),
            'updatedAt'    => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchOne("SELECT * FROM `Task` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'id'                    => $created['id'],
            'title'                 => $created['title'],
            'description'           => $created['description'],
            'status'                => $created['status'],
            'category'              => $created['category'],
            'priority'              => $created['priority'],
            'startDate'             => $created['startDate'],
            'dueDate'               => $created['dueDate'],
            'reminderMinutesBefore' => $created['reminderMinutesBefore'] !== null ? (int)$created['reminderMinutesBefore'] : null,
            'reminderChannel'       => $created['reminderChannel'],
            'projectId'             => $created['projectId'],
            'userId'                => $created['userId'],
            'assigneeId'            => $created['assigneeId'],
            'additionalAssigneeIds' => [],
            'departmentId'          => $created['departmentId'],
            'verifiedBy'            => $created['verifiedBy'],
            'verifiedAt'            => $created['verifiedAt'],
            'verificationNote'      => $created['verificationNote'],
            'submittedAt'           => $created['submittedAt'],
            'submissionNote'        => $created['submissionNote'],
            'aiMeta'                => !empty($created['aiMeta']) ? json_decode($created['aiMeta'], true) : null,
            'createdAt'             => $created['createdAt'],
            'updatedAt'             => $created['updatedAt'],
        ], 201);
    }

    public static function listConversations(): void {
        $user = requireAuth();
        $convs = dbFetchAll("
            SELECT c.*, 
                   COUNT(m.`id`) AS messageCount,
                   COALESCE(MAX(m.`text`), '') AS preview
            FROM `SmartTaskConversation` c
            LEFT JOIN `SmartTaskConversationMessage` m ON m.`conversationId` = c.`id`
            WHERE c.`userId` = :uId
            GROUP BY c.`id`
            ORDER BY c.`updatedAt` DESC
        ", ['uId' => $user['sub']]);

        $data = array_map(function($c) {
            return [
                'id'              => $c['id'],
                'status'          => $c['status'],
                'resultingTaskId' => $c['resultingTaskId'],
                'messageCount'    => (int)$c['messageCount'],
                'title'           => 'Conversation ' . substr($c['createdAt'], 0, 10),
                'preview'         => substr($c['preview'], 0, 60),
                'createdAt'       => $c['createdAt'],
                'updatedAt'       => $c['updatedAt'],
            ];
        }, $convs);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function getConversation(string $id): void {
        $user = requireAuth();
        $conv = dbFetchOne("SELECT * FROM `SmartTaskConversation` WHERE `id` = :id AND `userId` = :uId LIMIT 1", ['id' => $id, 'uId' => $user['sub']]);
        if (!$conv) {
            errorResponse('Conversation not found', 404);
        }

        $messages = dbFetchAll("SELECT * FROM `SmartTaskConversationMessage` WHERE `conversationId` = :id ORDER BY `timestamp` ASC", ['id' => $id]);

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'              => $conv['id'],
                'userId'          => $conv['userId'],
                'status'          => $conv['status'],
                'resultingTaskId' => $conv['resultingTaskId'],
                'messages'        => array_map(fn($m) => [
                    'from'      => $m['from'],
                    'text'      => $m['text'],
                    'timestamp' => $m['timestamp'],
                ], $messages),
                'createdAt'       => $conv['createdAt'],
                'updatedAt'       => $conv['updatedAt'],
            ]
        ]);
    }

    public static function createConversation(): void {
        $user = requireAuth();
        $body = getRequestBody();
        $id = generateId();

        dbTransaction(function() use ($id, $user, $body) {
            dbInsert('SmartTaskConversation', [
                'id'        => $id,
                'userId'    => $user['sub'],
                'status'    => 'in_progress',
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
            ]);

            if (!empty($body['messages']) && is_array($body['messages'])) {
                foreach ($body['messages'] as $m) {
                    dbInsert('SmartTaskConversationMessage', [
                        'id'             => generateId(),
                        'conversationId' => $id,
                        'from'           => $m['from'] ?? 'user',
                        'text'           => $m['text'] ?? '',
                        'timestamp'      => date('Y-m-d H:i:s'),
                        'createdAt'      => date('Y-m-d H:i:s'),
                        'updatedAt'      => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getConversation($id);
    }

    public static function patchConversation(string $id): void {
        $user = requireAuth();
        $conv = dbFetchOne("SELECT `id` FROM `SmartTaskConversation` WHERE `id` = :id AND `userId` = :uId LIMIT 1", ['id' => $id, 'uId' => $user['sub']]);
        if (!$conv) {
            errorResponse('Conversation not found', 404);
        }

        $body = getRequestBody();
        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['status'])) $update['status'] = $body['status'];
        if (array_key_exists('resultingTaskId', $body)) $update['resultingTaskId'] = $body['resultingTaskId'] ?: null;

        dbTransaction(function() use ($id, $update, $body) {
            dbUpdate('SmartTaskConversation', $update, "`id` = :id", ['id' => $id]);

            if (!empty($body['messages']) && is_array($body['messages'])) {
                foreach ($body['messages'] as $m) {
                    dbInsert('SmartTaskConversationMessage', [
                        'id'             => generateId(),
                        'conversationId' => $id,
                        'from'           => $m['from'] ?? 'user',
                        'text'           => $m['text'] ?? '',
                        'timestamp'      => date('Y-m-d H:i:s'),
                        'createdAt'      => date('Y-m-d H:i:s'),
                        'updatedAt'      => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        });

        self::getConversation($id);
    }

    public static function deleteAllConversations(): void {
        $user = requireAuth();
        $count = dbDelete('SmartTaskConversation', "`userId` = :uId", ['uId' => $user['sub']]);
        jsonResponse(['success' => true, 'data' => ['deletedCount' => $count]]);
    }
}
