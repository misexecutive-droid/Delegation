<?php
/**
 * TicketAttachmentController - Ticket Attachments Upload & Deletion
 */

class TicketAttachmentController {
    public static function uploadAttachments(string $ticketId): void {
        $user = requireAuth();
        $ticket = dbFetchOne("SELECT `id` FROM `Ticket` WHERE `id` = :id LIMIT 1", ['id' => $ticketId]);
        if (!$ticket) {
            errorResponse('Ticket not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $uploadDir = $config['upload']['dir'] . '/ticket-attachments';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $createdAttachments = [];
        $files = $_FILES['images'] ?? $_FILES['files'] ?? null;

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
                        $url = "/uploads/ticket-attachments/$newFilename";

                        dbInsert('TicketAttachment', [
                            'id'               => $attId,
                            'url'              => $url,
                            'originalFilename' => $origName,
                            'sizeBytes'        => $size,
                            'mimeType'         => $mime,
                            'captureMethod'    => 'GALLERY',
                            'ticketId'         => $ticketId,
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
                            'captureMethod'    => 'GALLERY',
                            'ticketId'         => $ticketId,
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
        $att = dbFetchOne("SELECT * FROM `TicketAttachment` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$att) {
            errorResponse('Attachment not found', 404);
        }

        $config = require dirname(__DIR__) . '/config.php';
        $filePath = dirname(__DIR__, 2) . $att['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        dbDelete('TicketAttachment', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
