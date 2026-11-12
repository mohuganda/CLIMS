import { LogOut } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser, useSignOut } from '@/features/auth/hooks';
import { initialsOf } from '@/lib/format';

/** The signed-in user's identity and the way to sign out. */
export function UserMenu() {
  const user = useCurrentUser();
  const signOut = useSignOut();
  if (!user) return null;

  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ');
  const displayName = fullName || user.username;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName}`}
        className="from-primary/80 to-chart-1 text-primary-foreground focus-visible:ring-ring/50 hover:ring-primary/50 flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-xs font-semibold ring-2 ring-transparent transition-shadow outline-none focus-visible:ring-3"
      >
        {initialsOf(displayName)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-foreground truncate text-sm font-medium">{displayName}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {[user.username, user.role].filter(Boolean).join(' · ')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
