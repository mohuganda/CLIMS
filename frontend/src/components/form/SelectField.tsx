import { useId, type Ref } from 'react';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly SelectOption[];
  placeholder: string;
  error?: string;
  description?: string;
  required?: boolean;
  /** True while the options are being fetched. */
  isLoading?: boolean;
  /** Set when the options could not be fetched; shown in place of the placeholder. */
  loadError?: string;
  disabled?: boolean;
  /** Lets a form focus this field, e.g. when it is the first one in error. */
  triggerRef?: Ref<HTMLButtonElement>;
}

/** A labelled select whose options may come from the API. */
export function SelectField({
  label,
  value,
  onValueChange,
  onBlur,
  options,
  placeholder,
  error,
  description,
  required,
  isLoading = false,
  loadError,
  disabled = false,
  triggerRef,
}: SelectFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error || loadError ? `${id}-error` : undefined;
  const message = error ?? loadError;

  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? null : <span className="text-muted-foreground font-normal">(optional)</span>}
      </FieldLabel>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading || options.length === 0}
        required={required}
      >
        <SelectTrigger
          ref={triggerRef}
          id={id}
          className="w-full"
          onBlur={onBlur}
          aria-invalid={message ? true : undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        >
          <SelectValue
            placeholder={
              isLoading ? 'Loading…' : options.length === 0 ? 'No options available' : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {message ? <FieldError id={errorId}>{message}</FieldError> : null}
    </Field>
  );
}
