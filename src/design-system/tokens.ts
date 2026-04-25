// Design system tokens — single source of truth for JS-side color references.
// The CSS palette lives in globals.css (@theme block).

export const colors = {
  gray: {
    50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB',
    400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
    800: '#1F2937', 900: '#111827',
  },
  primary: {
    50:  '#F0F1FA', 100: '#D8DAEE', 200: '#ADB2DB', 300: '#7279C0',
    400: '#3D4599', 500: '#0D1033', 600: '#090C28', 700: '#07091F',
    800: '#050716', 900: '#03040D',
  },
  success: {
    50:  '#ECFDF5', 100: '#D1FAE5',
    500: '#10B981', 600: '#059669', 700: '#047857',
  },
  warning: {
    50:  '#FFFBEB', 100: '#FEF3C7',
    500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E',
  },
  danger: {
    50:  '#FEF2F2', 100: '#FEE2E2',
    500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
  },
  info: {
    50:  '#EFF6FF', 100: '#DBEAFE',
    500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
  },
  riskLevel: {
    LOW:    { bg: '#D1FAE5', text: '#047857' },
    MEDIUM: { bg: '#FEF3C7', text: '#B45309' },
    HIGH:   { bg: '#FEE2E2', text: '#B91C1C' },
  },
  evidence: {
    strong:  { bg: '#10B981', text: '#FFFFFF' },
    partial: { bg: 'transparent', text: '#B45309', border: '#F59E0B' },
    none:    { bg: 'transparent', text: '#B91C1C', border: '#EF4444' },
  },
} as const;

export const spacing = {
  0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px',
  5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px',
} as const;

export const radius = {
  sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px', full: '9999px',
} as const;

export const shadows = {
  xs: '0 1px 2px 0 rgba(17, 24, 39, 0.04)',
  sm: '0 1px 3px 0 rgba(17, 24, 39, 0.06), 0 1px 2px 0 rgba(17, 24, 39, 0.04)',
  md: '0 4px 6px -1px rgba(17, 24, 39, 0.08), 0 2px 4px -1px rgba(17, 24, 39, 0.04)',
  lg: '0 10px 15px -3px rgba(17, 24, 39, 0.08), 0 4px 6px -2px rgba(17, 24, 39, 0.04)',
} as const;
