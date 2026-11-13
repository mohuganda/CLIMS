import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Page not found' };

/*
 * An address that matches no screen. Without this route Next.js would answer
 * with the root not-found page, outside the app shell; raising it from here
 * hands it to the not-found page next to this folder, which renders inside.
 */
export default function Page() {
  notFound();
}
