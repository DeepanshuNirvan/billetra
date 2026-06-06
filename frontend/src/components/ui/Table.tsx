import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
  /**
   * When provided, the desktop table is hidden on small screens and each row
   * renders as a stacked card instead — avoids horizontal scrolling on mobile.
   */
  renderMobileCard?: (row: T, index: number) => ReactNode;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data found',
  loading,
  stickyHeader,
  renderMobileCard,
}: TableProps<T>) {
  return (
    <>
      {/* Mobile card list */}
      {renderMobileCard && (
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">{emptyMessage}</div>
          ) : (
            data.map((row, i) => (
              <div
                key={keyExtractor(row, i)}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm shadow-gray-200/50 transition-all',
                  onRowClick && 'cursor-pointer active:scale-[0.99] hover:border-gray-200'
                )}
              >
                {renderMobileCard(row, i)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Desktop table */}
      <div
        className={clsx(
          'overflow-x-auto rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/50',
          renderMobileCard && 'hidden md:block'
        )}
      >
        <table className="w-full text-sm">
          <thead className={clsx('bg-gray-50/80', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row, i)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-primary-50/40'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx('px-4 py-3.5 text-gray-700', col.className)}
                    >
                      {col.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <p className="text-sm text-gray-500">
        Showing {start}–{end} of {total} results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
