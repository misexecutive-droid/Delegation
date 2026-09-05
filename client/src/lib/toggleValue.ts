/**
 * Immutably adds a value to an array, or removes it if already present — the multi-select toggle
 * behind every "pick any number of these" filter.
 *
 * Delegation and Tickets each carried their own identical copy of this.
 */
export const toggleValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
