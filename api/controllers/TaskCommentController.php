<?php
/**
 * TaskCommentController - Task Comments, Attachments, and Geolocation
 */

class TaskCommentController {
    public static function list(string $taskId): void {
        requireAuth();
        $comments = dbFetchAll("
            SELECT c.*, u.`firstName`, u.`lastName`, u.`email`, u.`role`
            FROM `TaskComment` c
            LEFT JOIN `User` u ON u.`id` = c.`authorId`
            WHERE c.`taskId` = :taskId
            ORDER BY c.`createdAt` ASC
        ", ['taskId' => $taskId]);

        if (empty($comments)) {
            jsonResponse(['success' => true, 'data' => []]);
        }

        $commentIds = array_column($comments, 'id');
        $inClause = implode(',', array_fill(0, count($commentIds), '?'));
        $attRows = dbFetchAll("SELECT * FROM `TaskCommentAttachment` WHERE `commentId` IN ($inClause)", $commentIds);

        $attachmentsByComment = [];
        foreach ($attRows as $a) {
            $attachmentsByComment[$a['commentId']][] = [
                'url'              => $a['url'],
                'originalFilename' => $a['originalFilename'],
                'mimeType'         => $a['mimeType'],
                'sizeBytes'        => (int)$a['sizeBytes'],
            ];
        }

        $data = array_map(function($c) use ($attachmentsByComment) {
            $location = null;
            if ($c['locationLat'] !== null && $c['locationLng'] !== null) {
                $location = [
                    'lat'   => (float)$c['locationLat'],
                    'lng'   => (float)$c['locationLng'],
                    'label' => $c['locationLabel'] ?? null,
                ];
            }

            return [
                'id'          => $c['id'],
                'taskId'      => $c['taskId'],
                'body'        => $c['body'],
                'attachments' => $attachmentsByComment[$c['id']] ?? [],
                'location'    => $location,
                'authorId'    => $c['authorId'] ? [
                    'id'        => $c['authorId'],
                    'firstName' => $c['firstName'] ?? '',
                    'lastName'  => $c['lastName'] ?? null,
                    'email'     => $c['email'] ?? '',
                    'role'      => $c['role'] ?? '',
                ] : null,
                'createdAt'   => $c['createdAt'],
                'updatedAt'   => $c['updatedAt'],
            ];
        }, $comments);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function create(string $taskId): void {
        $user = requireAuth();
        $bodyText = trim($_POST['body'] ?? '');
        $locationRaw = $_POST['location'] ?? null;
        $location = null;
        if (!empty($locationRaw)) {
            $location = is_string($locationRaw) ? json_decode($locationRaw, true) : $locationRaw;
        }

        $commentId = generateId();
        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/task-comment-attachments';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        dbTransaction(function() use ($commentId, $taskId, $user, $bodyText, $location, $uploadDir) {
            dbInsert('TaskComment', [
                'id'            => $commentId,
                'taskId'        => $taskId,
                'authorId'      => $user['sub'],
                'body'          => $bodyText,
                'locationLat'   => isset($location['lat']) ? (float)$location['lat'] : null,
                'locationLng'   => isset($location['lng']) ? (float)$location['lng'] : null,
                'locationLabel' => isset($location['label']) ? trim($location['label']) : null,
                'createdAt'     => date('Y-m-d H:i:s'),
                'updatedAt'     => date('Y-m-d H:i:s'),
            ]);

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
                            dbInsert('TaskCommentAttachment', [
                                'id'               => generateId(),
                                'commentId'        => $commentId,
                                'url'              => "/uploads/task-comment-attachments/$newFilename",
                                'originalFilename' => $origName,
                                'mimeType'         => $mime,
                                'sizeBytes'        => $size,
                                'createdAt'        => date('Y-m-d H:i:s'),
                                'updatedAt'        => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
        });

        // Fetch created comment
        $comment = dbFetchOne("
            SELECT c.*, u.`firstName`, u.`lastName`, u.`email`, u.`role`
            FROM `TaskComment` c
            LEFT JOIN `User` u ON u.`id` = c.`authorId`
            WHERE c.`id` = :id
        ", ['id' => $commentId]);

        $attachments = dbFetchAll("SELECT * FROM `TaskCommentAttachment` WHERE `commentId` = :id", ['id' => $commentId]);

        $loc = null;
        if ($comment['locationLat'] !== null && $comment['locationLng'] !== null) {
            $loc = [
                'lat'   => (float)$comment['locationLat'],
                'lng'   => (float)$comment['locationLng'],
                'label' => $comment['locationLabel'] ?? null,
            ];
        }

        jsonResponse([
            'success' => true,
            'data'    => [
                'id'          => $comment['id'],
                'taskId'      => $comment['taskId'],
                'body'        => $comment['body'],
                'attachments' => array_map(fn($a) => [
                    'url'              => $a['url'],
                    'originalFilename' => $a['originalFilename'],
                    'mimeType'         => $a['mimeType'],
                    'sizeBytes'        => (int)$a['sizeBytes'],
                ], $attachments),
                'location'    => $loc,
                'authorId'    => [
                    'id'        => $user['sub'],
                    'firstName' => $comment['firstName'] ?? '',
                    'lastName'  => $comment['lastName'] ?? null,
                    'email'     => $comment['email'] ?? '',
                    'role'      => $comment['role'] ?? '',
                ],
                'createdAt'   => $comment['createdAt'],
                'updatedAt'   => $comment['updatedAt'],
            ]
        ], 201);
    }
}
