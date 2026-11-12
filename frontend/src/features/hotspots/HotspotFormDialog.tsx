import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form/FormDialog';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { formLevelError } from '@/components/form/serverErrors';
import { TextField } from '@/components/form/TextField';

import type { Hotspot } from './api';
import {
  HOTSPOT_FIELDS,
  HOTSPOT_SERVER_FIELD_MAP,
  hotspotFormDefaults,
  hotspotLabel,
  hotspotSchema,
  statusOptions,
  type HotspotFormInput,
  type HotspotFormOutput,
} from './hotspotForm';
import { useSaveHotspot } from './queries';

interface HotspotFormDialogProps {
  /** The hotspot being edited, or `null` to add one. */
  hotspot: Hotspot | null;
  organizationUnits: { options: readonly SelectOption[]; isLoading: boolean };
  onClose: () => void;
}

/** Add or edit a hotspot. Mount it to open; `onClose` unmounts it. */
export function HotspotFormDialog({ hotspot, organizationUnits, onClose }: HotspotFormDialogProps) {
  const isEditing = hotspot !== null;
  const saveHotspot = useSaveHotspot(hotspot);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<HotspotFormInput, unknown, HotspotFormOutput>({
    resolver: zodResolver(hotspotSchema),
    defaultValues: hotspotFormDefaults(hotspot),
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    saveHotspot.mutate(values, {
      onSuccess: onClose,
      onError: (error) => {
        setFormError(formLevelError(error, HOTSPOT_FIELDS, setError, HOTSPOT_SERVER_FIELD_MAP));
      },
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEditing ? `Edit ${hotspotLabel(hotspot)}` : 'Add hotspot'}
      description="A hotspot is a place where condoms are distributed, with a contact person on site."
      submitLabel={isEditing ? 'Save changes' : 'Add hotspot'}
      pendingLabel={isEditing ? 'Saving…' : 'Adding…'}
      isPending={saveHotspot.isPending}
      isDirty={isDirty}
      error={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Hotspot name"
        required
        autoComplete="off"
        error={errors.hotspot_name?.message}
        {...register('hotspot_name')}
      />
      <Controller
        control={control}
        name="hotspot_status"
        render={({ field, fieldState }) => (
          <SelectField
            label="Status"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={statusOptions(hotspot?.hotspot_status ?? null)}
            placeholder="Choose a status…"
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        label="Contact person"
        required
        autoComplete="off"
        error={errors.contact_person_name?.message}
        {...register('contact_person_name')}
      />
      <TextField
        label="Contact phone"
        type="tel"
        required
        autoComplete="off"
        error={errors.contact_person_telephone?.message}
        {...register('contact_person_telephone')}
      />
      <TextField
        label="Latitude"
        required
        inputMode="decimal"
        autoComplete="off"
        description="Decimal degrees, e.g. 0.3136. South is negative."
        error={errors.latitude?.message}
        {...register('latitude')}
      />
      <TextField
        label="Longitude"
        required
        inputMode="decimal"
        autoComplete="off"
        description="Decimal degrees, e.g. 32.5811."
        error={errors.longitude?.message}
        {...register('longitude')}
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
