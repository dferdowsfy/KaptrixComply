'use client';
import React from 'react';
import { cn } from '@/lib/utils';

// ─── Input ───
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        id={inputId}
        className={cn(
          'h-9 px-3 text-sm rounded bg-white border border-slate-200',
          'placeholder:text-slate-400 text-slate-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-400 focus:ring-red-400',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        style={{ fontSize: '16px' }} // prevent iOS auto-zoom
        {...props}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Textarea ───
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={textareaId} className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        id={textareaId}
        className={cn(
          'px-3 py-2 text-sm rounded bg-white border border-slate-200 resize-y min-h-[80px]',
          'placeholder:text-slate-400 text-slate-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error && 'border-red-400 focus:ring-red-400',
          className,
        )}
        aria-invalid={!!error}
        style={{ fontSize: '16px' }}
        {...props}
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Select ───
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}
export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        id={selectId}
        className={cn(
          'h-9 px-3 text-sm rounded bg-white border border-slate-200 text-slate-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error && 'border-red-400',
          className,
        )}
        aria-invalid={!!error}
        style={{ fontSize: '16px' }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Checkbox ───
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}
export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const cbId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={cbId} className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        id={cbId}
        className={cn('h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500', className)}
        {...props}
      />
      {label}
    </label>
  );
}

// ─── Switch ───
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500',
          checked ? 'bg-blue-600' : 'bg-slate-200',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}
