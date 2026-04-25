'use client';
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

// ─── Modal ───
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
const modalSizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={cn('relative bg-white rounded-lg shadow-lg w-full', modalSizes[size], className)}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 rounded" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Drawer ───
interface DrawerProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; side?: 'right' | 'left'; className?: string; }
export function Drawer({ open, onClose, title, children, side = 'right', className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  return (
    <div className={cn('fixed inset-0 z-40 flex', side === 'right' ? 'justify-end' : 'justify-start', !open && 'pointer-events-none')} role="dialog" aria-modal="true">
      <div className={cn('absolute inset-0 bg-black/30 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} aria-hidden="true" />
      <div className={cn(
        'relative bg-white h-full w-full max-w-md shadow-xl flex flex-col transition-transform duration-300 motion-reduce:transition-none',
        side === 'right' ? (open ? 'translate-x-0' : 'translate-x-full') : (open ? 'translate-x-0' : '-translate-x-full'),
        className,
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close drawer">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ───
interface ToastProps { message: string; type?: 'success' | 'error' | 'info'; onDismiss?: () => void; }
const toastColors = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-slate-800 text-white',
};
export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm', toastColors[type])} role="status" aria-live="polite">
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-80 hover:opacity-100" aria-label="Dismiss">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}
