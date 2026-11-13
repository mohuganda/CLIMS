import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form/FormDialog';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { formLevelError } from '@/components/form/serverErrors';
import { TextField } from '@/components/form/TextField';

import { ADJUSTMENT_TYPES, type InventoryRecord } from './api';
import {
  ADJUSTMENT_FIELDS,
  ADJUSTMENT_LABELS,
  adjustmentSchema,
  type AdjustmentFormInput,
  type AdjustmentFormOutput,
} from './inventoryForm';
import { useAdjustInventory } from './queries';

interface LookupOptions {
  options: readonly SelectOption[];
  isLoading: boolean;
}

interface AdjustStockDialogProps {
  record: InventoryRecord;
  /** How the record is named in the dialog title, e.g. its batch number. */
  recordLabel: string;
  units: LookupOptions;
  organizationUnits: LookupOptions;
  onClose: () => void;
}

const TYPE_OPTIONS = ADJUSTMENT_TYPES.map((type) => ({
  value: type,
  label: ADJUSTMENT_LABELS[type],
}));

const toSelectValue = (id: number | null) => (id === null ? '' : String(id));

/** Adds to or distributes from an existing stock record. */
export function AdjustStockDialog({
  record,
  recordLabel,
  units,
  organizationUnits,
  onClose,
}: AdjustStockDialogProps) {
  const adjustInventory = useAdjustInventory(record.id);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<AdjustmentFormInput, unknown, AdjustmentFormOutput>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      // Deliberately unset: the two choices move stock in opposite directions,
      // so neither is a safe default.
      submitted_type: '' as AdjustmentFormInput['submitted_type'],
      quantity: '',
      unit_of_measure_id: toSelectValue(record.unit_of_measure_id),
      organization_unit_id: toSelectValue(record.organization_unit_id),
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    adjustInventory.mutate(values, {
      onSuccess: onClose,
      onError: (error) => {
        setFormError(formLevelError(error, ADJUSTMENT_FIELDS, setError));
      },
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Adjust stock for ${recordLabel}`}
      description="Record stock added to this batch, or stock distributed from it."
      submitLabel="Save adjustment"
      pendingLabel="Saving…"
      isPending={adjustInventory.isPending}
      isDirty={isDirty}
      error={formError}
      onSubmit={onSubmit}
    >
      <Controller
        control={control}
        name="submitted_type"
        render={({ field, fieldState }) => (
          <SelectField
            label="Adjustment type"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={TYPE_OPTIONS}
            placeholder="Choose a type…"
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        label="Quantity"
        required
        inputMode="numeric"
        autoComplete="off"
        error={errors.quantity?.message}
        {...register('quantity')}
      />
      <Controller
        control={control}
        name="unit_of_measure_id"
        render={({ field, fieldState }) => (
          <SelectField
            label="Unit of measure"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={units.options}
            placeholder="Choose a unit…"
            isLoading={units.isLoading}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="organization_unit_id"
        render={({ field, fieldState }) => (
          <SelectField
            label="Organisation unit"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={organizationUnits.options}
            placeholder="Choose an organisation unit…"
            isLoading={organizationUnits.isLoading}
            error={fieldState.error?.message}
          />
        )}
      />
    </FormDialog>
  );
}
