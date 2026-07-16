import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  /** Custom cell renderer; defaults to String(row[key]). */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
}

/** Reusable, responsive, accessible table (UI_UX_GUIDELINES §24). */
export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-md py-sm font-medium text-on-surface-variant ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-high">
              {columns.map((col) => (
                <td key={col.key} className={`px-md py-sm text-on-surface ${col.align === 'right' ? 'text-right' : ''}`}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
