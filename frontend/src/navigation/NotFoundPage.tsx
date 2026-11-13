'use client';

import { Compass } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/states/EmptyState';
import { Button } from '@/components/ui/button';

import { HOME_PATH } from './paths';

/** Shown inside the app shell for an address that matches no screen. */
export default function NotFoundPage() {
  return (
    <div className="bg-card rounded-xl border">
      <EmptyState
        icon={Compass}
        title="There is no page at this address"
        description="The link may be out of date, or the address may have been mistyped."
        action={
          <Button asChild>
            <Link href={HOME_PATH}>Go to the dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
