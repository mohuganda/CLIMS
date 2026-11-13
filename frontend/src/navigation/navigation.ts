import type { LucideIcon } from 'lucide-react';

/** One screen: where it lives and what it is called. */
export interface NavItem {
  /** Short label for the sidebar. */
  label: string;
  path: string;
  /** Full page title for the header and the browser tab. */
  title: string;
}

/** A sidebar section. Each one is the workspace of one kind of organisation or role. */
export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: readonly NavItem[];
}

/** The item whose path is `pathname`, searching every group. */
export function findNavItem(groups: readonly NavGroup[], pathname: string): NavItem | null {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const group of groups) {
    const item = group.items.find((candidate) => candidate.path === normalised);
    if (item) return item;
  }
  return null;
}
