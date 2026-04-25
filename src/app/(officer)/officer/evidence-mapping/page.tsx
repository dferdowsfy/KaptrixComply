import { redirect } from 'next/navigation';

// Evidence Mapping is now folded into Evidence Intelligence per engagement.
export default function EvidenceMappingRedirectPage() {
  redirect('/officer/evidence-intelligence');
}
