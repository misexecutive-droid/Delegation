<?php
/**
 * ReportController - CSV and Data Export for Tickets, Tasks, and Checklists
 */

class ReportController {
    public static function export(string $module): void {
        $user = requireAuth();
        $format = $_GET['format'] ?? 'csv';
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        $filename = "{$module}-export-" . date('Y-m-d') . ".csv";
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $output = fopen('php://output', 'w');
        // Add UTF-8 BOM for Excel compatibility
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

        if ($module === 'tickets') {
            fputcsv($output, ['ID', 'Title', 'Description', 'Status', 'Priority', 'TAT (Hours)', 'TAT Due At', 'Overdue', 'Created At', 'Closed At']);
            $where = [];
            $params = [];
            if ($from) {
                $where[] = "`createdAt` >= :from";
                $params['from'] = date('Y-m-d H:i:s', strtotime($from));
            }
            if ($to) {
                $where[] = "`createdAt` <= :to";
                $params['to'] = date('Y-m-d H:i:s', strtotime($to));
            }
            $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
            $rows = dbFetchAll("SELECT * FROM `Ticket` $whereSql ORDER BY `createdAt` DESC", $params);
            foreach ($rows as $r) {
                fputcsv($output, [
                    $r['id'],
                    $r['title'],
                    $r['description'],
                    $r['status'],
                    $r['priority'],
                    $r['tatHours'],
                    $r['tatDueAt'],
                    $r['isOverdue'] ? 'YES' : 'NO',
                    $r['createdAt'],
                    $r['closedAt'],
                ]);
            }
        } elseif ($module === 'tasks') {
            fputcsv($output, ['ID', 'Title', 'Description', 'Category', 'Priority', 'Status', 'Start Date', 'Due Date', 'Created At', 'Verified At']);
            $where = [];
            $params = [];
            if ($from) {
                $where[] = "`createdAt` >= :from";
                $params['from'] = date('Y-m-d H:i:s', strtotime($from));
            }
            if ($to) {
                $where[] = "`createdAt` <= :to";
                $params['to'] = date('Y-m-d H:i:s', strtotime($to));
            }
            if (!empty($_GET['category'])) {
                $where[] = "`category` = :cat";
                $params['cat'] = $_GET['category'];
            }
            if (!empty($_GET['status'])) {
                $where[] = "`status` = :st";
                $params['st'] = $_GET['status'];
            }
            $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
            $rows = dbFetchAll("SELECT * FROM `Task` $whereSql ORDER BY `createdAt` DESC", $params);
            foreach ($rows as $r) {
                fputcsv($output, [
                    $r['id'],
                    $r['title'],
                    $r['description'],
                    $r['category'],
                    $r['priority'],
                    $r['status'],
                    $r['startDate'],
                    $r['dueDate'],
                    $r['createdAt'],
                    $r['verifiedAt'],
                ]);
            }
        } elseif ($module === 'checklists') {
            fputcsv($output, ['Instance ID', 'Checklist Title', 'Recurrence', 'Store ID', 'Period Key', 'Period Start', 'Period End', 'Verification Status', 'Verified At']);
            $where = [];
            $params = [];
            if ($from) {
                $where[] = "`periodStart` >= :from";
                $params['from'] = date('Y-m-d H:i:s', strtotime($from));
            }
            if ($to) {
                $where[] = "`periodStart` <= :to";
                $params['to'] = date('Y-m-d H:i:s', strtotime($to));
            }
            $whereSql = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
            $rows = dbFetchAll("SELECT * FROM `ChecklistInstance` $whereSql ORDER BY `periodStart` DESC", $params);
            foreach ($rows as $r) {
                fputcsv($output, [
                    $r['id'],
                    $r['title'],
                    $r['recurrence'],
                    $r['storeId'],
                    $r['periodKey'],
                    $r['periodStart'],
                    $r['periodEnd'],
                    $r['verificationStatus'],
                    $r['verifiedAt'],
                ]);
            }
        }

        fclose($output);
        exit;
    }
}
