import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormDialog } from '@/components/form/FormDialog';
import { SelectField } from '@/components/form/SelectField';
import { formLevelError } from '@/components/form/serverErrors';
import { TextField } from '@/components/form/TextField';
import type { Lookup } from '@/features/reference/api';

import { condomLabel, type Condom } from './api';
import { useSaveCondom } from './queries';

const condomSchema = z.object({
  category: z.string().trim().min(1, 'Enter a category.').max(100),
  brand: z.string().trim().min(1, 'Enter a brand.').max(100),
  type: z.string().trim().max(100),
  unit_of_measure_id: z.string().min(1, 'Choose a unit of measure.'),
});

type CondomFormValues = z.infer<typeof condomSchema>;

const FIELDS = ['category', 'brand', 'type', 'unit_of_measure_id'] as const;

interface CondomFormDialogProps {
  /** The item being edited, or `null` to add one. */
  condom: Condom | null;
  units: readonly Lookup[] | undefined;
  isLoadingUnits: boolean;
  onClose: () => void;
}

/** Add or edit a condom item. Mount it to open; `onClose` unmounts it. */
export function CondomFormDialog({
  condom,
  units,
  isLoadingUnits,
  onClose,
}: CondomFormDialogProps) {
  const isEditing = condom !== null;
  const saveCondom = useSaveCondom(condom);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CondomFormValues>({
    resolver: zodResolver(condomSchema),
    defaultValues: {
      category: condom?.category ?? '',
      brand: condom?.brand ?? '',
      type: condom?.type ?? '',
      unit_of_measure_id:
        condom?.unit_of_measure_id === null || condom?.unit_of_measure_id === undefined
          ? ''
          : String(condom.unit_of_measure_id),
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    saveCondom.mutate(values, {
      onSuccess: onClose,
      onError: (error) => {
        setFormError(formLevelError(error, FIELDS, setError));
      },
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEditing ? `Edit ${condomLabel(condom)}` : 'Add condom item'}
      description="A condom item is a product that can be stocked and distributed."
      submitLabel={isEditing ? 'Save changes' : 'Add item'}
      pendingLabel={isEditing ? 'Saving…' : 'Adding…'}
      isPending={saveCondom.isPending}
      isDirty={isDirty}
      error={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Category"
        required
        autoComplete="off"
        description="For example, male or female."
        error={errors.category?.message}
        {...register('category')}
      />
      <TextField
        label="Brand"
        required
        autoComplete="off"
        error={errors.brand?.message}
        {...register('brand')}
      />
      <TextField
        label="Type"
        autoComplete="off"
        error={errors.type?.message}
        {...register('type')}
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
            options={(units ?? []).map((unit) => ({
              value: String(unit.id),
              label: unit.name ?? `#${unit.id}`,
            }))}
            placeholder="Choose a unit…"
            isLoading={isLoadingUnits}
            error={fieldState.error?.message}
          />
        )}
      />
    </FormDialog>
  );
}
