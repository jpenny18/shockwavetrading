import { redirect } from 'next/navigation';

// Landing content now lives at `/` (former newlanding).
// Keep this route so old /newlanding links still work.
export default function NewLandingRedirect() {
  redirect('/');
}
