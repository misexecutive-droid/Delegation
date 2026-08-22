<?php
/**
 * EventController - Announcements, Deadlines, Broadcasts
 */

class EventController {
    private static function populateEvents(array $events): array {
        return array_map(function($e) {
            return [
                'id'          => $e['id'],
                'title'       => $e['title'],
                'description' => $e['description'],
                'type'        => $e['type'],
                'eventDate'   => $e['eventDate'],
                'createdBy'   => [
                    'id'        => $e['createdBy'],
                    'firstName' => $e['firstName'] ?? '',
                    'lastName'  => $e['lastName'] ?? null,
                ],
                'createdAt'   => $e['createdAt'],
            ];
        }, $events);
    }

    public static function getAll(): void {
        requireAuth();
        $events = dbFetchAll("
            SELECT e.*, u.`firstName`, u.`lastName`
            FROM `Event` e
            LEFT JOIN `User` u ON u.`id` = e.`createdBy`
            ORDER BY e.`eventDate` ASC
        ");

        jsonResponse(['success' => true, 'data' => self::populateEvents($events)]);
    }

    public static function getUpcoming(): void {
        requireAuth();
        $limit = max(1, min(20, (int)($_GET['limit'] ?? 5)));
        $now = date('Y-m-d H:i:s');

        $events = dbFetchAll("
            SELECT e.*, u.`firstName`, u.`lastName`
            FROM `Event` e
            LEFT JOIN `User` u ON u.`id` = e.`createdBy`
            WHERE e.`eventDate` >= :now
            ORDER BY e.`eventDate` ASC
            LIMIT $limit
        ", ['now' => $now]);

        jsonResponse(['success' => true, 'data' => self::populateEvents($events)]);
    }

    public static function create(): void {
        $user = requireRole(['ADMIN', 'MANAGER', 'PC', 'SENIOR']);
        $body = getRequestBody();

        $title = trim($body['title'] ?? '');
        $eventDate = !empty($body['eventDate']) ? date('Y-m-d H:i:s', strtotime($body['eventDate'])) : null;

        if (empty($title) || empty($eventDate)) {
            errorResponse('Title and eventDate are required', 400);
        }

        $id = generateId();
        dbInsert('Event', [
            'id'          => $id,
            'title'       => $title,
            'description' => trim($body['description'] ?? '') ?: null,
            'type'        => in_array($body['type'] ?? '', ['DEADLINE', 'ANNOUNCEMENT', 'BROADCAST']) ? $body['type'] : 'ANNOUNCEMENT',
            'eventDate'   => $eventDate,
            'createdBy'   => $user['sub'],
            'createdAt'   => date('Y-m-d H:i:s'),
            'updatedAt'   => date('Y-m-d H:i:s'),
        ]);

        $created = dbFetchAll("
            SELECT e.*, u.`firstName`, u.`lastName`
            FROM `Event` e
            LEFT JOIN `User` u ON u.`id` = e.`createdBy`
            WHERE e.`id` = :id
        ", ['id' => $id]);

        jsonResponse(['success' => true, 'data' => self::populateEvents($created)[0] ?? null], 201);
    }

    public static function update(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC', 'SENIOR']);
        $body = getRequestBody();
        $existing = dbFetchOne("SELECT * FROM `Event` WHERE `id` = :id LIMIT 1", ['id' => $id]);
        if (!$existing) {
            errorResponse('Event not found', 404);
        }

        $update = ['updatedAt' => date('Y-m-d H:i:s')];
        if (isset($body['title'])) $update['title'] = trim($body['title']);
        if (array_key_exists('description', $body)) $update['description'] = trim($body['description'] ?? '') ?: null;
        if (isset($body['type'])) $update['type'] = $body['type'];
        if (array_key_exists('eventDate', $body)) $update['eventDate'] = !empty($body['eventDate']) ? date('Y-m-d H:i:s', strtotime($body['eventDate'])) : null;

        dbUpdate('Event', $update, "`id` = :id", ['id' => $id]);

        $updated = dbFetchAll("
            SELECT e.*, u.`firstName`, u.`lastName`
            FROM `Event` e
            LEFT JOIN `User` u ON u.`id` = e.`createdBy`
            WHERE e.`id` = :id
        ", ['id' => $id]);

        jsonResponse(['success' => true, 'data' => self::populateEvents($updated)[0] ?? null]);
    }

    public static function delete(string $id): void {
        requireRole(['ADMIN', 'MANAGER', 'PC', 'SENIOR']);
        dbDelete('Event', "`id` = :id", ['id' => $id]);
        jsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }
}
