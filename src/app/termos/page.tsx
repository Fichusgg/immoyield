import { permanentRedirect } from 'next/navigation';

// Convenience alias: tester invites and printed materials may reference the
// short /termos URL. The canonical document lives at /legal/termos.
export default function TermosAlias() {
  permanentRedirect('/legal/termos');
}
