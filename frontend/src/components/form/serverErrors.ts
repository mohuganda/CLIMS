import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { toApiError } from '@/lib/api';

/**
 * Shows the server's per-field validation messages next to the fields they
 * belong to. `fieldMap` translates an API field name to the form's, for the
 * few that differ. Returns how many messages were placed, so the caller can
 * tell whether the user has already been shown what is wrong.
 */
export function applyServerErrors<Values extends FieldValues>(
  error: unknown,
  formFields: readonly Path<Values>[],
  setError: UseFormSetError<Values>,
  fieldMap: Readonly<Record<string, Path<Values>>> = {},
): number {
  const { fieldErrors } = toApiError(error);
  let placed = 0;

  for (const [apiField, messages] of Object.entries(fieldErrors)) {
    const formField = fieldMap[apiField] ?? (apiField as Path<Values>);
    const message = messages[0];
    if (!message || !formFields.includes(formField)) continue;
    setError(formField, { type: 'server', message }, { shouldFocus: placed === 0 });
    placed += 1;
  }
  return placed;
}

/**
 * The message to show at the top of the form for a failed save, or `null` when
 * the failure was fully explained beside individual fields.
 */
export function formLevelError<Values extends FieldValues>(
  error: unknown,
  formFields: readonly Path<Values>[],
  setError: UseFormSetError<Values>,
  fieldMap?: Readonly<Record<string, Path<Values>>>,
): string | null {
  return applyServerErrors(error, formFields, setError, fieldMap) > 0
    ? null
    : toApiError(error).message;
}
