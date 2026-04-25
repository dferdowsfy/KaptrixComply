'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface FrameworkOption {
  id: string;
  label: string;
  description: string;
  popular: boolean;
  iconBg: string;
  iconStroke: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
}

interface Props {
  frameworks: FrameworkOption[];
  /** Initial selected framework id (defaults to first popular, else first) */
  initialSelectedId?: string;
}

export function DashboardFrameworkPicker({ frameworks, initialSelectedId }: Props) {
  const defaultId =
    initialSelectedId ??
    frameworks.find(f => f.popular)?.id ??
    frameworks[0]?.id;

  const [selectedId, setSelectedId] = useState<string | undefined>(defaultId);
  const selected = frameworks.find(f => f.id === selectedId);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          1. Choose a compliance framework
        </h2>
        <Link
          href="/officer/templates"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          See all frameworks →
        </Link>
      </div>

      <div
        role="radiogroup"
        aria-label="Compliance framework"
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        {frameworks.map(fw => {
          const isSelected = fw.id === selectedId;
          return (
            <button
              key={fw.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedId(fw.id)}
              className={cn(
                'group relative flex flex-col items-center text-center p-4 rounded-lg border transition-all',
                'hover:-translate-y-px hover:shadow-sm',
                isSelected
                  ? 'border-2 border-primary-500'
                  : 'border-gray-200 hover:border-gray-300',
              )}
              style={isSelected ? { backgroundColor: fw.iconBg + '44' } : undefined}
            >
              {isSelected && (
                <span
                  className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: fw.iconStroke }}
                  aria-hidden="true"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              )}
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: fw.iconBg }}
              >
                <span style={{ color: fw.iconStroke }}>{fw.icon}</span>
              </div>
              <p className="text-xs font-semibold text-gray-900 leading-tight mb-1">
                {fw.label}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">{fw.description}</p>
              {fw.popular && (
                <span
                  className="mt-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
                  style={{ backgroundColor: fw.badgeBg, color: fw.badgeText }}
                >
                  Most Popular
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Selected: <span className="font-semibold text-gray-900">{selected.label}</span>
          </p>
          <Link
            href={`/officer/vendors/new?framework=${selected.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-md hover:bg-primary-600 transition-colors"
          >
            Continue with {selected.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
