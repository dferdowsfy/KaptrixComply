'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>Save as PDF</button>
  );
}
