import React from 'react';
import { cn } from '@/lib/utils';

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}
const progressColors = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-info-500',
};
export function ProgressBar({ value, label, showValue, color = 'primary', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-600">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-all duration-300', progressColors[color])} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

// ─── RiskMeter ───────────────────────────────────────────────────────────────
type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';
function getRiskBand(score: number): RiskBand {
  if (score >= 80) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  return 'HIGH';
}
const riskBandColors: Record<RiskBand, { bar: string; text: string; label: string; score: string }> = {
  LOW:    { bar: 'bg-success-500',  text: 'text-success-600',  label: 'LOW RISK',    score: 'text-success-600' },
  MEDIUM: { bar: 'bg-warning-500',  text: 'text-warning-600',  label: 'MEDIUM RISK', score: 'text-warning-600' },
  HIGH:   { bar: 'bg-danger-500',   text: 'text-danger-600',   label: 'HIGH RISK',   score: 'text-danger-600' },
};

interface RiskMeterProps {
  score: number; // 0–100
  label?: string;
  showBand?: boolean;
  mini?: boolean;
  className?: string;
}
export function RiskMeter({ score, label, showBand = true, mini, className }: RiskMeterProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const band = getRiskBand(clamped);
  const colors = riskBandColors[band];

  if (mini) {
    return (
      <div className={cn('flex items-center gap-2', className)} aria-label={`Risk score ${clamped}`}>
        <div className="relative w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={cn('absolute left-0 top-0 h-full rounded-full', colors.bar)} style={{ width: `${clamped}%` }} />
          {/* Tick marks */}
          <div className="absolute top-0 left-[50%] w-px h-full bg-white opacity-60" />
          <div className="absolute top-0 left-[80%] w-px h-full bg-white opacity-60" />
        </div>
        <span className={cn('text-xs font-semibold tabular-nums', colors.text)}>{Math.round(clamped)}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-5xl font-bold tabular-nums', colors.score)}>{Math.round(clamped)}</span>
        <span className="text-lg text-gray-400 font-medium">/ 100</span>
        {showBand && (
          <span className={cn('ml-auto text-sm font-semibold px-3 py-1 rounded-full', colors.text,
            band === 'LOW' ? 'bg-success-50' : band === 'MEDIUM' ? 'bg-warning-50' : 'bg-danger-50'
          )}>
            {colors.label}
          </span>
        )}
      </div>
      {label && <p className="text-sm text-gray-500">{label}</p>}
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={`Risk score: ${band}`}>
        <div className={cn('absolute left-0 top-0 h-full rounded-full transition-all duration-500', colors.bar)} style={{ width: `${clamped}%` }} />
        <div className="absolute top-0 left-[50%] w-0.5 h-full bg-white opacity-70" />
        <div className="absolute top-0 left-[80%] w-0.5 h-full bg-white opacity-70" />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>0 — High Risk</span>
        <span>Low Risk — 100</span>
      </div>
    </div>
  );
}

// ─── ConfidenceBadge ─────────────────────────────────────────────────────────
interface ConfidenceBadgeProps { confidence: number; className?: string; }
export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? 'text-success-700 bg-success-50' : pct >= 40 ? 'text-warning-700 bg-warning-50' : 'text-danger-700 bg-danger-50';
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', color, className)}
      title={`Confidence: ${pct}%`}
      aria-label={`Confidence ${pct}%`}
    >
      {pct}% conf.
    </span>
  );
}
