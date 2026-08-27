import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, AlertCircle, Store } from 'lucide-react';
import { Input, Button, Modal, Combobox } from '../../../components';
import { useCreateDepartmentMutation, useUpdateDepartmentMutation } from '../hook';
import { useStoresQuery } from '../../tickets/hook';
import type { Department } from '../../../api/departments';

// --- Schema ---
const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  storeId: z.string().optional(),
});

type DepartmentFields = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  onClose: () => void;
  department?: Department;
  /** Called with the newly-created department right after a successful create (not fired when
   *  editing) — lets a caller opening this as a nested "quick create" (e.g. from UserForm's
   *  department Combobox) auto-select the result instead of the admin re-picking it themselves. */
  onCreated?: (department: Department) => void;
  /** Seeds the name field — e.g. whatever the admin had already typed into a Combobox's search
   *  box before hitting "Create new department". */
  prefillName?: string;
}

// --- Main Component ---
export const DepartmentForm = ({ onClose, department, onCreated, prefillName }: DepartmentFormProps) => {
  const isEditing = !!department;
  const createMutation = useCreateDepartmentMutation();
  const updateMutation = useUpdateDepartmentMutation();
  const mutation = isEditing ? updateMutation : createMutation;

  const { data: stores, isPending: isStoresLoading } = useStoresQuery();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DepartmentFields>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name || prefillName || '', storeId: department?.storeId ?? '' }
  });

  const isPending = mutation.isPending;

  const onSubmit = (data: DepartmentFields) => {
    const storePayload = data.storeId || undefined;

    if (isEditing && department) {
      updateMutation.mutate(
        { id: department.id, payload: { name: data.name, storeId: storePayload ?? null } },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(
        { name: data.name, storeId: storePayload },
        { onSuccess: (created) => { onCreated?.(created); onClose(); } }
      );
    }
  };

  const footer = (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" form="department-form" variant="primary" size="sm" isLoading={isPending}>
        {isEditing ? 'Save changes' : 'Create department'}
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={() => !isPending && onClose()}
      // Non-modal so this also works correctly when opened nested inside another Modal (e.g. a
      // "create new department" quick-add from UserForm's department Combobox) — same reasoning
      // as DatePicker/DateRangePicker.
      modal={false}
      icon={<Building2 className="w-5 h-5" />}
      title={isEditing ? 'Edit department' : 'New department'}
      description={
        isEditing
          ? "Update this department's name and details."
          : 'Departments group users and scope checklist assignments.'
      }
      footer={footer}
    >
      <form id="department-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <fieldset disabled={isPending} className="flex flex-col gap-4 disabled:opacity-60">
          <Input
            id="name"
            label="Department name"
            placeholder="e.g. Customer Support"
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Home Store — optional. Lets a department head (MANAGER) and a store's Senior
              resolve into each other's scoped reports instead of falling back to org-wide. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="storeId" className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Store className="w-3.5 h-3.5 text-text-light" strokeWidth={2.5} />
              Store (optional)
            </label>
            <Controller
              control={control}
              name="storeId"
              render={({ field }) => (
                <Combobox
                  id="storeId"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  isLoading={isStoresLoading}
                  placeholder="Search stores..."
                  emptyOptionLabel="No store"
                  options={(stores ?? []).map((s) => ({ value: s.id, label: s.name }))}
                />
              )}
            />
            <p className="text-xs font-display text-text-muted">
              Ties this department to one store so a department head and that store's Senior see
              consistent scoped data.
            </p>
          </div>
        </fieldset>

        {mutation.isError && (
          <div className="flex items-center gap-2 text-xs text-danger font-display bg-danger/10 p-2.5 rounded-lg">
            <AlertCircle size={14} className="shrink-0" />
            <span>
              {mutation.error instanceof Error ? mutation.error.message : `Failed to ${isEditing ? 'update' : 'create'} department.`}
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
};
