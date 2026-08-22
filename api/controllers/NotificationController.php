<?php
/**
 * NotificationController - In-app Notifications
 */

class NotificationController {
    public static function getAll(): void {
        $user = requireAuth();
        $notifs = dbFetchAll("
            SELECT * FROM `Notification` 
            WHERE `recipientId` = :uId 
            ORDER BY `createdAt` DESC 
            LIMIT 100
        ", ['uId' => $user['sub']]);

        $data = array_map(fn($n) => [
            'id'                  => $n['id'],
            'type'                => $n['type'],
            'title'               => $n['title'],
            'message'             => $n['message'],
            'ticketId'            => $n['ticketId'],
            'taskId'              => $n['taskId'],
            'checklistInstanceId' => $n['checklistInstanceId'],
            'isRead'              => (bool)$n['isRead'],
            'createdAt'           => $n['createdAt'],
        ], $notifs);

        jsonResponse(['success' => true, 'data' => $data]);
    }

    public static function markRead(string $id): void {
        $user = requireAuth();
        dbUpdate('Notification', [
            'isRead'    => 1,
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`id` = :id AND `recipientId` = :uId", ['id' => $id, 'uId' => $user['sub']]);

        $notif = dbFetchOne("SELECT * FROM `Notification` WHERE `id` = :id", ['id' => $id]);
        jsonResponse([
            'success' => true,
            'data'    => $notif ? [
                'id'                  => $notif['id'],
                'type'                => $notif['type'],
                'title'               => $notif['title'],
                'message'             => $notif['message'],
                'ticketId'            => $notif['ticketId'],
                'taskId'              => $notif['taskId'],
                'checklistInstanceId' => $notif['checklistInstanceId'],
                'isRead'              => (bool)$notif['isRead'],
                'createdAt'           => $notif['createdAt'],
            ] : null
        ]);
    }

    public static function markAllRead(): void {
        $user = requireAuth();
        dbUpdate('Notification', [
            'isRead'    => 1,
            'updatedAt' => date('Y-m-d H:i:s'),
        ], "`recipientId` = :uId AND `isRead` = 0", ['uId' => $user['sub']]);

        jsonResponse(['success' => true]);
    }
}
