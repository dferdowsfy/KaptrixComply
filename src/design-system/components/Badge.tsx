import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'status' | 'severity' | 'evidence' | 'framework' | 'default';
type BadgeStatus = 'success' | 'warning' | 'risk' | 'info' | 'neutral';
type EvidenceStrength = 'strong' | 'partial' | 'none';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type FrameworkId = 'soc2' | 'vdd' | 'financial_controls' | 'agnostic';

interface BaseBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}
interface StatusBadgeProps extends BaseBadgeProps { variant: 'status'; status: BadgeStatus; }
interface SeverityBadgeProps extends BaseBadgeProps { variant: 'severity'; level: RiskLevel; }
interface EvidenceBadgeProps extends BaseBadgeProps { variant: 'evidence'; strength: EvidenceStrength; }
interface FrameworkBadgeProps extends BaseBadgeProps { variant: 'framework'; framework: FrameworkId; }
interface DefaultBadgeProps extends BaseBadgeProps { variant?: 'default'; }

type BadgeProps = StatusBadgeProps | SeverityBadgeProps | EvidenceBadgeProps | FrameworkBadgeProps | DefaultBadgeProps;

const statusColors: Record<BadgeStatus, string> = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  risk:    'bg-danger-100 text-danger-700',
  info:    'bg-info-100 text-info-700',
  neutral: 'bg-gray-100 text-gray-600',
};

const severityColors: Record<RiskLevel, string> = {
  LOW:      'bg-success-100 text-success-700',
  MEDIUM:   'bg-warning-100 text-warning-700',
  HIGH:     'bg-danger-100 text-danger-700',
  CRITICAL: 'bg-danger-100 text-danger-700',
};

const evidenceColors: Record<EvidenceStrength, string> = {
  strong:  'bg-success-500 text-white',
  partial: 'bg-transparent text-warning-700 border border-warning-500',
  none:    'bg-transparent text-danger-700 border border-dashed border-danger-500',
};

const frameworkColors: Record<FrameworkId, string> = {
  soc2:               'bg-primary-100 text-primary-700',
  vdd:                'bg-success-100 text-success-700',
  financial_controls: 'bg-warning-100 text-warning-700',
  agnostic:           'bg-gray-100 text-gray-600',
};

const frameworkLabels: Record<FrameworkId, string> = {
  soc2: 'SOC 2', vdd: 'VDD', financial_controls: 'Financial Controls', agnostic: 'Agnostic',
};

export function Badge(props: BadgeProps) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full';
  let colorClass = 'bg-gray-100 text-gray-600';
  let label = props.children;

  if (props.variant === 'status') {
    colorClass = statusColors[(props as StatusBadgeProps).status];
  } else if (props.variant === 'severity') {
    const p = props as SeverityBadgeProps;
    colorClass = severityColors[p.level];
    label = label ?? p.level;
  } else if (props.variant === 'evidence') {
    const p = props as EvidenceBadgeProps;
    colorClass = evidenceColors[p.strength];
    label = label ?? p.strength.toUpperCase();
  } else if (props.variant === 'framework') {
    const p = props as FrameworkBadgeProps;
    colorClass = frameworkColors[p.framework];
    label = label ?? frameworkLabels[p.framework];
  }

  const { variant: _v, ...rest } = props as DefaultBadgeProps;
  return (
    <span className={cn(base, colorClass, props.className)} data-variant={props.variant} {...rest}>
      {label}
    </span>
  );
}
