import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  onRowClick?: (row: T) => void;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  defaultSortKey,
  defaultSortDir = 'asc',
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  emptyState,
  stickyHeader = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortKey(undefined);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Selection
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedKeys?.has(keyExtractor(row)));

  const handleSelectAll = () => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (allCurrentPageSelected) {
      paginatedData.forEach((row) => next.delete(keyExtractor(row)));
    } else {
      paginatedData.forEach((row) => next.add(keyExtractor(row)));
    }
    onSelectionChange(next);
  };

  const handleSelectRow = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  return (
    <div className="w-full flex flex-col border border-ink/10 rounded-card bg-base overflow-hidden">
      {/* Scrollable table container */}
      <div className="overflow-x-auto overflow-y-hidden w-full max-w-full">
        <table className="w-full text-left border-collapse text-sm">
          <thead
            className={`${
              stickyHeader ? 'sticky top-0 z-10' : ''
            } bg-base border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink/70`}
          >
            <tr className="h-12">
              {selectable && (
                <th scope="col" className="w-12 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="w-4 h-4 rounded border border-ink/30 accent-ink cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={`px-4 py-3 font-semibold whitespace-nowrap ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.sortable ? 'cursor-pointer select-none hover:text-ink' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-ink/40">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-ink" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-ink" />
                            )
                          ) : (
                            <div className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 text-ink">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-ink/60"
                >
                  {emptyState || 'No records found.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const key = keyExtractor(row);
                const isSelected = selectedKeys?.has(key) ?? false;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`h-12 transition-colors ${
                      isSelected ? 'bg-accent/15' : 'hover:bg-ink/[0.03]'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 text-center" onClick={(e) => handleSelectRow(e, key)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          aria-label={`Select row ${key}`}
                          className="w-4 h-4 rounded border border-ink/30 accent-ink cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row, index) : (row as any)[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-ink/10 bg-base text-xs text-ink/70">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="w-20">
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                options={pageSizeOptions.map((opt) => ({ value: opt, label: String(opt) }))}
                className="h-8 text-xs py-0"
              />
            </div>
            <span className="ml-2">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-ink/5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
