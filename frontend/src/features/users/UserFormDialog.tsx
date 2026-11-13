import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormDialog } from '@/components/form/FormDialog';
import { SelectField } from '@/components/form/SelectField';
import { formLevelError } from '@/components/form/serverErrors';
import { TextField } from '@/components/form/TextField';
import type { Lookup } from '@/features/reference/api';

import type { User } from './api';
import { useSaveUser } from './queries';
import {
  createUserSchema,
  editUserSchema,
  toUserInput,
  USER_FORM_FIELDS,
  userDisplayName,
  userFormDefaults,
  type UserFormValues,
} from './userForm';

interface UserFormDialogProps {
  /** The user being edited, or `null` to create one. */
  user: User | null;
  roles: readonly Lookup[] | undefined;
  isLoadingRoles: boolean;
  organizationUnits: readonly Lookup[] | undefined;
  isLoadingOrganizationUnits: boolean;
  onClose: () => void;
}

const toOptions = (items: readonly Lookup[] | undefined) =>
  (items ?? []).map((item) => ({ value: String(item.id), label: item.name ?? `#${item.id}` }));

/** Create or edit a user. Mount it to open; `onClose` unmounts it. */
export function UserFormDialog({
  user,
  roles,
  isLoadingRoles,
  organizationUnits,
  isLoadingOrganizationUnits,
  onClose,
}: UserFormDialogProps) {
  const isEditing = user !== null;
  const saveUser = useSaveUser(user);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEditing ? editUserSchema : createUserSchema),
    defaultValues: userFormDefaults(user, roles ?? []),
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    saveUser.mutate(toUserInput(values), {
      onSuccess: onClose,
      onError: (error) => {
        setFormError(formLevelError(error, USER_FORM_FIELDS, setError));
      },
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEditing ? `Edit ${userDisplayName(user)}` : 'Add user'}
      description={
        isEditing
          ? 'Update this account. Leave the password blank to keep the current one.'
          : 'Create an account. The person signs in with this username and password.'
      }
      submitLabel={isEditing ? 'Save changes' : 'Create user'}
      pendingLabel={isEditing ? 'Saving…' : 'Creating…'}
      isPending={saveUser.isPending}
      isDirty={isDirty}
      error={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="First name"
        required
        autoComplete="off"
        error={errors.firstname?.message}
        {...register('firstname')}
      />
      <TextField
        label="Last name"
        required
        autoComplete="off"
        error={errors.lastname?.message}
        {...register('lastname')}
      />
      <TextField
        label="Username"
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.username?.message}
        {...register('username')}
      />
      <TextField
        label="Email"
        type="email"
        required
        autoComplete="off"
        spellCheck={false}
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Phone number"
        type="tel"
        required
        autoComplete="off"
        error={errors.phone_number?.message}
        {...register('phone_number')}
      />
      <TextField
        label="Location"
        required
        autoComplete="off"
        error={errors.location?.message}
        {...register('location')}
      />
      <Controller
        control={control}
        name="role"
        render={({ field, fieldState }) => (
          <SelectField
            label="Role"
            required
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            triggerRef={field.ref}
            options={toOptions(roles)}
            placeholder="Choose a role…"
            isLoading={isLoadingRoles}
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
            options={toOptions(organizationUnits)}
            placeholder="Choose an organisation unit…"
            isLoading={isLoadingOrganizationUnits}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        label={isEditing ? 'New password' : 'Password'}
        type="password"
        required={!isEditing}
        autoComplete="new-password"
        description="At least 8 characters."
        error={errors.password?.message}
        {...register('password')}
      />
    </FormDialog>
  );
}
