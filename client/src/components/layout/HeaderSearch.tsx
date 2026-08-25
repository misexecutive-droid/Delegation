import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckSquare, TicketCheck, ListTodo, SearchX, Loader2 } from 'lucide-react';
import { HeaderSearchInput } from './HeaderSearchInput';
import { useTasksQuery } from '../../features/tasks/hook';
import { useTicketsQuery } from '../../features/tickets/hook';
import { useTodosQuery } from '../../features/todo/hook';
import { useClickOutside } from '../../lib/useClickOutside';

const MIN_QUERY_LENGTH = 2;
const MAX_PER_GROUP = 4;
const DEBOUNCE_MS = 250;

type ResultGroup = {
  key: string;
  label: string;
  icon: typeof CheckSquare;
  to: string;
  items: { id: string; title: string }[];
};

// Client-side quick search — no dedicated search endpoint exists yet, so this scans the same
// already-permission-scoped list data the app fetches elsewhere (Delegations, Tickets, To-Do),
// filtered by title. The three list queries below only turn on once there's an actual query to
// search for, so visiting any page never fetches data this feature doesn't need yet — and when a
// query key/params match a list already loaded elsewhere (e.g. Tickets page 1), it's an instant
// cache hit instead of a fresh request.
export const HeaderSearch = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = debounced.length >= MIN_QUERY_LENGTH;
  const needle = debounced.toLowerCase();

  // Matches TicketList's default page/limit so this shares its cache entry instead of racing it
  // under the same query key with a different page size.
  const tasksQuery = useTasksQuery(undefined, isSearching);
  const ticketsQuery = useTicketsQuery(1, 20, undefined, isSearching);
  const todosQuery = useTodosQuery(isSearching);

  useClickOutside(containerRef, () => setOpen(false), open);

  const groups: ResultGroup[] = isSearching
    ? [
        {
          key: 'tasks',
          label: 'Delegation',
          icon: CheckSquare,
          to: '/tasks',
          items: (tasksQuery.data ?? [])
            .filter((t) => t.title.toLowerCase().includes(needle))
            .slice(0, MAX_PER_GROUP)
            .map((t) => ({ id: t.id, title: t.title })),
        },
        {
          key: 'tickets',
          label: 'Tickets',
          icon: TicketCheck,
          to: '/tickets',
          items: (ticketsQuery.data?.data ?? [])
            .filter((t) => t.title.toLowerCase().includes(needle))
            .slice(0, MAX_PER_GROUP)
            .map((t) => ({ id: t.id, title: t.title })),
        },
        {
          key: 'todos',
          label: 'To-Do',
          icon: ListTodo,
          to: '/todo',
          items: (todosQuery.data ?? [])
            .filter((t) => t.text.toLowerCase().includes(needle))
            .slice(0, MAX_PER_GROUP)
            .map((t) => ({ id: t.id, title: t.text })),
        },
      ].filter((g) => g.items.length > 0)
    : [];

  const isLoading = isSearching && (tasksQuery.isPending || ticketsQuery.isPending || todosQuery.isPending);
  const hasNoResults = isSearching && !isLoading && groups.length === 0;

  const goToGroup = (to: string) => {
    navigate(to);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <HeaderSearchInput
        value={query}
        onChange={(v) => {
          setQuery(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search checklists, tasks, tickets…"
      />

      {open && isSearching && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 size={15} className="animate-spin" />
              Searching…
            </div>
          ) : hasNoResults ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <SearchX size={20} className="text-text-light" />
              <p className="text-sm font-medium text-text">No matches for "{debounced}"</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar py-2">
              {groups.map((group) => (
                <div key={group.key} className="px-2 py-1">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToGroup(group.to)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-text transition-colors hover:bg-surface-hover cursor-pointer"
                    >
                      <group.icon size={15} className="shrink-0 text-primary-600" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
