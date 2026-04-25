'use client';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  className?: string;
  onRowClick?: (row: T) => void;
  expandedRow?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function getValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function Table<T>({
  columns, data, keyField, className, onRowClick, expandedRow, emptyState, stickyHeader,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full text-sm border-collapse" data-testid="compliance-table">
        <thead className={cn('bg-slate-50 text-slate-600', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {expandedRow && <th className="w-8" />}
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide border-b border-slate-200',
                  col.sortable && 'cursor-pointer select-none hover:text-slate-900',
                  col.width,
                )}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                aria-sort={sortKey === String(col.key) ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none') : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === String(col.key) && (
                    <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && emptyState ? (
            <tr><td colSpan={columns.length + (expandedRow ? 1 : 0)} className="py-12 text-center">{emptyState}</td></tr>
          ) : (
            sorted.map(row => {
              const rowKey = String(getValue(row, String(keyField)));
              const isExpanded = expandedKeys.has(rowKey);
              return (
                <React.Fragment key={rowKey}>
                  <tr
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-slate-50',
                    )}
                    onClick={() => onRowClick?.(row)}
                    data-rowkey={rowKey}
                  >
                    {expandedRow && (
                      <td className="px-2">
                        <button
                          className="text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                          onClick={e => { e.stopPropagation(); toggleExpand(rowKey); }}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          aria-expanded={isExpanded}
                        >
                          <svg className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-4 py-3">
                        {col.render
                          ? col.render(getValue(row, String(col.key)), row)
                          : String(getValue(row, String(col.key)) ?? '')}
                      </td>
                    ))}
                  </tr>
                  {expandedRow && isExpanded && (
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td />
                      <td colSpan={columns.length} className="px-4 py-3">
                        {expandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
