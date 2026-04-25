import { redirect } from 'next/navigation';

// Old global Evidence page is now part of Evidence Intelligence (engagement-scoped).
// Land users on the picker so they can pick which engagement to inspect.
export default function EvidenceRedirectPage() {
  redirect('/officer/evidence-intelligence');
}
