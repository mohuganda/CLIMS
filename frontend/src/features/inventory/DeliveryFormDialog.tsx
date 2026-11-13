import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form/FormDialog';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { formLevelError } from '@/components/form/serverErrors';
import { TextField } from '@/components/form/TextField';
import { toDateInputValue } from '@/lib/validation';

import {
  DELIVERY_FIELDS,
  deliverySchema,
  type DeliveryFormInput,
  type DeliveryFormOutput,
} from './inventoryForm';
import { useCreateInventory } from './queries';

interface LookupOptions {
  options: readonly SelectOption[];
  isLoading: boolean;
}

interface DeliveryFormDialogProps {
  /** The signed-in user, recorded as having received the delivery. */
  userId: number;
  condoms: LookupOptions;
  units: LookupOptions;
  organizationUnits: LookupOptions;
  onClose: () => void;
}

/** Records a delivery into stock. Mount it to open; `onClose` unmounts it. */
export function DeliveryFormDialog({
  userId,
  condoms,
  units,
  organizationUnits,
  onClose,
}: DeliveryFormDialogProps) {
  const createInventory = useCreateInventory(userId);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<DeliveryFormInput, unknown, DeliveryFormOutput>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      condom_id: '',
      batch_number: '',
      quantity: '',
      unit_of_measure_id: '',
      unit_cost: '',
      date_of_delivery: '',
      organization_unit_id: '',
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    createInventory.mutate(values, {
      onSuccess: onClose,
      onError: (error) => {
        setFormError(formLevelError(error, DELIVERY_FIELDS, setError));
      },
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Record a delivery"
      description="Add a batch of condoms that has arrived into stock."
      submitLabel="Record delivery"
      pendingLabel="Recording…"
      isPending={createInventory.isPending}
      isDirty={isDirty}
      error={formError}
      onSubmit={onSubmit}
    >
      <Controller
        control={control}
        name="condom_id"
        render={({ field, fieldState }) => (
          <SelectField
            label="Condom item"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={condoms.options}
            placeholder="Choose an item…"
            isLoading={condoms.isLoading}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        label="Batch number"
        required
        autoComplete="off"
        spellCheck={false}
        error={errors.batch_number?.message}
        {...register('batch_number')}
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
      <TextField
        label="Unit cost"
        required
        inputMode="decimal"
        autoComplete="off"
        description="Cost of a single unit."
        error={errors.unit_cost?.message}
        {...register('unit_cost')}
      />
      <TextField
        label="Delivery date"
        type="date"
        required
        max={toDateInputValue(new Date())}
        error={errors.date_of_delivery?.message}
        {...register('date_of_delivery')}
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
