/**
 * Client-side CSV export for the admin directories.
 *
 * ponytail: the browser already has everything needed (Blob + <a download>), so
 * there is no export dependency and no reporting endpoint to wait for. Move this
 * server-side only when an export has to cover rows the client never loaded.
 */

/** RFC 4180 quoting: wrap in quotes and double any embedded quote. */
function cell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

/**
 * Turn `rows` into a CSV file and hand it to the browser's download flow.
 * `columns` fixes both the header order and which fields are exported.
 */
export function downloadCsv<T>(
  filename: string,
  columns: { header: string; value: (row: T) => unknown }[],
  rows: T[],
): void {
  const lines = [
    columns.map((c) => cell(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(',')),
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
