'use client';
import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ProgressBar } from './Meters';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  progress?: number; // 0-100, shown when uploading
  uploading?: boolean;
  className?: string;
  label?: string;
}
export function FileUpload({ onFilesSelected, accept, multiple, maxSizeMB = 50, progress, uploading, className, label }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (files: File[]): File[] => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    const valid = files.filter(f => {
      if (f.size > maxBytes) { setError(`${f.name} exceeds ${maxSizeMB}MB limit`); return false; }
      return true;
    });
    if (valid.length === files.length) setError(null);
    return valid;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = validate(Array.from(e.dataTransfer.files));
    if (files.length) onFilesSelected(files);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors',
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white',
          uploading && 'pointer-events-none opacity-70',
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <div className="text-sm text-center">
          <span className="text-blue-600 font-medium">Click to upload</span>
          <span className="text-slate-500"> or drag and drop</span>
        </div>
        <p className="text-xs text-slate-400">{accept ? accept.replace(/,/g, ', ') : 'PDF, DOCX, XLSX, PNG'} — max {maxSizeMB}MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={e => {
            const files = validate(Array.from(e.target.files ?? []));
            if (files.length) onFilesSelected(files);
            e.target.value = '';
          }}
          aria-hidden="true"
        />
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {uploading && progress != null && <ProgressBar value={progress} label="Uploading…" showValue color="primary" />}
    </div>
  );
}
