import type { Metadata } from 'next';

import { navGroups } from './navGroups';
import { findNavItem } from './navigation';

/**
 * The metadata for the screen at `path`, taken from the navigation table so a
 * page's tab title and its header can never disagree. Throws at build time for
 * a path the table does not know, which is how a page added without a
 * navigation entry is caught.
 */
export function pageMetadata(path: string): Metadata {
  const item = findNavItem(navGroups, path);
  if (!item) throw new Error(`No navigation entry for "${path}". Add it to navGroups.`);
  return { title: item.title };
}
