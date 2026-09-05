import { z } from 'zod';
import { apiFetch } from './http';
import { arrayField, withArrayDefaults, normalizeWith } from './normalize';
import type { ApiResponse, ChecklistRecurrence, ChecklistItemType, ChecklistConditionalAction } from './checklistDefinitions';
import type { CaptureMethod } from './ticket';

// OVERDUE is a subset of OPEN (unfinished and past its period end), matching the server's
// InstanceStatusFilter — it used to be applied client-side over the whole list.
export type ChecklistInstanceStatus = 'OPEN' | 'COMPLETED' | 'OVERDUE';
export type ChecklistVerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ChecklistInstanceImage = {
  id:                      string;
  url:                     string;
  originalFilename:        string | null;
  mimeType:                string;
  sizeBytes:               number;
  captureMethod:           CaptureMethod;
  checklistInstanceItemId: string;
  uploadedBy:              string;
  createdAt:               string;
};

export type ChecklistInstanceItemSubmissionImage = {
  id:             string;
  url:            string;
  originalFilename: string | null;
  mimeType:       string;
  sizeBytes:      number;
  captureMethod:  CaptureMethod;
  submissionId:   string;
  uploadedBy:     string;
  createdAt:      string;
};

export type ChecklistInstanceItemSubmissionAccessory = { name: string; checked: boolean };

// userId is always populated server-side (see checklistInstance.service.ts's populateInstance) so
// the UI can show the auditor's name and store without a separate lookup.
export type ChecklistInstanceItemSubmissionUser = {
  id:        string;
  firstName: string;
  lastName:  string | null;
  storeId:   string | null;
};

export type ChecklistInstanceItemSubmission = {
  id:          string;
  itemId:      string;
  userId:      ChecklistInstanceItemSubmissionUser;
  accessories: ChecklistInstanceItemSubmissionAccessory[];
  remarks:     string | null;
  isDone:      boolean;
  completedAt: string | null;
  images:      ChecklistInstanceItemSubmissionImage[];
};

export type ChecklistInstanceItem = {
  id:                 string;
  label:              string;
  order:              number;
  isDone:             boolean;
  completedAt:        string | null;
  completedBy:        string | null;
  requiredImageCount: number;
  maxImageCount:      number | null;
  requiresLivePhoto:  boolean;
  itemType:           ChecklistItemType;
  accessories:        string[];
  numberEntryUnit:    string | null;
  numberEntryMin:     number | null;
  numberEntryMax:     number | null;
  ratingScale:        number | null;
  numericValue:       number | null;
  options:            string[];
  booleanAnswer:      'YES' | 'NO' | null;
  textValue:          string | null;
  dateValue:          string | null;
  gpsTargetLat:       number | null;
  gpsTargetLng:       number | null;
  gpsRadiusMeters:    number | null;
  gpsLat:             number | null;
  gpsLng:             number | null;
  gpsAccuracy:        number | null;
  gpsCapturedAt:      string | null;
  signatureLabels:    string[];
  signatureValue:     string | null;
  secondSignatureValue: string | null;
  qrExpectedValue:    string | null;
  cashExpectedAmount: number | null;
  conditionalTrigger: 'YES' | 'NO' | null;
  conditionalActions: ChecklistConditionalAction[];
  conditionalReasonValue: string | null;
  remarks:            string | null;
  issueId:            string | null;
  instanceId:         string;
  images:             ChecklistInstanceImage[];
  submissions:        ChecklistInstanceItemSubmission[];
};

export type ChecklistInstance = {
  id:               string;
  definitionId:     string;
  title:            string;
  recurrence:       ChecklistRecurrence;
  storeId:          string;
  opensTime:        string | null;
  cutoffTime:       string | null;
  assigneeIds:      string[];
  periodKey:        string;
  periodStart:      string;
  periodEnd:        string;
  generatedAt:      string;
  verificationStatus: ChecklistVerificationStatus;
  verifiedBy:         string | null;
  verifiedAt:         string | null;
  verificationNote:   string | null;
  items:            ChecklistInstanceItem[];
};

export type VerifyChecklistInstancePayload = { action: 'APPROVE' | 'REJECT'; note?: string };

export type ComplianceReportGroupBy = 'hour' | 'day' | 'week' | 'month' | 'year';

// Same shape as task.ts's ComplianceReportRow — the recurring-checklist sibling report, bucketed
// by each instance's periodStart rather than item createdAt (see checklistInstance.service.ts).
export type ComplianceReportRow = {
  bucket: string;
  totalItems: number;
  doneItems: number;
  completionRate: number | null;
  itemsRequiringPhotos: number;
  qualityRate: number | null;
  // First-attempt-approval quality: of the instances actually submitted (reached PENDING/
  // APPROVED/REJECTED), what % were approved without ever having been rejected first. A reject
  // permanently disqualifies that instance from "first attempt," even once it's later fixed
  // and approved — mirrors qualityRate's per-item strictness at the instance level.
  submittedInstances: number;
  firstAttemptApproved: number;
  approvalRate: number | null;
};

// Accepts numbers too, since page/limit are numeric — they were being stringified at the call
// site before, which is easy to forget and silently drops the param.
const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
};

// assigneeIds/items are the fields this feature's own crash risk hinges on — TicketCard-style
// consumers (getChecklistProgress, instanceProgressStatus) iterate `.items` and the dashboard's
// Compliance card filters on `.assigneeIds`, both assuming an array that the type declares but a
// real response isn't guaranteed to include.
const checklistInstanceArrayDefaults = withArrayDefaults({
  assigneeIds: arrayField(z.string()),
  items: arrayField(z.unknown()),
});
const normalizeInstance = (raw: unknown) => normalizeWith<ChecklistInstance>(checklistInstanceArrayDefaults, raw);
const normalizeInstances = (raw: unknown[]) => raw.map(normalizeInstance);

/**
 * The three list endpoints now answer `{ success, data, meta }`. `page`/`limit` are optional and
 * the query stays unbounded when neither is sent, so `data` is unchanged for callers that don't
 * ask to paginate — `meta.total` is then simply the full count.
 */
export type ChecklistInstancePage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
};

type PageParams = { page?: number; limit?: number };

export type ChecklistInstanceSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  /** Across every item of every matching instance — powers completion-ratio gauges. */
  totalItems: number;
  doneItems: number;
};

export const checklistInstanceApi = {
  getMine: (status?: ChecklistInstanceStatus, paging: PageParams = {}) =>
    apiFetch<ApiResponse<ChecklistInstance[]> & { meta: ChecklistInstancePage }>(
      `/checklist-instances/mine${buildQuery({ status, ...paging })}`,
    ).then(r => ({ ...r, data: normalizeInstances(r.data) })),

  /**
   * The counts screens used to derive by downloading every instance and reducing in JS. Ask for
   * these instead of `.length`-ing a list — that pattern is why the list endpoints could not
   * paginate.
   */
  getSummary: (filter: { mine?: boolean; storeId?: string; assigneeId?: string; definitionId?: string } = {}) =>
    apiFetch<ApiResponse<ChecklistInstanceSummary>>(
      `/checklist-instances/summary${buildQuery({
        mine: filter.mine ? '1' : undefined,
        storeId: filter.storeId,
        assigneeId: filter.assigneeId,
        definitionId: filter.definitionId,
      })}`,
    ),

  getOne: (id: string) =>
    apiFetch<ApiResponse<ChecklistInstance>>(`/checklist-instances/${id}`)
      .then(r => ({ ...r, data: normalizeInstance(r.data) })),

  getForDefinition: (definitionId: string, paging: PageParams = {}) =>
    apiFetch<ApiResponse<ChecklistInstance[]> & { meta: ChecklistInstancePage }>(
      `/checklist-instances${buildQuery({ definitionId, ...paging })}`,
    ).then(r => ({ ...r, data: normalizeInstances(r.data) })),

  // Powers the compliance board — same endpoint as getForDefinition, generalized to whichever
  // combination of filters the admin has picked (store and/or person, plus status).
  list: (filter: { storeId?: string; assigneeId?: string; status?: ChecklistInstanceStatus } & PageParams = {}) =>
    apiFetch<ApiResponse<ChecklistInstance[]> & { meta: ChecklistInstancePage }>(
      `/checklist-instances${buildQuery(filter)}`,
    ).then(r => ({ ...r, data: normalizeInstances(r.data) })),

  getPendingVerification: (paging: PageParams = {}) =>
    apiFetch<ApiResponse<ChecklistInstance[]> & { meta: ChecklistInstancePage }>(
      `/checklist-instances/pending-verification${buildQuery(paging)}`,
    ).then(r => ({ ...r, data: normalizeInstances(r.data) })),

  setItemDone: (itemId: string, isDone: boolean, values?: {
    numericValue?: number;
    booleanAnswer?: 'YES' | 'NO';
    textValue?: string;
    dateValue?: string;
    gpsLat?: number;
    gpsLng?: number;
    gpsAccuracy?: number;
    signatureValue?: string;
    secondSignatureValue?: string;
    conditionalReasonValue?: string;
    remarks?: string;
  }) =>
    apiFetch<ApiResponse<ChecklistInstanceItem>>(`/checklist-instance-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDone, ...values }),
    }),

  verify: (id: string, payload: VerifyChecklistInstancePayload) =>
    apiFetch<ApiResponse<ChecklistInstance>>(`/checklist-instances/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then(r => ({ ...r, data: normalizeInstance(r.data) })),

  uploadImages: (itemId: string, files: File[], captureMethod: CaptureMethod) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    formData.append('captureMethod', captureMethod);
    return apiFetch<ApiResponse<ChecklistInstanceImage[]>>(`/checklist-instance-items/${itemId}/images`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteImage: (id: string) =>
    apiFetch<ApiResponse<{ deleted: boolean }>>(`/checklist-instance-images/${id}`, { method: 'DELETE' }),

  getComplianceReport: (groupBy: ComplianceReportGroupBy = 'month', storeId?: string, from?: string, to?: string) => {
    const params = new URLSearchParams({ groupBy });
    if (storeId) params.set('storeId', storeId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiFetch<ApiResponse<ComplianceReportRow[]>>(`/checklist-instances/reports/compliance?${params.toString()}`);
  },
};
