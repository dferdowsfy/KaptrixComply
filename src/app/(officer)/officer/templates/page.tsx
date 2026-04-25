import { redirect } from 'next/navigation';

// Frameworks/Templates listing has been replaced by the read-only
// "Framework Methodology" reference. Framework selection now happens
// inside the engagement creation flow.
export default function LegacyTemplatesPage() {
  redirect('/officer/methodology');
}
