export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// "Today"/"Tomorrow"/"Yesterday" reads far friendlier in a task row than a bare date, and matches
// how the day strip above already talks about dates — falls back to a short date once it's more
// than a day away in either direction.
export const relativeDayLabel = (date: Date, now: Date = new Date()) => {
  if (isSameDay(date, now)) return 'Today';

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
