'use client';

import { Info, Upload } from 'lucide-react';

import { TextField } from '@/components/form/TextField';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface EvidenceFormProps {
  title: string;
  description: string;
  quantityLabel: string;
  dateLabel: string;
  counterpartLabel: string;
}

function EvidenceForm({
  title,
  description,
  quantityLabel,
  dateLabel,
  counterpartLabel,
}: EvidenceFormProps) {
  return (
    <section className="bg-card flex flex-col gap-5 rounded-xl border p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>
      {/* Disabled as a group: there is no endpoint to send this to yet, and a
          form that accepts input it will discard is worse than one that says so. */}
      <fieldset disabled className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">{title}</legend>
        <TextField label={quantityLabel} required inputMode="numeric" autoComplete="off" />
        <TextField label={dateLabel} type="date" required />
        <TextField label={counterpartLabel} required autoComplete="off" />
        <TextField
          label="Evidence document"
          type="file"
          required
          accept=".pdf,image/png,image/jpeg"
          description="A delivery note or signed receipt, as a PDF or photo."
        />
        <Button type="button" className="self-start">
          <Upload data-icon="inline-start" />
          Upload evidence
        </Button>
      </fieldset>
    </section>
  );
}

/** Proof of what was received and what was sent on. */
export default function EvidencePage() {
  return (
    <>
      <PageHeader description="Upload the paperwork that backs up stock received and stock distributed." />
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>Evidence upload is not available yet</AlertTitle>
        <AlertDescription>
          These forms show what will be collected. They are switched off until the server can store
          uploaded documents, so nothing entered here would be saved.
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EvidenceForm
          title="Stock received"
          description="Record a delivery and attach the delivery note."
          quantityLabel="Quantity received"
          dateLabel="Date received"
          counterpartLabel="Supplied by"
        />
        <EvidenceForm
          title="Stock distributed"
          description="Record stock sent out and attach the signed receipt."
          quantityLabel="Quantity distributed"
          dateLabel="Date distributed"
          counterpartLabel="Sent to"
        />
      </div>
    </>
  );
}
