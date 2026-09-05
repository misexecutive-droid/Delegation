import type { AssignableUser } from '../api/users';
import type { FilterPerson } from '../components/filterRow';

/**
 * Shapes assignable users for the avatar-toggle filter rows.
 *
 * Delegation and Tickets each carried their own identical
 * `` (u) => `${u.firstName} ${u.lastName ?? ''}`.trim() ``, so a change to how a person is named in
 * one filter panel silently wouldn't reach the other.
 */
export const toFilterPeople = (users: AssignableUser[] | undefined): FilterPerson[] =>
  (users ?? []).map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName ?? ''}`.trim(),
  }));
