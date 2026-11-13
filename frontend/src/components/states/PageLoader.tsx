import { Spinner } from '@/components/ui/spinner';

/** Fills the content area while a lazily loaded page is fetched. */
export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <Spinner className="text-muted-foreground size-6" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
