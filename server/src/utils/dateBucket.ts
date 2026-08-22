export type DateBucket = "hour" | "day" | "week" | "month" | "year"

// MySQL DATE_FORMAT() format string for each report grouping granularity — shared by every
// report method that buckets rows by time (tasks, tickets, checklist instances). Replaces the
// old Mongo $dateToString format strings (kept the same bucket shapes: hour/day/month/year read
// identically; week used Mongo's ISO-week specifiers %G-%V, MySQL's equivalents are %x-%v).
export const DATE_FORMATS: Record<DateBucket, string> = {
    hour: '%Y-%m-%dT%H:00',
    day: '%Y-%m-%d',
    week: '%x-W%v',
    month: '%Y-%m',
    year: '%Y',
}
