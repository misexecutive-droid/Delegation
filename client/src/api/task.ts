import { z } from 'zod';
import { apiFetch } from './http';
import { arrayField, withArrayDefaults, normalizeWith } from './normalize';
import { taskChecklistDefaults, type TaskChecklist } from './taskChecklist';

export type TaskAttachment = {
    id:               string;
    url:              string;
    originalFilename: string | null;
    mimeType:         string;
    sizeBytes:        number;
    taskId:           string;
    uploadedBy:       { id: string; email: string; firstName: string; role: string } | null;
    createdAt:        string;
};

export type TaskStatusUpdate = {
    id:            string;
    taskId:        string;
    fromStatus:    Task['status'];
    toStatus:      Task['status'];
    remark:        string;
    changedBy:     string;
    changedByUser: { id: string; email: string; firstName: string; role: string } | null;
    createdAt:     string;
};

export type Task = {
    id:           string;
    title:        string;
    description:  string | null;
    status:       'todo' | 'in_progress' | 'pending_verification' | 'done';
    category :    'issue' | 'delegation';
    priority:     'low' | 'medium' | 'high';
    startDate:    string | null;
    dueDate:      string | null;
    reminderMinutesBefore: number | null;
    reminderChannel: 'notification' | 'alarm' | 'email' | 'sms';
    projectId:    string | null;
    assigneeId:   string | null;
    // Extra people beyond the primary assigneeId — see Task.ts model for why they're separate.
    additionalAssigneeIds: string[];
    departmentId: string | null;
    userId:       string;
    createdAt:    string;
    updatedAt:    string;
    verifiedBy:       string | null;
    verifiedAt:       string | null;
    verificationNote: string | null;
    aiMeta?: {
        rawInput : string;
        inputMode : "voice" | "text";
        channel : "whatsapp" | "web";
        extractedAssigneeName : string | null;
        extractedDepartment : string | null;
        confidence : number | null;
        model : string | null;
    } | null;
    checklists?:  TaskChecklist[];
    attachments?: TaskAttachment[];
    /** Newest first. Only the detail endpoint returns these — list responses omit them. */
    statusUpdates?: TaskStatusUpdate[];
};

export type CreateTaskPayload = {
    title:         string;
    description?:  string;
    status?:       Task['status'];
    priority?:     Task['priority'];
    startDate?:    string;
    dueDate?:      string;
    reminderMinutesBefore?: number;
    reminderChannel?: Task['reminderChannel'];
    projectId?:    string;
    assigneeId?:   string;
    additionalAssigneeIds?: string[];
    departmentId?: string;
};


export type SmartTaskParseResult = {
    title : string;
    context : string;
    category : "issue" | "delegated_task";
    assignee : { id : string ; name : string} | null;
    assigneeRaw : string;
    departmentRaw : string;
    dueDate : string;
    priority : Task["priority"];
    confidence : number;
    wonBy : string;
    rawInput : string;
};

export type ConfirmSmartTaskPayload = {
    title : string;
    context? : string;
    category : "issue" | "delegated_task";
    priority : Task["priority"];
    dueDate : string;
    assigneeId? : string;
    departmentId? : string;
    assigneeRaw? : string;
    departmentRaw?: string;
    confidence?:number;
    rawInput:string;
    inputMode : "voice" | "text";
    wonBy? : string;
    channel: "whatsapp" | "web";
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'assigneeId' | 'departmentId' | 'reminderMinutesBefore'>> & {
    assigneeId?: string | null;
    departmentId?: string | null;
    reminderMinutesBefore?: number | null;
    /** Required by the server whenever `status` differs from what's stored. */
    statusRemark?: string;
};

export type VerifyTaskPayload = { action: 'APPROVE' | 'REJECT'; note?: string };

export type ComplianceReportRow = {
    bucket: string;
    totalItems: number;
    doneItems: number;
    completionRate: number | null;
    itemsRequiringPhotos: number;
    qualityRate: number | null;
};

export type ApiResponse<T> = { success: boolean; data: T };

// additionalAssigneeIds is the field that actually crashed the dashboard (spread of an undefined
// value) — checklists/attachments are the same "typed as always-present" shape and just haven't
// bitten yet, so they're guarded the same way rather than waiting for their own crash report.
const taskArrayDefaults = withArrayDefaults({
    additionalAssigneeIds: arrayField(z.string()),
    // Nested via taskChecklistDefaults, not a bare arrayField(z.unknown()) — a checklist that's
    // present but missing its own `items` (or an item missing its `images`) is exactly the shape
    // that crashed ChecklistBlock's `checklist.items.filter(...)` before this was added.
    checklists: arrayField(taskChecklistDefaults).optional(),
    attachments: arrayField(z.unknown()).optional(),
    statusUpdates: arrayField(z.unknown()).optional(),
});
const normalizeTask = (raw: unknown) => normalizeWith<Task>(taskArrayDefaults, raw);

export const taskApi = {
    getAll: (userId?: string, status?: Task['status']) => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (status) params.set('status', status);
        const qs = params.toString();
        return apiFetch<ApiResponse<Task[]>>(qs ? `/tasks?${qs}` : '/tasks').then(r => r.data.map(normalizeTask));
    },

    parseSmart: (text: string) =>
        apiFetch<SmartTaskParseResult>('/tasks/ai/parse', { method: 'POST', body: JSON.stringify({ text }) }),

    createFromSmart: (payload: ConfirmSmartTaskPayload) =>
        apiFetch<Task>('/tasks/ai/create', { method: 'POST', body: JSON.stringify(payload) }),

    transcribeVoiceNote: (audioBlob: Blob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-note.webm');
        return apiFetch<{ transcript: string }>('/tasks/ai/transcribe', { method: 'POST', body: formData });
    },

    getOne: (id: string) => apiFetch<ApiResponse<Task>>(`/tasks/${id}`).then(r => normalizeTask(r.data)),

    create: (payload: CreateTaskPayload) =>
        apiFetch<ApiResponse<Task>>('/tasks', { method: 'POST', body: JSON.stringify(payload) }).then(r => normalizeTask(r.data)),

    update: (id: string, payload: UpdateTaskPayload) =>
        apiFetch<ApiResponse<Task>>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(r => normalizeTask(r.data)),

    verify: (id: string, payload: VerifyTaskPayload) =>
        apiFetch<ApiResponse<Task>>(`/tasks/${id}/verify`, { method: 'PATCH', body: JSON.stringify(payload) }).then(r => normalizeTask(r.data)),

    delete: (id: string) =>
        apiFetch<ApiResponse<{ deleted: boolean }>>(`/tasks/${id}`, { method: 'DELETE' }),

    getComplianceReport: (groupBy: 'hour' | 'day' | 'week' | 'month' | 'year' = 'month', from?: string, to?: string, departmentId?: string, userId?: string) => {
        const params = new URLSearchParams({ groupBy });
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (departmentId) params.set('departmentId', departmentId);
        if (userId) params.set('userId', userId);
        return apiFetch<ApiResponse<ComplianceReportRow[]>>(`/tasks/reports/compliance?${params.toString()}`);
    },

    uploadAttachments: (taskId: string, files: File[]) => {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        return apiFetch<ApiResponse<TaskAttachment[]>>(`/tasks/${taskId}/attachments`, {
            method: 'POST',
            body:   formData,
        });
    },

    deleteAttachment: (id: string) =>
        apiFetch<ApiResponse<{ deleted: boolean }>>(`/task-attachments/${id}`, { method: 'DELETE' }),
};
