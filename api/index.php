<?php
/**
 * TaskMatrix - Main Front Controller and Router for PHP Backend
 * tasks.vjsconnect.com
 */

// Error reporting
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

// Load configurations & core files
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/middleware.php';

// Load controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/StoreController.php';
require_once __DIR__ . '/controllers/DepartmentController.php';
require_once __DIR__ . '/controllers/CategoryController.php';
require_once __DIR__ . '/controllers/TaskController.php';
require_once __DIR__ . '/controllers/TaskChecklistController.php';
require_once __DIR__ . '/controllers/TaskCommentController.php';
require_once __DIR__ . '/controllers/TicketController.php';
require_once __DIR__ . '/controllers/TicketChecklistController.php';
require_once __DIR__ . '/controllers/TicketAttachmentController.php';
require_once __DIR__ . '/controllers/ChecklistTemplateController.php';
require_once __DIR__ . '/controllers/ChecklistDefinitionController.php';
require_once __DIR__ . '/controllers/ChecklistInstanceController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/EventController.php';
require_once __DIR__ . '/controllers/TodoController.php';
require_once __DIR__ . '/controllers/ProjectController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/SmartTaskController.php';

// Handle CORS
handleCors();

// Extract HTTP Method & Path
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';

// Normalize path: strip query string and /api prefix
$path = parse_url($uri, PHP_URL_PATH) ?? '/';

// Remove base path prefixes like /taskmetrics/api or /api
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$scriptDir = dirname($scriptName);
if ($scriptDir !== '/' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir));
}
if (str_starts_with($path, '/api')) {
    $path = substr($path, 4);
}
$path = '/' . ltrim($path, '/');
$path = rtrim($path, '/');
if ($path === '') $path = '/';

// Router matcher helper
function matchRoute(string $routePattern, string $path, array &$params): bool {
    $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $routePattern);
    $pattern = "#^" . $pattern . "$#";
    if (preg_match($pattern, $path, $matches)) {
        $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        return true;
    }
    return false;
}

$params = [];

try {
    // Health check
    if ($method === 'GET' && ($path === '/health' || $path === '/')) {
        jsonResponse(['status' => 'ok', 'app' => 'TaskMatrix API (PHP)', 'version' => '1.0.0']);
    }

    // ----------------------------------------------------
    // Auth Routes
    // ----------------------------------------------------
    if ($method === 'POST' && $path === '/auth/login') { AuthController::login(); }
    if ($method === 'POST' && $path === '/auth/register') { AuthController::register(); }
    if ($method === 'POST' && $path === '/auth/refresh') { AuthController::refresh(); }
    if ($method === 'POST' && $path === '/auth/logout') { AuthController::logout(); }
    if ($method === 'POST' && $path === '/auth/forgot-password') { AuthController::forgotPassword(); }
    if ($method === 'POST' && $path === '/auth/reset-password') { AuthController::resetPassword(); }
    if ($method === 'GET' && $path === '/auth/me') { AuthController::me(); }

    // ----------------------------------------------------
    // User Routes
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/users/assignable') { UserController::getAssignable(); }
    if ($method === 'GET' && $path === '/users') { UserController::getAll(); }
    if ($method === 'POST' && $path === '/users') { UserController::create(); }
    if ($method === 'GET' && matchRoute('/users/{id}', $path, $params)) { UserController::getOne($params['id']); }
    if ($method === 'PATCH' && matchRoute('/users/{id}', $path, $params)) { UserController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/users/{id}', $path, $params)) { UserController::delete($params['id']); }

    // ----------------------------------------------------
    // Store Routes
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/stores') { StoreController::getAll(); }
    if ($method === 'POST' && $path === '/stores') { StoreController::create(); }
    if ($method === 'PATCH' && matchRoute('/stores/{id}', $path, $params)) { StoreController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/stores/{id}', $path, $params)) { StoreController::delete($params['id']); }

    // ----------------------------------------------------
    // Department Routes
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/departments') { DepartmentController::getAll(); }
    if ($method === 'POST' && $path === '/departments') { DepartmentController::create(); }
    if ($method === 'PATCH' && matchRoute('/departments/{id}', $path, $params)) { DepartmentController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/departments/{id}', $path, $params)) { DepartmentController::delete($params['id']); }

    // ----------------------------------------------------
    // Category Routes
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/categories') { CategoryController::getAll(); }
    if ($method === 'POST' && $path === '/categories') { CategoryController::create(); }
    if ($method === 'PATCH' && matchRoute('/categories/{id}', $path, $params)) { CategoryController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/categories/{id}', $path, $params)) { CategoryController::delete($params['id']); }

    // ----------------------------------------------------
    // Task AI & Reports Routes
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/tasks/reports/compliance') { TaskController::complianceReport(); }
    if ($method === 'POST' && $path === '/tasks/ai/parse') { SmartTaskController::parseSmart(); }
    if ($method === 'POST' && $path === '/tasks/ai/create') { SmartTaskController::createFromSmart(); }

    // ----------------------------------------------------
    // Task Sub-resources
    // ----------------------------------------------------
    if ($method === 'GET' && matchRoute('/tasks/{id}/comments', $path, $params)) { TaskCommentController::list($params['id']); }
    if ($method === 'POST' && matchRoute('/tasks/{id}/comments', $path, $params)) { TaskCommentController::create($params['id']); }
    if ($method === 'POST' && matchRoute('/tasks/{id}/checklists', $path, $params)) { TaskChecklistController::createChecklist($params['id']); }
    if ($method === 'POST' && matchRoute('/tasks/{taskId}/checklists/from-template/{templateId}', $path, $params)) { TaskChecklistController::applyTemplate($params['taskId'], $params['templateId']); }
    if ($method === 'POST' && matchRoute('/tasks/{id}/attachments', $path, $params)) { TaskController::uploadAttachments($params['id']); }
    if ($method === 'PATCH' && matchRoute('/tasks/{id}/verify', $path, $params)) { TaskController::verify($params['id']); }

    // ----------------------------------------------------
    // Task CRUD
    // ----------------------------------------------------
    if ($method === 'GET' && matchRoute('/tasks/{id}', $path, $params)) { TaskController::getOne($params['id']); }
    if ($method === 'PATCH' && matchRoute('/tasks/{id}', $path, $params)) { TaskController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/tasks/{id}', $path, $params)) { TaskController::delete($params['id']); }
    if ($method === 'GET' && $path === '/tasks') { TaskController::getAll(); }
    if ($method === 'POST' && $path === '/tasks') { TaskController::create(); }

    // ----------------------------------------------------
    // Task Checklists & Attachments CRUD
    // ----------------------------------------------------
    if ($method === 'DELETE' && matchRoute('/task-checklists/{id}', $path, $params)) { TaskChecklistController::deleteChecklist($params['id']); }
    if ($method === 'PATCH' && matchRoute('/task-checklist-items/{id}/remarks', $path, $params)) { TaskChecklistController::updateRemarks($params['id']); }
    if ($method === 'POST' && matchRoute('/task-checklist-items/{id}/complete', $path, $params)) { TaskChecklistController::completeItem($params['id']); }
    if ($method === 'POST' && matchRoute('/task-checklist-items/{id}/images', $path, $params)) { TaskChecklistController::uploadImages($params['id']); }
    if ($method === 'PATCH' && matchRoute('/task-checklist-items/{id}', $path, $params)) { TaskChecklistController::updateItem($params['id']); }
    if ($method === 'DELETE' && matchRoute('/task-checklist-items/{id}', $path, $params)) { TaskChecklistController::deleteItem($params['id']); }
    if ($method === 'DELETE' && matchRoute('/task-images/{id}', $path, $params)) { TaskChecklistController::deleteImage($params['id']); }
    if ($method === 'DELETE' && matchRoute('/task-attachments/{id}', $path, $params)) { TaskController::deleteAttachment($params['id']); }

    // ----------------------------------------------------
    // Ticket Reports & Sub-resources
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/tickets/reports/tat') { TicketController::tatReport(); }
    if ($method === 'POST' && matchRoute('/tickets/{id}/status-updates', $path, $params)) { TicketController::addStatusUpdate($params['id']); }
    if ($method === 'POST' && matchRoute('/tickets/{id}/attachments', $path, $params)) { TicketAttachmentController::uploadAttachments($params['id']); }
    if ($method === 'POST' && matchRoute('/tickets/{id}/comments', $path, $params)) { TicketController::addComment($params['id']); }
    if ($method === 'POST' && matchRoute('/tickets/{id}/checklists', $path, $params)) { TicketChecklistController::addChecklist($params['id']); }
    if ($method === 'POST' && matchRoute('/tickets/{ticketId}/checklists/from-template/{templateId}', $path, $params)) { TicketChecklistController::applyTemplate($params['ticketId'], $params['templateId']); }
    if ($method === 'PATCH' && matchRoute('/tickets/{id}/verify', $path, $params)) { TicketController::verify($params['id']); }

    // ----------------------------------------------------
    // Ticket CRUD
    // ----------------------------------------------------
    if ($method === 'GET' && matchRoute('/tickets/{id}', $path, $params)) { TicketController::getOne($params['id']); }
    if ($method === 'PATCH' && matchRoute('/tickets/{id}', $path, $params)) { TicketController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/tickets/{id}', $path, $params)) { TicketController::delete($params['id']); }
    if ($method === 'GET' && $path === '/tickets') { TicketController::getAll(); }
    if ($method === 'POST' && $path === '/tickets') { TicketController::create(); }

    // ----------------------------------------------------
    // Ticket Checklists & Attachments CRUD
    // ----------------------------------------------------
    if ($method === 'DELETE' && matchRoute('/checklists/{id}', $path, $params)) { TicketChecklistController::deleteChecklist($params['id']); }
    if ($method === 'PATCH' && matchRoute('/checklist-items/{id}/remarks', $path, $params)) { TicketChecklistController::updateRemarks($params['id']); }
    if ($method === 'POST' && matchRoute('/checklist-items/{id}/complete', $path, $params)) { TicketChecklistController::completeItem($params['id']); }
    if ($method === 'POST' && matchRoute('/checklist-items/{id}/images', $path, $params)) { TicketChecklistController::uploadImages($params['id']); }
    if ($method === 'PATCH' && matchRoute('/checklist-items/{id}', $path, $params)) { TicketChecklistController::updateItem($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-items/{id}', $path, $params)) { TicketChecklistController::deleteItem($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-images/{id}', $path, $params)) { TicketChecklistController::deleteImage($params['id']); }
    if ($method === 'DELETE' && matchRoute('/ticket-attachments/{id}', $path, $params)) { TicketAttachmentController::deleteAttachment($params['id']); }

    // ----------------------------------------------------
    // Checklist Templates
    // ----------------------------------------------------
    if ($method === 'POST' && matchRoute('/checklist-templates/{id}/items', $path, $params)) { ChecklistTemplateController::addItem($params['id']); }
    if ($method === 'GET' && matchRoute('/checklist-templates/{id}', $path, $params)) { ChecklistTemplateController::getOne($params['id']); }
    if ($method === 'PATCH' && matchRoute('/checklist-templates/{id}', $path, $params)) { ChecklistTemplateController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-templates/{id}', $path, $params)) { ChecklistTemplateController::delete($params['id']); }
    if ($method === 'GET' && $path === '/checklist-templates') { ChecklistTemplateController::getAll(); }
    if ($method === 'POST' && $path === '/checklist-templates') { ChecklistTemplateController::create(); }
    if ($method === 'PATCH' && matchRoute('/checklist-template-items/{id}', $path, $params)) { ChecklistTemplateController::updateItem($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-template-items/{id}', $path, $params)) { ChecklistTemplateController::deleteItem($params['id']); }

    // ----------------------------------------------------
    // Checklist Definitions (Recurring Builder)
    // ----------------------------------------------------
    if ($method === 'PATCH' && matchRoute('/checklist-definitions/{id}/active', $path, $params)) { ChecklistDefinitionController::setActive($params['id']); }
    if ($method === 'GET' && matchRoute('/checklist-definitions/{id}', $path, $params)) { ChecklistDefinitionController::getOne($params['id']); }
    if ($method === 'PUT' && matchRoute('/checklist-definitions/{id}', $path, $params)) { ChecklistDefinitionController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-definitions/{id}', $path, $params)) { ChecklistDefinitionController::remove($params['id']); }
    if ($method === 'GET' && $path === '/checklist-definitions') { ChecklistDefinitionController::getAll(); }
    if ($method === 'POST' && $path === '/checklist-definitions') { ChecklistDefinitionController::create(); }

    // ----------------------------------------------------
    // Checklist Instances (Scheduled Execution)
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/checklist-instances/mine') { ChecklistInstanceController::getMine(); }
    if ($method === 'GET' && $path === '/checklist-instances/pending-verification') { ChecklistInstanceController::getPendingVerification(); }
    if ($method === 'GET' && $path === '/checklist-instances/reports/compliance') { ChecklistInstanceController::complianceReport(); }
    if ($method === 'PATCH' && matchRoute('/checklist-instances/{id}/verify', $path, $params)) { ChecklistInstanceController::verify($params['id']); }
    if ($method === 'GET' && matchRoute('/checklist-instances/{id}', $path, $params)) { ChecklistInstanceController::getOne($params['id']); }
    if ($method === 'GET' && $path === '/checklist-instances') { ChecklistInstanceController::getForDefinition(); }

    if ($method === 'PATCH' && matchRoute('/checklist-instance-items/{id}', $path, $params)) { ChecklistInstanceController::setItemDone($params['id']); }
    if ($method === 'POST' && matchRoute('/checklist-instance-items/{id}/images', $path, $params)) { ChecklistInstanceController::uploadImages($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-instance-images/{id}', $path, $params)) { ChecklistInstanceController::deleteImage($params['id']); }

    // Auditor Submissions
    if ($method === 'PATCH' && matchRoute('/checklist-instance-item-submissions/{id}/accessories', $path, $params)) { ChecklistInstanceController::updateSubmissionAccessories($params['id']); }
    if ($method === 'PATCH' && matchRoute('/checklist-instance-item-submissions/{id}/remarks', $path, $params)) { ChecklistInstanceController::updateSubmissionRemarks($params['id']); }
    if ($method === 'POST' && matchRoute('/checklist-instance-item-submissions/{id}/images', $path, $params)) { ChecklistInstanceController::uploadSubmissionImages($params['id']); }
    if ($method === 'PATCH' && matchRoute('/checklist-instance-item-submissions/{id}', $path, $params)) { ChecklistInstanceController::setSubmissionDone($params['id']); }
    if ($method === 'DELETE' && matchRoute('/checklist-instance-item-submission-images/{id}', $path, $params)) { ChecklistInstanceController::deleteSubmissionImage($params['id']); }

    // ----------------------------------------------------
    // Notifications
    // ----------------------------------------------------
    if ($method === 'PATCH' && $path === '/notifications/read-all') { NotificationController::markAllRead(); }
    if ($method === 'PATCH' && matchRoute('/notifications/{id}/read', $path, $params)) { NotificationController::markRead($params['id']); }
    if ($method === 'GET' && $path === '/notifications') { NotificationController::getAll(); }

    // ----------------------------------------------------
    // Reports Export
    // ----------------------------------------------------
    if ($method === 'GET' && matchRoute('/reports/{module}/export', $path, $params)) { ReportController::export($params['module']); }

    // ----------------------------------------------------
    // Events
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/events/upcoming') { EventController::getUpcoming(); }
    if ($method === 'GET' && $path === '/events') { EventController::getAll(); }
    if ($method === 'POST' && $path === '/events') { EventController::create(); }
    if ($method === 'PATCH' && matchRoute('/events/{id}', $path, $params)) { EventController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/events/{id}', $path, $params)) { EventController::delete($params['id']); }

    // ----------------------------------------------------
    // Todos
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/todos') { TodoController::getAll(); }
    if ($method === 'POST' && $path === '/todos') { TodoController::create(); }
    if ($method === 'PATCH' && matchRoute('/todos/{id}', $path, $params)) { TodoController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/todos/{id}', $path, $params)) { TodoController::delete($params['id']); }

    // ----------------------------------------------------
    // Projects
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/projects') { ProjectController::getAll(); }
    if ($method === 'POST' && $path === '/projects') { ProjectController::create(); }
    if ($method === 'GET' && matchRoute('/projects/{id}', $path, $params)) { ProjectController::getOne($params['id']); }
    if ($method === 'PATCH' && matchRoute('/projects/{id}', $path, $params)) { ProjectController::update($params['id']); }
    if ($method === 'DELETE' && matchRoute('/projects/{id}', $path, $params)) { ProjectController::delete($params['id']); }

    // ----------------------------------------------------
    // Settings
    // ----------------------------------------------------
    if ($method === 'GET' && $path === '/settings') { SettingsController::get(); }
    if ($method === 'PATCH' && $path === '/settings') { SettingsController::update(); }

    // ----------------------------------------------------
    // Smart Task Conversations
    // ----------------------------------------------------
    if ($method === 'GET' && matchRoute('/smart-task-conversations/{id}', $path, $params)) { SmartTaskController::getConversation($params['id']); }
    if ($method === 'PATCH' && matchRoute('/smart-task-conversations/{id}', $path, $params)) { SmartTaskController::patchConversation($params['id']); }
    if ($method === 'DELETE' && $path === '/smart-task-conversations') { SmartTaskController::deleteAllConversations(); }
    if ($method === 'GET' && $path === '/smart-task-conversations') { SmartTaskController::listConversations(); }
    if ($method === 'POST' && $path === '/smart-task-conversations') { SmartTaskController::createConversation(); }

    // 404 Fallback
    errorResponse("Route not found: [$method] $path", 404);

} catch (Throwable $e) {
    errorResponse($e->getMessage(), 500);
}
