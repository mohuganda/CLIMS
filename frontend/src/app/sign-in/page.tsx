import type { Metadata } from 'next';

import SignInPage from '@/features/auth/SignInPage';
import { RedirectIfSignedIn } from '@/navigation/guards';

export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <RedirectIfSignedIn>
      <SignInPage />
    </RedirectIfSignedIn>
  );
}
