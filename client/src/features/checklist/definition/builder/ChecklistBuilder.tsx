import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Trash2, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, GradientIconTile, Breadcrumbs } from '../../../../components';
import { Badge } from '@/components/ui/badge';
import {
  useChecklistDefinitionQuery,
  useCreateChecklistDefinitionMutation,
  useUpdateChecklistDefinitionMutation,
} from '../../hook';
import { ChecklistDetailsFields } from '../form/ChecklistDetailsFields';
import { ImportFromTemplateField } from '../form/ImportFromTemplateField';
import { useChecklistTemplatesQuery } from '../../hook';
import { QuestionTypePalette } from './QuestionTypePalette';
import { isItemDraftComplete } from './ItemTypeConfigFields';
import { BuilderSchedulePanel } from './BuilderSchedulePanel';
import  {BuilderAssignPanel}  from './BuilderAssignPanel';
import { BuilderProofPanel } from './BuilderProofPanel';
import { BuilderStepper } from './wizard/BuilderStepper';
import { BuilderStepFrame } from './wizard/BuilderStepFrame';
import { BuilderReviewStep } from './wizard/BuilderReviewStep';
import { ChecklistDefinitionItemDraftRow, emptyItemDraft, type ItemDraft } from '../ChecklistDefinitionItemDraftRow';
import type {
  ChecklistRecurrence, ChecklistAssigneeRole, ChecklistProofType,
  ChecklistDefinitionItem, CreateChecklistDefinitionItemPayload,
} from '../../../../api/checklistDefinitions';

const toItemDraft = (item: ChecklistDefinitionItem): ItemDraft => ({
  label: item.label,
  requiredImageCount: String(item.requiredImageCount),
  maxImageCount: item.maxImageCount != null ? String(item.maxImageCount) : '',
  requiresLivePhoto: item.requiresLivePhoto,
  itemType: item.itemType,
  auditUserIds: item.auditUserIds,
  accessories: item.accessories,
  numberEntryUnit: item.numberEntryUnit ?? '',
  numberEntryMin: item.numberEntryMin != null ? String(item.numberEntryMin) : '',
  numberEntryMax: item.numberEntryMax != null ? String(item.numberEntryMax) : '',
  ratingScale: item.ratingScale != null ? String(item.ratingScale) : '5',
  options: item.options,
  gpsTargetLat: item.gpsTargetLat != null ? String(item.gpsTargetLat) : '',
  gpsTargetLng: item.gpsTargetLng != null ? String(item.gpsTargetLng) : '',
  gpsRadiusMeters: item.gpsRadiusMeters != null ? String(item.gpsRadiusMeters) : '',
  qrExpectedValue: item.qrExpectedValue ?? '',
  cashExpectedAmount: item.cashExpectedAmount != null ? String(item.cashExpectedAmount) : '',
  conditionalTrigger: item.conditionalTrigger ?? '',
  conditionalActions: item.conditionalActions ?? [],
});

const SIGNATURE_LABELS: Record<string, string[]> = {
  SIGNATURE: ['Signature'],
  DUAL_SIGNATURE: ['Employee', 'Supervisor'],
};

const buildItemPayloads = (itemDrafts: ItemDraft[]): CreateChecklistDefinitionItemPayload[] =>
  itemDrafts
    .filter(d => d.label.trim())
    .map(d => ({
      label: d.label.trim(),
      requiredImageCount: Number(d.requiredImageCount) || 0,
      maxImageCount: d.maxImageCount ? Number(d.maxImageCount) : undefined,
      requiresLivePhoto: d.requiresLivePhoto,
      itemType: d.itemType,
      ...(d.itemType === 'AUDIT' ? { auditUserIds: d.auditUserIds, accessories: d.accessories } : {}),
      ...(d.itemType === 'NUMBER_ENTRY' || d.itemType === 'CASH_TALLY' ? {
        numberEntryUnit: d.numberEntryUnit.trim() || undefined,
        numberEntryMin: d.numberEntryMin.trim() ? Number(d.numberEntryMin) : undefined,
        numberEntryMax: d.numberEntryMax.trim() ? Number(d.numberEntryMax) : undefined,
      } : {}),
      ...(d.itemType === 'RATING' ? { ratingScale: d.ratingScale.trim() ? Number(d.ratingScale) : undefined } : {}),
      ...(d.itemType === 'MULTIPLE_CHOICE' || d.itemType === 'DROPDOWN' ? { options: d.options } : {}),
      ...(d.itemType === 'GPS' ? {
        gpsTargetLat: d.gpsTargetLat.trim() ? Number(d.gpsTargetLat) : undefined,
        gpsTargetLng: d.gpsTargetLng.trim() ? Number(d.gpsTargetLng) : undefined,
        gpsRadiusMeters: d.gpsRadiusMeters.trim() ? Number(d.gpsRadiusMeters) : undefined,
      } : {}),
      ...(d.itemType === 'QR_SCAN' ? { qrExpectedValue: d.qrExpectedValue.trim() || undefined } : {}),
      ...(d.itemType === 'CASH_TALLY' ? { cashExpectedAmount: d.cashExpectedAmount.trim() ? Number(d.cashExpectedAmount) : undefined } : {}),
      ...(d.itemType === 'SIGNATURE' || d.itemType === 'DUAL_SIGNATURE' ? { signatureLabels: SIGNATURE_LABELS[d.itemType] } : {}),
      ...(d.conditionalTrigger && (d.itemType === 'YES_NO' || d.itemType === 'PASS_FAIL') ? {
        conditionalTrigger: d.conditionalTrigger,
        conditionalActions: d.conditionalActions,
      } : {}),
    }));

const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'items', label: 'Items' },
  { key: 'assign', label: 'Assign & Proof' },
  { key: 'review', label: 'Review' },
] as const;

// Shown next to the disabled Next button so it's clear *why* it's blocked, not just that it is.
const STEP_BLOCK_REASON: Record<number, string> = {
  0: 'Enter a checklist name to continue.',
  1: 'Select at least one store and a start date to continue.',
  2: 'Add at least one complete checklist item to continue.',
  3: 'Assign at least one team member to continue.',
};

export const ChecklistBuilder = () => {
  const { definitionId } = useParams();
  const isEditing = !!definitionId;
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const { data: existing, isPending: isLoadingExisting, isError: loadError } = useChecklistDefinitionQuery(definitionId ?? '');
  const { data: templates } = useChecklistTemplatesQuery();
  const createDefinition = useCreateChecklistDefinitionMutation();
  const updateDefinition = useUpdateChecklistDefinitionMutation();
  const mutation = isEditing ? updateDefinition : createDefinition;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<ChecklistRecurrence>('DAILY');
  const [startDate, setStartDate] = useState('');
  const [opensTime, setOpensTime] = useState('');
  const [cutoffTime, setCutoffTime] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeRoles, setAssigneeRoles] = useState<ChecklistAssigneeRole[]>([]);
  const [proofRequired, setProofRequired] = useState<ChecklistProofType[]>([]);
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [step, setStep] = useState(() => (definitionId ? STEPS.length - 1 : 0));
  const [maxStepReached, setMaxStepReached] = useState(step);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goToStep = (index: number) => {
    setDirection(index > step ? 1 : -1);
    setStep(index);
    setMaxStepReached(m => Math.max(m, index));
  };

  const [hydratedId, setHydratedId] = useState<string | undefined>(undefined);
  if (existing && hydratedId !== existing.id) {
    setHydratedId(existing.id);
    setName(existing.name);
    setDescription(existing.description ?? '');
    setStoreIds(existing.storeIds);
    setRecurrence(existing.recurrence);
    setStartDate(existing.startDate.slice(0, 10));
    setOpensTime(existing.opensTime ?? '');
    setCutoffTime(existing.cutoffTime ?? '');
    setAssigneeIds(existing.assigneeIds);
    setAssigneeRoles(existing.assigneeRoles);
    setProofRequired(existing.proofRequired);
    setItemDrafts(existing.items.map(toItemDraft));
  }

  const primaryStoreId = storeIds[0] ?? '';

  const updateDraft = (i: number, patch: Partial<ItemDraft>) =>
    setItemDrafts(drafts => drafts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addItem = (patch: Partial<ItemDraft>) =>
    setItemDrafts(drafts => [...drafts, { ...emptyItemDraft(), ...patch }]);

  const removeItem = (index: number) =>
    setItemDrafts(drafts => drafts.filter((_, i) => i !== index));

  const handleImportTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) return;
    setItemDrafts(drafts => [
      ...drafts.filter(d => d.label.trim()),
      ...template.items.map(item => ({
        ...emptyItemDraft(),
        label: item.label,
        requiredImageCount: String(item.requiredImageCount),
        maxImageCount: item.maxImageCount != null ? String(item.maxImageCount) : '',
        requiresLivePhoto: item.requiresLivePhoto,
      })),
    ]);
  };

  const items = buildItemPayloads(itemDrafts);
  const basicsValid = !!name.trim();
  const scheduleValid = storeIds.length > 0 && !!startDate;
  const itemsValid = items.length > 0 && itemDrafts.every(d => !d.label.trim() || isItemDraftComplete(d));
  const assignValid = assigneeIds.length > 0;
  const sectionValidity = [basicsValid, scheduleValid, itemsValid, assignValid] as const;
  const canSubmit = sectionValidity.every(Boolean);
  const isStepValid = (index: number) => (index < sectionValidity.length ? sectionValidity[index] : true);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      storeIds,
      recurrence,
      startDate: new Date(startDate).toISOString(),
      opensTime: opensTime || undefined,
      cutoffTime: cutoffTime || undefined,
      assigneeIds,
      assigneeRoles: assigneeRoles.length ? assigneeRoles : undefined,
      proofRequired: proofRequired.length ? proofRequired : undefined,
      items,
    };

    if (isEditing) {
      updateDefinition.mutate({ id: definitionId!, payload }, {
        onSuccess: (updated) => navigate(`/admin/scheduled-checklists/${updated.id}`),
      });
    } else {
      createDefinition.mutate(payload, {
        onSuccess: (created) => navigate(`/admin/scheduled-checklists/${created.id}`),
      });
    }
  };

  if (isEditing && isLoadingExisting) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isEditing && (loadError || !existing)) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-display shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>Failed to load this checklist. Please refresh or try again later.</span>
        </div>
      </div>
    );
  }

  const stepContent = [
    <BuilderStepFrame key="basics" stepIndex={step} title="Basics" description="Give this checklist a name your team will recognize.">
      <div className="max-w-3xl">
        <ChecklistDetailsFields name={name} onNameChange={setName} description={description} onDescriptionChange={setDescription} />
      </div>
    </BuilderStepFrame>,

    <BuilderStepFrame key="schedule" stepIndex={step} title="Schedule" description="Choose which stores run this checklist and how often.">
      <div className="max-w-xl">
        <BuilderSchedulePanel
          storeIds={storeIds}
          onStoreIdsChange={setStoreIds}
          recurrence={recurrence}
          onRecurrenceChange={setRecurrence}
          startDate={startDate}
          onStartDateChange={setStartDate}
          opensTime={opensTime}
          onOpensTimeChange={setOpensTime}
          cutoffTime={cutoffTime}
          onCutoffTimeChange={setCutoffTime}
        />
      </div>
    </BuilderStepFrame>,

    <BuilderStepFrame key="items" stepIndex={step} title="Checklist Items" description="Add the steps your team needs to complete, in order.">
      <div className="flex flex-col gap-6">
        <ImportFromTemplateField templates={templates} onImport={handleImportTemplate} />
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-6 items-start">
          <div className="rounded-xl border border-border bg-surface shadow-xs p-4 lg:sticky lg:top-6">
            <QuestionTypePalette onAdd={addItem} storeId={primaryStoreId} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <label className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider text-text-secondary">
                <span>Checklist Items</span>
                <Badge variant="outline" className="text-[11px] py-0 px-2 font-mono">
                  {itemDrafts.length}
                </Badge>
              </label>
            </div>

            {itemDrafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 rounded-xl border border-dashed border-border/80 bg-surface-hover/20 text-center transition-colors">
                <span className="flex items-center justify-center size-12 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/40 shadow-xs">
                  <ListChecks size={22} />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-display font-semibold text-text">No checklist items yet</p>
                  <p className="text-xs font-display text-text-muted max-w-xs leading-relaxed">
                    Pick a question type from the palette on the left to add your first checklist item.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {itemDrafts.map((draft, i) => (
                  <div key={i} className="group flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <ChecklistDefinitionItemDraftRow index={i} draft={draft} onChange={updateDraft} storeId={primaryStoreId} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="shrink-0 p-2 mt-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BuilderStepFrame>,

    <BuilderStepFrame key="assign" stepIndex={step} title="Assign & Proof" description="Decide who's responsible and what evidence they must provide.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BuilderAssignPanel
          storeId={primaryStoreId}
          assigneeIds={assigneeIds}
          onAssigneeIdsChange={setAssigneeIds}
          assigneeRoles={assigneeRoles}
          onAssigneeRolesChange={setAssigneeRoles}
        />
        <BuilderProofPanel selected={proofRequired} onChange={setProofRequired} />
      </div>
    </BuilderStepFrame>,

    <BuilderStepFrame key="review" stepIndex={step} title="Review & Create" description="Double-check everything below, then create the checklist.">
      <BuilderReviewStep
        name={name}
        description={description}
        storeIds={storeIds}
        recurrence={recurrence}
        startDate={startDate}
        opensTime={opensTime}
        cutoffTime={cutoffTime}
        itemDrafts={itemDrafts}
        assigneeIds={assigneeIds}
        assigneeRoles={assigneeRoles}
        proofRequired={proofRequired}
        sectionValidity={sectionValidity}
        onEditSection={goToStep}
        canSubmit={canSubmit}
        isSubmitting={mutation.isPending}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        submitError={mutation.isError ? (mutation.error instanceof Error ? mutation.error.message : 'Failed to save checklist.') : undefined}
      />
    </BuilderStepFrame>,
  ];

  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-2 sm:py-4">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Admin', to: '/admin' },
          { label: 'Checklists', to: '/admin/scheduled-checklists' },
          { label: isEditing && existing ? existing.name : 'New checklist' },
          { label: STEPS[step].label },
        ]}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <GradientIconTile icon={ListChecks} />
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-text tracking-tight leading-snug">
              {isEditing ? `Editing: ${existing?.name}` : 'New Checklist'}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              {isEditing && existing
                ? `Version ${existing.version} · Live in ${existing.storeIds.length} store${existing.storeIds.length !== 1 ? 's' : ''}`
                : 'Build a recurring checklist your team runs on a schedule.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/scheduled-checklists')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-display font-medium text-text-secondary border border-border bg-surface hover:bg-surface-hover hover:text-text hover:border-border/80 shadow-2xs transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 active:scale-[0.98]"
        >
          <ArrowLeft size={13} />
          <span>Back to Templates</span>
        </button>
      </div>

      {/* Main Wizard Card */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        {/* Stepper Header with Progress Bar */}
        <div className="flex flex-col gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border/60 bg-muted/20">
          <BuilderStepper
            steps={STEPS}
            current={step}
            maxReached={maxStepReached}
            allUnlocked={isEditing}
            isStepValid={isStepValid}
            onSelect={goToStep}
          />
          <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Wizard Content Step */}
        <div className="p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.2, ease: 'easeOut' }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation Bar */}
          <div className="flex items-center justify-between pt-6 mt-8 border-t border-border/60">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-display font-medium text-text-secondary border border-border bg-surface hover:bg-surface-hover hover:text-text transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 active:scale-[0.98]"
              >
                <ChevronLeft size={15} />
                <span>Back</span>
              </button>
            ) : <span />}

            {step < STEPS.length - 1 && (
              <div className="flex flex-col items-end gap-1.5">
                {!sectionValidity[step] && (
                  <p className="text-[11px] font-display text-warning flex items-center gap-1">
                    <AlertCircle size={12} className="shrink-0" />
                    {STEP_BLOCK_REASON[step]}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  disabled={!sectionValidity[step]}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-display font-medium text-white bg-primary-700 shadow-xs transition-all duration-150 hover:bg-primary-800 hover:shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};