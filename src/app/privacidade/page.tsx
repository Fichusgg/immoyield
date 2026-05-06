import { permanentRedirect } from 'next/navigation';

// Convenience alias: tester invites and printed materials may reference the
// short /privacidade URL. The canonical document lives at /legal/privacidade.
export default function PrivacidadeAlias() {
  permanentRedirect('/legal/privacidade');
}
