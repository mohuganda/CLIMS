import { FlaskConical } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

/**
 * Marks a figure or chart that is not read from the API. Several screens were
 * designed before their endpoints existed; an unlabelled placeholder number in
 * a stock system is a number someone will eventually act on.
 */
export function SampleBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground shrink-0 font-normal">
      Sample
    </Badge>
  );
}

interface SampleDataNoticeProps {
  /** What is illustrative on this page, e.g. "The order figures". */
  subject: string;
}

/** Page-level explanation for screens whose figures are all illustrative. */
export function SampleDataNotice({ subject }: SampleDataNoticeProps) {
  return (
    <Alert>
      <FlaskConical aria-hidden="true" />
      <AlertTitle>Sample data</AlertTitle>
      <AlertDescription>
        {subject} on this page are illustrative. They will show live figures once this screen is
        connected to the server.
      </AlertDescription>
    </Alert>
  );
}
