import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

type EvidenceStrength = 'strong' | 'partial' | 'none';

interface DataGridRow { id: string; label: string; }
interface DataGridColumn { id: string; label: string; }
interface DataGridCell { rowId: string; colId: string; strength: EvidenceStrength; tooltip?: string; }

interface DataGridProps {
  rows: DataGridRow[];
  columns: DataGridColumn[];
  cells: DataGridCell[];
  onCellClick?: (rowId: string, colId: string) => void;
  className?: string;
}

const strengthSymbol: Record<EvidenceStrength, string> = { strong: '●', partial: '◐', none: '○' };
const strengthClass: Record<EvidenceStrength, string> = {
  strong: 'text-green-600 bg-green-50',
  partial: 'text-amber-600 bg-amber-50',
  none: 'text-red-400 bg-red-50',
};

export function DataGrid({ rows, columns, cells, onCellClick, className }: DataGridProps) {
  const cellMap = new Map(cells.map(c => [`${c.rowId}:${c.colId}`, c]));
  return (
    <div className={cn('overflow-auto rounded-lg border border-slate-200', className)}>
      <table className="text-xs w-full border-collapse" aria-label="Evidence mapping matrix">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-b border-slate-200 sticky left-0 bg-slate-50 min-w-[180px]">Question</th>
            {columns.map(col => (
              <th key={col.id} className="px-2 py-2 text-center font-medium text-slate-500 border-b border-slate-200 min-w-[100px] max-w-[120px]">
                <span className="block truncate" title={col.label}>{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-slate-700 sticky left-0 bg-white border-r border-slate-100 font-mono">{row.label}</td>
              {columns.map(col => {
                const cell = cellMap.get(`${row.id}:${col.id}`);
                const strength = cell?.strength ?? 'none';
                return (
                  <td
                    key={col.id}
                    className={cn('px-2 py-2 text-center', cell && onCellClick && 'cursor-pointer hover:opacity-80', strengthClass[strength])}
                    onClick={() => cell && onCellClick?.(row.id, col.id)}
                    title={cell?.tooltip}
                    aria-label={`${row.label} — ${col.label}: ${strength}`}
                  >
                    <span className="text-base" aria-hidden="true">{strengthSymbol[strength]}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
