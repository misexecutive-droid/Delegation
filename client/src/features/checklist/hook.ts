import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  checklistDefinitionApi,
  type CreateChecklistDefinitionPayload,
  type UpdateChecklistDefinitionPayload,
  type ListChecklistDefinitionsParams,
} from '../../api/checklistDefinitions';
import { checklistInstanceApi, type ChecklistInstance, type ChecklistInstanceStatus, type VerifyChecklistInstancePayload } from '../../api/checklistInstances';
import { checklistInstanceItemSubmissionApi } from '../../api/checklistInstanceItemSubmissions';
import type { ChecklistInstanceItemSubmissionAccessory } from '../../api/checklistInstances';
import type { CaptureMethod } from '../../api/ticket';
import { checklistBulkImportApi, type BulkImportPublishPayload } from '../../api/checklistBulkImport';
import { useEntityMutation, errorMessage, handleQueryRetry } from '../../lib/queryHelpers';

const KEYS = {
  definitions:            (filters: ListChecklistDefinitionsParams) => ['checklist-definitions', filters] as const,
  definitionDetail:       (id: string) => ['checklist-definitions', 'detail', id] as const,
  myInstances:            (status?: ChecklistInstanceStatus) => ['checklist-instances', 'mine', status ?? 'all'] as const,
  instanceDetail:         (id: string) => ['checklist-instances', 'detail', id] as const,
  instancesForDefinition: (definitionId: string) => ['checklist-instances', 'by-definition', definitionId] as const,
  instancesBoard:         (filter: { storeId?: string; assigneeId?: string; status?: ChecklistInstanceStatus }) =>
    ['checklist-instances', 'board', filter] as const,
};

export const useChecklistDefinitionsQuery = (filters: ListChecklistDefinitionsParams = {}) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEYS.definitions(filters),
    queryFn: () => checklistDefinitionApi.getAll(filters).then(r => r.data),
    enabled: !!token,
    retry: handleQueryRetry,
  });
};

export const useChecklistDefinitionQuery = (id: string) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEYS.definitionDetail(id),
    queryFn: () => checklistDefinitionApi.getOne(id).then(r => r.data),
    enabled: !!token && !!id,
    retry: handleQueryRetry,
  });
};

export const useCreateChecklistDefinitionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChecklistDefinitionPayload) =>
      checklistDefinitionApi.create(payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
      toast.success('Checklist created');
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to create checklist')),
  });
};

export const useUpdateChecklistDefinitionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateChecklistDefinitionPayload }) =>
      checklistDefinitionApi.update(id, payload).then(r => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.definitionDetail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
      toast.success('Checklist updated');
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to update checklist')),
  });
};

export const useSetChecklistDefinitionActiveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      checklistDefinitionApi.setActive(id, isActive).then(r => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(KEYS.definitionDetail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
      toast.success(updated.isActive ? 'Checklist resumed' : 'Checklist paused');
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to update checklist')),
  });
};

export const useDeleteChecklistDefinitionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checklistDefinitionApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] });
      toast.success('Checklist deleted');
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to delete checklist')),
  });
};

// Read-only — parses + matches the uploaded file but never writes anything, so no cache
// invalidation belongs here.
export const useChecklistBulkImportPreviewMutation = () =>
  useMutation({
    mutationFn: (file: File) => checklistBulkImportApi.preview(file).then(r => r.data),
    onError: (err) => toast.error(errorMessage(err, 'Failed to read that file')),
  });

export const useChecklistBulkImportPublishMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkImportPublishPayload) => checklistBulkImportApi.publish(payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] });
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to publish this batch')),
  });
};

/**
 * Counts straight from the database, instead of `useMyChecklistInstancesQuery().length`.
 *
 * The dashboard cards and the compliance board used to download every instance — items, images,
 * submissions and all — purely to count them. That is why those list endpoints had to stay
 * unbounded; this is what lets them paginate.
 */
export const useChecklistInstanceSummaryQuery = (
  filter: { mine?: boolean; storeId?: string; assigneeId?: string; definitionId?: string } = {},
) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['checklist-instances', 'summary', filter],
    queryFn: () => checklistInstanceApi.getSummary(filter).then(r => r.data),
    enabled: !!token,
    retry: handleQueryRetry,
  });
};

export const useMyChecklistInstancesQuery = (
  status?: ChecklistInstanceStatus,
  paging: { page?: number; limit?: number } = {},
) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: [...KEYS.myInstances(status), paging],
    queryFn: () => checklistInstanceApi.getMine(status, paging).then(r => r.data),
    enabled: !!token,
    retry: handleQueryRetry,
  });
};

export const useChecklistInstanceQuery = (id: string) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEYS.instanceDetail(id),
    queryFn: () => checklistInstanceApi.getOne(id).then(r => r.data),
    enabled: !!token && !!id,
    retry: handleQueryRetry,
  });
};

export const useInstancesForDefinitionQuery = (definitionId: string, paging: { page?: number; limit?: number } = {}) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEYS.instancesForDefinition(definitionId),
    queryFn: () => checklistInstanceApi.getForDefinition(definitionId, paging).then(r => r.data),
    enabled: !!token && !!definitionId,
    retry: handleQueryRetry,
  });
};

// Powers the admin Compliance Board — every generated instance matching whichever store/person/
// status filters are picked, across every checklist definition (not scoped to one, unlike
// useInstancesForDefinitionQuery above).
/** Returns the whole `{ data, meta }` page — the board needs `meta.totalPages` for its pager. */
export const useChecklistInstancesBoardQuery = (
  filter: { storeId?: string; assigneeId?: string; status?: ChecklistInstanceStatus; page?: number; limit?: number } = {},
) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEYS.instancesBoard(filter),
    queryFn: () => checklistInstanceApi.list(filter),
    enabled: !!token,
    retry: handleQueryRetry,
  });
};

type SetChecklistInstanceItemDoneVars = {
  itemId: string;
  isDone: boolean;
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
};

export const useSetChecklistInstanceItemDoneMutation = (instanceId: string) => {
  const queryClient = useQueryClient();
  const instanceKey = KEYS.instanceDetail(instanceId);

  return useMutation<unknown, unknown, SetChecklistInstanceItemDoneVars, { previous?: ChecklistInstance }>({
    mutationFn: ({ itemId, isDone, numericValue, booleanAnswer, textValue, dateValue, gpsLat, gpsLng, gpsAccuracy, signatureValue, secondSignatureValue, conditionalReasonValue, remarks }) =>
      checklistInstanceApi.setItemDone(itemId, isDone, {
        numericValue, booleanAnswer, textValue, dateValue, gpsLat, gpsLng, gpsAccuracy, signatureValue, secondSignatureValue, conditionalReasonValue, remarks,
      }).then(r => r.data),
    // Checking an item off (or filling in its answer) should reflect on the card immediately —
    // waiting on the round-trip made every tap feel laggy. Patch the cached instance's item now,
    // roll back in onError if the server rejects it.
    onMutate: async ({ itemId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: instanceKey });
      const previous = queryClient.getQueryData<ChecklistInstance>(instanceKey);
      if (previous) {
        queryClient.setQueryData<ChecklistInstance>(instanceKey, {
          ...previous,
          items: previous.items.map((item) =>
            item.id === itemId
              ? { ...item, ...patch, completedAt: patch.isDone ? new Date().toISOString() : null }
              : item,
          ),
        });
      }
      return { previous };
    },
    onSuccess: () => {
      // No success toast here — keeps checkbox-toggling snappy, matching
      // useUpdateChecklistItemMutation in tickets/hook.ts.
      queryClient.invalidateQueries({ queryKey: instanceKey });
      queryClient.invalidateQueries({ queryKey: ['checklist-instances', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-instances', 'by-definition'] });
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(instanceKey, context.previous);
      toast.error(errorMessage(err, 'Failed to update item'));
    },
  });
};

export const useUploadChecklistInstanceImagesMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: ({ itemId, files, captureMethod }: { itemId: string; files: File[]; captureMethod: CaptureMethod }) =>
      checklistInstanceApi.uploadImages(itemId, files, captureMethod).then(r => r.data),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    successMessage: 'Photos uploaded',
    errorFallback: 'Failed to upload photos',
  });

export const useDeleteChecklistInstanceImageMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: (id: string) => checklistInstanceApi.deleteImage(id),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    successMessage: 'Photo deleted',
    errorFallback: 'Failed to delete photo',
  });

// Mutations below act on one AUDIT item's per-auditor ChecklistInstanceItemSubmission (see
// ChecklistInstanceItemAuditCard.tsx) — all invalidate the same instance-detail key as the
// STANDARD-item mutations above, since a submission change also flips its parent item's derived
// isDone (and possibly the instance's verificationStatus) server-side.
export const useSetChecklistInstanceItemSubmissionDoneMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      checklistInstanceItemSubmissionApi.setDone(id, isDone).then(r => r.data),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    errorFallback: 'Failed to update submission',
  });

export const useUpdateChecklistInstanceItemSubmissionAccessoriesMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: ({ id, accessories }: { id: string; accessories: ChecklistInstanceItemSubmissionAccessory[] }) =>
      checklistInstanceItemSubmissionApi.updateAccessories(id, accessories).then(r => r.data),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    errorFallback: 'Failed to update accessories',
  });

export const useUpdateChecklistInstanceItemSubmissionRemarksMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string | null }) =>
      checklistInstanceItemSubmissionApi.updateRemarks(id, remarks).then(r => r.data),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    successMessage: 'Remarks saved',
    errorFallback: 'Failed to save remarks',
  });

export const useUploadChecklistInstanceItemSubmissionImagesMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: ({ submissionId, files, captureMethod }: { submissionId: string; files: File[]; captureMethod: CaptureMethod }) =>
      checklistInstanceItemSubmissionApi.uploadImages(submissionId, files, captureMethod).then(r => r.data),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    successMessage: 'Photos uploaded',
    errorFallback: 'Failed to upload photos',
  });

export const useDeleteChecklistInstanceItemSubmissionImageMutation = (instanceId: string) =>
  useEntityMutation({
    mutationFn: (id: string) => checklistInstanceItemSubmissionApi.deleteImage(id),
    invalidateKeys: [KEYS.instanceDetail(instanceId)],
    successMessage: 'Photo deleted',
    errorFallback: 'Failed to delete photo',
  });

// Powers the PC/Admin verification queue's Checklists section — instances with every item done,
// awaiting review. Scoped server-side (PC gets their own department, ADMIN gets every department).
export const usePendingVerificationChecklistInstancesQuery = (paging: { page?: number; limit?: number } = {}) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['checklist-instances', 'pending-verification', paging],
    queryFn: () => checklistInstanceApi.getPendingVerification(paging).then(r => r.data),
    enabled: !!token,
    retry: handleQueryRetry,
  });
};

export const useVerifyChecklistInstanceMutation = () =>
  useEntityMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VerifyChecklistInstancePayload }) =>
      checklistInstanceApi.verify(id, payload).then(r => r.data),
    setDetailData: (updated) => ({ key: KEYS.instanceDetail(updated.id), data: updated }),
    invalidateKeys: [['checklist-instances']],
    successMessage: (updated) => (updated.verificationStatus === 'APPROVED' ? 'Checklist verified' : 'Checklist sent back'),
    errorFallback: 'Failed to verify checklist',
  });

export { useDepartmentsQuery, useStoresQuery, useAssignableUsersQuery } from '../tickets/hook';
// Templates are a separate one-off feature (see ChecklistDefinition model comment), but the
// definition form lets admins import a template's step labels as a starting point.
export { useChecklistTemplatesQuery } from '../admin/hook';
