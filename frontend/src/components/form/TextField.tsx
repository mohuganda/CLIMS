import { useId, type ComponentProps } from 'react';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, 'id'> {
  label: string;
  /** Validation message; its presence marks the field invalid. */
  error?: string;
  /** Guidance shown under the field, e.g. the expected format. */
  description?: string;
}

/** A labelled input with its guidance and error wired up for assistive technology. */
export function TextField({ label, error, description, required, ...inputProps }: TextFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? null : <span className="text-muted-foreground font-normal">(optional)</span>}
      </FieldLabel>
      <Input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        {...inputProps}
      />
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
