type ChecklistLike = { items: { isDone: boolean }[] };

// `checklists` and each entry's `items` are typed as always-present arrays, but real API
// responses have been seen omitting fields their own type claims are required (see the
// dashboard's additionalAssigneeIds crash) — defaulted here since this runs on every
// ticket card render across list/board/grouped views, the highest-blast-radius call site.
export const getChecklistProgress = (checklists: ChecklistLike[] | undefined | null) => {
  const list = checklists ?? [];
  const totalItems = list.reduce((sum, c) => sum + (c.items ?? []).length, 0);
  const doneItems = list.reduce((sum, c) => sum + (c.items ?? []).filter(i => i.isDone).length, 0);
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : null;
  return { totalItems, doneItems, progress };
};
