// Shared by TodoPage/TicketList/TaskList's `?quickFilter=` deep-link seeding — each page has its
// own quick-filter key union, but the same "read the query param once, keep it only if it's one
// of the valid values" logic was previously copy-pasted identically in all three.
export function readQuickFilterParam<T extends string>(
  searchParams: URLSearchParams,
  validValues: readonly T[],
): T | null {
  const qf = searchParams.get('quickFilter');
  return qf !== null && (validValues as readonly string[]).includes(qf) ? (qf as T) : null;
}
