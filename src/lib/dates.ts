/** LOCAL calendar date as yyyy-mm-dd. Never use toISOString().slice(0,10) for
 * user-facing dates — it returns the UTC day, which shifts evening sessions to
 * tomorrow for US timezones (review finding, 2026-08-01). */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
