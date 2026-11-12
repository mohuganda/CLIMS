import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable';
import { RowActions } from '@/components/data-table/RowActions';
import { ExportButton } from '@/components/ExportButton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Lookup } from '@/features/reference/api';
import { lookupName, useOrganizationUnits, useRoles } from '@/features/reference/queries';
import { formatDate, initialsOf } from '@/lib/format';

import type { User } from './api';
import { useDeleteUser, useUsers } from './queries';
import { UserFormDialog } from './UserFormDialog';
import { userDisplayName } from './userForm';

/** A role shown by name whether the API sent a role id or a role name. */
function roleLabel(role: string | null, roles: readonly Lookup[] | undefined): string | null {
  if (!role) return null;
  return /^\d+$/.test(role) ? lookupName(roles, Number(role)) : role;
}

type DialogState = { user: User | null } | null;

export default function UsersPage() {
  const users = useUsers();
  const roles = useRoles();
  const organizationUnits = useOrganizationUnits();
  const currentUser = useCurrentUser();
  const deleteUser = useDeleteUser();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        value: userDisplayName,
        cell: (user) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
              {initialsOf(userDisplayName(user))}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium" title={userDisplayName(user)}>
                {userDisplayName(user)}
              </p>
              <p
                className="text-muted-foreground truncate text-xs"
                title={user.username ?? undefined}
              >
                {user.username}
              </p>
            </div>
          </div>
        ),
      },
      { id: 'email', header: 'Email', value: (user) => user.email },
      { id: 'phone', header: 'Phone', value: (user) => user.phone_number },
      { id: 'role', header: 'Role', value: (user) => roleLabel(user.role, roles.data) },
      {
        id: 'organization',
        header: 'Organisation unit',
        value: (user) => lookupName(organizationUnits.data, user.organization_unit_id),
      },
      { id: 'location', header: 'Location', value: (user) => user.location },
      {
        id: 'status',
        header: 'Status',
        value: (user) => user.status,
        cell: (user) => <StatusBadge status={user.status} />,
      },
      {
        id: 'created',
        header: 'Created',
        value: (user) => user.created_at,
        cell: (user) => formatDate(user.created_at),
      },
    ],
    [roles.data, organizationUnits.data],
  );

  const addButton = (
    <Button
      onClick={() => {
        setDialog({ user: null });
      }}
    >
      <Plus data-icon="inline-start" />
      Add user
    </Button>
  );

  return (
    <>
      <PageHeader
        description="Accounts that can sign in to CLIMS, with their role and organisation unit."
        actions={
          <>
            <ExportButton name="Users" columns={columns} rows={users.data} />
            {addButton}
          </>
        }
      />

      <DataTable
        label="Users"
        columns={columns}
        rows={users.data}
        getRowId={(user) => user.id}
        isLoading={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        isRetrying={users.isRefetching}
        searchPlaceholder="Search users…"
        emptyTitle="No users yet"
        emptyDescription="Add the first account so someone else can sign in."
        emptyAction={addButton}
        rowActions={(user) => (
          <RowActions
            label={`Actions for ${userDisplayName(user)}`}
            actions={[
              {
                label: 'Edit',
                icon: Pencil,
                onSelect: () => {
                  setDialog({ user });
                },
              },
              // Deleting the account you are signed in with would lock you out mid-session.
              ...(user.id === currentUser?.id
                ? []
                : [
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => {
                        setUserToDelete(user);
                      },
                    },
                  ]),
            ]}
          />
        )}
      />

      {dialog ? (
        <UserFormDialog
          key={dialog.user?.id ?? 'new'}
          user={dialog.user}
          roles={roles.data}
          isLoadingRoles={roles.isPending}
          organizationUnits={organizationUnits.data}
          isLoadingOrganizationUnits={organizationUnits.isPending}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={userToDelete !== null}
        onOpenChange={(open) => {
          if (open) return;
          setUserToDelete(null);
          deleteUser.reset();
        }}
        title={userToDelete ? `Delete ${userDisplayName(userToDelete)}?` : 'Delete user?'}
        description="This account will no longer be able to sign in. This cannot be undone."
        confirmLabel="Delete user"
        isPending={deleteUser.isPending}
        error={deleteUser.error}
        onConfirm={() => {
          if (!userToDelete) return;
          deleteUser.mutate(userToDelete.id, {
            onSuccess: () => {
              setUserToDelete(null);
            },
          });
        }}
      />
    </>
  );
}
