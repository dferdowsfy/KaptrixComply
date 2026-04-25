import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { noPadding?: boolean; }
interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ noPadding, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-xs',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-gray-100', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg', className)} {...props}>
      {children}
    </div>
  );
}
